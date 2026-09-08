import React, { useEffect, useState, useContext } from "react";
import "./preview.css";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchPreviewRequest, resetPreview } from "../store/previewSlice";
import { dobToAge } from "../utils/ageUtils";
import { Context } from "../main";
import { PiPrescriptionBold, PiPrinter } from "react-icons/pi";
import api from "../utils/api";
import { BsDownload } from "react-icons/bs";
import MyDocument from "./MyDocument";
import ReactDOM from 'react-dom';
import { PDFViewer } from '@react-pdf/renderer';

// Helper: format date
const formatDate = (date) =>
  date ? new Date(date).toLocaleDateString("en-GB") : ""; // dd/mm/yyyy
const Preview = () => {
  const { patientId: routePatientId } = useParams();
  const location = useLocation();
  // Preview may receive either a patientId route param or an appointmentId via query or props
  const qs = new URLSearchParams(location.search);
  const appointmentIdFromQuery =
    qs.get("appointmentId") || qs.get("apptId") || null;
  const patientId = routePatientId || appointmentIdFromQuery;
  const dispatch = useDispatch();
  const preview = useSelector((s) => s.preview);
  const patient = preview.patient;
  const doctor = preview.doctor;
  const loading = preview.loading;
  const error = preview.error;
  const [editMode, setEditMode] = useState(false);
  const [printWithHeader, setPrintWithHeader] = useState(true);
  const [printWithFooter, setPrintWithFooter] = useState(true);
  const { isAuthenticated, admin } = useContext(Context);
  const navigate = useNavigate();

  // Construct full image URLs
  const headerImageUrl = doctor?.headerImage ? `${api.defaults.baseURL}${doctor.headerImage}` : "/Header.png";
  const footerImageUrl = doctor?.signImage ? `${api.defaults.baseURL}${doctor.signImage}` : "/Footer.png";

  // Role check
  const canEdit = isAuthenticated && ["Admin", "Doctor"].includes(admin?.role);

  useEffect(() => {
    if (!patientId) return;
    // try to detect whether this is an appointment id (24 hex chars) or a patient id
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(patientId);
    dispatch(fetchPreviewRequest({ patientId }));
    return () => {
      dispatch(resetPreview());
    };
  }, [patientId, dispatch]);


  if (loading)
    return (
      <div className="prescription">
        <span class="loader" style={{height:"3rem"}}></span>      
      </div>
    );
  if (error)
    return (
      <div className="prescription">
        <div style={{ color: "red" }}>{error}</div>
      </div>
    );
  if (!patient)
    return (
      <div className="prescription">
        <div>Patient not found.</div>
      </div>
    );

  const report =
    Array.isArray(patient.report) && patient.report.length > 0
      ? patient.report[0]
      : null;
  const clinic = {
    name: doctor?.clinicName || doctor?.hospital || "",
    address: doctor?.qualifications || "MBBS",
    contact: doctor?.phone || doctor?.email || "",
  };
  const medicines = Array.isArray(report?.medicineAdvice)
    ? report.medicineAdvice.filter((m) => m.name) // Filter out empty/unselected medicines
    : report?.medicineAdvice
    ? [report?.medicineAdvice]
    : [];
  console.log(medicines);
  const previewFollowup =
    (report && report.advice && report.advice.followup_date) ||
    patient.reportdate ||
    report?.followUp ||
    "";

  // --- UI ---
  return (
    <section className="page modern-preview">
      <div className="back-btn-box" style={{ width: "100%" }}>
        <button className="back-btn add-btn" onClick={() => navigate("/")}>
          ← Go Back
        </button>
      </div>
      {report ? (
        <PDFViewer width="100%" height="600px">
          <MyDocument header={headerImageUrl} footer={footerImageUrl} p_data={patient} dr_data={doctor} report={report} />
        </PDFViewer>
      ) : (
        <div className="prescription">
          <p>No report available</p>
        </div>
      )}
    </section>
  );
};

export default Preview;

