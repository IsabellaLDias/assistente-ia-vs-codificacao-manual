#requires -Version 5.1
param([Parameter(Mandatory)][string]$JobDirectory)
$ErrorActionPreference = 'Stop'
$job = Get-Content -LiteralPath (Join-Path $JobDirectory 'request.json') -Raw -Encoding UTF8 | ConvertFrom-Json
try {
    $params = @{
        SourceDir = Join-Path $JobDirectory 'source'
        Participant = $job.participant
        Kata = $job.kata
        Treatment = $job.treatment
        OutputCsv = Join-Path $JobDirectory 'metrics.csv'
    }
    $record = & (Join-Path $PSScriptRoot '../scripts/collect-static-metrics.ps1') @params
    $root = Split-Path -Parent $PSScriptRoot
    $raw = Join-Path $root $record.artifacts_dir
    $methods = @(Import-Csv -LiteralPath (Join-Path $raw 'ck/method.csv') -Encoding UTF8 | Where-Object { $_.constructor -ne 'true' } | ForEach-Object {
        [pscustomobject]@{ classe=$_.class; metodo=$_.method; complexidade=[int]$_.wmc; loc=[int]$_.loc }
    })
    [pscustomobject]@{ metrics=$record; methods=$methods } | ConvertTo-Json -Depth 8 |
        Set-Content -LiteralPath (Join-Path $JobDirectory 'result.json') -Encoding UTF8
}
catch {
    [pscustomobject]@{ error=$_.Exception.Message } | ConvertTo-Json |
        Set-Content -LiteralPath (Join-Path $JobDirectory 'error.json') -Encoding UTF8
    exit 1
}
