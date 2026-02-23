param(
  [int]$Port = 4173
)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $repoRoot

Write-Host "Launching local server for futon mini-game..."
Write-Host "Open this URL in your browser:"
Write-Host "  http://127.0.0.1:$Port/index.html"
Write-Host ""
Write-Host "Press Ctrl+C to stop."

python -m http.server $Port
