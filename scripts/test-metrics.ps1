#requires -Version 5.1
# Regression checks for metric semantics and failure handling.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$collector = Join-Path $PSScriptRoot 'collect-static-metrics.ps1'
$testRoot = Join-Path $root ('data/metrics/raw/fixture_unit_' + [guid]::NewGuid())
New-Item -ItemType Directory -Path $testRoot | Out-Null
$utf8 = New-Object System.Text.UTF8Encoding($false)
$tokens = $null
$errors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($collector, [ref]$tokens, [ref]$errors)
if ($errors.Count) { throw 'Collector has syntax errors' }
foreach ($function in $ast.FindAll({param($n) $n -is [System.Management.Automation.Language.FunctionDefinitionAst]}, $false)) {
    . ([scriptblock]::Create($function.Extent.Text))
}

# Odd-sized median, including a case affected by PowerShell integer rounding.
$methods = Join-Path $testRoot 'method.csv'
[IO.File]::WriteAllText($methods, "constructor,wmc`nfalse,1`nfalse,2`nfalse,9`ntrue,20`n", $utf8)
$metrics = Get-CkMethodMetrics -MethodCsv $methods -ConstructorsIncluded $false
if ($metrics.median -ne 2 -or $metrics.count -ne 3) { throw 'Median or constructor exclusion failed' }
if ($null -ne (Format-Decimal -Value $null)) { throw 'Missing metric became zero' }

# Union must count overlapping intervals only once (1..5 and 3..8 = 8).
$xmlPath = Join-Path $testRoot 'cpd.xml'
[IO.File]::WriteAllText($xmlPath, '<pmd-cpd xmlns="https://pmd-code.org/schema/cpd-report"><duplication><file path="A.java" line="1" endline="5"/><file path="A.java" line="3" endline="8"/></duplication></pmd-cpd>', $utf8)
if ((Get-CpdMetrics -CpdXml $xmlPath).unique_lines -ne 8) { throw 'Overlap counted twice' }
[IO.File]::WriteAllText($xmlPath, '<pmd-cpd><error msg="invalid source"/></pmd-cpd>', $utf8)
$rejected = $false
try { Get-CpdMetrics -CpdXml $xmlPath | Out-Null } catch { $rejected = $true }
if (-not $rejected) { throw 'CPD error was accepted' }

$source = Join-Path $testRoot 'input'
New-Item -ItemType Directory -Path $source | Out-Null
$javaFile = Join-Path $source 'OnlyConstructor.java'
[IO.File]::WriteAllText($javaFile, 'public class OnlyConstructor { public OnlyConstructor() {} }', $utf8)
$csv = Join-Path $testRoot 'results.csv'
$params = @{SourceDir=$source; Participant='fixture'; Kata='unit'; Treatment='SEM_IA'; OutputCsv=$csv}
$record = & $collector @params
if ($record.ck_method_count -ne 0 -or $record.ck_wmc_mean -or [double]$record.cpd_duplication_pct_physical -ne 0) {
    throw 'Constructor-only source did not yield null complexity and zero duplication'
}
$originalHash = (Get-FileHash -LiteralPath $csv).Hash
$rejected = $false
try { & $collector @params | Out-Null } catch { $rejected = $true }
if (-not $rejected -or (Get-FileHash -LiteralPath $csv).Hash -ne $originalHash) { throw 'Duplicate trial modified CSV' }
[IO.File]::WriteAllText($javaFile, 'public class OnlyConstructor { invalid !!! }', $utf8)
$params.Kata = 'invalid'
$rejected = $false
try { & $collector @params | Out-Null } catch { $rejected = $true }
if (-not $rejected -or (Get-FileHash -LiteralPath $csv).Hash -ne $originalHash) { throw 'Invalid code modified CSV' }
Write-Host 'PASS: median, null values, overlapping clones, CPD errors, zero duplication, duplicate trial, invalid code.'
