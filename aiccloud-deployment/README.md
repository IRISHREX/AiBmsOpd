# aiccloud-deployment

Dynamic deployment and management CLI for BMS-OPD on **aiccloud VPS** (`https://biomechasoft.in`).

---

## 🚀 Quick Start

Run all commands from this directory (`c:\PROJECTS\AiBmsOpd\aiccloud-deployment`):

```bash
# 1. Interactive setup for local paths (LOCAL_PROJECT_ROOT, LOCAL_BACKEND_PATH, LOCAL_FRONTEND_PATH)
npm run setup

# 2. Stage files and view changes in terminal
npm run add be      # Stages backend changes and lists files
npm run add fe      # Stages frontend changes and lists files

# 3. Commit, Push to Git & Deploy to aiccloud VPS
npm run push be     # Pushes backend to GitHub, uploads to VPS, restarts PM2
npm run push fe     # Pushes frontend to GitHub, builds dist, uploads to VPS, restarts Nginx

# 4. View deployment reports and last 3 logs
npm run report be   # Backend status, last deploy time, and last 3 PM2 logs
npm run report fe   # Frontend status, last deploy time, and last 3 Nginx logs
npm run report      # Full report for both Frontend & Backend
```

---

## 🛠️ Commands Breakdown

| Command | Action |
|---|---|
| `npm run setup` | Interactively prompts for machine paths and saves them to `.env`. |
| `npm run add be` | Stages all backend changes in git and prints changed files with status icons. |
| `npm run add fe` | Stages all frontend changes in git and prints changed files with status icons. |
| `npm run push be` | Auto-commits & pushes to `origin/main`, uploads to `/root/BMS-opd-be`, runs `npm install`, and restarts PM2 (`bms-backend`). |
| `npm run push fe` | Auto-commits & pushes to `origin/Sohel2`, runs local `npm run build`, uploads `dist/` to `/root/BMS-opd-fe`, and reloads Nginx. |
| `npm run report be` | Shows last deployment timestamp, PM2 status, and last 3 stdout/error logs. |
| `npm run report fe` | Shows last deployment timestamp, Nginx HTTP status, and last 3 access/error logs. |

---

## 📁 Configuration (`.env`)

```env
LOCAL_PROJECT_ROOT=c:/PROJECTS/AiBmsOpd
LOCAL_BACKEND_PATH=c:/PROJECTS/AiBmsOpd/BMS-opd-be
LOCAL_FRONTEND_PATH=c:/PROJECTS/AiBmsOpd/BMS-opd-fe

VPS_HOST=148.113.6.25
VPS_PORT=20172
VPS_USER=root
VPS_PASSWORD=Ml0NqUQECgW2nFDF
REMOTE_FRONTEND_PATH=/root/BMS-opd-fe
REMOTE_BACKEND_PATH=/root/BMS-opd-be
PM2_APP_NAME=bms-backend
APP_DOMAIN=https://biomechasoft.in
```
