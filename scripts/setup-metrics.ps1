#requires -Version 5.1
<#
.SYNOPSIS
Baixa e prepara uma instalação portátil de CK e PMD/CPD para o LAB02.

.DESCRIPTION
Não instala nada globalmente no Windows. As ferramentas ficam em tools/,
que é ignorada pelo Git. As versões ficam fixadas para que todos os trials
sejam analisados com a mesma configuração.
#>
[CmdletBinding()]
param(
    [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$CkVersion = '0.7.0'
$PmdVersion = '7.26.0'
$MavenVersion = '3.9.11'

function Ensure-Directory {
    param(
        [Parameter(Mandatory)]
        [string]$Path
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
    }
}

function Invoke-Download {
    param(
        [Parameter(Mandatory)]
        [string]$Uri,

        [Parameter(Mandatory)]
        [string]$Destination
    )

    Write-Host "Baixando $Uri"
    Invoke-WebRequest -Uri $Uri -OutFile $Destination -UseBasicParsing
}

function Get-JavaMajorVersion {
    $ErrorActionPreference = 'Continue' # Windows PowerShell treats Java stderr as errors.
    $javaOutput = & java -version 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw 'Não foi possível executar java. Instale um JDK 17 ou superior e tente novamente.'
    }

    $javaText = ($javaOutput | Out-String)
    $match = [regex]::Match($javaText, '"(?:1\.)?(?<major>\d+)')
    if (-not $match.Success) {
        throw "Não foi possível identificar a versão do Java: $javaText"
    }

    return [int]$match.Groups['major'].Value
}

function Get-JavaHome {
    $javac = Get-Command javac -ErrorAction SilentlyContinue
    if ($null -eq $javac) {
        throw 'Não foi possível localizar javac. Instale um JDK 17 ou superior, não apenas um JRE.'
    }

    $ErrorActionPreference = 'Continue'
    $settings = (& java -XshowSettings:properties -version 2>&1 | Out-String)
    $ErrorActionPreference = 'Stop'
    $homeMatch = [regex]::Match($settings, '(?m)^\s*java\.home\s*=\s*(.+)$')
    if (-not $homeMatch.Success) { throw 'Java não informou java.home.' }
    $javaHome = $homeMatch.Groups[1].Value.Trim()
    $javadocPath = Join-Path $javaHome 'bin\javadoc.exe'
    if (-not (Test-Path -LiteralPath $javadocPath)) {
        throw "O JDK encontrado em $javaHome não contém javadoc.exe."
    }

    return $javaHome
}

function Get-FirstFile {
    param(
        [Parameter(Mandatory)]
        [string]$Root,

        [Parameter(Mandatory)]
        [string]$Filter
    )

    $candidate = Get-ChildItem -LiteralPath $Root -Recurse -File -Filter $Filter |
        Select-Object -First 1

    if ($null -eq $candidate) {
        return $null
    }

    return $candidate.FullName
}

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$toolsRoot = Join-Path $repositoryRoot 'tools'
$downloadsRoot = Join-Path $toolsRoot 'downloads'
$pmdRoot = Join-Path $toolsRoot 'pmd'
$ckRoot = Join-Path $toolsRoot 'ck'
$mavenRoot = Join-Path $toolsRoot 'maven'

Ensure-Directory -Path $toolsRoot
Ensure-Directory -Path $downloadsRoot
Ensure-Directory -Path $pmdRoot
Ensure-Directory -Path $ckRoot
Ensure-Directory -Path $mavenRoot

$javaMajor = Get-JavaMajorVersion
if ($javaMajor -lt 17) {
    throw "Foi encontrado Java $javaMajor. O CK requer JDK 17 ou superior."
}
$javaHome = Get-JavaHome
$env:JAVA_HOME = $javaHome

$pmdCommand = Get-FirstFile -Root $pmdRoot -Filter 'pmd.bat'
if ($Force -or $null -eq $pmdCommand) {
    $pmdArchive = Join-Path $downloadsRoot "pmd-dist-$PmdVersion-bin.zip"
    if ($Force -or -not (Test-Path -LiteralPath $pmdArchive)) {
        Invoke-Download -Uri "https://github.com/pmd/pmd/releases/download/pmd_releases%2F$PmdVersion/pmd-dist-$PmdVersion-bin.zip" -Destination $pmdArchive
    }

    $versionedPmdRoot = Join-Path $pmdRoot "pmd-bin-$PmdVersion"
    if ($Force -or -not (Test-Path -LiteralPath $versionedPmdRoot)) {
        Write-Host "Extraindo PMD $PmdVersion"
        Expand-Archive -LiteralPath $pmdArchive -DestinationPath $pmdRoot -Force
    }

    $pmdCommand = Get-FirstFile -Root $pmdRoot -Filter 'pmd.bat'
}

if ($null -eq $pmdCommand) {
    throw 'O bootstrap do PMD terminou sem encontrar pmd.bat.'
}

$ckJar = Join-Path $ckRoot "ck-$CkVersion-jar-with-dependencies.jar"
if ($Force -or -not (Test-Path -LiteralPath $ckJar)) {
    $mavenHome = Join-Path $mavenRoot "apache-maven-$MavenVersion"
    $mavenCommand = Join-Path $mavenHome 'bin\mvn.cmd'

    if ($Force -or -not (Test-Path -LiteralPath $mavenCommand)) {
        $mavenArchive = Join-Path $downloadsRoot "apache-maven-$MavenVersion-bin.zip"
        if ($Force -or -not (Test-Path -LiteralPath $mavenArchive)) {
            Invoke-Download -Uri "https://archive.apache.org/dist/maven/maven-3/$MavenVersion/binaries/apache-maven-$MavenVersion-bin.zip" -Destination $mavenArchive
        }

        Write-Host "Extraindo Maven $MavenVersion"
        Expand-Archive -LiteralPath $mavenArchive -DestinationPath $mavenRoot -Force
    }

    if (-not (Test-Path -LiteralPath $mavenCommand)) {
        throw 'O bootstrap do Maven terminou sem encontrar mvn.cmd.'
    }

    $ckSourceRoot = Join-Path $ckRoot 'source'
    $ckProjectRoot = Join-Path $ckSourceRoot "ck-ck-$CkVersion"
    if ($Force -or -not (Test-Path -LiteralPath (Join-Path $ckProjectRoot 'pom.xml'))) {
        $ckArchive = Join-Path $downloadsRoot "ck-$CkVersion-source.zip"
        if ($Force -or -not (Test-Path -LiteralPath $ckArchive)) {
            Invoke-Download -Uri "https://github.com/mauricioaniche/ck/archive/refs/tags/ck-$CkVersion.zip" -Destination $ckArchive
        }

        Ensure-Directory -Path $ckSourceRoot
        Write-Host "Extraindo código-fonte do CK $CkVersion"
        Expand-Archive -LiteralPath $ckArchive -DestinationPath $ckSourceRoot -Force
    }

    if (-not (Test-Path -LiteralPath (Join-Path $ckProjectRoot 'pom.xml'))) {
        $pom = Get-FirstFile -Root $ckSourceRoot -Filter 'pom.xml'
        if ($null -eq $pom) {
            throw 'Não foi possível localizar o pom.xml do CK.'
        }
        $ckProjectRoot = Split-Path -Parent $pom
    }

    Write-Host "Compilando CK $CkVersion (primeira execução pode levar alguns minutos)"
    Push-Location $ckProjectRoot
    try {
        & $mavenCommand '-q' '-Dmaven.test.skip=true' '-Dmaven.javadoc.skip=true' 'package'
        if ($LASTEXITCODE -ne 0) {
            throw "A compilação do CK falhou (código $LASTEXITCODE)."
        }
    }
    finally {
        Pop-Location
    }

    $builtJar = Get-FirstFile -Root (Join-Path $ckProjectRoot 'target') -Filter '*-jar-with-dependencies.jar'
    if ($null -eq $builtJar) {
        throw 'A compilação do CK terminou sem produzir o JAR com dependências.'
    }

    Copy-Item -LiteralPath $builtJar -Destination $ckJar -Force
}

$toolMetadata = [ordered]@{
    ck_version = $CkVersion
    pmd_version = $PmdVersion
    maven_version = $MavenVersion
    java_major = $javaMajor
    java_home = $javaHome
    setup_utc = (Get-Date).ToUniversalTime().ToString('o')
    ck_jar = $ckJar
    pmd_command = $pmdCommand
}
$toolMetadata |
    ConvertTo-Json |
    Set-Content -LiteralPath (Join-Path $toolsRoot 'metrics-tools.json') -Encoding utf8

Write-Host ''
Write-Host 'Ambiente de métricas pronto.'
[pscustomobject]$toolMetadata
