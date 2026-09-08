import React, { useState, useEffect } from "react";
import "./DoctorDashboard.css";
import SearchHospitalsTab from "./tabs/SearchHospitalsTab";
import QueryResourcesTab from "./tabs/QueryResourcesTab";
import CreateReferralTab from "./tabs/CreateReferralTab";
import TrackReferralsTab from "./tabs/TrackReferralsTab";
import api from "../utils/api";

const DoctorDashboard = ({ isReferralWorkflow = false, initialReferralForm = null, setReferralForm: externalSetReferralForm = null }) => {
  const [activeTab, setActiveTab] = useState(isReferralWorkflow ? "referral" : "referral");
  const [searchFilters, setSearchFilters] = useState({
    location: "",
    specialty: "",
    insurance: "",
    nabh: false,
  });
  const [selectedHospitals, setSelectedHospitals] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [queryParams, setQueryParams] = useState({
    bedType: "general",
    icuType: "",
    otRequired: false,
    services: [],
  });
  const [referralForm, setReferralForm] = useState(
    initialReferralForm || {
      patientId: "",
      patientName: "",
      age: "",
      gender: "male",
      abhaId: "",
      diagnosis: "",
      clinicalNotes: "",
      urgency: "routine",
      requiredCare: "",
      hospitals: [],
    }
  );

  const [referrals, setReferrals] = useState([]);
  const [loadingReferrals, setLoadingReferrals] = useState(false);

  // Fetch hospitals on component mount
  useEffect(() => {
    fetchHospitals();
  }, []);

  // Fetch referrals
  const fetchReferrals = async () => {
    try {
      setLoadingReferrals(true);
      const { data } = await api.get("/api/v1/referral/all");
      setReferrals(data.referrals || []);
    } catch (error) {
      console.error("Error fetching referrals:", error);
    } finally {
      setLoadingReferrals(false);
    }
  };

  // Fetch hospitals
  const fetchHospitals = async () => {
    try {
      setLoadingHospitals(true);
      const { data } = await api.get("/api/v1/hospital/all?limit=50");
      const activeHospitals = data.hospitals.filter(h => h.active && !h.blocked);
      setHospitals(activeHospitals);
    } catch (error) {
      console.error("Error fetching hospitals:", error);
    } finally {
      setLoadingHospitals(false);
    }
  };

  // Update external referral form if provided
  useEffect(() => {
    if (externalSetReferralForm) {
      externalSetReferralForm(referralForm);
    }
  }, [referralForm, externalSetReferralForm]);

  // Handle Create Referral Tab submit
  const handleCreateReferralSubmit = async (formData) => {
    console.log('Create Referral Submitted:', formData);
    setReferralForm(formData);
    // Move to search hospitals tab
    setActiveTab("search");
  };

  // Handle Hospital Selection (multiple)
  const handleHospitalSelect = (selectedHospitalsList) => {
    const updatedForm = {
      ...referralForm,
      hospitals: selectedHospitalsList,
    };
    console.log('Hospitals Selected and Added to Referral:', updatedForm);
    setReferralForm(updatedForm);
    setSelectedHospitals(selectedHospitalsList);
    // Move to query resources tab
    setActiveTab("query");
  };

  // Handle Query Resources submit
  const handleQueryResourcesSubmit = async (queryData) => {
    const submissionData = {
      ...referralForm,
      queryParams: queryData,
    };
    console.log('Query Resources Submitted with Referral Data:', submissionData);
    
    // Validate required fields
    if (!submissionData.patientId) {
      alert('Error: Patient ID is missing. Please try again.');
      return;
    }
    if (!submissionData.patientName) {
      alert('Error: Patient name is missing. Please fill it in.');
      return;
    }
    if (!submissionData.clinicalNotes) {
      alert('Error: Clinical notes are required.');
      return;
    }
    if (!submissionData.diagnosis) {
      alert('Error: Diagnosis is required.');
      return;
    }
    
    setReferralForm(submissionData);

    try {
      // Create referral in database with hospital-specific queries
      const hospitals = submissionData.hospitals.map(h => {
        const hospitalId = h._id || h.id;
        const hospitalQuery = queryData.hospitalQueries && queryData.hospitalQueries[hospitalId];
        
        return {
          hospitalId: hospitalId,
          hospitalName: h.name,
          address: h.address,
          city: h.city,
          state: h.state,
          specialty: h.features?.specialty || [],
          bedCount: h.features?.bedCount || 0,
          icuBedCount: h.features?.icuBedCount || 0,
          rating: h.rating,
          nabh: h.features?.nabh || false,
          // Include hospital-specific query if available
          ...(hospitalQuery && { query: hospitalQuery })
        };
      });

      const referralPayload = {
        patientId: submissionData.patientId,
        patientName: submissionData.patientName,
        age: submissionData.age,
        gender: submissionData.gender,
        abhaId: submissionData.abhaId,
        diagnosis: submissionData.diagnosis,
        clinicalNotes: submissionData.clinicalNotes,
        requiredCare: submissionData.requiredCare,
        urgency: submissionData.urgency,
        hospitals: hospitals,
        queryParams: {
          bedType: queryData.bedType || "general",
          icuType: queryData.icuType || "",
          otRequired: queryData.otRequired || false,
          services: queryData.services || [],
          hospitalQueries: queryData.hospitalQueries, // Include all hospital queries
        },
      };

      console.log('Referral Payload:', referralPayload);
      const { data } = await api.post("/api/v1/referral/create", referralPayload);
      console.log('Referral Created Successfully:', data);
      
      // Send message notification to Sohel.Islam@ibm.com
      try {
        const referralSummary = `
Patient: ${submissionData.patientName} (Age: ${submissionData.age}, ${submissionData.gender})
ABHA ID: ${submissionData.abhaId || 'N/A'}
Diagnosis: ${submissionData.diagnosis}
Clinical Notes: ${submissionData.clinicalNotes}
Urgency: ${submissionData.urgency}
Required Care: ${submissionData.requiredCare || 'N/A'}
Referral Number: ${data.referral.referralNumber}
Status: ${data.referral.status}
Date: ${new Date().toLocaleString()}
        `.trim();

        const messagePayload = {
          firstName: "Referral",
          lastName: "System",
          email: "referral-system@pathologylab.com",
          phone: "9876543210",
          message: referralSummary,
          recipientEmail: "Sohel.Islam@ibm.com",
        };

        await api.post("/api/v1/message/send", messagePayload);
        console.log('Message sent successfully');
      } catch (messageError) {
        console.error('Failed to send message:', messageError);
      }
      
      // Refresh referrals list
      fetchReferrals();
      
      // Reset form and hospitals
      setSelectedHospitals([]);
      setReferralForm({
        patientId: submissionData.patientId, // Keep patient ID for next referral
        patientName: "",
        age: "",
        gender: "male",
        abhaId: "",
        diagnosis: "",
        clinicalNotes: "",
        urgency: "routine",
        requiredCare: "",
        hospitals: [],
      });
    } catch (error) {
      console.error('Error creating referral:', error);
      alert('Error creating referral: ' + (error.response?.data?.message || error.message));
    }

    // Move to track referrals tab
    setActiveTab("tracking");
  };

  // Handle Track Referrals submit (final submission)
  const handleTrackReferralsSubmit = () => {
    const finalData = {
      ...referralForm,
    };
    console.log('Final Referral Submission:', finalData);
    // Final submission complete - refresh referrals
    fetchReferrals();
  };

  const renderReferralTab = () => (
    <CreateReferralTab
      referralForm={referralForm}
      setReferralForm={setReferralForm}
      setActiveTab={setActiveTab}
      onSubmit={isReferralWorkflow ? handleCreateReferralSubmit : undefined}
    />
  );

  const renderSearchTab = () => (
    <SearchHospitalsTab
      searchFilters={searchFilters}
      setSearchFilters={setSearchFilters}
      hospitals={loadingHospitals ? [] : hospitals}
      setSelectedHospitals={setSelectedHospitals}
      setActiveTab={setActiveTab}
      onHospitalSelect={isReferralWorkflow ? handleHospitalSelect : undefined}
      loading={loadingHospitals}
    />
  );

  const renderQueryTab = () => (
    <QueryResourcesTab
      selectedHospitals={selectedHospitals}
      queryParams={queryParams}
      setQueryParams={setQueryParams}
      setActiveTab={setActiveTab}
      onSubmit={isReferralWorkflow ? handleQueryResourcesSubmit : undefined}
    />
  );

  const renderTrackingTab = () => (
    <TrackReferralsTab
      referrals={loadingReferrals ? [] : referrals}
      onSubmit={isReferralWorkflow ? handleTrackReferralsSubmit : undefined}
      loading={loadingReferrals}
    />
  );

  return (
    <section>
      <div className="dashboard">
        <div className="tabs">
          <button
            className={`tab ${activeTab === "referral" ? "active" : ""}`}
            onClick={() => setActiveTab("referral")}
          >
            Create Referral
          </button>
          <button
            className={`tab ${activeTab === "search" ? "active" : ""}`}
            onClick={() => setActiveTab("search")}
          >
            Search Hospitals
          </button>
          <button
            className={`tab ${activeTab === "query" ? "active" : ""}`}
            onClick={() => setActiveTab("query")}
          >
            Query Resources
          </button>

          <button
            className={`tab ${activeTab === "tracking" ? "active" : ""}`}
            onClick={() => setActiveTab("tracking")}
          >
            Track Referrals
          </button>
        </div>
        <div className="dashboard-content">
          {activeTab === "referral" && renderReferralTab()}
          {activeTab === "search" && renderSearchTab()}
          {activeTab === "query" && renderQueryTab()}
          {activeTab === "tracking" && renderTrackingTab()}
        </div>
      </div>
    </section>
  );
};

export default DoctorDashboard;
