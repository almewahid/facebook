$ErrorActionPreference = "Stop"

$sourceRoot = $PSScriptRoot
$targetRoot = "D:\work\2 unziptoastudio\facebook-auto-poster"

$resolvedSourceRoot = (Resolve-Path -LiteralPath $sourceRoot).Path
$resolvedTargetRoot = (Resolve-Path -LiteralPath $targetRoot).Path

if ($resolvedSourceRoot -eq $resolvedTargetRoot) {
    throw "This script is running from the target project. Run copy-fixed-files-to-original.bat from the Codex fixed project folder instead: C:\Users\ALBORAQ\Documents\Codex\2026-05-02\d-work-2-unziptoastudio-facebook-auto"
}

$files = @(
    "copy-fixed-files-to-original.bat",
    "copy-fixed-files-to-original.ps1",
    "backend\app\main.py",
    "backend\app\models.py",
    "backend\app\schemas.py",
    "backend\app\api\routers\admin.py",
    "backend\app\api\routers\billing.py",
    "backend\app\api\routers\bot.py",
    "backend\alembic\versions\9c2d3e4f5a6b_service_pricing_subscriptions.py",
    "docs\supabase-schema.sql",
    "frontend\app\page.jsx",
    "frontend\app\Components\SettingsDialog.jsx"
)

$failed = @()

foreach ($file in $files) {
    $source = Join-Path $sourceRoot $file
    $target = Join-Path $targetRoot $file

    if (!(Test-Path -LiteralPath $source)) {
        throw "Missing source file: $source"
    }

    $targetDir = Split-Path -Parent $target
    if (!(Test-Path -LiteralPath $targetDir)) {
        New-Item -ItemType Directory -Path $targetDir | Out-Null
    }

    if (Test-Path -LiteralPath $target) {
        $targetItem = Get-Item -LiteralPath $target -Force
        if ($targetItem.PSIsContainer -eq $false) {
            try {
                $targetItem.IsReadOnly = $false
            } catch {
                Write-Host "Could not clear read-only flag for $file"
            }
        }
    }

    try {
        Copy-Item -LiteralPath $source -Destination $target -Force -ErrorAction Stop
        Write-Host "Copied $file"
    } catch {
        $failed += "$file -> $($_.Exception.Message)"
        Write-Host "FAILED $file"
    }
}

if ($failed.Count -gt 0) {
    Write-Host ""
    Write-Host "Some files were not copied:"
    $failed | ForEach-Object { Write-Host $_ }
    exit 1
}

Write-Host "Done. Fixed files copied to original project."
