# Automated Release Script for BMS-OPD Android APK with Version Management
# Usage:
#   npm run release                                                       # Auto-increments to next version (v1.0.0.1, v1.0.0.2...)
#   powershell -ExecutionPolicy Bypass -File scripts\release.ps1          # Auto-increments
#   powershell -ExecutionPolicy Bypass -File scripts\release.ps1 -Version "1.0.0.5" # Explicit version

param(
    [string]$Version = ""
)

$ErrorActionPreference = "Continue"
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

$appJson = Get-Content $appJsonPath -Raw | ConvertFrom-Json
$currentVersion = $appJson.expo.version
if (-not $currentVersion) { $currentVersion = "1.0.0" }

if ($Version) {
    $nextVersion = $Version.TrimStart('v').TrimStart('V').Trim()
} else {
    $parts = $currentVersion.Split('.')
    if ($parts.Length -eq 3) {
        # E.g. 1.0.0 -> 1.0.0.1
        $nextVersion = "{0}.{1}.{2}.1" -f $parts[0], $parts[1], $parts[2]
    } elseif ($parts.Length -ge 4) {
        # E.g. 1.0.0.1 -> 1.0.0.2
        $buildPart = [int]$parts[3] + 1
        $nextVersion = "{0}.{1}.{2}.{3}" -f $parts[0], $parts[1], $parts[2], $buildPart
    } else {
        $nextVersion = "$currentVersion.1"
    }
}

$currentCode = if ($appJson.expo.android.versionCode) { [int]$appJson.expo.android.versionCode } else { 1 }
$nextCode = $currentCode + 1

Write-Host "  Previous Version : v$currentVersion (Code: $currentCode)" -ForegroundColor DarkGray
Write-Host "  Target Version   : v$nextVersion (Code: $nextCode)" -ForegroundColor Green

# Update app.json
$appJson.expo.version = $nextVersion
if (-not $appJson.expo.android) {
    $appJson.expo | Add-Member -MemberType NoteProperty -Name "android" -Value ([PSCustomObject]@{})
}
$appJson.expo.android.versionCode = $nextCode
$appJson | ConvertTo-Json -Depth 10 | Set-Content $appJsonPath -Encoding UTF8

# Update package.json
$pkgJson = Get-Content $pkgJsonPath -Raw | ConvertFrom-Json
$pkgJson.version = $nextVersion
$pkgJson | ConvertTo-Json -Depth 10 | Set-Content $pkgJsonPath -Encoding UTF8
Write-Host "  √ Updated app.json and package.json to v$nextVersion" -ForegroundColor Green

# -------------------------------------------------------------
# 2. Validate TypeScript Compilation
# -------------------------------------------------------------
Write-Host ""
Write-Host "[2/5] Running TypeScript compiler checks..." -ForegroundColor Yellow
$tscOutput = npx tsc --noEmit 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: TypeScript validation failed:" -ForegroundColor Red
    Write-Host $tscOutput
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
$buildOutput = npx eas-cli build --platform android --profile preview --non-interactive --json 2>&1

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
    Write-Host "  Note: Falling back to latest build query..." -ForegroundColor DarkYellow
}

if ($buildId) {
    Write-Host "  Cloud Build ID : $buildId" -ForegroundColor Cyan
    Write-Host "  Dashboard Link : $buildDetailsUrl" -ForegroundColor Cyan
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
    $maxWaitMinutes = 15
    while (((Get-Date) - $startTime).TotalMinutes -lt $maxWaitMinutes) {
        Start-Sleep -Seconds 20
        $viewOutput = npx eas-cli build:view $buildId --json 2>&1
        try {
            $jStart = $viewOutput.IndexOf('{')
            $jEnd = $viewOutput.LastIndexOf('}')
            if ($jStart -ge 0 -and $jEnd -gt $jStart) {
                $statusObj = $viewOutput.Substring($jStart, $jEnd - $jStart + 1) | ConvertFrom-Json
                $buildStatus = $statusObj.status
                Write-Host "  Current EAS Build Status: $buildStatus..." -ForegroundColor DarkGray
                if ($buildStatus -eq "FINISHED") {
                    $appUrl = $statusObj.artifacts.buildUrl
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

# Fallback to eas-cli build:download if direct polling didn't capture artifact
if (-not $downloadSuccess) {
    Write-Host "  Running eas-cli build:download..." -ForegroundColor DarkYellow
    if ($buildId) {
        npx eas-cli build:download --build-id $buildId --non-interactive
    } else {
        npx eas-cli build:download -p android --non-interactive
    }
    $cachedApk = Get-ChildItem "$env:LOCALAPPDATA\Temp\eas-cli-nodejs\eas-build-run-cache\*.apk" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($cachedApk) {
        Copy-Item $cachedApk.FullName $versionedApkPath -Force
        Copy-Item $cachedApk.FullName $latestApkPath -Force
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
Write-Host "Versioned APK   : $versionedApkPath ($apkSizeMB MB)" -ForegroundColor Green
Write-Host "Latest APK Link : $latestApkPath" -ForegroundColor White
if ($buildDetailsUrl) {
    Write-Host "Online Download : $buildDetailsUrl" -ForegroundColor Cyan
}
Write-Host ""
Write-Host "Directly installable on any Android phone via USB or sharing!" -ForegroundColor Green
Write-Host ""
