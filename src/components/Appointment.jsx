import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import api from "../utils/api";
import Modal from "react-modal";
// @ts-ignore
import jsPDF from "jspdf";
import {
  dobToAge,
  dobToAgeParts,
  formatAge,
  ageToDob,
} from "../utils/ageUtils";
import { useSnackbar } from "../context/SnackbarContext";
import "./Appointment.css";
import { useNavigate } from "react-router-dom";

const Appointment = () => {
  const snackbar = useSnackbar();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  // const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [nic, setNic] = useState("");
  const [dob, setDob] = useState("");
  const [ageYears, setAgeYears] = useState("");
  const [ageMonths, setAgeMonths] = useState("");
  const [ageDays, setAgeDays] = useState("");
  const [gender, setGender] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [department, setDepartment] = useState("Pediatrics");
  const [doctorFirstName, setDoctorFirstName] = useState("");
  const [doctorLastName, setDoctorLastName] = useState("");
  const [profession, setProfession] = useState("");
  const [address, setAddress] = useState("");
  const [_id, set_id] = useState("");
  const [hasVisited, setHasVisited] = useState(false);
  const [price, setPrice] = useState(0);
  const [doctorFee, setDoctorFee] = useState(100);
  const [diagnosys, setDiagnosys] = useState({ BP: "", PR: "", SPO2: "", Temp: "", Height: "", Weight: "", BMI: "", Others: "" });
  const [paymentStatus, setPaymentStatus] = useState("Pending");

  const [downloadInvoice, setDownloadInvoice] = useState(false);
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [invoiceFields, setInvoiceFields] = useState({
    address: "",
    doctorFee: 100,
    price: 0,
    paymentStatus: "Pending",
  });
  const [step, setStep] = useState(1);
  const [departmentSearch, setDepartmentSearch] = useState("");
  const [searchNameOrPhone, setSearchNameOrPhone] = useState("");
  const [patientSuggestions, setPatientSuggestions] = useState([]);
  const [doctorList, setDoctorList] = useState([]);
  const [showPatientSuggestions, setShowPatientSuggestions] = useState(false);
  const suggestRef = useRef();
  const suggestTimer = useRef();
  const formRef = useRef(null);
  const keysPressed = useRef(new Set());

  const departmentsArray = [
    "Pediatrics",
    "Orthopedics",
    "Cardiology",
    "Neurology",
    "Oncology",
    "Radiology",
    "Physical Therapy",
    "Dermatology",
    "ENT",
  ];

  const professions = [
    "Farmer",
    "Toto Driver",
    "Laborer / Day Laborer",
    "Teacher",
    "Professor",
    "Student",
    "Housewife/Homemaker",
    "Shopkeeper",
    "Driver (auto, truck, taxi)",
    "Clerk",
    "Police personnel",
    "Army personnel",
    "Businessman",
    "Sweeper/Sanitation worker",
    "Tailor",
    "Barber",
    "Electrician",
    "Plumber",
    "Mechanic",
    "Mason",
    "Painter",
    "Fisherman",
    "Watchman/Security guard",
    "Nurse",
    "Doctor",
    "Engineer",
    "Technician",
    "Imam",
    "Vendor (street, market)",
    "Unemployed",
    "Retired",
  ];
  const [doctors, setDoctors] = useState([]);
  const [dashboardUser, setDashboardUser] = useState(null);
  const [canBook, setCanBook] = useState(false);
  const dispatch = useDispatch();
  const appointmentState = useSelector((s) => s.appointment);
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const { data } = await api.get(`/api/v1/user/doctors`);
        setDoctors(data.doctors || []);
      } catch (err) {
        snackbar.error(err?.response?.data?.message || "Failed to fetch doctors");
      }
    };
    fetchDoctors();
    // check dashboard session
    const checkDashboard = async () => {
      try {
        const { data: res } = await api.get(`/api/v1/user/dashboard/me`);
        setDashboardUser(res?.user || null);
        setCanBook(["Admin", "Doctor", "Compounder"].includes(res?.user?.role));
      } catch (e) {
        setDashboardUser(null);
        setCanBook(false);
      }
    };
    checkDashboard();
  }, []);

  // keyboard navigation inside the appointment form
  useEffect(() => {
    const selector =
      "input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])";

    const getFocusable = (container) => {
      if (!container) return [];
      return Array.from(container.querySelectorAll(selector)).filter(
        (el) => el.offsetParent !== null
      );
    };

    const focusNext = (active) => {
      const container = formRef.current;
      if (!container) return false;
      const focusables = getFocusable(container);
      const idx = focusables.indexOf(active);
      if (idx >= 0 && idx < focusables.length - 1) {
        focusables[idx + 1].focus();
        return true;
      }
      return false;
    };

    const focusPrev = (active) => {
      const container = formRef.current;
      if (!container) return false;
      const focusables = getFocusable(container);
      const idx = focusables.indexOf(active);
      if (idx > 0) {
        focusables[idx - 1].focus();
        return true;
      }
      return false;
    };

    const onKeyDown = (e) => {
      const active = document.activeElement;
      // only handle when focus is inside the form
      if (!formRef.current || !formRef.current.contains(active)) return;

      // track pressed keys for combos
      keysPressed.current.add(e.key);

      const isCtrl = e.ctrlKey || e.metaKey;

      // Ctrl/Cmd+V -> save & print (scoped)
      if (isCtrl && (e.key === "v" || e.key === "V")) {
        e.preventDefault();
        setDownloadInvoice(true);
        setTimeout(() => handleAppointment(), 50);
        return;
      }

      // allow native behavior for buttons, links, selects and checkboxes/radios
      if (active) {
        const tag = active.tagName;
        const type = active.type || "";
        if (tag === "TEXTAREA") return;
        if (tag === "BUTTON" || tag === "A" || tag === "SELECT") return;
        if (tag === "INPUT" && (type === "checkbox" || type === "radio"))
          return;
      }

      // Enter handling: plain Enter -> next field; Enter+Tab -> next step
      if (e.key === "Enter") {
        // detect Enter+Tab combo via keysPressed
        const hasTab = keysPressed.current.has("Tab");
        if (hasTab) {
          e.preventDefault();
          setStep((s) => Math.min(s + 1, 4));
          return;
        }
        e.preventDefault();
        const moved = focusNext(active);
        if (!moved) {
          setStep((s) => Math.min(s + 1, 4));
        }
        return;
      }

      // Arrow navigation
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const moved = focusNext(active);
        if (!moved) setStep((s) => Math.min(s + 1, 4));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        const moved = focusPrev(active);
        if (!moved) setStep((s) => Math.max(s - 1, 1));
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setStep((s) => Math.min(s + 1, 4));
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setStep((s) => Math.max(s - 1, 1));
        return;
      }
    };

    const onKeyUp = (e) => {
      // remove from pressed set
      keysPressed.current.delete(e.key);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [formRef]);

  // set default appointment date to today (yyyy-mm-dd)
  useEffect(() => {
    if (!appointmentDate) {
      const d = new Date();
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      setAppointmentDate(`${yyyy}-${mm}-${dd}`);
    }
  }, []);

  // auto-generate NIC if missing when phone changes
  // useEffect(() => {
  //   if (!nic && phone) {
  //     const base = (phone + Date.now().toString()).replace(/\D/g, "");
  //     setNic(base.slice(0, 13).padEnd(13, "0"));
  //   }
  // }, [phone]);

  useEffect(() => {
    if (!dashboardUser || !doctors.length) return;

    let filteredDoctors = [];
    if (dashboardUser.role === 'Admin') {
      filteredDoctors = doctors;
    } else if (dashboardUser.role === 'Doctor') {
      filteredDoctors = doctors.filter(doc => doc._id === dashboardUser._id);
    } else if (dashboardUser.role === 'Compounder') {
      const assigned = (dashboardUser.assignedDoctors || []).map(d => String(d?._id || d?.id || d));
      filteredDoctors = doctors.filter(doc => assigned.includes(String(doc._id)));
    }

    setDoctorList(filteredDoctors);

    if (filteredDoctors.length > 0) {
      set_id(filteredDoctors[0]._id);
    } else {
      set_id('');
    }

  }, [dashboardUser, doctors]);

  useEffect(() => {
    if (_id) {
      const d = doctors.find((doc) => doc._id === _id);
      if (d) {
        setDoctorFirstName(d.firstName);
        setDoctorLastName(d.lastName);
        setDoctorFee(d.consultationFee || 100);
        setPrice(Math.round((d.consultationFee || 100) * 0.2));
      }
    }
  }, [_id, doctors]);

  const handleAppointment = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    try {
      // Name parsing logic
      let firstName = "";
      let lastName = "";
      if (name && name.trim()) {
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) {
          firstName = parts[0];
          lastName = "";
        } else if (parts.length === 2) {
          firstName = parts[0];
          lastName = parts[1];
        } else if (parts.length > 2) {
          firstName = parts[0];
          lastName = parts.slice(1).join(" ");
        }
      }
      const hasVisitedBool = Boolean(hasVisited);

      // Calculate BMI if height and weight are available
      let bmiValue = "";
      const heightInMeters = Number(diagnosys.Height) / 100;
      const weightInKg = Number(diagnosys.Weight);
      if (heightInMeters > 0 && weightInKg > 0) {
        const bmi = (weightInKg / (heightInMeters * heightInMeters)).toFixed(2);
        bmiValue = bmi;
      }

      // Combine calculated BMI with any manually entered "Others" text
      // const othersValue = [bmiString, diagnosys.Others].filter(Boolean).join('; ');

      // Append units to diagnosys fields for the payload
      const diagnosysForPayload = {
        BP: diagnosys.BP ? diagnosys.BP : undefined,
        PR: diagnosys.PR ? diagnosys.PR : undefined,
        SPO2: diagnosys.SPO2 ? diagnosys.SPO2 : undefined,
        Temp: diagnosys.Temp ? diagnosys.Temp : undefined,
        Height: diagnosys.Height ? diagnosys.Height : undefined,
        Weight: diagnosys.Weight ? diagnosys.Weight : undefined,
        BMI: bmiValue ? bmiValue : undefined,
        Others: diagnosys.Others ? diagnosys.Others : undefined,
      };

      const payload = {
        firstName: firstName,
        lastName: lastName || "Not Confirmed",
        name,
        // email: email || undefined,
        phone,
        nic: nic || undefined,
        dob: dob || undefined,
        // send numeric years for backend compatibility; prefer ageYears then fallback to undefined
        age:
          ageYears !== "" && ageYears !== null && ageYears !== undefined
            ? Number(ageYears)
            : undefined,
        gender,
        appointment_date: appointmentDate
          ? new Date(appointmentDate).toISOString()
          : undefined,
        department,
        doctorId: _id || undefined,
        hasVisited: hasVisitedBool,
        profession,
        address,
        price,
        // send paymentStatus to backend and let backend decide status according to centralized rules
        paymentStatus,
        // do not set status from frontend creation; backend will harmonize (Paid -> Accepted at creation)
        status: undefined,
        // match backend schema keys and casing
        result: { diagnosys: diagnosysForPayload },
      };
      // payload prepared for appointment creation
      if (!canBook)
        return snackbar.error(
          "Only Admin/Doctor/Compounder may create appointments. Please login to dashboard."
        );
      // debug: log payload being dispatched so we can confirm data sent
      // dispatch redux action to create appointment (saga handles download)
      console.log('Creating appointment with payload:', payload);
      dispatch({
        type: "appointment/createAppointmentRequest",
        payload: { payload, download: downloadInvoice },
      });

      // Let saga handle success. Saga will toast. We listen to appointmentState below to reset.
    } catch (error) {
      // show friendly error to user
      snackbar.error(
        error?.response?.data?.message || "An error occurred. Please try again."
      );
    }
  };

  // reset form on successful appointment creation
  useEffect(() => {
    if (appointmentState && appointmentState.lastCreated) {
      setName("");
      // setEmail("");
      setPhone("");
      setNic("");
      setDob("");
      setAgeYears("");
      setAgeMonths("");
      setAgeDays("");
      setGender("");
      setAppointmentDate("");
      setDepartment("Pediatrics");
      setDoctorFirstName("");
      setDoctorLastName("");
      setHasVisited(false);
      setProfession("")
      setAddress("");
      set_id("");
      setPrice(0);
      setDiagnosys({ BP: "", PR: "", SPO2: "", Temp: "", Height: "", Weight: "", BMI: "", Others: "" });
      setDownloadInvoice(false);
      setStep(1);
    }
  }, [appointmentState.lastCreated]);

  const handlePrefillFromVisited = async () => {
    if (!searchNameOrPhone) return snackbar.error("Enter name or phone to search");
    try {
      const q = encodeURIComponent(searchNameOrPhone);
      // use api helper (axios instance) instead of undefined globals
      const { data } = await api.get(`/api/v1/appointment/search`, { params: { q } });
      const appt = data.appointments[0];
      if (appt) {
        setName(
          appt.name || `${appt.firstName || ""} ${appt.lastName || ""}`.trim()
        );
        // setEmail(appt.email || "");
        setPhone(appt.phone || "");
        setNic(appt.nic || "");
        if (appt.dob) {
          const iso = new Date(appt.dob).toISOString().slice(0, 10);
          setDob(iso);
          const parts = dobToAgeParts(iso);
          if (parts) {
            setAgeYears(parts.years);
            setAgeMonths(parts.months);
            setAgeDays(parts.days);
          }
        } else if (appt.age) {
          // if only numeric age is available, set years and clear months/days
          setAgeYears(appt.age);
          setAgeMonths("");
          setAgeDays("");
        }
        setProfession(appt.profession || "");
        setAddress(appt.address || "");
        setDepartment(appt.department || department);
        if (appt.doctorId) set_id(appt.doctorId);
        snackbar.success("Prefilled from previous appointment");
      }
    } catch (err) {
      snackbar.error(
        err?.response?.data?.message || "No previous appointment found"
      );
    }
  };

  // simple focus navigation: Enter -> next focusable, Shift+Enter -> previous
  const handleKeyNavigation = (e) => {
    if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      const form = formRef.current;
      if (!form) return;
      const focusable = Array.from(
        form.querySelectorAll("input,select,textarea,button")
      ).filter((el) => !el.disabled && el.type !== "hidden");
      const idx = focusable.indexOf(document.activeElement);
      if (e.shiftKey) {
        const prev = focusable[Math.max(0, idx - 1)];
        if (prev) prev.focus();
      } else {
        const next = focusable[Math.min(focusable.length - 1, idx + 1)];
        if (next) {
          // if next is a button to change step, trigger step change
          if (next.dataset && next.dataset.step) {
            setStep(Number(next.dataset.step));
            next.focus();
          } else {
            next.focus();
          }
        }
      }
    }
  };
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); // normalize to local date
  const todayStr = d.toISOString().split("T")[0];

  return (
    <>
      <section className="page">
        <div className="back-btn-box">
          <button className="arrow-btn" onClick={() => navigate("/")}></button>
        </div>
        <div className="  appointment-form">
          <div className="appointment-header">
            {/* <img src="/logo.png" alt="PathologyLab Logo" className="appointment-logo" /> */}
            <h2>Appointment</h2>
          </div>
          <div className="mb-05rem">
            <small>Step {step} of 2</small>
            <div className="float-right">
              <small>Shortcut: Ctrl/Cmd+P to submit & download</small>
            </div>
          </div>
          <form
            ref={formRef}
            onKeyDown={handleKeyNavigation}
            onSubmit={handleAppointment}
          >
            <div className="has-visited-box ">
              <div className="checkbox-container">
                <p className="font-1rem mb-0">
                  Have you visited before?
                </p>
                <input
                  type="checkbox"
                  checked={hasVisited}
                  onChange={(e) => setHasVisited(e.target.checked)}
                />
              </div>
              {/* {hasVisited && (
                <div className="search-container">
                  <input
                    type="search"
                    placeholder="Search by name or phone"
                    value={searchNameOrPhone}
                    onChange={(e) => setSearchNameOrPhone(e.target.value)}
                  />
                  <button type="button" onClick={handlePrefillFromVisited}>
                    Search
                  </button>
                </div>
              )} */}
            </div>
            {step === 1 && (
              <div className="position-relative">
                {showPatientSuggestions &&
                      patientSuggestions &&
                      patientSuggestions.length > 0 && (
                        <div
                          style={{
                            position: "absolute",
                            left: 0,
                            right: 0,
                            top: "3rem",
                            background: "#fff",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                            zIndex: 1200,
                            maxHeight: 220,
                            overflowY: "auto",
                          }}
                        >
                          {patientSuggestions.map((p) => (
                            <div
                              key={p._id}
                              style={{
                                padding: "8px 10px",
                                borderBottom: "1px solid #eee",
                                cursor: "pointer",
                              }}
                              onClick={() => {
                                snackbar.success("Prefilled existing patient");
                                // autofill fields
                                setName(p.name || "");
                                setPhone(p.phone || "");
                                setNic(p.nic || "");
                                if (p.profession) setProfession(p.profession)
                                if (p.address) setAddress(p.address);
                                // fill dob/age/gender if present (but do NOT override appointmentDate)
                                if (p.dob) {
                                  const iso = new Date(p.dob)
                                    .toISOString()
                                    .slice(0, 10);
                                  setDob(iso);
                                  const parts = dobToAgeParts(iso);
                                  if (parts) {
                                    setAgeYears(String(parts.years || ""));
                                    setAgeMonths(String(parts.months || ""));
                                    setAgeDays(String(parts.days || ""));
                                  }
                                } else if (p.age) {
                                  setAgeYears(String(p.age || ""));
                                  setAgeMonths("");
                                  setAgeDays("");
                                }
                                if (p.gender) setGender(p.gender);
                                // mark as visited (we found existing patient)
                                setHasVisited(true);
                                setShowPatientSuggestions(false);
                              }}
                            >
                              <div className="fw-600">{p.name}</div>
                              <div className="muted font-13">
                                {p.phone || p.email || p.profession || p.address || ""}
                              </div>
                            </div>
                          ))}
                        </div>
                    )}
                <div className="lnr-input-box">
                  <div className="flex-1 w-100" ref={suggestRef}>
                    <input
                      type="text"
                      placeholder="Full Name"
                      className="w-100"
                      value={name}
                      onChange={(e) => {
                        const v = e.target.value;
                        setName(v);
                        // debounce suggestions
                        if (suggestTimer.current)
                          clearTimeout(suggestTimer.current);
                        if (!v || v.trim().length < 2) {
                          setPatientSuggestions([]);
                          setShowPatientSuggestions(false);
                          return;
                        }
                        suggestTimer.current = setTimeout(async () => {
                          try {
                            const q = encodeURIComponent(v);
                            const { data } = await api.get(
                              `/api/v1/appointment/suggest`,
                              { params: { q, limit: 8 } }
                            );
                            setPatientSuggestions(data.patients || []);
                            setShowPatientSuggestions(true);
                          } catch (err) {
                            setPatientSuggestions([]);
                            setShowPatientSuggestions(false);
                          }
                        }, 300);
                      }}
                    />
                    
                  </div>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Others">Others</option>
                  </select>
                </div>
                <div className=" lnr-input-box">
                  <div className=" inner-box-of-lnr">
                    <label htmlFor="">Enter your age:</label>
                    <div className="age-grid">
                      <input
                        type="number"
                        placeholder="Years"
                        min={0}
                        value={ageYears}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^0-9]/g, "");
                          setAgeYears(v && v>150 ? 150:v);
                          // compute DOB from parts
                          const y = Number(v) || 0;
                          const m = Number(ageMonths) || 0;
                          const d = Number(ageDays) || 0;
                          const computed = (() => {
                            // subtract y/m/d from today
                            const dt = new Date();
                            dt.setFullYear(dt.getFullYear() - y);
                            // subtract months
                            const month = dt.getMonth() - m;
                            dt.setMonth(month);
                            // subtract days
                            dt.setDate(dt.getDate() - d);
                            dt.setMinutes(
                              dt.getMinutes() - dt.getTimezoneOffset()
                            );
                            return dt.toISOString().slice(0, 10);
                          })();
                          setDob(computed);
                        }}
                      />
                      <input
                        type="number"
                        placeholder="Months"
                        min={0}
                        max={12}
                        value={ageMonths}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^0-9]/g, "");
                          setAgeMonths(v && v > 12 ? 12:v);
                          const y = Number(ageYears) || 0;
                          const m = Number(v) || 0;
                          const d = Number(ageDays) || 0;
                          const dt = new Date();
                          dt.setFullYear(dt.getFullYear() - y);
                          dt.setMonth(dt.getMonth() - m);
                          dt.setDate(dt.getDate() - d);
                          dt.setMinutes(
                            dt.getMinutes() - dt.getTimezoneOffset()
                          );
                          setDob(dt.toISOString().slice(0, 10));
                        }}
                      />
                      <input
                        type="number"
                        placeholder="Days"
                        min={0}
                        max={31}
                        value={ageDays}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^0-9]/g, "");
                          setAgeDays(v && v > 31 ? 31:v);
                          const y = Number(ageYears) || 0;
                          const m = Number(ageMonths) || 0;
                          const d = Number(v) || 0;
                          const dt = new Date();
                          dt.setFullYear(dt.getFullYear() - y);
                          dt.setMonth(dt.getMonth() - m);
                          dt.setDate(dt.getDate() - d);
                          dt.setMinutes(
                            dt.getMinutes() - dt.getTimezoneOffset()
                          );
                          setDob(dt.toISOString().slice(0, 10));
                        }}
                      />
                    </div>
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    pattern="\d{10}"
                    placeholder="Mobile Number"
                    value={phone}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setPhone(v);
                    }}
                  />
                </div>
                <div className="lnr-input-box">
                  <select
                    value={profession}
                    onChange={(e) => setProfession(e.target.value)}
                  >
                    <option value="">Select Profession</option>
                    {professions.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                    <div className="inner-box-of-lnr">
                      <label htmlFor="">Addrrss:</label>
                      <textarea className="address-box"
                        rows="1"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Area, vill/City, P.O, P.S, District, PIN code"
                      />
                    </div>
                </div>
                <div className="btn-container">
                  <button
                  className="btn-cls next-btn"
                    type="button"
                    data-step="2"
                    onClick={() => setStep(2)}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <div className="vitals-grid">
                      <input
                        type="text"
                        placeholder="BP (e.g., 120/80 mm of Hg)"
                        maxLength={7}
                        value={diagnosys.BP}
                        onChange={(e) => setDiagnosys(d => ({ ...d, BP: e.target.value }))}
                      />
                      <input
                        type="number"
                        placeholder="PR (bpm)"
                        min="20"
                        max="500"
                        value={diagnosys.PR}
                        onChange={(e) => {
                          const v = e.target.value;
                          setDiagnosys(d => ({ ...d, PR: v && v>500? 500:v }))
                        }}
                      />

                      <input
                        type="number"
                        placeholder="SPO2 (% in RA)"
                        min="0"
                        max="100"
                        inputMode="numeric"
                        value={diagnosys.SPO2}
                        onChange={(e) => {
                          const v = e.target.value
                          setDiagnosys(d => ({ ...d, SPO2: v && v>100? 100:v }));
                        }}
                      />
                      <input
                        type="number"
                        placeholder="Temp (F)"
                        min="50"
                        max="200"
                        value={diagnosys.Temp}
                        onChange={(e) => {
                          const v = e.target.value;
                          setDiagnosys(d => ({ ...d, Temp: v && v>200? 200:v }))
                        }}
                      />
                      <input
                        type="number"
                        placeholder="Height (cm)"
                        min="30"
                        max="250"
                        value={diagnosys.Height}
                        onChange={(e) => {
                          const v = e.target.value;
                          setDiagnosys(d => ({ ...d, Height: v && v>250? 250:v }))
                        }}
                      />

                      <input
                        type="number"
                        placeholder="Weight (kg)"
                        min="1"
                        max="300"
                        value={diagnosys.Weight}
                        onChange={(e) => {
                          const v = e.target.value;
                          setDiagnosys(d => ({ ...d, Weight: v && v>300? 300:v }))
                        }}
                      />
                </div>
                <div className="lnr-input-box">
                      <textarea
                        rows="2"
                        value={diagnosys.Others}
                        onChange={(e) => setDiagnosys(d => ({ ...d, Others: e.target.value }))}
                        placeholder="Others"
                      />
                      <input
                        type="date"
                        placeholder="Appointment Date"
                        min={todayStr}
                        value={appointmentDate}
                        onChange={(e) => {
                          const v = e.target.value;
                          setAppointmentDate(v && v < todayStr ? todayStr : v);
                        }}
                      />
                </div>

                <div className="lnr-input-box">
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    disabled={dashboardUser && dashboardUser.role === "Doctor"}
                  >
                    {departmentsArray.map((depart) => (
                      <option value={depart} key={depart}>
                        {depart}
                      </option>
                    ))}
                  </select>
                  <select
                    value={_id}
                    onChange={(e) => set_id(e.target.value)}
                    disabled={dashboardUser && dashboardUser.role === "Doctor"}
                  >
                    <option value="">Select Doctor</option>
                    {doctorList.map((doctor) => (
                      <option value={doctor._id} key={doctor._id}>
                        {doctor.firstName} {doctor.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="fees-detail-box">
                  Appointment Fee: {price} Rs
                  <br />
                  Doctor Fee: {doctorFee} Rs
                  <br />
                  <b>Total: {price + doctorFee} Rs</b>
                </div>

                <div className="mt-2rem">
                  <div className="invoice-container">
                    <div className="checkbox-container mt-1rem py-05rem">
                      <div className="pay-status-box">
                        <label htmlFor="">Payment Status: </label>
                        <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
                          <option value="Pending">Pending</option>
                          <option value="Paid">Paid</option>
                        </select>
                      </div>

                      <div className="btn-container">
                        <button className="btn-cls" type="button" onClick={() => { setInvoiceFields({ address, doctorFee, price, paymentStatus }); setShowInvoicePreview(true); }}>
                          Preview
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="btn-container">
                  <button type="button" className="btn-cls" onClick={() => setStep(1)}>Back</button>
                  <button type="submit" className="btn-cls">GET APPOINTMENT</button>
                </div>
              </div>
            )}
          </form>
        </div>
      </section>
      {/* change into jsx page instead of model?? */}
      <Modal
        isOpen={showInvoicePreview}
        onRequestClose={() => setShowInvoicePreview(false)}
        contentLabel="Invoice Preview"
        style={{
          overlay: { zIndex: 1000, background: "rgba(0,0,0,0.5)" },
          content: {
            maxWidth: "600px",
            margin: "auto",
            borderRadius: "12px",
            padding: "2rem",
          },
        }}
      >
        <div
          className="flex-jc-sb-ai-c"
        >
          <img
            src="/logo.png"
            alt="logo"
            className="w-80px br-50pct"
          />
          <h2 className="m-0">Appointment Invoice</h2>
        </div>
        <hr />
        <div
          className="flex-jc-sb-ai-c mt-1rem"
        >
          <div className="flex-1">
            <h3>Patient Info</h3>
            <div>Name: {name}</div>
            <div>
              Age:{" "}
              {
                // prefer DOB-based formatted age when DOB is available, otherwise show numeric years
                dob
                  ? formatAge(dobToAgeParts(dob))
                  : ageYears
                  ? `${ageYears} years`
                  : ""
              }
            </div>
            <div>
              Address:{" "}
              <input
                type="text"
                value={invoiceFields.address}
                onChange={(e) =>
                  setInvoiceFields((f) => ({ ...f, address: e.target.value }))
                }
                className="w-80pct"
              />
            </div>
          </div>
          <div className="flex-1 text-right">
            <h3>Doctor Info</h3>
            <div>
              Name: {doctorFirstName} {doctorLastName}
            </div>
            <div>Department: {department}</div>
          </div>
        </div>
        <div className="mt-1rem">
          <div>Appointment Date: {appointmentDate}</div>
          <div>
            Valid up to:{" "}
            {(() => {
              if (!appointmentDate) return "-";
              const d = new Date(appointmentDate);
              if (isNaN(d.getTime())) return "-";
              d.setDate(d.getDate() + 2);
              return d.toISOString().slice(0, 10);
            })()}
          </div>
        </div>
        <hr />
        <div className="mt-1rem font-11rem">
          <div>
            Appointment Fee:{" "}
            <input
              type="number"
              value={invoiceFields.price}
              onChange={(e) =>
                setInvoiceFields((f) => ({
                  ...f,
                  price: Number(e.target.value),
                }))
              }
              className="w-80px"
            />{" "}
            Rs
          </div>
          <div>
            Doctor Fee:{" "}
            <input
              type="number"
              value={invoiceFields.doctorFee}
              onChange={(e) =>
                setInvoiceFields((f) => ({
                  ...f,
                  doctorFee: Number(e.target.value),
                }))
              }
              className="w-80px"
            />{" "}
            Rs
          </div>
          <div>
            <b>
              Total:{" "}
              {Number(invoiceFields.price) + Number(invoiceFields.doctorFee)} Rs
            </b>
          </div>
          <div>Paid by: Cash</div>
          <div>
            Payment Status:
              <select
                value={invoiceFields.paymentStatus}
                onChange={(e) =>
                  setInvoiceFields((f) => ({
                    ...f,
                    paymentStatus: e.target.value,
                  }))
                }
                className="ml-05rem"
              >
                <option value="Pending">Pending</option>
                <option value="Paid">Paid</option>
              </select>
          </div>
        </div>
        <div className="mt-2rem text-right">
          <button
            onClick={() => {
              const doc = new jsPDF();
              doc.setFontSize(18);
              doc.text("Appointment Invoice", 20, 20);
              doc.addImage("/logo.png", "PNG", 160, 10, 30, 30);
              doc.setFontSize(12);
              doc.text(`Patient Name: ${name}`, 20, 40);
              doc.text(
                `Age: ${
                  dob ? dobToAge(dob) : ageYears ? `${ageYears} years` : ""
                }`,
                20,
                48
              );
              doc.text(`Address: ${invoiceFields.address}`, 20, 56);
              doc.text(`Doctor: ${doctorFirstName} ${doctorLastName}`, 120, 40);
              doc.text(`Department: ${department}`, 120, 48);
              doc.text(`Appointment Date: ${appointmentDate}`, 20, 70);
              doc.text(
                `Valid up to: ${(() => {
                  if (!appointmentDate) return "-";
                  const d = new Date(appointmentDate);
                  if (isNaN(d.getTime())) return "-";
                  d.setDate(d.getDate() + 2);
                  return d.toISOString().slice(0, 10);
                })()}`,
                20,
                78
              );
              doc.text(`Appointment Fee: ${invoiceFields.price} Rs`, 20, 90);
              doc.text(`Doctor Fee: ${invoiceFields.doctorFee} Rs`, 20, 98);
              doc.text(
                `Total: ${
                  Number(invoiceFields.price) + Number(invoiceFields.doctorFee)
                } Rs`,
                20,
                106
              );
              doc.text(`Paid by: Cash`, 20, 114);
              doc.text(
                `Payment Status: ${
                  invoiceFields.paymentStatus === "Paid"
                    ? "Paid"
                    : "Pending"
                }`,
                20,
                122
              );
              doc.save(`Appointment_Invoice_${name}_${appointmentDate}.pdf`);
            }}
            style={{
              marginRight: "1rem",
              padding: "0.5rem 1.5rem",
              background: "#271776ca",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
            }}
          >
            Download PDF
          </button>
          <button
            onClick={() => setShowInvoicePreview(false)}
            style={{
              padding: "0.5rem 1.5rem",
              background: "#eee",
              border: "none",
              borderRadius: "6px",
            }}
          >
            Close
          </button>
        </div>
      </Modal>
    </>
  );
};

export default Appointment;
