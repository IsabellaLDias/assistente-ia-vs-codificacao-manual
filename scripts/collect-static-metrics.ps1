#requires -Version 5.1
<#
.SYNOPSIS
Coleta métricas estáticas de um único trial Java do LAB02.

.DESCRIPTION
Executa CK e PMD CPD somente sobre os arquivos .java de produção de um trial.
Gera relatórios brutos auditáveis e adiciona uma linha padronizada ao CSV
consolidado da RQ3.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidateNotNullOrEmpty()]
    [string]$SourceDir,

    [Parameter(Mandatory)]
    [ValidateNotNullOrEmpty()]
    [string]$Participant,

    [Parameter(Mandatory)]
    [ValidateNotNullOrEmpty()]
    [string]$Kata,

    [Parameter(Mandatory)]
    [ValidateSet('COM_IA', 'SEM_IA')]
    [string]$Treatment,

    [string]$OutputCsv,

    [ValidateRange(1, 100000)]
    [int]$MinimumTokens = 50,

    [switch]$IncludeConstructors,

    [switch]$ReplaceExisting
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$SchemaVersion = '1.0'
$CkVersion = '0.7.0'
$PmdVersion = '7.26.0'
$ExcludedPathSegments = @('test', 'tests', 'target', 'build', 'out', '.git', '.idea', '.gradle')

function Ensure-Directory {
    param(
        [Parameter(Mandatory)]
        [string]$Path
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
    }
}

function Get-RelativePath {
    param(
        [Parameter(Mandatory)]
        [string]$BasePath,

        [Parameter(Mandatory)]
        [string]$TargetPath
    )

    $baseFullPath = (Resolve-Path -LiteralPath $BasePath).Path
    $targetFullPath = (Resolve-Path -LiteralPath $TargetPath).Path
    $separator = [System.IO.Path]::DirectorySeparatorChar.ToString()

    if (-not $baseFullPath.EndsWith($separator)) {
        $baseFullPath = $baseFullPath + $separator
    }

    $baseUri = New-Object System.Uri($baseFullPath)
    $targetUri = New-Object System.Uri($targetFullPath)
    $relativeUri = $baseUri.MakeRelativeUri($targetUri)

    return [System.Uri]::UnescapeDataString($relativeUri.ToString()).Replace('/', [System.IO.Path]::DirectorySeparatorChar)
}

function ConvertTo-SafePathPart {
    param(
        [Parameter(Mandatory)]
        [string]$Value
    )

    $safeValue = $Value -replace '[<>:"/\\|?*]', '_'
    $safeValue = $safeValue.Trim()
    if ([string]::IsNullOrWhiteSpace($safeValue)) {
        return 'sem_nome'
    }

    return $safeValue
}

function ConvertTo-InvariantDouble {
    param(
        [Parameter(Mandatory)]
        [AllowEmptyString()]
        [string]$Value,

        [Parameter(Mandatory)]
        [string]$FieldName
    )

    if ([string]::IsNullOrWhiteSpace($Value)) {
        throw "O campo '$FieldName' está vazio no relatório da ferramenta."
    }

    return [double]::Parse(
        $Value,
        [System.Globalization.NumberStyles]::Float,
        [System.Globalization.CultureInfo]::InvariantCulture
    )
}

function Format-Decimal {
    param(
        [AllowNull()]
        $Value
    )

    if ($null -eq $Value) {
        return $null
    }

    return ([double]$Value).ToString('0.0000', [System.Globalization.CultureInfo]::InvariantCulture)
}

function Test-ProductionJavaFile {
    param(
        [Parameter(Mandatory)]
        [string]$Root,

        [Parameter(Mandatory)]
        [string]$FilePath
    )

    $relativePath = Get-RelativePath -BasePath $Root -TargetPath $FilePath
    $segments = $relativePath -split '[\\/]'

    foreach ($segment in $segments) {
        if ($ExcludedPathSegments -contains $segment.ToLowerInvariant()) {
            return $false
        }
    }

    return $true
}

function Get-JavaPhysicalLoc {
    param([string]$FilePath)
    return [System.IO.File]::ReadAllLines($FilePath).Length
}

function Convert-BytesToHex {
    param(
        [Parameter(Mandatory)]
        [byte[]]$Bytes
    )

    return ([System.BitConverter]::ToString($Bytes)).Replace('-', '').ToLowerInvariant()
}

function Get-SourceSummary {
    param(
        [Parameter(Mandatory)]
        [array]$Files,

        [Parameter(Mandatory)]
        [string]$Root
    )

    $manifest = @()
    foreach ($file in $Files) {
        $relativePath = Get-RelativePath -BasePath $Root -TargetPath $file.FullName
        $contentHash = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
        $manifest += [pscustomobject][ordered]@{
            relative_path = $relativePath.Replace('\', '/')
            original_path = $file.FullName
            source_sha256 = $contentHash
            loc_physical = Get-JavaPhysicalLoc -FilePath $file.FullName
        }
    }

    $canonicalManifest = ($manifest | ForEach-Object {
        "$($_.relative_path):$($_.source_sha256)"
    }) -join [System.Environment]::NewLine

    $sha256 = [System.Security.Cryptography.SHA256]::Create()
    try {
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($canonicalManifest)
        $combinedHash = Convert-BytesToHex -Bytes $sha256.ComputeHash($bytes)
    }
    finally {
        $sha256.Dispose()
    }

    $totalPhysicalLoc = 0
    foreach ($entry in $manifest) {
        $totalPhysicalLoc += [int]$entry.loc_physical
    }

    return [pscustomobject]@{
        hash = $combinedHash
        manifest = $manifest
        physical_loc = $totalPhysicalLoc
    }
}

function Get-CkSloc {
    param(
        [Parameter(Mandatory)]
        [string]$ClassCsv
    )

    $rows = @(Import-Csv -LiteralPath $ClassCsv)
    if ($rows.Count -eq 0) {
        throw 'O CK não retornou classes em class.csv.'
    }

    $totalSloc = 0
    foreach ($fileGroup in ($rows | Group-Object -Property file)) {
        # Multiple classes may overlap (nested) or be disjoint (top-level).
        # Do not present the maximum as the SLOC of the entire file.
        if ($fileGroup.Count -gt 1) { return $null }
        $largestClassSloc = 0
        foreach ($row in $fileGroup.Group) {
            $classSloc = ConvertTo-InvariantDouble -Value $row.loc -FieldName 'class.csv.loc'
            if ($classSloc -gt $largestClassSloc) {
                $largestClassSloc = $classSloc
            }
        }
        $totalSloc += [int][Math]::Round($largestClassSloc)
    }

    return $totalSloc
}

function Get-CkClassMetrics {
    param(
        [Parameter(Mandatory)]
        [string]$ClassCsv
    )

    $rows = @(Import-Csv -LiteralPath $ClassCsv)
    if ($rows.Count -eq 0) {
        return [pscustomobject]@{
            max_nested_blocks = 0
            cbo_mean = 0.0
            rfc_mean = 0.0
            lcom_mean = 0.0
        }
    }

    $maxNested = 0
    $cboSum = 0.0
    $rfcSum = 0.0
    $lcomSum = 0.0

    foreach ($row in $rows) {
        if ($null -ne $row.maxNestedBlocksQty -and $row.maxNestedBlocksQty -ne '') {
            $val = [int]$row.maxNestedBlocksQty
            if ($val -gt $maxNested) { $maxNested = $val }
        }
        if ($null -ne $row.cbo -and $row.cbo -ne '') { $cboSum += ConvertTo-InvariantDouble -Value $row.cbo -FieldName 'class.csv.cbo' }
        if ($null -ne $row.rfc -and $row.rfc -ne '') { $rfcSum += ConvertTo-InvariantDouble -Value $row.rfc -FieldName 'class.csv.rfc' }
        if ($null -ne $row.lcom -and $row.lcom -ne '') { $lcomSum += ConvertTo-InvariantDouble -Value $row.lcom -FieldName 'class.csv.lcom' }
    }

    return [pscustomobject]@{
        max_nested_blocks = $maxNested
        cbo_mean = ($cboSum / $rows.Count)
        rfc_mean = ($rfcSum / $rows.Count)
        lcom_mean = ($lcomSum / $rows.Count)
    }
}

function Invoke-KataBenchmark {
    param(
        [Parameter(Mandatory)]
        [string]$ClassesDirectory,
        [string]$KataHint,
        [Parameter(Mandatory)]
        [string]$RawRunDirectory,
        [Parameter(Mandatory)]
        [string]$ScriptRoot
    )

    $runnerJava = Join-Path $ScriptRoot 'KataBenchmarkRunner.java'
    if (-not (Test-Path -LiteralPath $runnerJava)) {
        return [pscustomobject]@{
            bench_executed = $false
            bench_time_us = $null
            bench_allocated_bytes = $null
            bench_throughput_ops = $null
        }
    }

    $benchBuildDir = Join-Path $RawRunDirectory 'bench-build'
    Ensure-Directory -Path $benchBuildDir

    $benchStdout = Join-Path $RawRunDirectory 'bench.stdout.log'
    $benchStderr = Join-Path $RawRunDirectory 'bench.stderr.log'

    try {
        $compileStdout = Join-Path $RawRunDirectory 'bench-compile.stdout.log'
        $compileStderr = Join-Path $RawRunDirectory 'bench-compile.stderr.log'
        $ErrorActionPreference = 'Continue'
        & javac -encoding UTF-8 -d $benchBuildDir $runnerJava 1> $compileStdout 2> $compileStderr
        if ($LASTEXITCODE -ne 0) {
            $ErrorActionPreference = 'Stop'
            return [pscustomobject]@{ bench_executed = $false; bench_time_us = $null; bench_allocated_bytes = $null; bench_throughput_ops = $null }
        }

        $sep = if ($IsWindows -or ($env:OS -like '*Windows*')) { ';' } else { ':' }
        $cp = "$benchBuildDir$sep$ClassesDirectory"

        $benchOutput = & java -cp $cp br.ufc.lab02.benchmark.KataBenchmarkRunner $ClassesDirectory $KataHint 2> $benchStderr
        $ErrorActionPreference = 'Stop'

        if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace($benchOutput)) {
            Set-Content -LiteralPath (Join-Path $RawRunDirectory 'benchmark.json') -Value $benchOutput -Encoding utf8
            $json = $benchOutput | ConvertFrom-Json
            if ($json.benchmark_executed) {
                return [pscustomobject]@{
                    bench_executed = $true
                    bench_time_us = [double]$json.bench_time_us
                    bench_allocated_bytes = [double]$json.bench_allocated_bytes
                    bench_throughput_ops = [double]$json.bench_throughput_ops
                }
            }
        }
    }
    catch {}

    return [pscustomobject]@{
        bench_executed = $false
        bench_time_us = $null
        bench_allocated_bytes = $null
        bench_throughput_ops = $null
    }
}

function Get-PmdRuleViolations {
    param(
        [Parameter(Mandatory)]
        $PmdCommand,
        [Parameter(Mandatory)]
        [string]$AnalysisDirectory,
        [Parameter(Mandatory)]
        [string]$RawRunDirectory
    )

    $pmdRulesJson = Join-Path $RawRunDirectory 'pmd-rules.json'
    $pmdCheckStdout = Join-Path $RawRunDirectory 'pmd-check.stdout.log'
    $pmdCheckStderr = Join-Path $RawRunDirectory 'pmd-check.stderr.log'

    try {
        $pmdCheckArgs = @(
            'check',
            '--dir', $AnalysisDirectory,
            '--rulesets', 'category/java/performance.xml,category/java/bestpractices.xml',
            '--format', 'json',
            '--report-file', $pmdRulesJson,
            '--no-fail-on-violation'
        )
        $ErrorActionPreference = 'Continue'
        & $PmdCommand.FullName @pmdCheckArgs 1> $pmdCheckStdout 2> $pmdCheckStderr
        $ErrorActionPreference = 'Stop'

        if (Test-Path -LiteralPath $pmdRulesJson) {
            $json = Get-Content -LiteralPath $pmdRulesJson -Raw -Encoding UTF8 | ConvertFrom-Json
            $violations = @($json.files | ForEach-Object { $_.violations })
            $perfCount = @($violations | Where-Object { $_.ruleset -like '*Performance*' }).Count
            $bpCount = @($violations | Where-Object { $_.ruleset -like '*Best Practices*' }).Count
            return [pscustomobject]@{
                pmd_performance_violations = $perfCount
                pmd_bestpractices_violations = $bpCount
                pmd_total_violations = $violations.Count
            }
        }
    }
    catch {}

    return [pscustomobject]@{
        pmd_performance_violations = 0
        pmd_bestpractices_violations = 0
        pmd_total_violations = 0
    }
}

function Get-CkMethodMetrics {
    param(
        [Parameter(Mandatory)]
        [string]$MethodCsv,

        [Parameter(Mandatory)]
        [bool]$ConstructorsIncluded
    )

    $rows = @(Import-Csv -LiteralPath $MethodCsv)
    if (-not $ConstructorsIncluded) {
        $rows = @($rows | Where-Object {
            -not $_.constructor.Equals('true', [System.StringComparison]::OrdinalIgnoreCase)
        })
    }

    if ($rows.Count -eq 0) {
        return [pscustomobject]@{
            count = 0
            sum = $null
            mean = $null
            median = $null
            max = $null
        }
    }

    $values = @()
    foreach ($row in $rows) {
        $values += ConvertTo-InvariantDouble -Value $row.wmc -FieldName 'method.csv.wmc'
    }
    $values = @($values | Sort-Object)

    $sum = 0.0
    foreach ($value in $values) {
        $sum += $value
    }
    $count = $values.Count
    $mean = $sum / $count

    if (($count % 2) -eq 1) {
        $median = $values[[int][Math]::Floor($count / 2)]
    }
    else {
        $upperIndex = [int]($count / 2)
        $median = ($values[$upperIndex - 1] + $values[$upperIndex]) / 2
    }

    return [pscustomobject]@{
        count = $count
        sum = $sum
        mean = $mean
        median = $median
        max = $values[$values.Count - 1]
    }
}

function Get-CpdMetrics {
    param(
        [Parameter(Mandatory)]
        [string]$CpdXml
    )

    if (-not (Test-Path -LiteralPath $CpdXml)) {
        throw 'O PMD não produziu o relatório XML do CPD.'
    }

    [xml]$document = Get-Content -LiteralPath $CpdXml -Raw -Encoding UTF8
    if ($null -eq $document.DocumentElement) {
        throw 'O relatório XML do CPD está vazio ou inválido.'
    }

    $namespaceUri = $document.DocumentElement.NamespaceURI
    $namespaceManager = New-Object System.Xml.XmlNamespaceManager($document.NameTable)
    $hasNamespace = -not [string]::IsNullOrWhiteSpace($namespaceUri)
    if ($hasNamespace) {
        $namespaceManager.AddNamespace('cpd', $namespaceUri)
        $duplications = $document.SelectNodes('//cpd:duplication', $namespaceManager)
        $errors = $document.SelectNodes('//cpd:error', $namespaceManager)
    }
    else {
        $duplications = $document.SelectNodes('//duplication')
        $errors = $document.SelectNodes('//error')
    }

    if ($errors.Count -gt 0) {
        throw "O CPD registrou $($errors.Count) erro(s) de análise. Consulte $CpdXml."
    }

    $intervalsByFile = @{}
    $occurrences = 0

    foreach ($duplication in $duplications) {
        if ($hasNamespace) {
            $files = $duplication.SelectNodes('./cpd:file', $namespaceManager)
        }
        else {
            $files = $duplication.SelectNodes('./file')
        }

        if ($files.Count -lt 2) {
            throw 'O relatório do CPD contém uma duplicação sem ao menos duas ocorrências.'
        }

        foreach ($fileNode in $files) {
            $path = $fileNode.GetAttribute('path')
            $start = [int]$fileNode.GetAttribute('line')
            $end = [int]$fileNode.GetAttribute('endline')

            if ([string]::IsNullOrWhiteSpace($path) -or $start -lt 1 -or $end -lt $start) {
                throw 'O relatório do CPD contém um intervalo de duplicação inválido.'
            }

            if (-not $intervalsByFile.ContainsKey($path)) {
                $intervalsByFile[$path] = @()
            }
            $intervalsByFile[$path] += [pscustomobject]@{
                start = $start
                end = $end
            }
            $occurrences += 1
        }
    }

    $uniqueDuplicatedLines = 0
    foreach ($path in $intervalsByFile.Keys) {
        $orderedIntervals = @($intervalsByFile[$path] | Sort-Object -Property start, end)
        $currentStart = $null
        $currentEnd = $null

        foreach ($interval in $orderedIntervals) {
            if ($null -eq $currentStart) {
                $currentStart = [int]$interval.start
                $currentEnd = [int]$interval.end
                continue
            }

            if ([int]$interval.start -le ($currentEnd + 1)) {
                if ([int]$interval.end -gt $currentEnd) {
                    $currentEnd = [int]$interval.end
                }
            }
            else {
                $uniqueDuplicatedLines += $currentEnd - $currentStart + 1
                $currentStart = [int]$interval.start
                $currentEnd = [int]$interval.end
            }
        }

        if ($null -ne $currentStart) {
            $uniqueDuplicatedLines += $currentEnd - $currentStart + 1
        }
    }

    return [pscustomobject]@{
        groups = $duplications.Count
        occurrences = $occurrences
        unique_lines = $uniqueDuplicatedLines
    }
}

function Get-JavaVersion {
    $ErrorActionPreference = 'Continue'
    $output = & java -version 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw 'Não foi possível identificar a versão do Java.'
    }

    return ($output | Select-Object -First 1).ToString().Trim()
}

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$sourceDirectory = (Resolve-Path -LiteralPath $SourceDir).Path
$sourceSegments = $sourceDirectory -split '[\\/]'
foreach ($segment in $sourceSegments) {
    if ($ExcludedPathSegments -contains $segment.ToLowerInvariant()) {
        throw 'SourceDir deve apontar para o código de produção, e não para testes, build ou artefatos.'
    }
}

$ckJar = Join-Path $repositoryRoot "tools/ck/ck-$CkVersion-jar-with-dependencies.jar"
$pmdRoot = Join-Path $repositoryRoot 'tools/pmd'
$isUnix = ($null -ne (Get-Variable -Name 'IsLinux' -ErrorAction SilentlyContinue) -and $IsLinux) -or
          ($null -ne (Get-Variable -Name 'IsMacOS' -ErrorAction SilentlyContinue) -and $IsMacOS)
$pmdCommand = Get-ChildItem -LiteralPath $pmdRoot -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object {
        if ($isUnix) { $_.Name -eq 'pmd' -and -not $_.Name.EndsWith('.bat') }
        else { $_.Name -eq 'pmd.bat' }
    } | Select-Object -First 1

if (-not (Test-Path -LiteralPath $ckJar) -or $null -eq $pmdCommand) {
    throw 'Ferramentas não encontradas. Execute .\scripts\setup-metrics.ps1 antes da coleta.'
}

if ([string]::IsNullOrWhiteSpace($OutputCsv)) {
    $OutputCsv = Join-Path $repositoryRoot 'data\metrics\static_metrics.csv'
}
$outputCsvFullPath = [System.IO.Path]::GetFullPath($OutputCsv)
$outputDirectory = Split-Path -Parent $outputCsvFullPath
Ensure-Directory -Path $outputDirectory

$javaFiles = @(
    Get-ChildItem -LiteralPath $sourceDirectory -Recurse -File -Filter '*.java' |
        Where-Object { Test-ProductionJavaFile -Root $sourceDirectory -FilePath $_.FullName } |
        Sort-Object -Property FullName
)

if ($javaFiles.Count -eq 0) {
    throw 'Nenhum arquivo Java de produção foi encontrado em SourceDir.'
}

$sourceSummary = Get-SourceSummary -Files $javaFiles -Root $sourceDirectory
if ($sourceSummary.physical_loc -eq 0) {
    throw 'Os arquivos Java encontrados não possuem linhas físicas de código.'
}

$runTimestamp = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssfffZ')
$rawRoot = Join-Path $repositoryRoot 'data\metrics\raw'
$safeParticipant = ConvertTo-SafePathPart -Value $Participant
$safeKata = ConvertTo-SafePathPart -Value $Kata
$rawRunName = '{0}_{1}_{2}_{3}' -f $safeParticipant, $safeKata, $Treatment, $runTimestamp
$rawRunDirectory = Join-Path $rawRoot $rawRunName
$ckRawDirectory = Join-Path $rawRunDirectory 'ck'
$cpdXml = Join-Path $rawRunDirectory 'cpd.xml'
$analysisDirectory = Join-Path $rawRunDirectory 'source'

Ensure-Directory -Path $rawRunDirectory
Ensure-Directory -Path $ckRawDirectory
Ensure-Directory -Path $analysisDirectory

$rawRelativePath = (Get-RelativePath -BasePath $repositoryRoot -TargetPath $rawRunDirectory).Replace('\', '/')

try {
    $sourceSummary.manifest |
        Export-Csv -LiteralPath (Join-Path $rawRunDirectory 'source-manifest.csv') -NoTypeInformation -Encoding utf8

    foreach ($entry in $sourceSummary.manifest) {
        $stagedPath = Join-Path $analysisDirectory $entry.relative_path
        $stagedDirectory = Split-Path -Parent $stagedPath
        Ensure-Directory -Path $stagedDirectory
        Copy-Item -LiteralPath $entry.original_path -Destination $stagedPath -Force
    }

    # CK 0.7.0 uses JLS11 and may silently recover from malformed syntax.
    # Compile without executing the kata or annotation processors first.
    $classesDirectory = Join-Path $rawRunDirectory 'build'
    Ensure-Directory -Path $classesDirectory
    $compileArgsFile = Join-Path $rawRunDirectory 'javac.args'
    $compileArgs = @('--release', '11', '-encoding', 'UTF-8', '-proc:none', '-d', ('"' + $classesDirectory.Replace('\', '/') + '"'))
    foreach ($entry in $sourceSummary.manifest) {
        $compileArgs += '"' + (Join-Path $analysisDirectory $entry.relative_path).Replace('\', '/') + '"'
    }
    [System.IO.File]::WriteAllLines($compileArgsFile, $compileArgs, (New-Object System.Text.UTF8Encoding($false)))
    $ErrorActionPreference = 'Continue'
    & javac '-J-Dfile.encoding=UTF-8' ('@' + $compileArgsFile) 1> (Join-Path $rawRunDirectory 'javac.stdout.log') 2> (Join-Path $rawRunDirectory 'javac.stderr.log')
    $ErrorActionPreference = 'Stop'
    if ($LASTEXITCODE -ne 0) {
        throw 'Fontes não compilam como Java 11 sem dependências externas. Consulte javac.stderr.log. Preserve o trial e registre as métricas estruturais como indisponíveis.'
    }

    $ckArguments = @(
        '-Dfile.encoding=UTF-8',
        '-jar',
        $ckJar,
        $analysisDirectory,
        'false',
        '0',
        'false',
        ($ckRawDirectory.Replace('\', '/') + '/')
    )
    $ckStdout = Join-Path $rawRunDirectory 'ck.stdout.log'
    $ckStderr = Join-Path $rawRunDirectory 'ck.stderr.log'
    $ErrorActionPreference = 'Continue'
    & java @ckArguments 1> $ckStdout 2> $ckStderr
    $ErrorActionPreference = 'Stop'
    if ($LASTEXITCODE -ne 0) {
        throw "CK falhou (código $LASTEXITCODE). Consulte $ckStdout e $ckStderr."
    }
    if (Select-String -LiteralPath $ckStderr -Pattern 'Error in |Exception in thread|Caused by:|\w+Exception:' -Quiet) {
        throw 'CK registrou erro no log; coleta não será consolidada.'
    }

    $classCsv = Get-ChildItem -LiteralPath $ckRawDirectory -Recurse -File -Filter 'class.csv' |
        Select-Object -First 1
    $methodCsv = Get-ChildItem -LiteralPath $ckRawDirectory -Recurse -File -Filter 'method.csv' |
        Select-Object -First 1
    if ($null -eq $classCsv -or $null -eq $methodCsv) {
        throw 'CK terminou sem gerar class.csv e method.csv.'
    }
    $reportedFiles = @(Import-Csv -LiteralPath $classCsv.FullName -Encoding UTF8 | Select-Object -ExpandProperty file -Unique)
    if ($reportedFiles.Count -ne $javaFiles.Count) {
        throw 'CK não reportou todos os arquivos. Verifique classes com nomes repetidos, fontes vazios ou erros de análise.'
    }

    $pmdArguments = @(
        'cpd',
        '--minimum-tokens',
        $MinimumTokens,
        '--language',
        'java',
        '--dir',
        $analysisDirectory,
        '--encoding',
        'UTF-8',
        '--format',
        'xml',
        '--report-file',
        $cpdXml,
        '--no-fail-on-violation',
        '--fail-on-error'
    )
    $pmdStdout = Join-Path $rawRunDirectory 'pmd.stdout.log'
    $pmdStderr = Join-Path $rawRunDirectory 'pmd.stderr.log'
    $ErrorActionPreference = 'Continue'
    & $pmdCommand.FullName @pmdArguments 1> $pmdStdout 2> $pmdStderr
    $ErrorActionPreference = 'Stop'
    if ($LASTEXITCODE -ne 0) {
        throw "PMD CPD falhou (código $LASTEXITCODE). Consulte $pmdStdout e $pmdStderr."
    }

    $methodMetrics = Get-CkMethodMetrics -MethodCsv $methodCsv.FullName -ConstructorsIncluded $IncludeConstructors.IsPresent
    $ckSloc = Get-CkSloc -ClassCsv $classCsv.FullName
    $classMetrics = Get-CkClassMetrics -ClassCsv $classCsv.FullName
    $cpdMetrics = Get-CpdMetrics -CpdXml $cpdXml
    $benchMetrics = Invoke-KataBenchmark -ClassesDirectory $classesDirectory -KataHint $Kata -RawRunDirectory $rawRunDirectory -ScriptRoot $PSScriptRoot
    $pmdRuleMetrics = Get-PmdRuleViolations -PmdCommand $pmdCommand -AnalysisDirectory $analysisDirectory -RawRunDirectory $rawRunDirectory

    $duplicationPct = (100.0 * $cpdMetrics.unique_lines) / $sourceSummary.physical_loc
    $runMetadata = [ordered]@{
        schema_version = $SchemaVersion
        participant = $Participant
        kata = $Kata
        treatment = $Treatment
        source_path = $sourceDirectory
        source_sha256 = $sourceSummary.hash
        source_java_files = $javaFiles.Count
        analysis_utc = (Get-Date).ToUniversalTime().ToString('o')
        java_version = Get-JavaVersion
        ck_version = $CkVersion
        pmd_version = $PmdVersion
        cpd_min_tokens = $MinimumTokens
        constructors_included = $IncludeConstructors.IsPresent
        loc_physical = $sourceSummary.physical_loc
        loc_ck_sloc = $ckSloc
        ck_method_count = $methodMetrics.count
        ck_wmc_sum = $methodMetrics.sum
        ck_wmc_mean = $methodMetrics.mean
        ck_wmc_median = $methodMetrics.median
        ck_wmc_max = $methodMetrics.max
        ck_max_nested_blocks = $classMetrics.max_nested_blocks
        ck_cbo_mean = $classMetrics.cbo_mean
        ck_rfc_mean = $classMetrics.rfc_mean
        ck_lcom_mean = $classMetrics.lcom_mean
        cpd_duplication_groups = $cpdMetrics.groups
        cpd_occurrences = $cpdMetrics.occurrences
        cpd_duplicated_lines_unique = $cpdMetrics.unique_lines
        cpd_duplication_pct_physical = $duplicationPct
        bench_time_us = $benchMetrics.bench_time_us
        bench_allocated_bytes = $benchMetrics.bench_allocated_bytes
        bench_throughput_ops = $benchMetrics.bench_throughput_ops
        pmd_performance_violations = $pmdRuleMetrics.pmd_performance_violations
        pmd_bestpractices_violations = $pmdRuleMetrics.pmd_bestpractices_violations
        pmd_total_violations = $pmdRuleMetrics.pmd_total_violations
    }
    $runMetadata |
        ConvertTo-Json |
        Set-Content -LiteralPath (Join-Path $rawRunDirectory 'run-metadata.json') -Encoding utf8

    $record = [pscustomobject][ordered]@{
        schema_version = $SchemaVersion
        trial_id = "$Participant|$Kata|$Treatment"
        participante = $Participant
        kata = $Kata
        tratamento = $Treatment
        source_sha256 = $sourceSummary.hash
        source_java_files = $javaFiles.Count
        analysis_utc = $runMetadata.analysis_utc
        java_version = $runMetadata.java_version
        ck_version = $CkVersion
        pmd_version = $PmdVersion
        constructors_included = $IncludeConstructors.IsPresent
        loc_physical = $sourceSummary.physical_loc
        loc_ck_sloc = $ckSloc
        ck_method_count = $methodMetrics.count
        ck_wmc_sum = Format-Decimal -Value $methodMetrics.sum
        ck_wmc_mean = Format-Decimal -Value $methodMetrics.mean
        ck_wmc_median = Format-Decimal -Value $methodMetrics.median
        ck_wmc_max = Format-Decimal -Value $methodMetrics.max
        ck_max_nested_blocks = $classMetrics.max_nested_blocks
        ck_cbo_mean = Format-Decimal -Value $classMetrics.cbo_mean
        ck_rfc_mean = Format-Decimal -Value $classMetrics.rfc_mean
        ck_lcom_mean = Format-Decimal -Value $classMetrics.lcom_mean
        cpd_min_tokens = $MinimumTokens
        cpd_duplication_groups = $cpdMetrics.groups
        cpd_occurrences = $cpdMetrics.occurrences
        cpd_duplicated_lines_unique = $cpdMetrics.unique_lines
        cpd_duplication_pct_physical = Format-Decimal -Value $duplicationPct
        bench_time_us = if ($null -ne $benchMetrics.bench_time_us) { Format-Decimal -Value $benchMetrics.bench_time_us } else { $null }
        bench_allocated_bytes = if ($null -ne $benchMetrics.bench_allocated_bytes) { Format-Decimal -Value $benchMetrics.bench_allocated_bytes } else { $null }
        bench_throughput_ops = if ($null -ne $benchMetrics.bench_throughput_ops) { Format-Decimal -Value $benchMetrics.bench_throughput_ops } else { $null }
        pmd_performance_violations = $pmdRuleMetrics.pmd_performance_violations
        pmd_bestpractices_violations = $pmdRuleMetrics.pmd_bestpractices_violations
        pmd_total_violations = $pmdRuleMetrics.pmd_total_violations
        status = 'OK'
        artifacts_dir = $rawRelativePath
    }

    $existingRows = @()
    if (Test-Path -LiteralPath $outputCsvFullPath) {
        $existingRows = @(Import-Csv -LiteralPath $outputCsvFullPath)
        if ($existingRows.Count -gt 0 -and -not ($existingRows[0].PSObject.Properties.Name -contains 'schema_version')) {
            throw "O CSV existente não usa o schema $SchemaVersion. Escolha outro OutputCsv ou faça a migração explicitamente."
        }
    }

    $sameTrialRows = @($existingRows | Where-Object {
        $_.participante -eq $Participant -and
        $_.kata -eq $Kata -and
        $_.tratamento -eq $Treatment
    })
    if ($sameTrialRows.Count -gt 0 -and -not $ReplaceExisting.IsPresent) {
        throw 'Já existe uma coleta para participante, kata e tratamento. Use -ReplaceExisting somente para substituir uma reexecução do mesmo trial.'
    }
    if ($ReplaceExisting.IsPresent) {
        $existingRows = @($existingRows | Where-Object {
            -not (
                $_.participante -eq $Participant -and
                $_.kata -eq $Kata -and
                $_.tratamento -eq $Treatment
            )
        })
    }

    $allRows = @($existingRows) + @($record)
    $temporaryCsv = Join-Path $outputDirectory ('.static-metrics-' + [System.Guid]::NewGuid().ToString() + '.tmp')
    $allRows |
        Export-Csv -LiteralPath $temporaryCsv -NoTypeInformation -Encoding utf8
    Move-Item -LiteralPath $temporaryCsv -Destination $outputCsvFullPath -Force

    Write-Host "Métricas registradas em $outputCsvFullPath"
    Write-Host "Relatórios brutos: $rawRunDirectory"
    return $record
}
catch {
    [pscustomobject]@{ status = 'FAILED'; error = $_.Exception.Message } |
        ConvertTo-Json | Set-Content -LiteralPath (Join-Path $rawRunDirectory 'failure.json') -Encoding utf8
    throw
}
