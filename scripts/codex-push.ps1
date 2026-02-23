param(
  [Parameter(Mandatory=$false)]
  [string]$RemoteUrl = $env:GIT_REMOTE_URL,

  [Parameter(Mandatory=$false)]
  [string]$Username = $env:GIT_USERNAME,

  [Parameter(Mandatory=$false)]
  [string]$Token = $env:GIT_TOKEN
)

$ErrorActionPreference = 'Stop'

function Require-Command {
  param([string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Error: required command '$Name' is not installed."
  }
}

Require-Command git

$null = git rev-parse --is-inside-work-tree 2>$null
if ($LASTEXITCODE -ne 0) {
  throw "Error: current directory is not a git repository. Open PowerShell in your cloned repository folder."
}

$repoRoot = (git rev-parse --show-toplevel).Trim()
Set-Location $repoRoot

if ([string]::IsNullOrWhiteSpace($RemoteUrl)) {
  throw "Error: GIT_REMOTE_URL is required. Example: `$env:GIT_REMOTE_URL='https://github.com/owner/repo.git'; .\scripts\codex-push.ps1"
}

$branch = (git rev-parse --abbrev-ref HEAD).Trim()

$null = git remote get-url origin 2>$null
if ($LASTEXITCODE -eq 0) {
  git remote set-url origin $RemoteUrl
} else {
  git remote add origin $RemoteUrl
}

if (-not [string]::IsNullOrWhiteSpace($Token)) {
  if ([string]::IsNullOrWhiteSpace($Username)) {
    throw "Error: GIT_USERNAME is required when GIT_TOKEN is set."
  }

  $uri = [System.Uri]$RemoteUrl
  if ($uri.Scheme -ne 'http' -and $uri.Scheme -ne 'https') {
    throw 'Error: token auth mode requires an HTTP/HTTPS remote URL.'
  }

  $builder = New-Object System.UriBuilder($uri)
  $builder.UserName = [System.Uri]::EscapeDataString($Username)
  $builder.Password = [System.Uri]::EscapeDataString($Token)
  $authUrl = $builder.Uri.AbsoluteUri

  git push $authUrl "HEAD:$branch" --set-upstream
} else {
  git push --set-upstream origin $branch
}

Write-Host "Pushed branch '$branch' successfully."
