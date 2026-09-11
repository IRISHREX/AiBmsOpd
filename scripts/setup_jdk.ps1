[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$url = "https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.20.1%2B1/OpenJDK17U-jdk_x64_windows_hotspot_17.0.20.1_1.zip"
$zipPath = "C:\PROJECTS\jdk17.zip"
$destDir = "C:\PROJECTS\jdk-17"
$tempDir = "C:\PROJECTS\jdk17_temp"

if (Test-Path $destDir) {
    Write-Host "JDK 17 already exists at $destDir"
    exit 0
}

Write-Host "Downloading OpenJDK 17 portable archive from $url..."
$client = New-Object System.Net.WebClient
$client.DownloadFile($url, $zipPath)

Write-Host "Extracting archive to $tempDir..."
Expand-Archive -Path $zipPath -DestinationPath $tempDir -Force

$inner = Get-ChildItem $tempDir | Select-Object -First 1
Move-Item -Path $inner.FullName -Destination $destDir -Force

Remove-Item $zipPath -Force -ErrorAction SilentlyContinue
Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "OpenJDK 17 setup complete at $destDir!"
