import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import DoctorDashboard from './DoctorDashboard';
import { fetchPreviewRequest } from '../store/previewSlice';

const ReferralPage = () => {
  const { referralId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { patient, loading, error } = useSelector((state) => state.preview);

  const [referralForm, setReferralForm] = useState({
    patientId: '',
    patientName: '',
    age: '',
    gender: 'male',
    abhaId: '',
    diagnosis: '',
    clinicalNotes: 'allocate bed urgently',
    urgency: 'routine',
    requiredCare: 'follow the prescription',
    attachments: [],
    hospital: null,
  });

  // Fetch appointment data when component mounts
  useEffect(() => {
    if (referralId) {
      // referralId is actually the appointmentId from the dashboard link
      dispatch(fetchPreviewRequest({ appointmentId: referralId }));
    }
  }, [referralId, dispatch]);

  // Populate form when patient data is loaded
  useEffect(() => {
    if (patient) {
      const calculateAge = (dob) => {
        if (!dob) return '';
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        return age;
      };

      // Format diagnosis from diagnosys object with all vital parameters
      const formatDiagnosis = (diagnosysObj) => {
        if (!diagnosysObj || typeof diagnosysObj !== 'object') {
          return '';
        }

        const diagnosticValues = [];
        const { BP, PR, SPO2, Temp, Height, Weight, BMI, Others } = diagnosysObj;

        if (BP) diagnosticValues.push(`BP: ${BP}`);
        if (PR) diagnosticValues.push(`PR: ${PR}`);
        if (SPO2) diagnosticValues.push(`SPO2: ${SPO2}`);
        if (Temp) diagnosticValues.push(`Temp: ${Temp}`);
        if (Height) diagnosticValues.push(`Height: ${Height}`);
        if (Weight) diagnosticValues.push(`Weight: ${Weight}`);
        if (BMI) diagnosticValues.push(`BMI: ${BMI}`);
        if (Others) diagnosticValues.push(`Others: ${Others}`);

        return diagnosticValues.join(' | ');
      };

      // Extract diagnosis from report data if available
      let diagnosis = '';
      if (patient.report && patient.report.length > 0) {
        const reportData = patient.report[0];
        if (reportData?.diagnosys) {
          diagnosis = formatDiagnosis(reportData.diagnosys);
        } else if (reportData?.diagnosis) {
          diagnosis = reportData.diagnosis;
        }
      }
      
      // Ensure diagnosis is not empty
      if (!diagnosis || diagnosis.trim() === '') {
        diagnosis = 'Patient requires specialized care and evaluation';
      }

      setReferralForm((prev) => ({
        ...prev,
        patientId: patient._id || patient.id,
        patientName: `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || patient.name || '',
        age: calculateAge(patient.dob),
        gender: patient.gender || 'male',
        abhaId: patient.nic || '', // NIC as ABHA ID
        diagnosis: diagnosis,
        clinicalNotes: 'allocate bed urgently',
        urgency: 'routine',
        requiredCare: 'follow the prescription',
        attachments: [],
      }));
    }
  }, [patient]);

  if (loading) {
    return <div className="loading">Loading patient data...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="referral-page">
      <DoctorDashboard
        isReferralWorkflow={true}
        initialReferralForm={referralForm}
        setReferralForm={setReferralForm}
      />
    </div>
  );
};

export default ReferralPage;
