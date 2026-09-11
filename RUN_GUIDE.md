# BMS-OPD System — Complete Run & Release Guide

This document provides step-by-step instructions for running the mobile app, web frontend, backend server, and executing the automated Android release script with 4-digit local version tracking (`v1.0.0.1`, `v1.0.0.2`...).

---

## 📋 Table of Contents
1. [System Architecture & Prerequisites](#1-system-architecture--prerequisites)
2. [Running the Mobile App (React Native / Expo)](#2-running-the-mobile-app-react-native--expo)
3. [Running the Web Frontend (React / Vite)](#3-running-the-web-frontend-react--vite)
4. [Running the Backend Server (Node.js / Express)](#4-running-the-backend-server-nodejs--express)
5. [Automated Release Script (v1.0.0.1, v1.0.0.2...)](#5-automated-release-script-v1001-v1002)
6. [Installing the Generated APK on Android Phones](#6-installing-the-generated-apk-on-android-phones)
7. [Troubleshooting & Common FAQs](#7-troubleshooting--common-faqs)

---

## 1. System Architecture & Prerequisites

The BMS-OPD ecosystem consists of three interconnected components located within `c:\PROJECTS\AiBmsOpd`:

| Component | Directory | Stack | Port / URL |
| :--- | :--- | :--- | :--- |
| **Mobile App** | Root (`c:\PROJECTS\AiBmsOpd`) | React Native (Expo SDK 51) + TypeScript | Metro 8081 / Expo Go |
| **Web Portal** | `c:\PROJECTS\AiBmsOpd\BMS-opd-fe` | React + Vite + Redux Toolkit | `http://localhost:5173` (Prod: `https://novel.mkinfotrack.com`) |
| **Backend API** | `c:\PROJECTS\AiBmsOpd\BMS-opd-be` | Node.js + Express + MongoDB | `http://localhost:5000` (Prod: `https://bms-opd-be.onrender.com`) |

### Prerequisites
- **Node.js**: `v18.x` or `v20.x` LTS ([Download Node.js](https://nodejs.org/))
- **Package Manager**: `npm` (v9+)
- **Git**: Installed and configured on your system PATH
- **PowerShell**: Windows PowerShell 5.1 or PowerShell 7+
- **Expo Go App**: Installed on physical Android or iOS devices from Google Play Store or App Store
- **EAS CLI**: Included via `npx eas-cli` (Expo Application Services account configured)

---

## 2. Running the Mobile App (React Native / Expo)

### Step 1: Open Project Directory
Open PowerShell or Command Prompt:
```powershell
cd c:\PROJECTS\AiBmsOpd
```

### Step 2: Install Dependencies (if not already installed)
```powershell
npm install
```

### Step 3: Verify `.env` File
Ensure `.env` exists in the root folder with the deployed API endpoint:
```env
EXPO_PUBLIC_API_URL=https://bms-opd-be.onrender.com
```

### Step 4: Start the Expo Development Server
```powershell
npx expo start -c
```
*(The `-c` flag clears the Metro cache to ensure smooth bundling).*

### Interactive Terminal Options:
- **Physical Phone (Expo Go)**:
  - Open **Expo Go** on your Android phone and scan the QR code displayed in the terminal.
  - *(Ensure phone and PC are connected to the same Wi-Fi network, or press `s` to switch to Expo tunnel mode).*
- **Android Emulator**:
  - Press `a` in the terminal to launch the app on a connected Android Studio emulator or USB device.
- **Web Browser**:
  - Press `w` or run `npm run dev` to launch the mobile layout in Google Chrome.
- **Reload App**:
  - Press `r` to immediately reload the app on connected devices.

> **💡 In-App Server Switcher**:
> You can change the backend URL directly inside the mobile app without restarting:
> - **Login Screen**: Tap **"⚙️ Server Endpoint"** at the bottom.
> - **Profile Screen**: Tap **"🌐 Backend API Endpoint"** to test or switch between local, staging, or production servers.

---

## 3. Running the Web Frontend (React / Vite)

The web dashboard and desktop clinical portal are located in `BMS-opd-fe`.

```powershell
cd c:\PROJECTS\AiBmsOpd\BMS-opd-fe
npm install
npm run dev
```

- **Local Address**: `http://localhost:5173`
- **Production Host**: `https://novel.mkinfotrack.com`
- **Prescription Preview**: When preview links are accessed on localhost (`/preview/:patientId`), they automatically redirect to `https://novel.mkinfotrack.com/preview/:patientId` for consistent, official prescription views.

---

## 4. Running the Backend Server (Node.js / Express)

The backend server is located in `BMS-opd-be`.

```powershell
cd c:\PROJECTS\AiBmsOpd\BMS-opd-be
npm install
npm run dev
```

- **Local Address**: `http://localhost:5000`
- **Swagger Documentation**: `http://localhost:5000/docs`
- **Live Production Server**: `https://bms-opd-be.onrender.com`

---

## 5. Automated Release Script (`v1.0.0.1`, `v1.0.0.2`...)

The automated release script handles the full pipeline: version incrementing, TypeScript compilation checks, Git commits, EAS Cloud Android APK generation, and local downloading.

### Versioning Behavior:
- **First Release**: Starts at `v1.0.0.1` (Android versionCode: `2`).
- **Subsequent Releases**: Automatically increments the 4th digit:
  `v1.0.0.1` ➔ `v1.0.0.2` ➔ `v1.0.0.3` ➔ `v1.0.0.4`...
- **Both APKs Saved**:
  1. `bms-opd-v1.0.0.X.apk` (Permanent versioned archive)
  2. `bms-opd-release.apk` (Always points to the latest release for quick distribution)

---

### How to Run the Release Script

#### Option A: One-Click Windows Batch File (Easiest)
Double-click `release.bat` in Windows File Explorer:
```cmd
c:\PROJECTS\AiBmsOpd\release.bat
```
*(Or open Command Prompt and run `release.bat`).*

#### Option B: Via npm Command
In project root:
```powershell
npm run release
```

#### Option C: Directly via PowerShell
```powershell
powershell -ExecutionPolicy Bypass -File scripts\release.ps1
```

#### Option D: Specify a Custom Version
You can pass an explicit version string:
```powershell
powershell -ExecutionPolicy Bypass -File scripts\release.ps1 -Version "1.0.0.5"
```
*(Or in batch file: `release.bat -Version "1.0.0.5"`).*

---

### What the Script Does Step-by-Step:
1. **[1/5] Bumps Version**: Reads `app.json` and increments to `v1.0.0.X`, updating both `app.json` and `package.json`.
2. **[2/5] Validates TypeScript**: Runs `npx tsc --noEmit` to guarantee 0 compile errors before building.
3. **[3/5] Git Sync**: Staged, committed with `chore(release): bump release version to v1.0.0.X`, and pushed to `origin/main`.
4. **[4/5] EAS Cloud Build**: Triggers EAS Cloud Android build with APK profile.
5. **[5/5] Cloud Download**: Polls until finished and saves the file directly to:
   - `c:\PROJECTS\AiBmsOpd\bms-opd-v1.0.0.X.apk`
   - `c:\PROJECTS\AiBmsOpd\bms-opd-release.apk`

---

## 6. Installing the Generated APK on Android Phones

Once `release.ps1` finishes, install the APK using any of the following methods:

### Method 1: Direct USB File Transfer
1. Connect your Android phone to the PC via USB.
2. Set USB mode to **File Transfer / MTP**.
3. Copy `c:\PROJECTS\AiBmsOpd\bms-opd-release.apk` into your phone's **Downloads** folder.
4. On your phone, tap the file in the **Files** or **Downloads** app and tap **Install**.

### Method 2: Via ADB (Android Debug Bridge)
If USB Debugging is enabled:
```powershell
adb install -r c:\PROJECTS\AiBmsOpd\bms-opd-release.apk
```

### Method 3: Instant WhatsApp / Telegram / Drive Sharing
- Upload `bms-opd-release.apk` to Google Drive or send it via WhatsApp Web / Telegram to clinical staff or doctors.
- Recipients tap the file on Android to install.

### Method 4: Online Cloud Download Link
- You can share the direct Expo dashboard URL printed by the script:
  `https://expo.dev/accounts/irishrex/projects/irishrex/builds/<build-id>`

---

## 7. Troubleshooting & Common FAQs

### Q1: The backend server takes 30-45 seconds to respond on first load.
- **Cause**: Render's free backend sleeps when inactive.
- **Resolution**: The app has an integrated 45-second timeout and exponential backoff auto-retry. Allow up to 40 seconds on the very first request after sleep; all subsequent requests will be instantaneous.

### Q2: "The action 'RESET' was not handled by any navigator."
- **Resolution**: This was resolved by registering all screens unconditionally in `Stack.Navigator` and guarding `resetToMain()` in `AppNavigator.tsx`.

### Q3: Metro bundler shows cached errors.
- **Resolution**: Run `npx expo start -c` to wipe cache, or delete `.expo` and restart.

### Q4: PowerShell says "File scripts\release.ps1 cannot be loaded because running scripts is disabled".
- **Resolution**: Always run with `-ExecutionPolicy Bypass`:
  ```powershell
  powershell -ExecutionPolicy Bypass -File scripts\release.ps1
  ```
  Or run `npm run release` or `release.bat`.

---

## 8. How the Build is Made & APK is Created

There are two primary ways to create an Android APK from this codebase:

### 🌟 Approach A: Automated Hybrid Build (Recommended — Current Setup)
This is the approach used by `release.bat` and `scripts/release.ps1`:

```
┌─────────────────────────┐       ┌────────────────────────┐       ┌────────────────────────┐
│  Your Local PC          │       │  Expo EAS Cloud        │       │  Your Local PC         │
│  - Checks TypeScript    │ ────> │  - Linux Container     │ ────> │  - Downloads final APK │
│  - Bumps v1.0.0.X       │       │  - JDK 17 & SDK 34     │       │  - Saves as:           │
│  - Commits to Git       │       │  - Gradle compiles APK │       │    bms-opd-v1.0.0.X.apk│
└─────────────────────────┘       └────────────────────────┘       │    bms-opd-release.apk │
                                                                   └────────────────────────┘
```

#### Why this is recommended:
- **Zero Local Toolchain Setup**: React Native 0.74 (Expo SDK 51) requires **Java JDK 17**, **Android SDK Platform 34**, and **Android NDK**. Your Windows PC does not need to install ~15 GB of Android Studio or configure complex environment variables.
- **Identical Clean Environment**: Avoids Windows path length limits (`MAX_PATH`) and local Gradle daemon cache corruption.
- **Local Output File**: Even though compiled in EAS Cloud, the script **automatically downloads the completed `.apk` binary straight to your local PC**:
  - `c:\PROJECTS\AiBmsOpd\bms-opd-v1.0.0.X.apk` (Versioned archive)
  - `c:\PROJECTS\AiBmsOpd\bms-opd-release.apk` (Latest release pointer)

---

### 💻 Approach B: 100% Local Machine Build (Pure Offline Build)

If you wish to compile the APK entirely on your local Windows hardware without using cloud servers:

#### 1. Prerequisites Required on Your PC
1. **Java Development Kit 17 (JDK 17)**:
   - Download and install **OpenJDK 17** or **Eclipse Temurin 17** (JDK 8 or JRE will not work).
   - Set environment variable: `JAVA_HOME` = `C:\Program Files\Eclipse Adoptium\jdk-17.x.x`
   - Add `%JAVA_HOME%\bin` to your System `PATH`.
   - Verify in terminal: `javac -version` (must output `javac 17.x.x`).
2. **Android Studio & Android SDK**:
   - Install Android Studio.
   - Open Android Studio ➔ **SDK Manager**:
     - Install **Android 14.0 (API 34)** SDK Platform.
     - Under SDK Tools: check **Android SDK Build-Tools 34.0.0**, **Android SDK Command-line Tools**, and **Android SDK Platform-Tools**.
   - Set environment variable: `ANDROID_HOME` = `C:\Users\<YourUser>\AppData\Local\Android\Sdk`
   - Add `%ANDROID_HOME%\platform-tools` and `%ANDROID_HOME%\cmdline-tools\latest\bin` to `PATH`.

#### 2. Local Build Commands

##### Method 1: EAS Local Build
Run EAS build with the `--local` flag in PowerShell:
```powershell
npx eas-cli build --platform android --profile preview --local
```
*(EAS CLI will invoke local Android SDK / Gradle and output the APK in your working directory).*

##### Method 2: Direct Gradle Build (Native Android Project)
Because the `android` directory is already prebuilt in your project:
```powershell
# 1. Navigate to android folder
cd c:\PROJECTS\AiBmsOpd\android

# 2. Compile Release APK using Gradle wrapper
.\gradlew.bat assembleRelease

# 3. Or compile Debug APK (faster, unsigned)
.\gradlew.bat assembleDebug
```

#### Where the Local APK is Created:
- **Release APK**:
  `c:\PROJECTS\AiBmsOpd\android\app\build\outputs\apk\release\app-release.apk`
- **Debug APK**:
  `c:\PROJECTS\AiBmsOpd\android\app\build\outputs\apk\debug\app-debug.apk`

---

### 📊 Summary Comparison

| Feature | Approach A (Current `release.bat`) | Approach B (100% Local Machine) |
| :--- | :--- | :--- |
| **Command** | `release.bat` or `npm run release` | `cd android && .\gradlew.bat assembleRelease` |
| **Local Disk Space Needed** | **~0 GB** (no SDK needed) | **~15–20 GB** (JDK 17, Android Studio, SDK 34) |
| **Setup Effort** | **Instant** (ready right now) | Requires JDK 17, SDK 34, `JAVA_HOME`, `ANDROID_HOME` |
| **Version Tracking** | **Automatic** (`v1.0.0.1`, `v1.0.0.2`...) | Manual version update in `app.json` |
| **Local APK Location** | `c:\PROJECTS\AiBmsOpd\bms-opd-release.apk` | `android\app\build\outputs\apk\release\app-release.apk` |

