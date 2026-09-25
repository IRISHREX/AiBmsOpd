# BMS-OPD System Memory Log

> **Rule**: Maintain <= 300 lines. When adding new entries, prune oldest historical records to keep total lines under 300.

---

## [2026-09-24 ~ 2026-09-25] aiccloud VPS Deployment & Troubleshooting

### Task 1: VPS Full Deployment & 502 Bad Gateway Troubleshooting
* **Date & Time**: 2026-09-24 ~ 2026-09-25 00:20 IST
* **Goal**: Deploy BMS-OPD (Frontend + Backend) to aiccloud VPS (`148.113.6.25:20172`) for domain `https://biomechasoft.in/`.
* **Issue**: Site returned HTTP 502 Bad Gateway.
* **Steps Taken**:
  1. Inspected port bindings and processes on VPS (`ss -tulpn`, PM2, Nginx).
  2. Identified NAT VPS port forwarding: VPS external IP routes through host router.
  3. Corrected Nginx configuration at `/etc/nginx/sites-available/default`:
     - Set `root /root/BMS-opd-fe; index index.html;` with `try_files $uri $uri/ /index.html;`.
     - Set reverse proxy: `location /api { proxy_pass http://127.0.0.1:5000; }` with WebSocket headers.
  4. Configured listening on IPv4 loopback & external interfaces, restarted Nginx.

---

### Task 2: Frontend Environment & API Endpoint Alignment
* **Date & Time**: 2026-09-25 00:28 ~ 00:52 IST
* **Goal**: Fix login failures throwing "Network Error" in browser.
* **Root Cause**: Frontend build had old Render URL (`pathologylab-backend-new-project.onrender.com`) baked into Vite bundle. Local `.env.production` had `http://localhost:5000` which caused mixed content and failed external client requests.
* **Steps Taken**:
  1. Updated `BMS-opd-fe/.env.production` to `VITE_BASE_URL=https://biomechasoft.in`.
  2. Synced latest backend code to `/root/BMS-opd-be` and restarted via PM2.
  3. Rebuilt frontend with `npm run build` in `BMS-opd-fe`.
  4. Uploaded fresh `dist` to `/root/BMS-opd-fe` on the VPS.
  5. Tested login endpoint via Nginx: verified `POST /api/v1/user/login` returned proper JSON (`400 Bad Request: Please Fill Email, Password and Role!`).

---

### Task 3: Remote Repository Sync (Frontend & Backend Pull)
* **Date & Time**: 2026-09-25 00:55 ~ 01:05 IST
* **Goal**: Pull latest commits from GitHub repositories and redeploy.
* **Steps Taken**:
  1. `BMS-opd-be`: Pulled `origin/main` (received updates to `controller/reportController.js`).
  2. `BMS-opd-fe`: Switched to tracking branch `origin/Sohel2`, pulled 6 new commits (ID modifications, prescription/invoice fixes, chart layouts).
  3. Resolved missing dependency: installed `react-countup` in `BMS-opd-fe`.
  4. Ensured `.env.production` remained `VITE_BASE_URL=https://biomechasoft.in`.
  5. Built production bundle (`npm run build`) and redeployed both BE and FE to VPS.

---

### Task 4: Local VPS MongoDB 8.0 Installation & Database Migration
* **Date & Time**: 2026-09-25 01:07 ~ 01:25 IST
* **Goal**: Migrate from MongoDB Atlas to local VPS MongoDB for sub-millisecond query speed, while preserving Atlas as automatic failover.
* **Steps Taken**:
  1. Installed MongoDB 8.0 Community Edition (`mongodb-org`, `mongodb-org-tools`) on Ubuntu 24.04 noble.
  2. Optimized memory footprint in `/etc/mongod.conf`:
     - Configured `wiredTiger.engineConfig.cacheSizeGB: 0.25` (256 MB) to prevent out-of-memory on 1GB RAM VPS.
     - Bound to `127.0.0.1:27017`.
  3. Migrated entire database from Atlas using `mongodump` & `mongorestore`:
     - Restored **5,399 total documents** into `MERN_STACK_HOSPITAL_MANAGEMENT` with 0 failures.
     - Preserved: 4,115 medicines, 917 diagnostic tests, 236 logs, 44 messages, 15 users, all appointments & prescriptions.
  4. Updated `BMS-opd-be/database/dbConnection.js`:
     - Primary: Connects to local `mongodb://127.0.0.1:27017/MERN_STACK_HOSPITAL_MANAGEMENT` (<1ms latency).
     - Failover: Automatically falls back to MongoDB Atlas cluster if local service is unavailable.
  5. Restarted PM2: verified `bms-backend` online and connected to local MongoDB.

---

### Task 5: aiccloud S3 Object Storage Integration & Automated Daily Backup
* **Date & Time**: 2026-09-25 01:25 ~ 01:40 IST
* **Goal**: Connect user's aiccloud S3 bucket for file storage and automated database/CSV backups.
* **Credentials Configured**:
  - Endpoint: `https://s3.aiccloud.online`
  - Bucket: `aic-585105c0`
  - Region: `us-east-1`
  - Access Key: `4987216CA9E680068A03`
* **Steps Taken**:
  1. Installed `@aws-sdk/client-s3` in `BMS-opd-be`.
  2. Created `BMS-opd-be/utils/s3Storage.js` supporting direct uploads, CSV exports, and object listing.
  3. Added S3 backup controller routes:
     - `POST /api/v1/backup/s3/trigger`
     - `GET /api/v1/backup/s3/list`
  4. Created CLI automation script `BMS-opd-be/scripts/runS3Backup.js`.
  5. Created `/root/backup-to-s3.sh` and scheduled cron job at `02:00 AM UTC` daily:
     - Dumps compressed MongoDB `.gz` archive.
     - Generates and uploads human-readable Appointments CSV, Patients CSV, and Medicines Master CSV to S3.
     - Prunes local backups older than 7 days.
  6. Verified initial run: confirmed `.gz` archive and CSV files uploaded to `aic-585105c0` bucket.

---

### Task 6: GitHub Version Control Push
* **Date & Time**: 2026-09-25 06:44 IST
* **Goal**: Commit and push all work to GitHub.
* **Steps Taken**:
  1. `BMS-opd-be` (`origin/main`): Committed `f56557f` ("feat: add local mongodb failover, aiccloud s3 backup integration").
  2. `BMS-opd-fe` (`origin/Sohel2`): Committed `6ca9d6d` ("chore: point production API to biomechasoft.in and add react-countup").
  3. Root repo `AiBmsOpd` (`origin/main`): Committed `ce08926` updating submodule pointers. All pushed cleanly.

---

### Task 7: S3 Doctor Assets Storage & Image Serving Resolution
* **Date & Time**: 2026-09-25 07:05 ~ 07:25 IST
* **Goal**: Fix doctor stamp, avatar (DP), header, and footer images failing to load in frontend and PDF previews.
* **Root Causes Identified**:
  1. **Nginx Missing Route**: Nginx on VPS lacked a `location /uploads` directive. Requests for `/uploads/doctors/...` were caught by `location /` and returned `index.html` (text/html) instead of image bytes.
  2. **Private S3 Bucket**: The aiccloud S3 bucket is private; direct browser requests to `https://s3.aiccloud.online/aic-585105c0/...` return `403 Forbidden AccessDenied`.
  3. **No S3 Sync for Uploads**: Multer was saving uploaded images strictly to local disk `/uploads/doctors/` without uploading to S3.
  4. **Missing footerImage Field**: `footerImage` was absent from `userSchema.js`, `upload.js`, and `userController.js`.
* **Steps Taken**:
  1. Updated `BMS-opd-be/models/userSchema.js` and `middlewares/upload.js` to add `footerImage`.
  2. Updated `userController.js` (`addNewDoctor`, `updateUserById`, `updateDoctorProfile`) to asynchronously upload doctor images (`docAvatar`, `stampImage`, `signImage`, `headerImage`, `footerImage`) directly to S3 bucket `aic-585105c0` under `doctors/`.
  3. Implemented smart S3 fallback endpoint in `app.js` (`GET /uploads/doctors/:filename`): serves from local disk cache, and if missing, streams from S3 bucket and caches locally.
  4. Updated Nginx config on VPS to proxy `/uploads` to backend (`127.0.0.1:5000`) and restarted Nginx.
  5. Synced all 20 existing doctor uploads from VPS disk to S3 bucket `aic-585105c0/doctors/`.
  6. Verified over HTTPS: `https://biomechasoft.in/uploads/doctors/...` now returns `HTTP 200 OK` with `Content-Type: image/jpeg`.
  7. Committed & pushed backend changes (`e829598`) and root submodule pointer (`d4e4f78`).
