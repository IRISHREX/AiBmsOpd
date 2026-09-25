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

---

### Task 8: Prescription PDF Storage (S3, 3-Version Rolling Retention) & Multi-View Downloads
* **Date & Time**: 2026-09-25 09:30 ~ 10:15 IST
* **Goal**: Enable direct PDF generation and saving to S3 disk storage, retaining up to 3 prescriptions per patient (same-day overwrites, >3 oldest purged). Add date-selection download modal across Dashboard, Reports, and Messages.
* **Steps Taken**:
  1. Updated `prescriptionSchema.js` with `pdfFiles` array (`date`, `s3Key`, `s3Url`, `savedAt`).
  2. Implemented S3 helpers in `s3Storage.js` (`uploadPrescriptionPdfToS3`, `deleteS3Object`, `getPresignedDownloadUrl`). Installed `@aws-sdk/s3-request-presigner`.
  3. Added backend routes in `prescriptionRouter.js` and controller functions in `prescriptionController.js` (`savePrescriptionPdf`, `listPrescriptionPdfs`).
  4. Added `handleSavePdf` and "💾 Save PDF" button in `Preview.jsx`.
  5. Created `DownloadPrescriptionModal.jsx` and `DownloadPrescriptionModal.css` for date-selection downloads via presigned URLs.
  6. Added PDF download triggers in `Dashboard.jsx`, `ReportsPage.jsx`, and `Messages.jsx` (via `MessageCard.jsx` / `MessageList.jsx`).

---

### Task 9: Doctor Footer Placement & Form Field Tweak
* **Date & Time**: 2026-09-25 10:20 ~ 10:35 IST
* **Goal**: Fix doctor's footer image rendering in place of signature/stamp while default blue footer was still appearing at bottom.
* **Root Cause**: `AddNewDoctor.jsx` mislabeled the `signImage` input as "Footer Image (optional)" and lacked a `footerImage` input, storing the footer banner in `signImage`.
* **Steps Taken**:
  1. Updated `AddNewDoctor.jsx`: separated inputs into "Signature Image (optional)" and "Footer Image (optional)" with full preview and submit support.
  2. Migrated Dr. Tarikul Alam's document in MongoDB on VPS: moved the ThyroGen banner from `signImage` to `footerImage` and set `signImage: null`.
  3. Updated `MyDocument.jsx` and `Preview.jsx`: ensured custom doctor footer replaces `/Footer.png` at the bottom and does not appear in credentials section.

---

### Task 10: General Settings Branding, Location QR Code, Receipt/Prescription Hierarchy & Template Builder Fix
* **Date & Time**: 2026-09-25 11:00 ~ 11:35 IST
* **Goal**: Fix HTTP 413 error and TemplateBuilder state mutation error, implement Organization Settings with Location QR code, uploadable Default Header & Footer, and apply branding hierarchy across Prescriptions and Receipts.
* **Steps Taken**:
  1. **Fixed HTTP 413 on VPS**: Added `client_max_body_size 50M;` to Nginx config and reloaded. Updated prescription saving flow to store structured JSON data in MongoDB with rolling 3-version retention, generating PDFs client-side on demand for fast, lightweight storage.
  2. **Fixed TemplateBuilder Error**: Resolved `TypeError: Cannot assign to read only property 'prescriptionTemplate'` by updating React context state immutably (`setAdmin(prev => ({ ...prev, prescriptionTemplate: tmpl.name }))`).
  3. **Backend General Settings API**: Created `generalSettingsSchema.js`, `generalSettingsController.js`, and `generalSettingsRouter.js` mounted at `/api/v1/settings/general` with multer upload middleware (`uploadClinicImagesDisk`) and S3 background sync.
  4. **Frontend Organization & Branding UI**: Added `OrganizationSettings.jsx` inside `ThemeSettings.jsx` providing editable clinic details (Org Name, Reg No, Address, Owner, Platform Fee, Google Location URL), live Location QR code generator (`qrcode`), and image uploaders for Default Header & Footer.
  5. **Prescription Branding Hierarchy**: Updated `Preview.jsx` and PDF templates to use `doctor.headerImage || generalSettings.defaultHeaderImage` and `doctor.footerImage || generalSettings.defaultFooterImage`.
  6. **Receipt / Invoice Branding**: Updated OPD receipts in `Appointment.jsx` and `ReportsPage.jsx` using `generalSettingsUtil.js` to render the Default Header, Organization details, Platform Fee, Google Location QR code, and Default Footer.
  7. **Redeployment & Git Push**: Built frontend, deployed backend and frontend to aiccloud VPS (`https://biomechasoft.in`), verified live API response, and pushed all commits to GitHub.

---

### Task 11: Receipt Serial Numbers, Multi-Step Referral, Prescription Details & Report Data Mismatch Fix
* **Date & Time**: 2026-09-25 13:00 ~ 13:30 IST
* **Goal**:
  1. Add Doctor-wise Day-wise serial numbers (`#01`, `#02` and `REC-YYYYMMDD-DOC-XX`) to OPD receipts with Header, Footer, and Location QR code.
  2. Transform Create Referral into a 3-step wizard with step indicators and validation.
  3. Ensure downloadable prescription uses selected default template and renders all clinical/demographic details.
  4. Resolve data mismatch between Dashboard Appointments and Reports table (MINA KHATUN appearing for multiple patients).
* **Root Causes & Solutions**:
  1. **Data Mismatch in Reports**: When multiple family members booked appointments using the same phone (`9749626905`), they shared MINA KHATUN's User `patientId`. In `ReportsPage.jsx`, patient name checked `r.patientId` first, rendering "MINA KHATUN" for AZAHARUDDIN and ABDUL ALIM. Fixed by prioritizing `r.appointmentId?.name`.
  2. **Payment Status Discrepancy**: ABDUL ALIM was marked "Completed" in appointments, which auto-synced the report status to "Paid". Because ABDUL ALIM was mistakenly displaying as "MINA KHATUN", it looked like Mina Khatun was "Paid" in Reports while "Pending" on Dashboard. Correcting the name completely aligned both views.
  3. **Total Patients: 0**: `ReportsPage.jsx` called `/api/v1/user/patients` which was missing on backend. Implemented `getAllPatients` and route `/user/patients` in `userController.js` and `userRouter.js`.
  4. **Multi-Step Referral**: Created `CreateReferralTab.css` and updated `CreateReferralTab.jsx` with a responsive 3-step wizard.
  5. **Receipt Serial**: Updated `invoiceController.js` and `generalSettingsUtil.js` to compute daily doctor serials and embed QR code.
  6. **Prescription Download**: Updated `prescriptionSchema.js`, `prescriptionController.js`, and `DownloadPrescriptionModal.jsx` to persist and load template and all clinical fields.
* **Redeployment**:
  - Rebuilt frontend with `npm run build`.
  - Deployed BE and FE to aiccloud VPS (`https://biomechasoft.in`).
  - Committed & pushed `BMS-opd-be` (`origin/main`) and `BMS-opd-fe` (`origin/Sohel2`).


