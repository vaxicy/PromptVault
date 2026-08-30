# PromptVault Chrome Extension Packager
#
# Usage:
#   .\scripts\package.ps1                 # uses version from manifest.json
#   .\scripts\package.ps1 -Version 1.2.1  # overrides the version
#
# Output: D:\迅雷下载\vibe coding\PromptVault-v<version>.zip
# (Project rule: build artifacts must live OUTSIDE the project folder,
#  next to the other project folders.)

param(
    [string]$Version,
    [string]$OutDir
)

$ErrorActionPreference = 'Stop'

# Resolve paths
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ManifestPath = Join-Path $ProjectRoot 'manifest.json'

if (-not (Test-Path $ManifestPath)) {
    Write-Error "manifest.json not found at $ManifestPath"
    exit 1
}

# Read version from manifest unless overridden (force UTF-8, the file has CJK text)
$manifestRaw = [System.IO.File]::ReadAllText($ManifestPath, [System.Text.Encoding]::UTF8)
$manifest = $manifestRaw | ConvertFrom-Json
if (-not $Version) {
    $Version = $manifest.version
}
Write-Host "Packaging PromptVault v$Version" -ForegroundColor Cyan

# Output goes OUTSIDE the project, into the user's project-collection root:
#   D:\迅雷下载\vibe coding\
# The project itself lives at ...\vibe coding\Chrome Extensions\PromptVault,
# so that is two levels up. Fall back to the immediate parent if it is missing.
if (-not $OutDir) {
    $OutDir = Split-Path -Parent (Split-Path -Parent $ProjectRoot)
    if (-not (Test-Path $OutDir)) {
        $OutDir = Split-Path -Parent $ProjectRoot
    }
}
$OutFile = Join-Path $OutDir "PromptVault-v$Version.zip"

if (Test-Path $OutFile) {
    Remove-Item $OutFile -Force
    Write-Host "Removed existing package: $OutFile" -ForegroundColor Yellow
}

# Files / folders to include in the extension package
$Include = @(
    'manifest.json',
    'background.js',
    'popup.html',
    'popup.js',
    'styles.css',
    'storage.js',
    'i18n.js',
    'content.js',
    'universal-insert.js',
    'command-palette.js',
    'welcome.html',
    'welcome.js',
    'welcome.css',
    'assets',
    'icons',
    '_locales'
)

# Build a staging folder with only the files that ship
$Stage = Join-Path $env:TEMP "PromptVault-Package-$([guid]::NewGuid().ToString('N').Substring(0,8))"
New-Item -ItemType Directory -Path $Stage | Out-Null

try {
    foreach ($item in $Include) {
        $src = Join-Path $ProjectRoot $item
        if (-not (Test-Path $src)) {
            Write-Warning "Skipping missing item: $item"
            continue
        }
        $dst = Join-Path $Stage $item
        if (Test-Path $src -PathType Container) {
            Copy-Item $src -Destination $dst -Recurse
        } else {
            Copy-Item $src -Destination $dst
        }
    }

    # Sanity check: every file referenced in the manifest must exist
    Write-Host "Verifying manifest references..." -ForegroundColor Gray
    $missing = @()
    if ($manifest.background.service_worker) { $missing += $manifest.background.service_worker }
    if ($manifest.action.default_popup) { $missing += $manifest.action.default_popup }
    foreach ($f in $manifest.content_scripts.js) { $missing += $f }
    foreach ($f in $manifest.web_accessible_resources.resources) { $missing += $f }
    foreach ($icon in $manifest.icons.PSObject.Properties) { $missing += $icon.Value }

    $missing | Select-Object -Unique | ForEach-Object {
        $p = Join-Path $Stage $_
        if (-not (Test-Path $p)) {
            Write-Error "Manifest references missing file: $_"
            exit 1
        }
    }

    Compress-Archive -Path (Join-Path $Stage '*') -DestinationPath $OutFile -CompressionLevel Optimal

    # Verify the archive really landed on disk before reporting success
    if (-not [System.IO.File]::Exists($OutFile)) {
        Write-Error "Archive was not created at: $OutFile"
        exit 1
    }

    $size = (Get-Item $OutFile).Length / 1KB
    Write-Host ''
    Write-Host 'Package created successfully' -ForegroundColor Green
    Write-Host "  Path: $OutFile" -ForegroundColor White
    Write-Host ("  Size: {0:N1} KB" -f $size) -ForegroundColor White
    Write-Host "  Contents:" -ForegroundColor White
    Get-ChildItem $Stage -Recurse -File | ForEach-Object {
        Write-Host ("    " + $_.FullName.Substring($Stage.Length + 1)) -ForegroundColor DarkGray
    }
} finally {
    Remove-Item $Stage -Recurse -Force -ErrorAction SilentlyContinue
}
