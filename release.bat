@echo off
cd /d "c:\PROJECTS\AiBmsOpd"
powershell -ExecutionPolicy Bypass -File "scripts\release.ps1"
pause
