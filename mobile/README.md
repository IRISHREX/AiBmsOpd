# BMS-OPD Mobile Application (React Native / Expo)

A complete cross-platform React Native mobile application for the Hospital Outpatient Department (OPD) Management System, built with Expo, TypeScript, and React Navigation.

---

## 🚀 Quickstart Guide

### 1. Prerequisites
Ensure you have Node.js (>= 18) installed on your development machine.

### 2. Install Dependencies
Navigate to the mobile directory and install all required packages:
```bash
cd mobile
npm install
```

### 3. Configure Your Deployed Backend URL
Create a `.env` file in the `mobile/` root (or copy `.env.example`):
```bash
cp .env.example .env
```
Edit `.env` and set your deployed backend server URL:
```env
EXPO_PUBLIC_API_URL=https://your-deployed-opd-api.com
```

> **Note**: You can also change the API endpoint directly from inside the app!
> - On the **Login Screen**: Click on **"⚙️ Server Endpoint"** at the bottom to test or paste your deployed URL.
> - In **Profile / Settings**: Use the **"🌐 Backend API Endpoint"** section to switch between staging and production endpoints on the fly.

### 4. Start the Application
Start the Expo development server:
```bash
npx expo start
```
- Scan the QR code with **Expo Go** on your iPhone or Android phone.
- Press `a` to launch on an Android emulator.
- Press `i` to launch on the iOS simulator.
- Press `w` to run in the web browser.

---

## 📱 Features Included

1. **🔐 Authentication & Role Management**
   - Doctor, Admin, and Compounder login.
   - Persistent JWT auth token management with `@react-native-async-storage/async-storage`.
   - Automatic bearer token injection on every outgoing request.
   - Dynamic server switcher for local dev, staging, or production.

2. **📊 OPD Dashboard**
   - KPI metrics: Today's appointments, pending consultations, settled invoices.
   - Quick action shortcuts to Appointments, Prescriptions, Doctors, and Billing.
   - Recent patient appointments feed with status indicators.

3. **📅 Appointments & Scheduling**
   - Search by patient name, phone, or token.
   - Status filters: All, Pending, Completed, Rescheduled, Cancelled.
   - Instant booking modal with doctor selection, time slot, and symptoms.
   - Reschedule modal to update date and time slot.
   - One-tap status update to Mark Completed.

4. **🩺 Doctors & Live Slot Capacity**
   - Doctor directory with fee, phone, and specialty.
   - Live Capacity Checker: select any date to view total capacity, booked count, and remaining available slots.
   - Add new doctor profile modal.

5. **💊 Medical Store & Prescriptions**
   - Medicine catalog with search by Brand Name or Chemical Composition.
   - Dosage form, strength, and manufacturer details.
   - Interactive prescription builder (Rx draft sheet).

6. **💳 Billing & Invoices**
   - Total billed, collected, and pending revenue summaries.
   - Invoice list with payable amount and payment status badge.
   - One-tap invoice settlement (`POST /api/v1/invoice/:id/settle`).

7. **👤 User Profile & Settings**
   - Doctor/user credentials.
   - Change password dialog.
   - Live API endpoint tester and switcher.
   - Secure sign-out.

---

## 🌐 Complete API Endpoint Mappings

All API modules are located in `mobile/src/api/`:
- **Auth**: `POST /api/v1/user/login`, `GET /api/v1/user/dashboard/me`, `GET /api/v1/user/admin/logout`, `POST /api/v1/user/change-own-password`
- **Appointments**: `GET /api/v1/appointment/getall`, `POST /api/v1/appointment/post`, `PUT /api/v1/appointment/reschedule/:id`, `PUT /api/v1/appointment/status/:id`, `DELETE /api/v1/appointment/delete/:id`, `GET /api/v1/appointment/search`
- **Doctors & Slots**: `GET /api/v1/user/doctors`, `POST /api/v1/user/doctor/addnew`, `GET /api/v1/capacity`, `POST /api/v1/capacity/set`, `GET /api/v1/capacity-scheduler`
- **Medicines**: `GET /api/v1/medical`, `GET /api/v1/medicine/search/name`, `GET /api/v1/medicine/search/composition`, `POST /api/v1/medicine/add`
- **Invoices**: `GET /api/v1/invoice`, `GET /api/v1/invoice/stats`, `POST /api/v1/invoice`, `POST /api/v1/invoice/:id/settle`, `DELETE /api/v1/invoice/:id`
- **Reports**: `GET /api/v1/reports`, `GET /api/v1/reports/summary`
- **Messages**: `GET /api/v1/message/getall`, `POST /api/v1/message/send`
- **Referrals**: `GET /api/v1/referral/all`, `POST /api/v1/referral/create`, `GET /api/v1/hospital/all`
- **Staff & Roles**: `GET /api/v1/user/compounders`, `POST /api/v1/user/compounder/addnew`, `PUT /api/v1/user/role/:id`

---

## 📦 Building Native Binaries (APK / IPA)

To build standalone production APKs or iOS builds using Expo Application Services (EAS):
```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android --profile preview
eas build --platform ios --profile preview
```
