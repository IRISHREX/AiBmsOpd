# BMS-OPD Deployment & Infrastructure Guide

## System Memory Maintenance Rule
* **Memory Log File**: `MEMORY.md` located in the root repository.
* **Format**: Document all executed tasks with **Date**, **Time**, **Task Goal**, and **Step-by-Step Actions**.
* **Strict Limit**: Maintain `MEMORY.md` under **300 lines**. Whenever new tasks cause the file to exceed 300 lines, delete the oldest historical records to keep the file <= 300 lines.

---

## aiccloud VPS Deployment & Infrastructure
Whenever working with the aiccloud production VPS:

### 1. Target Infrastructure
* **Domain / URL**: `https://biomechasoft.in`
* **VPS IP**: `148.113.6.25`
* **SSH Port**: `20172`
* **SSH User**: `root`
* **Password**: `Ml0NqUQECgW2nFDF`
* **Frontend Path**: `/root/BMS-opd-fe` (served via Nginx)
* **Backend Path**: `/root/BMS-opd-be` (managed via PM2 as `bms-backend`)
* **Primary Database**: Local MongoDB 8.0 on VPS `mongodb://127.0.0.1:27017/MERN_STACK_HOSPITAL_MANAGEMENT`
* **Failover Database**: MongoDB Atlas `mongodb+srv://Irishrex:Samima2006@irishrex.p1e0kow.mongodb.net/MERN_STACK_HOSPITAL_MANAGEMENT`
* **S3 Object Storage**:
  * **Endpoint**: `https://s3.aiccloud.online`
  * **Bucket**: `aic-585105c0`
  * **Region**: `us-east-1`
  * **Access Key**: `4987216CA9E680068A03`
  * **Secret Key**: `iFoDGF0LaDaGqkg7FoJB7z4sUf8`
* **Automated Daily Backup**: Runs via cron at `02:00 AM UTC` (`/root/backup-to-s3.sh`) dumping compressed MongoDB archive and Appointments/Patients/Medicines CSV files directly into the S3 bucket.

### 2. How to Deploy to aiccloud VPS
#### Dynamic Deployment CLI (Recommended):
From `c:\PROJECTS\AiBmsOpd\aiccloud-deployment`:
```bash
npm run setup       # Configure local paths (LOCAL_PROJECT_ROOT, LOCAL_BACKEND_PATH, LOCAL_FRONTEND_PATH)
npm run add be      # Stage changed backend files and display in terminal
npm run add fe      # Stage changed frontend files and display in terminal
npm run push be     # Push backend to Git + upload to VPS + restart PM2
npm run push fe     # Push frontend to Git + local build + upload to VPS + restart Nginx
npm run report be   # Last backend deploy time and last 3 PM2 stdout/error logs
npm run report fe   # Last frontend deploy time and last 3 Nginx access/error logs
npm run report      # Full status report for both Frontend and Backend
```

#### Legacy Direct Scripts:
```bash
# In BMS-opd-fe directory:
npm run build

# In project root c:\PROJECTS\AiBmsOpd:
node deploy-frontend-now.js
node deploy-backend-now.js
```

---

## Hostinger Deployment Memory
Whenever the user asks to **"deploy to hostinger"**:

### 1. Target Infrastructure
* **Frontend Target URL**: `https://novel.mkinfotrack.com`
* **Hostinger Server IP**: `147.93.17.56`
* **SSH Port**: `65002`
* **SSH User**: `u832627210`
* **Remote Path**: `/home/u832627210/domains/mkinfotrack.com/public_html/novel`
* **Backend API**: `https://bms-opd-be.onrender.com` (hosted on Render)

### 2. How to Deploy Frontend to Hostinger
Run the automated deployment script located in project root:
```bash
# In BMS-opd-fe directory:
npm run build

# In project root c:\PROJECTS\AiBmsOpd:
node deploy-hostinger.js
```

---

## Git Branches
* Backend (`BMS-opd-be`): `origin/main`
* Frontend (`BMS-opd-fe`): `origin/Sohel2`
