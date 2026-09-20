# BMS-OPD Deployment & Infrastructure Guide

## Hostinger Deployment Memory
Whenever the user asks to **"deploy to hostinger"** or **"deploy"**:

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
The script will connect via SSH, upload `BMS-opd-fe/dist` directly to `/home/u832627210/domains/mkinfotrack.com/public_html/novel`, preserve `.htaccess` SPA routing, and set proper 644/755 permissions.

### 3. Git Branches
* Backend (`BMS-opd-be`): `origin/main`
* Frontend (`BMS-opd-fe`): `origin/Sohel2`
