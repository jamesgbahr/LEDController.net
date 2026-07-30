param(
    [ValidateSet('private','public')]
    [string]$Visibility = 'private',
    [string]$Repository = 'LEDController.net'
)

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

function Require-Command([string]$Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "$Name is not installed or is not available in PATH."
    }
}

Require-Command git
Require-Command gh
Require-Command node
Require-Command npm

gh auth status | Out-Host
npm test

if (-not (Test-Path '.git')) {
    git init -b main
}

git add .
if (-not (git diff --cached --quiet)) {
    git commit -m 'Initial release: LEDController.net v0.4.36'
}

$origin = git remote get-url origin 2>$null
if (-not $origin) {
    $description = 'Browser-based LED matrix and WLED/Art-Net visual engine with 135 effects, layered A/B mixing, audio reactivity, advanced pixel mapping, preset memory, and live DDP/Art-Net output.'
    if ($Visibility -eq 'public') {
        gh repo create $Repository --public --source . --remote origin --push --description $description
    } else {
        gh repo create $Repository --private --source . --remote origin --push --description $description
    }
} else {
    git push -u origin main
}

if (-not (git tag --list 'v0.4.36')) {
    git tag -a v0.4.36 -m 'LEDController.net v0.4.36'
    git push origin v0.4.36
}

Write-Host ''
Write-Host 'Source and v0.4.36 tag pushed successfully.' -ForegroundColor Green
Write-Host 'Create the downloadable GitHub Release from RELEASE-NOTES-v0.4.36.md after adding the release ZIP asset.'
