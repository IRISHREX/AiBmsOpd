import { Appointment, MedicineAdviceItem } from '../types';
import { PrescriptionSettings } from './prescriptionSettings';

interface GenerateHtmlParams {
  appointment: Appointment;
  doctorName: string;
  doctorSpecialization?: string;
  vitals: Record<string, string>;
  clinicalFindings: Record<string, any>;
  medicines: MedicineAdviceItem[];
  advice?: string;
  diet?: string;
  followUp?: string;
  settings: PrescriptionSettings;
}

export const generatePrescriptionHtml = ({
  appointment,
  doctorName,
  doctorSpecialization,
  vitals,
  clinicalFindings,
  medicines,
  advice,
  diet,
  followUp,
  settings,
}: GenerateHtmlParams): string => {
  const patientName = appointment.name || appointment.patientName || 'Patient';
  const age = appointment.age || appointment.patientAge || 'N/A';
  const gender = appointment.gender || appointment.patientGender || 'N/A';
  const phone = appointment.phone || appointment.patientPhone || 'N/A';
  const address = appointment.address || appointment.patientAddress || 'N/A';
  const dateStr = appointment.appointmentDate || (appointment.appointment_date ? appointment.appointment_date.split('T')[0] : new Date().toLocaleDateString('en-GB'));

  const vitalsList = Object.entries(vitals)
    .filter(([_, val]) => val && val.trim() !== '')
    .map(([key, val]) => `<strong>${key}:</strong> ${val}`)
    .join(' &nbsp;|&nbsp; ');

  const findingsList = Object.entries(clinicalFindings)
    .filter(([_, val]) => {
      if (!val) return false;
      if (typeof val === 'object') return Object.values(val).some(v => !!v);
      return typeof val === 'string' && val.trim() !== '';
    })
    .map(([key, val]) => {
      const displayVal = typeof val === 'object' ? JSON.stringify(val) : val;
      return `<strong>${key.replace(/_/g, ' ').toUpperCase()}:</strong> ${displayVal}`;
    })
    .join(' &nbsp;|&nbsp; ');

  const medicinesRows = medicines && medicines.length > 0
    ? medicines.map((m, idx) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #0f172a;">${idx + 1}. ${m.name || 'Medicine'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #334155;">${m.dose || m.type || '-'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #1e40af; font-weight: 600;">${m.frequency || '-'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #334155;">${m.duration || '-'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 11px;">${m.notes || '-'}</td>
      </tr>
    `).join('')
    : `<tr><td colspan="5" style="padding: 12px; text-align: center; color: #94a3b8;">No medicines prescribed yet</td></tr>`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Prescription - ${patientName}</title>
  <style>
    @page {
      size: A4;
      margin: 10mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 10px;
      font-size: 12px;
      line-height: 1.4;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      border: 1px solid #cbd5e1;
      padding: 16px;
      border-radius: 8px;
    }
    /* Header Section */
    .header-box {
      border-bottom: 2px solid #1e40af;
      padding-bottom: 12px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header-image {
      max-width: 100%;
      max-height: 80px;
      object-fit: contain;
      margin-bottom: 8px;
    }
    .clinic-name {
      font-size: 18px;
      font-weight: 800;
      color: #1e40af;
      margin: 0;
      letter-spacing: 0.5px;
    }
    .clinic-sub {
      font-size: 11px;
      color: #64748b;
      margin: 2px 0;
    }
    .doctor-block {
      text-align: right;
    }
    .dr-name {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }
    .dr-qual {
      font-size: 11px;
      color: #d97706;
      font-weight: 600;
      margin: 2px 0;
    }
    .dr-reg {
      font-size: 10px;
      color: #64748b;
      margin: 0;
    }

    /* Patient Details */
    .patient-strip {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 14px;
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 14px;
    }
    .p-item {
      font-size: 11px;
    }
    .p-label {
      color: #64748b;
      font-weight: 600;
    }
    .p-val {
      font-weight: 700;
      color: #0f172a;
    }

    /* Vitals Strip */
    .vitals-strip {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 11px;
      margin-bottom: 14px;
      color: #78350f;
    }

    /* Clinical findings */
    .clinical-strip {
      background: #eff6ff;
      border: 1px solid #dbeafe;
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 11px;
      margin-bottom: 14px;
      color: #1e3a8a;
    }

    /* Rx Table */
    .rx-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 18px;
      font-weight: 800;
      color: #1e40af;
      margin: 12px 0 8px 0;
    }
    .rx-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    .rx-table th {
      background: #1e40af;
      color: #ffffff;
      padding: 8px;
      text-align: left;
      font-size: 11px;
      font-weight: 700;
    }

    /* Advice */
    .advice-box {
      border: 1px dashed #cbd5e1;
      border-radius: 6px;
      padding: 10px;
      margin-bottom: 14px;
      background: #fafafa;
    }
    .advice-title {
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 4px;
    }

    /* Footer & Seal */
    .footer-section {
      margin-top: 24px;
      border-top: 1px solid #e2e8f0;
      padding-top: 16px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .followup-box {
      font-size: 11px;
      font-weight: 700;
      color: #b45309;
    }
    .signature-box {
      text-align: center;
      min-width: 160px;
    }
    .sign-image {
      max-width: 140px;
      max-height: 50px;
      object-fit: contain;
      margin-bottom: 4px;
    }
    .sign-line {
      border-top: 1px solid #0f172a;
      padding-top: 4px;
      font-size: 11px;
      font-weight: 700;
    }
    .disclaimer {
      font-size: 9px;
      color: #94a3b8;
      text-align: center;
      margin-top: 16px;
      border-top: 1px solid #f1f5f9;
      padding-top: 6px;
    }
  </style>
</head>
<body>
  <div class="container">
    ${settings.printWithHeader ? `
      <div class="header-box">
        <div>
          ${settings.headerImageUrl ? `<img src="${settings.headerImageUrl}" class="header-image" alt="Clinic Letterhead" />` : ''}
          <h1 class="clinic-name">${settings.clinicName || 'BMS MEDICAL OPD'}</h1>
          <p class="clinic-sub">${settings.clinicSubtitle || 'Outpatient Clinic & Healthcare'}</p>
          <p class="clinic-sub">${settings.clinicAddress || ''} • Tel: ${settings.clinicContact || ''}</p>
        </div>
        <div class="doctor-block">
          <h2 class="dr-name">${doctorName}</h2>
          <p class="dr-qual">${doctorSpecialization || settings.doctorDegree || 'Consultant Physician'}</p>
          <p class="dr-reg">${settings.doctorRegNo || 'Regd. Medical Practitioner'}</p>
        </div>
      </div>
    ` : `
      <div style="text-align: right; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
        <strong>${doctorName}</strong> | ${doctorSpecialization || 'Physician'}
      </div>
    `}

    <!-- Patient Details Strip -->
    <div class="patient-strip">
      <div class="p-item"><span class="p-label">Patient:</span> <span class="p-val">${patientName}</span></div>
      <div class="p-item"><span class="p-label">Age/Gender:</span> <span class="p-val">${age} Yrs / ${gender}</span></div>
      <div class="p-item"><span class="p-label">Date:</span> <span class="p-val">${dateStr}</span></div>
      <div class="p-item"><span class="p-label">Phone:</span> <span class="p-val">${phone}</span></div>
      <div class="p-item"><span class="p-label">Address:</span> <span class="p-val">${address}</span></div>
    </div>

    <!-- Vitals -->
    ${vitalsList ? `
      <div class="vitals-strip">
        <strong>Vitals:</strong> ${vitalsList}
      </div>
    ` : ''}

    <!-- Clinical Findings -->
    ${findingsList ? `
      <div class="clinical-strip">
        <strong>Clinical Findings / Provisional Diagnosis:</strong> ${findingsList}
      </div>
    ` : ''}

    <!-- Medicines Table -->
    <div class="rx-header">℞ Medicine Advice</div>
    <table class="rx-table">
      <thead>
        <tr>
          <th style="width: 35%;">Medicine</th>
          <th style="width: 15%;">Dosage</th>
          <th style="width: 20%;">Frequency</th>
          <th style="width: 15%;">Duration</th>
          <th style="width: 15%;">Instructions</th>
        </tr>
      </thead>
      <tbody>
        ${medicinesRows}
      </tbody>
    </table>

    <!-- Advice & Diet -->
    ${(advice || diet) ? `
      <div class="advice-box">
        ${advice ? `<div><span class="advice-title">General Advice:</span> ${advice}</div>` : ''}
        ${diet ? `<div style="margin-top: 4px;"><span class="advice-title">Dietary Guidance:</span> ${diet}</div>` : ''}
      </div>
    ` : ''}

    <!-- Footer with Seal & Sign -->
    <div class="footer-section">
      <div class="followup-box">
        ${followUp ? `📅 Next Follow-up: <strong>${followUp}</strong>` : 'Follow up as advised or SOS in case of emergency.'}
      </div>
      <div class="signature-box">
        ${settings.signImageUrl ? `<img src="${settings.signImageUrl}" class="sign-image" alt="Doctor Signature" /><br/>` : '<div style="height: 36px;"></div>'}
        <div class="sign-line">Authorized Sign & Seal</div>
        <div style="font-size: 10px; color: #64748b;">${doctorName}</div>
      </div>
    </div>

    ${settings.printWithFooter && settings.footerText ? `
      <div class="disclaimer">
        ${settings.footerText}
      </div>
    ` : ''}
  </div>
</body>
</html>
  `.trim();
};
