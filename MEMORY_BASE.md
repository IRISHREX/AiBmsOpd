# BMS-OPD Ecosystem — Master Architectural Memory Base

> **Version**: 2.0.0  
> **Last Updated**: September 2026  
> **Ecosystem Repositories**:  
> 1. Backend: `IRISHREX/BMS_OPD_BE` (`c:\PROJECTS\AiBmsOpd\BMS-opd-be`)  
> 2. Web Frontend: `IRISHREX/BMS_OPD_FE` (`c:\PROJECTS\AiBmsOpd\BMS-opd-fe`)  
> 3. Mobile Application: `IRISHREX/AiBmsOpd` (`c:\PROJECTS\AiBmsOpd`)  

---

## 1. Executive Summary & Purpose

The **BMS-OPD** (Outpatient Department Management System) is an enterprise-grade healthcare management platform designed for hospitals, polyclinics, nursing homes, and diagnostic centers. 

The platform spans three synchronized tiers:
1. **BMS-opd-be**: High-throughput REST API microservice powered by Node.js, Express, and MongoDB.
2. **BMS-opd-fe**: Responsive hospital administration web portal built with React 18, Vite, and an interactive clinical workflow.
3. **AiBmsOpd (Mobile)**: Native mobile application built on React Native 0.74 & Expo SDK 51, providing on-the-go clinical consultations, prescription authoring, dual inbound/outbound patient referrals, staff collaboration, and patient billing.

---

## 2. System Architecture & Tech Stack

```
                               ┌──────────────────────────────────────────────┐
                               │               Cloud Database                 │
                               │               MongoDB Atlas                  │
                               └──────────────────────┬───────────────────────┘
                                                      │
                                                      │ Mongoose Models
                                                      ▼
                               ┌──────────────────────────────────────────────┐
                               │           Backend Microservice               │
                               │        BMS-OPD-BE (Node.js/Express)          │
                               │   https://bms-opd-be.onrender.com            │
                               └──────────┬────────────────────────┬──────────┘
                                          │                        │
                    JWT & REST API (JSON) │                        │ REST API / Axios
                                          ▼                        ▼
     ┌──────────────────────────────────────────────┐    ┌──────────────────────────────────────────────┐
     │            Web Administration Portal         │    │           Cross-Platform Mobile App          │
     │            BMS-OPD-FE (React 18 / Vite)      │    │        AiBmsOpd (React Native / Expo 51)     │
     │      Doctors, Admin, Receptionists, Billing  │    │     Doctors, Compounders, Patients, Referrals │
     └──────────────────────────────────────────────┘    └──────────────────────────────────────────────┘
```

### Backend (`BMS-opd-be`)
- **Runtime**: Node.js v18+ / Express.js
- **Database**: MongoDB with Mongoose ORM
- **Authentication**: Stateless JSON Web Tokens (JWT) with HTTP-only cookies and Bearer token fallback for mobile apps.
- **File & Media Storage**: Cloudinary v2 SDK for doctor avatars, prescriptions, patient diagnostic reports.
- **Messaging & Notifications**: Twilio SDK for automated appointment SMS alerts.
- **Error Handling**: Centralized asynchronous error wrapper (`catchAsyncErrors`) and custom `ErrorHandler` middleware.

### Web Frontend (`BMS-opd-fe`)
- **Framework**: React 18 with Vite build tooling.
- **Styling**: Modular Vanilla CSS with responsive design system.
- **Routing**: React Router DOM v6 with role-based Route Guards (`RequireAuth`, `RequirePermission`).
- **State Management**: React Context API for authentication, active patient encounters, and theme states.
- **Canvas / Drawing**: HTML5 Signature Pad for digital doctor signatures.
- **Document Generation**: React-PDF / HTML2Canvas printing for prescriptions and bills.

### Mobile Application (`AiBmsOpd`)
- **Framework**: React Native 0.74.1 / Expo SDK ~51.0.0.
- **Navigation**: React Navigation v6 (Native Stack + Bottom Tab Navigator).
- **Themes**: Dynamic Theme Engine supporting 4 palettes (`Light`, `Dark`, `Pro Golden Dark`, `Pro Golden Light`).
- **Sensory Feedback**: `expo-haptics` tactile vibration and Web Audio API click/chime effects.
- **Print & Share**: `expo-print` for HTML-to-PDF compilation and `expo-sharing` for WhatsApp/Email sharing.
- **Deployment**: EAS Build (Expo Application Services) with 1-click local and cloud APK compilation pipeline.

---

## 3. User Roles & Permission Scope

| User Role | Scope & Capabilities | Primary Interface |
| :--- | :--- | :--- |
| **Admin / Superuser** | Complete administrative control. Manage doctors, compounders, hospital departments, invoice settings, global reports, capacity calendars, and user credentials. | Web FE & Mobile App |
| **Doctor / Consultant** | Clinical workstation. View scheduled appointments, review patient history, generate digital prescriptions, manage capacity slots, issue patient referrals, and view doctor revenue. | Web FE & Mobile App |
| **Compounder / Assistant** | Front-desk operations. Register walk-in patients, take vitals, manage appointment queues, process invoice payments, hand out printed prescriptions, and manage inventory. | Web FE & Mobile App |
| **Patient / Referrer** | Zero-login inbound patient referral & appointment booking. Browse available specialist doctors, book consultation slots, specify emergency levels, and view doctor qualifications. | Mobile App (Public Booking) & Web FE |

---

## 4. Component & Screen Functional Inventory

### A. Backend Microservices (`BMS-opd-be`)
1. **User Router (`/api/v1/user`)**:
   - `POST /login`: Universal authentication verifying email, password, and role.
   - `GET /dashboard/me`: Fetches profile and assigned compounder/doctor relations.
   - `GET /doctors`: Lists active doctors with departments, fees, and contact info.
   - `POST /doctor/addnew`: Registers a new doctor with avatar upload and assigned compounder.
   - `PUT /doctor/update/:id`: Updates doctor details, visiting fee, and qualification.
   - `GET /compounders`: Lists all compounders with doctor association mappings.
   - `POST /compounder/addnew`: Adds compounder with multi-doctor assignment.
2. **Appointment Router (`/api/v1/appointment`)**:
   - `POST /post`: Creates appointment with automated invoice generation.
   - `GET /getall`: Filters appointments by role, doctor, date range, or status.
   - `PUT /update/:id`: Modifies appointment details, timing, or status (`Pending` -> `Accepted` -> `Completed` -> `Cancelled`).
   - `DELETE /delete/:id`: Removes appointment records.
3. **Referral Router (`/api/v1/referral`)**:
   - `POST /create`: Dual architecture referral creator (supports both internal hospital referrals and public external applicant bookings).
   - `GET /all`: Fetches all referrals with search, doctor filters, and applicant details.
   - `PUT /:id/status`: Updates referral status (`Pending`, `In-Review`, `Accepted`, `Completed`).
   - `POST /:id/convert`: Converts an accepted inbound referral into a live OPD appointment with doctor fees automatically linked.
4. **Invoice Router (`/api/v1/invoice`)**:
   - `GET /all`: Lists patient billing invoices with payment status (`Paid`, `Due`, `Partial`).
   - `PUT /update/:id`: Updates itemized charges, discounts, taxes, and payment status.
5. **Medical Advice & Prescription Router (`/api/v1/medical-advice`)**:
   - Saves clinical findings, vitals (BP, Pulse, SpO2, Temperature), medicines with dosages, lab investigations, and follow-up dates.
6. **Medicine Store Router (`/api/v1/medicine`)**:
   - Inventory tracking: Batch numbers, expiry dates, quantities in stock, reorder levels, unit prices.

---

### B. Mobile Application Screens (`AiBmsOpd`)

1. **`PublicBookingScreen.tsx` (Default First Screen)**:
   - **Zero-Login Patient Entry**: Allows patients or external health workers to book doctor consultations without entering credentials.
   - **Doctor Showcase**: Rich cards displaying doctor photos, specializations, qualifications, visiting fees, and OPD helpline.
   - **Emergency Selector**: Routine, Urgent, and Emergency tags.
   - **Applicant Tracking**: Captures whether booking is for Self, Relative, Primary Health Center (PHC), or Field Health Worker.
   - **Top-Left Staff Login**: Direct navigation switch between Public Patient Portal and Staff Login / Dashboard.
2. **`LoginScreen.tsx`**:
   - **Role Tabs**: Doctor, Admin, Compounder.
   - **Smart Staff Role Recovery**: Automatically checks other staff roles if a user selects the wrong role tab, preventing "User Not Found With This Role!" errors.
   - **Sanitized Backend Switcher**: Allows live testing against local or production Render APIs.
   - **Back Navigation**: Direct button to return to Public Booking.
3. **`DashboardScreen.tsx`**:
   - **Native Status Distribution**: Zero-dependency visual distribution component illustrating Pending, Accepted, Completed, and Cancelled appointments.
   - **KPI Metrics Cards**: Today's Appointments, Pending Consultations, Completed Encounters, and Revenue Generated.
   - **Quick Actions**: Book New Appointment, Register Doctor, Open Rx Store, Patient Billing.
   - **Recent Patients List**: Snapshot of upcoming appointments with status badges.
4. **`AppointmentsScreen.tsx`**:
   - **Queue Management**: Filter by status (`All`, `Pending`, `Accepted`, `Completed`, `Cancelled`) and date.
   - **Patient Autocomplete Lookup**: Auto-suggests existing patient records from previous visits to avoid re-typing demographics.
   - **Doctor & Slot Formatting**: Displays scheduled doctor name, date, and time slot clearly.
   - **Rx Store Integration**: Direct prescription icon button that loads existing prescriptions or opens a clean prescription authoring form.
   - **Lifecycle Integrity**: Completed appointments cannot be rescheduled; instead, a "Book New Appointment" flow is enforced.
5. **`DoctorsScreen.tsx`**:
   - **Doctor Portfolio**: Doctor profile cards with department badges, phone numbers, and fees.
   - **Create Doctor Modal**: Form with compounder auto-suggest picker and avatar upload.
   - **Edit Doctor Modal**: In-place editing of doctor fee, department, qualifications, and active status.
6. **`PrescriptionsScreen.tsx`**:
   - **Prescription Builder**: Medicine search, dosage frequency, duration, food timing instructions.
   - **Template Library**: Save and load reusable prescription templates (e.g. Hypertension, Viral Fever, Post-Op Care).
   - **Header & Footer Customization**: Allows configuring hospital branding, clinic headers, disclaimer footers, and doctor registration numbers.
   - **Digital Signature**: Doctor signature capture pad.
   - **Preview & Download**: Generates pixel-perfect PDFs ready to download or share via WhatsApp/Email.
7. **`InvoicesScreen.tsx`**:
   - **Accurate Billing**: Itemized doctor fees, medicines, diagnostic tests, and procedure fees.
   - **Payment Status Toggle**: Enforces accurate accounting so fully paid invoices cannot show due balances.
   - **Print Invoice**: Generates professional hospital receipts.
8. **`ReferralsScreen.tsx`**:
   - **Dual Referral Hub**: Dedicated management for inbound applicant bookings and intra-hospital doctor referrals.
   - **One-Click Conversion**: "Add as Appointment" converts approved referrals directly into scheduled appointments with visiting fees carried over.
9. **`MedicineStoreScreen.tsx`**:
   - Inventory catalog with stock levels, batch numbers, and low-stock alerts.
10. **`CompoundersScreen.tsx`**:
    - Manage compounders and medical assistants, including assigning multiple doctors to a single compounder.
11. **`ReportsScreen.tsx` & `MessagesScreen.tsx`**:
    - Patient diagnostic reports upload/download and internal staff communication messaging.
12. **`ProfileScreen.tsx` & `MenuScreen.tsx`**:
    - Profile management, password reset, theme selector, and system logout.

---

## 5. Major Enhancements Already Made

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                           COMPLETED ENHANCEMENTS                               │
├────────────────────────────────┬───────────────────────────────────────────────┤
│ Feature Area                   │ Implementation Summary                        │
├────────────────────────────────┼───────────────────────────────────────────────┤
│ 1. Dual Referral Architecture  │ Unified BE schema, FE, and mobile app to      │
│                                │ support both internal clinical referrals and  │
│                                │ inbound patient self-referrals with applicant │
│                                │ tracking (Self, Relative, PHC, Agent).        │
├────────────────────────────────┼───────────────────────────────────────────────┤
│ 2. Public Booking Entry        │ `PublicBookingScreen` opens as default screen │
│                                │ without login required; top-left button       │
│                                │ transitions staff into Login/Dashboard.       │
├────────────────────────────────┼───────────────────────────────────────────────┤
│ 3. Premium Aesthetic Redesign  │ Replaced emojis with Ionicons vector icons;    │
│                                │ established Navy Blue & Royal Gold theme      │
│                                │ with 4 theme modes (Light, Dark, Pro Gold).   │
├────────────────────────────────┼───────────────────────────────────────────────┤
│ 4. Prescription Engine (Mobile)│ Reusable template modal, Header/Footer        │
│                                │ customizer, digital signature capture, PDF    │
│                                │ preview and download (`expo-print`/`sharing`).│
├────────────────────────────────┼───────────────────────────────────────────────┤
│ 5. Native Status Breakdown     │ Removed fragile `react-native-chart-kit` and  │
│                                │ replaced with zero-dependency native progress │
│                                │ bars and status metric cards.                 │
├────────────────────────────────┼───────────────────────────────────────────────┤
│ 6. Patient Autocomplete        │ Auto-suggests existing patient names and      │
│                                │ auto-fills contact info upon selection.       │
├────────────────────────────────┼───────────────────────────────────────────────┤
│ 7. Smart Staff Role Recovery   │ Automatically attempts other staff roles      │
│                                │ (Doctor, Admin, Compounder) if backend rejects│
│                                │ role selection, eliminating login friction.   │
├────────────────────────────────┼───────────────────────────────────────────────┤
│ 8. Production URL Safeguard    │ Configured production Render API endpoints in │
│                                │ `.env` and added Axios interceptors to prevent│
│                                │ localhost network failures on mobile devices. │
├────────────────────────────────┼───────────────────────────────────────────────┤
│ 9. Automated Release Pipeline  │ Created 1-click `npm run release` and root    │
│                                │ `release.bat` that validates code, pushes git,│
│                                │ triggers EAS build, and downloads the APK.    │
└────────────────────────────────┴───────────────────────────────────────────────┘
```

---

## 6. Recommended Future Enhancements (Roadmap)

1. **Push Notifications & Reminders**:
   - Integrate `expo-notifications` and Twilio WhatsApp API to send automated appointment reminders to patients 24 hours and 2 hours before their scheduled slot.
2. **Offline-First Synchronization (WatermelonDB / SQLite)**:
   - For rural health outposts with intermittent internet, cache appointments, patient records, and prescriptions locally and synchronize when connectivity resumes.
3. **Medicine Barcode Scanner**:
   - Integrate `expo-barcode-scanner` into `MedicineStoreScreen` to scan medicine packages and automatically deduct inventory stock during prescription dispensing.
4. **Biometric Staff Authentication**:
   - Implement `expo-local-authentication` for fingerprint and FaceID login for rapid access by busy physicians and compounders.
5. **Multi-Language Localization**:
   - Support English, Hindi, Bengali, and regional languages for patient booking forms and prescription instructions.
6. **Telemedicine & Video Consultation**:
   - WebRTC / Agora video calling integration directly within `AppointmentsScreen` for remote patient follow-ups.

---

## 7. Operational & Deployment Reference

### API Configuration
- **Production Backend API**: `https://bms-opd-be.onrender.com`
- **Environment Key**: `EXPO_PUBLIC_API_URL=https://bms-opd-be.onrender.com`
- **Port**: Default 3000 (Web Vite development)

### EAS Android Build Configuration
- **EAS Project ID**: `4a0946f1-cd14-4c24-8dae-e520c63e2122`
- **Owner**: `irishrex`
- **Latest Build Artifact**: [Build 60b4cc3f](https://expo.dev/accounts/irishrex/projects/irishrex/builds/60b4cc3f-38c1-415e-9894-7d7f665f281f)
- **Local APK Path**: `c:\PROJECTS\AiBmsOpd\bms-opd-release.apk`

### 1-Click Release Trigger
- **Command**: `npm run release` or double-click `release.bat`.
