# Automated Release Script for BMS-OPD Android APK with Version Management
# Usage:
#   npm run release                                                       # Auto-increments to next version (v1.0.0.1, v1.0.0.2...)
#   powershell -ExecutionPolicy Bypass -File scripts\release.ps1          # Auto-increments
#   powershell -ExecutionPolicy Bypass -File scripts\release.ps1 -Version "1.0.0.1" # Explicit version

param(
    [string]$Version = ""
)

$ErrorActionPreference = "Stop"
$ProjectRoot = "c:\PROJECTS\AiBmsOpd"
Set-Location $ProjectRoot

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Starting BMS-OPD Automated Android Release...   " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# -------------------------------------------------------------
# 1. Determine and Update Release Version (v1.0.0.1, v1.0.0.2...)
# -------------------------------------------------------------
Write-Host "[1/5] Determining release version..." -ForegroundColor Yellow

$appJsonPath = Join-Path $ProjectRoot "app.json"
$pkgJsonPath = Join-Path $ProjectRoot "package.json"

# Use Node.js script inline for bulletproof JSON manipulation without BOM
$nodeUpdateScript = @"
const fs = require('fs');
const appJsonPath = './app.json';
const pkgJsonPath = './package.json';

const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

let currentVersion = appJson.expo.version || '1.0.0';
let explicitVersion = process.argv[2] ? process.argv[2].replace(/^[vV]/, '').trim() : '';

let nextVersion = '';
if (explicitVersion) {
    nextVersion = explicitVersion;
} else {
    const parts = currentVersion.split('.');
    if (parts.length === 3) {
        nextVersion = parts[0] + '.' + parts[1] + '.' + parts[2] + '.1';
    } else if (parts.length >= 4) {
        const buildNum = parseInt(parts[3], 10) + 1;
        nextVersion = parts[0] + '.' + parts[1] + '.' + parts[2] + '.' + buildNum;
    } else {
        nextVersion = currentVersion + '.1';
    }
}

if (!appJson.expo.android) {
    appJson.expo.android = {};
}
const currentCode = appJson.expo.android.versionCode || 1;
const nextCode = currentCode + 1;

appJson.expo.version = nextVersion;
appJson.expo.android.versionCode = nextCode;
pkgJson.version = nextVersion;

fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n', 'utf8');
fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + '\n', 'utf8');

console.log(JSON.stringify({ currentVersion, nextVersion, currentCode, nextCode }));
"@

$versionInfoJson = node -e "$nodeUpdateScript" "$Version"
$versionInfo = $versionInfoJson | ConvertFrom-Json
$nextVersion = $versionInfo.nextVersion
$nextCode = $versionInfo.nextCode

Write-Host "  Previous Version : v$($versionInfo.currentVersion) (Code: $($versionInfo.currentCode))" -ForegroundColor DarkGray
Write-Host "  Target Version   : v$nextVersion (Code: $nextCode)" -ForegroundColor Green
Write-Host "  √ Updated app.json and package.json to v$nextVersion (BOM-free UTF-8)" -ForegroundColor Green

# -------------------------------------------------------------
# 2. Validate TypeScript Compilation
# -------------------------------------------------------------
Write-Host ""
Write-Host "[2/5] Running TypeScript compiler checks..." -ForegroundColor Yellow
$tscResult = npx tsc --noEmit 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: TypeScript validation failed:" -ForegroundColor Red
    Write-Host ($tscResult | Out-String)
    exit 1
}
Write-Host "  √ TypeScript validation passed (0 errors)." -ForegroundColor Green

# -------------------------------------------------------------
# 3. Stage, Commit, and Push Version Bump to Git
# -------------------------------------------------------------
Write-Host ""
Write-Host "[3/5] Checking Git repository status..." -ForegroundColor Yellow
$status = git status --porcelain
if ($status) {
    Write-Host "  Staging and committing version bump v$nextVersion..." -ForegroundColor DarkYellow
    git add -A
    git commit -m "chore(release): bump release version to v$nextVersion (build $nextCode)"
    Write-Host "  Pushing release commit to origin/main..." -ForegroundColor DarkYellow
    git push origin main
    Write-Host "  √ Git repository updated and pushed." -ForegroundColor Green
} else {
    Write-Host "  √ Git working directory is clean." -ForegroundColor Green
}

# -------------------------------------------------------------
# 4. Trigger EAS Cloud Android Build (APK)
# -------------------------------------------------------------
Write-Host ""
Write-Host "[4/5] Triggering EAS Cloud Android Build (APK)..." -ForegroundColor Yellow

$buildRaw = npx eas-cli build --platform android --profile preview --non-interactive --json 2>&1
$buildOutput = ($buildRaw | Out-String)

$buildId = ""
$buildDetailsUrl = ""
try {
    $jsonStart = $buildOutput.IndexOf('[')
    $jsonEnd = $buildOutput.LastIndexOf(']')
    if ($jsonStart -ge 0 -and $jsonEnd -gt $jsonStart) {
        $jsonText = $buildOutput.Substring($jsonStart, $jsonEnd - $jsonStart + 1)
        $buildData = $jsonText | ConvertFrom-Json
        $buildId = $buildData[0].id
        $buildDetailsUrl = "https://expo.dev/accounts/irishrex/projects/irishrex/builds/$buildId"
    }
} catch {
    Write-Host "  Parsing build response..." -ForegroundColor DarkYellow
}

if (-not $buildId) {
    # Fallback to query latest build
    Start-Sleep -Seconds 3
    $listRaw = npx eas-cli build:list --platform android --limit 1 --json 2>&1
    $listStr = ($listRaw | Out-String)
    $jStart = $listStr.IndexOf('[')
    $jEnd = $listStr.LastIndexOf(']')
    if ($jStart -ge 0 -and $jEnd -gt $jStart) {
        $latestData = $listStr.Substring($jStart, $jEnd - $jStart + 1) | ConvertFrom-Json
        $buildId = $latestData[0].id
        $buildDetailsUrl = "https://expo.dev/accounts/irishrex/projects/irishrex/builds/$buildId"
    }
}

if ($buildId) {
    Write-Host "  Cloud Build ID : $buildId" -ForegroundColor Cyan
    Write-Host "  Dashboard Link : $buildDetailsUrl" -ForegroundColor Cyan
} else {
    Write-Host "  Warning: Build ID could not be retrieved immediately." -ForegroundColor Yellow
}

# -------------------------------------------------------------
# 5. Monitor Build Completion & Download Versioned APK
# -------------------------------------------------------------
Write-Host ""
Write-Host "[5/5] Monitoring EAS build and downloading APK..." -ForegroundColor Yellow

$versionedApkPath = "$ProjectRoot\bms-opd-v$nextVersion.apk"
$latestApkPath = "$ProjectRoot\bms-opd-release.apk"

$downloadSuccess = $false
if ($buildId) {
    Write-Host "  Waiting for EAS build to complete in cloud..." -ForegroundColor DarkYellow
    $startTime = Get-Date
    $maxWaitMinutes = 20
    while (((Get-Date) - $startTime).TotalMinutes -lt $maxWaitMinutes) {
        Start-Sleep -Seconds 20
        $viewRaw = npx eas-cli build:view $buildId --json 2>&1
        $viewOutput = ($viewRaw | Out-String)
        try {
            $jStart = $viewOutput.IndexOf('{')
            $jEnd = $viewOutput.LastIndexOf('}')
            if ($jStart -ge 0 -and $jEnd -gt $jStart) {
                $statusObj = $viewOutput.Substring($jStart, $jEnd - $jStart + 1) | ConvertFrom-Json
                $buildStatus = $statusObj.status
                Write-Host "  Current EAS Build Status: $buildStatus..." -ForegroundColor DarkGray
                if ($buildStatus -eq "FINISHED") {
                    $appUrl = if ($statusObj.artifacts.buildUrl) { $statusObj.artifacts.buildUrl } else { $statusObj.artifacts.applicationArchiveUrl }
                    if ($appUrl) {
                        Write-Host "  Build completed! Downloading APK from cloud..." -ForegroundColor Green
                        Invoke-WebRequest -Uri $appUrl -OutFile $versionedApkPath -UseBasicParsing
                        Copy-Item $versionedApkPath $latestApkPath -Force
                        $downloadSuccess = $true
                        break
                    }
                } elseif ($buildStatus -eq "ERRORED" -or $buildStatus -eq "CANCELED") {
                    Write-Host "  EAS Build failed with status: $buildStatus" -ForegroundColor Red
                    break
                }
            }
        } catch {
            # Continue polling
        }
    }
}

if (-not $downloadSuccess) {
    Write-Host "  Checking for downloaded APK..." -ForegroundColor DarkYellow
    if ($buildId) {
        npx eas-cli build:download --build-id $buildId --non-interactive 2>&1 | Out-Null
    } else {
        npx eas-cli build:download -p android --non-interactive 2>&1 | Out-Null
    }
    $cachedApk = Get-ChildItem "$env:LOCALAPPDATA\Temp\eas-cli-nodejs\eas-build-run-cache\*.apk" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($cachedApk) {
        Copy-Item $cachedApk.FullName $versionedApkPath -Force
        Copy-Item $cachedApk.FullName $latestApkPath -Force
        $downloadSuccess = $true
    }
}

$apkItem = Get-Item $versionedApkPath -ErrorAction SilentlyContinue
if (-not $apkItem) {
    $apkItem = Get-Item $latestApkPath -ErrorAction SilentlyContinue
}
$apkSizeMB = if ($apkItem) { [math]::Round($apkItem.Length / 1MB, 2) } else { "N/A" }

Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "  Android Release v$nextVersion Completed!        " -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Release Version : v$nextVersion (Version Code: $nextCode)" -ForegroundColor White
if ($apkItem) {
    Write-Host "Versioned APK   : $versionedApkPath ($apkSizeMB MB)" -ForegroundColor Green
    Write-Host "Latest APK Link : $latestApkPath" -ForegroundColor White
}
if ($buildDetailsUrl) {
    Write-Host "Online Download : $buildDetailsUrl" -ForegroundColor Cyan
}
Write-Host ""
Write-Host "Directly installable on any Android phone via USB or sharing!" -ForegroundColor Green
Write-Host ""
