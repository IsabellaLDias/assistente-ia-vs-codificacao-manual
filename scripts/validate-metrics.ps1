#requires -Version 5.1
<#
.SYNOPSIS
Valida localmente o ambiente e o coletor de métricas com um fixture controlado.
#>
[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$fixtureSource = Join-Path $repositoryRoot 'examples\metrics-fixture\src\main\java'
$validationCsv = Join-Path $repositoryRoot 'data\metrics\validation.csv'

& (Join-Path $PSScriptRoot 'setup-metrics.ps1')
& (Join-Path $PSScriptRoot 'collect-static-metrics.ps1') -SourceDir $fixtureSource -Participant 'fixture' -Kata 'metrics-fixture' -Treatment 'COM_IA' -MinimumTokens 50 -OutputCsv $validationCsv -ReplaceExisting

$row = @(Import-Csv -LiteralPath $validationCsv | Where-Object {
    $_.participante -eq 'fixture' -and
    $_.kata -eq 'metrics-fixture' -and
    $_.tratamento -eq 'COM_IA'
}) | Select-Object -Last 1

if ($null -eq $row) {
    throw 'A validação não encontrou a linha do fixture no CSV.'
}
if ($row.status -ne 'OK') {
    throw "A validação terminou com status $($row.status)."
}
if ([int]$row.ck_method_count -ne 3 -or [double]$row.ck_wmc_sum -ne 11 -or [double]$row.ck_wmc_median -ne 5) {
    throw 'O CK não identificou os métodos esperados no fixture.'
}
if ([int]$row.cpd_duplication_groups -lt 1) {
    throw 'O CPD não identificou a duplicação intencional do fixture.'
}
if ([int]$row.cpd_duplicated_lines_unique -lt 1) {
    throw 'O CPD não calculou linhas duplicadas no fixture.'
}
if ([int]$row.loc_physical -ne 49 -or [double]$row.cpd_duplication_pct_physical -gt 100) {
    throw 'LOC ou percentual de duplicação inconsistente.'
}

Write-Host 'Validação concluída com sucesso.'
$row
