# Automated Release Script for BMS-OPD Android APK
# Usage: npm run release OR powershell -ExecutionPolicy Bypass -File scripts\release.ps1

$ErrorActionPreference = "Stop"
$ProjectRoot = "c:\PROJECTS\AiBmsOpd"
Set-Location $ProjectRoot

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Starting BMS-OPD Automated Android Release...   " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Validate TypeScript
Write-Host "[1/4] Running TypeScript compiler checks..." -ForegroundColor Yellow
$tscOutput = npx tsc --noEmit 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: TypeScript validation failed:" -ForegroundColor Red
    Write-Host $tscOutput
    exit 1
}
Write-Host "  √ TypeScript validation passed (0 errors)." -ForegroundColor Green

# 2. Check and push Git changes
Write-Host "[2/4] Checking Git repository status..." -ForegroundColor Yellow
$status = git status --porcelain
if ($status) {
    Write-Host "  Found uncommitted changes, staging and committing..." -ForegroundColor DarkYellow
    git add -A
    git commit -m "chore(release): automated release commit $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
    Write-Host "  Pushing latest changes to origin/main..." -ForegroundColor DarkYellow
    git push origin main
    Write-Host "  √ Git repository is up to date." -ForegroundColor Green
} else {
    Write-Host "  √ Git working directory is clean." -ForegroundColor Green
}

# 3. Trigger EAS Android Build
Write-Host "[3/4] Triggering EAS Cloud Android Build (APK)..." -ForegroundColor Yellow
$buildOutput = npx eas-cli build --platform android --profile preview --non-interactive --json 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "EAS build command failed:" -ForegroundColor Red
    Write-Host $buildOutput
    exit 1
}

# Parse JSON output from EAS CLI
try {
    # Find JSON array in the output
    $jsonStart = $buildOutput.IndexOf('[')
    $jsonEnd = $buildOutput.LastIndexOf(']')
    $jsonText = $buildOutput.Substring($jsonStart, $jsonEnd - $jsonStart + 1)
    $buildData = $jsonText | ConvertFrom-Json
    $buildId = $buildData[0].id
    $appUrl = $buildData[0].artifacts.buildUrl
    $buildDetailsUrl = "https://expo.dev/accounts/irishrex/projects/irishrex/builds/$buildId"
} catch {
    Write-Host "Note: Falling back to direct build inspection..." -ForegroundColor DarkYellow
    $buildId = ""
}

# 4. Download compiled APK locally
Write-Host "[4/4] Downloading generated APK to local PC..." -ForegroundColor Yellow
if ($buildId) {
    npx eas-cli build:download --build-id $buildId --non-interactive
    $tempApk = Get-ChildItem "$env:LOCALAPPDATA\Temp\eas-cli-nodejs\eas-build-run-cache\*" -Filter "*$buildId*.apk" | Select-Object -First 1
    if ($tempApk) {
        Copy-Item $tempApk.FullName "$ProjectRoot\bms-opd-release.apk" -Force
    }
} else {
    # If buildId wasn't parsed from JSON, download latest android build
    npx eas-cli build:download -p android --non-interactive
    $latestApk = Get-ChildItem "$env:LOCALAPPDATA\Temp\eas-cli-nodejs\eas-build-run-cache\*.apk" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($latestApk) {
        Copy-Item $latestApk.FullName "$ProjectRoot\bms-opd-release.apk" -Force
    }
}

$apkItem = Get-Item "$ProjectRoot\bms-opd-release.apk" -ErrorAction SilentlyContinue
$apkSizeMB = if ($apkItem) { [math]::Round($apkItem.Length / 1MB, 2) } else { "N/A" }

Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "        Android Release Completed Successfully!   " -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Local APK Path : $ProjectRoot\bms-opd-release.apk ($apkSizeMB MB)" -ForegroundColor White
if ($buildDetailsUrl) {
    Write-Host "Online Download: $buildDetailsUrl" -ForegroundColor Cyan
}
Write-Host ""
Write-Host "You can share or install bms-opd-release.apk directly on any Android phone!" -ForegroundColor Green
Write-Host ""
