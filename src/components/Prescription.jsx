import React, { useEffect, useState, useMemo } from "react";
import AutoSuggestInput from "./AutoSuggestInput";
import AutoSuggestInputforSymptom from "./AutoSuggestInputforSymptom";
import useSymptomSuggestions from "./useSymptomSuggestions";
import useMedicineSuggestions from "./useMedicineSuggestions";
import api from "../utils/api";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "../context/SnackbarContext";
import { playSaveSound } from "../utils/soundUtils";
import "./Prescription.css";
import { addMedicineRequest } from "../store/medicineSlice";
import {
  IoIosClose,
  IoIosCloseCircle,
  IoIosCloseCircleOutline,
} from "react-icons/io";
import { FaSave } from "react-icons/fa";
import { BsPrinter, BsTrash } from "react-icons/bs";
import { FaChevronDown } from "react-icons/fa";
import { FaChevronUp } from "react-icons/fa";
import { TbLoader3, TbRefresh } from "react-icons/tb";
import { useSelector, useDispatch } from "react-redux";
import { change } from "../store/diagnosisSlice";
import { changeSdisease } from "../store/diseaseSlice";

// Clean, single-component Prescription (5-step slider)
const Prescription = ({ patientId, onClose }) => {
  const snackbar = useSnackbar();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [appointmentId, setAppointmentId] = useState("");
  const [nic, setNic] = useState("");
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [bookedBy, setBookedBy] = useState("");
  const rDiagnosis = useSelector((state) => state.diagnosis.value);
  const dispatch = useDispatch();
  const symptomSuggestions = useSymptomSuggestions();
  const medSuggestions = useMedicineSuggestions();
  // server-driven complaint suggestions while typing
  const [complaintQuery, setComplaintQuery] = useState("");
  const [complaintSuggestions, setComplaintSuggestions] = useState([]);
  const [selectedComplaints, setSelectedComplaints] = useState([]);
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [isFetchingComplaints, setIsFetchingComplaints] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState(null);
  const complainDebounceRef = React.useRef(null);
  const [toggleOpen, setToggleOpen] = useState({
    medicalHistory: false,
    clinicalFindings: false,
  });

  // Derived test suggestions (flatten testAdvice from advices)
  const testSuggestions = useMemo(() => {
    const map = new Map();
    (symptomSuggestions || []).forEach((a) => {
      if (Array.isArray(a.testAdvice)) {
        a.testAdvice.forEach((t) => {
          const key = (t.testName || "").trim();
          if (!key) return;
          if (!map.has(key)) map.set(key, { name: key, ...t });
        });
      }
    });
    return Array.from(map.values());
  }, [symptomSuggestions]);
  const [temp_complain, setTemp_complain] = useState([
    "Fever",
    "Cough",
    "Headache",
    "Body Pain",
    "Cold",
  ]);
  const [temp_medicalHistory, setTemp_medicalHistory] = useState([
    "HTN(Hypertension)",
    "T2DM(Type-2 Diabetes Mellitus)",
    "Hyperlipidemia",
    "Thyroid",
  ]);
  const [medicalHistory, setMedicalHistory] = useState("");
  const [clinical_findings, setClinical_findings] = useState({
    patientCondition: {
      c1: "",
      c2: "",
      c3: "",
      c4: "",
    },
    polar: "",
    icterus: "",
    edema: "",
    cyanosis: "",
    clubbing: "",
    lymph_nodes: "",
    chest: "",
    cvs: "",
    per_abdomen: {
      pt: "",
      pv: "",
    },
    others: "",
  });
  const [diagnosys_heading, setDiagnosys_heading] = useState(
    "Provisional Diagnosis"
  );
  const [complaints, setComplaints] = useState("");
  const [gravida, setGravida] = useState("");
  const [parity, setParity] = useState({ Pa: "", Pb: "" });
  const [LMP, setLMP] = useState("");
  const [EDD, setEDD] = useState("");
  const [diagnosys, setDiagnosys] = useState({
    BP: "",
    PR: "",
    SPO2: "",
    Temp: "",
    Height: "",
    Weight: "",
    BMI: "",
    Others: "",
  });
  const [followUp, setFollowUp] = useState("");
  const [medicineAdvice, setMedicineAdvice] = useState([]);
  const [autoPopulating, setAutoPopulating] = useState(false);
  const [selectedTestTypes, setSelectedTestTypes] = useState([]);
  const [testAdviceRows, setTestAdviceRows] = useState([
    {
      testName: "",
      testType: "",
      precautions: "",
      testDate: "",
      selected: false,
    },
  ]);
  const [medicationAdvice, setMedicationAdvice] = useState("");
  const [dietAdvice, setDietAdvice] = useState("");
  const [additionalAdvice, setAdditionalAdvice] = useState("");
  // helper: dedupe (case-insensitive) and sort lines alphabetically (case-insensitive)
  const dedupeAndSortLines = (text) => {
    if (!text) return "";
    const lines = String(text)
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const map = new Map();
    lines.forEach((l) => {
      const key = l.toLowerCase();
      if (!map.has(key)) map.set(key, l);
    });
    // sort by lowercase key
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => v)
      .join("\n");
  };
  const [originalPayload, setOriginalPayload] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  // Checkbox toggle for advice types
  const [POG, setPOG] = useState("");
  const [LCB, setLCB] = useState("");
  const [MOD, setMOD] = useState("");
  const handleCheckboxToggle = (e, testType) => {
    setSelectedTestTypes((prev) =>
      e.target.checked
        ? [...prev, testType]
        : prev.filter((t) => t !== testType)
    );
  };

  // Add new test advice row
  const addNewTestAdviceRow = () => {
    setTestAdviceRows((prev) => [
      ...prev,
      {
        testName: "",
        testType: "",
        precautions: "",
        testDate: "",
        selected: true,
      },
    ]);
  };

  // Obstetric calculations
  useEffect(() => {
    if (!LMP) {
      setPOG("");
      return;
    }
    try {
      const lmpDate = new Date(LMP);
      if (isNaN(lmpDate.getTime())) {
        setPOG("");
        return;
      }

      // Calculate EDD from LMP
      const eddDate = new Date(lmpDate);
      eddDate.setMonth(eddDate.getMonth() + 9);
      eddDate.setDate(eddDate.getDate() + 7);
      setEDD(eddDate.toISOString().slice(0, 10));

      // Calculate POG
      const today = new Date();
      const msPerDay = 1000 * 60 * 60 * 24;
      const daysDifference = Math.floor((today - lmpDate) / msPerDay);
      const weeks = Math.floor(daysDifference / 7);
      const days = daysDifference % 7;
      setPOG(`${weeks} weeks, ${days} days`);
    } catch (e) {
      setPOG("");
    }
  }, [LMP]);

  const handleEddChange = (e) => {
    const newEdd = e.target.value;
    setEDD(newEdd);
    if (!newEdd) return;
    try {
      const eddDate = new Date(newEdd);
      eddDate.setMonth(eddDate.getMonth() - 9);
      eddDate.setDate(eddDate.getDate() - 7);
      setLMP(eddDate.toISOString().slice(0, 10));
    } catch (e) {
      // ignore invalid date
    }
  };

  // Update test advice row
  const handleTestAdviceChange = (idx, field, value) => {
    setTestAdviceRows((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row))
    );
  };
  const [doctorId, setDoctorId] = useState("");
  const [doctorContact, setDoctorContact] = useState("");
  const [doctorsList, setDoctorsList] = useState([]);

  const steps = ["Complain & Medicines", "Medical History"];
  const rootRef = React.useRef(null);
  const keysPressed = React.useRef(new Set());

  useEffect(() => {
    const fetchLatestAppointment = async () => {
      try {
        const { data } = await api.get(
          `/api/v1/appointment/patient/${patientId}`
        );
        const appointments = data.appointments || [];
        if (!appointments.length) return setLoading(false);
        appointments.sort(
          (a, b) => new Date(b.appointment_date) - new Date(a.appointment_date)
        );
        const latest = appointments[0];
        setAppointmentId(latest._id);
        setNic(latest.nic || "");
        setName(latest.name || "");
        setGender(latest.gender || "");
        setAge(latest.age || "");
        setBookedBy(latest.bookedBy || "");
        setComplaints(latest.result[0]?.presentingComplaints || "");
        setDoctorId(latest.doctorId || "");
        if (latest.result && latest.result.length) {
          const r = latest.result[0];
          // setInitialComplain(r.initialComplain || "");
          dispatch(change(r.initialComplain || ""));
          setMedicalHistory(r.medicalHistory || "");
          setClinical_findings(
            r.clinical_findings || {
              patientCondition: {
                c1: "",
                c2: "",
                c3: "",
                c4: "",
              },
              polar: "",
              icterus: "",
              edema: "",
              cyanosis: "",
              clubbing: "",
              lymph_nodes: "",
              chest: "",
              cvs: "",
              per_abdomen: {
                pt: "",
                pv: "",
              },
              others: "",
            }
          );
          setDiagnosys_heading(r.diagnosys_heading || "Provisional Diagnosis");
          if (r.femaleTests) {
            setGravida(r.femaleTests.Gravida || "");
            if (r.femaleTests.Parity && r.femaleTests.Parity.includes("+")) {
              const [Pa, Pb] = r.femaleTests.Parity.split("+");
              setParity({ Pa, Pb });
            } else {
              setParity({ Pa: r.femaleTests.Parity || "", Pb: "" });
            }
            setLMP(r.femaleTests.LMP || "");
            setEDD(r.femaleTests.EDD || "");
            setPOG(r.femaleTests.POG || "");
            setLCB(r.femaleTests.LCB || "");
            setMOD(r.femaleTests.MOD || "");
          } else {
            // For backwards compatibility with old data structure
            setGravida(r.Gravida || "");
            // setParity({Pa: r.Parity || "", Pb: ""});
            if (r.Parity && r.Parity.includes("+")) {
              const [Pa, Pb] = r.Parity.split("+");
              setParity({ Pa, Pb });
            } else {
              setParity({ Pa: r.Parity || "", Pb: "" });
            }
            setLMP(r.LMP || "");
            setEDD(r.EDD || "");
            setPOG(r.POG || "");
            setLCB(r.LCB || "");
            setMOD(r.MOD || "");
          }
          setAdditionalAdvice(r.additionalAdvice || "");
          setFollowUp(r.followUp);
          setDiagnosys(
            r.diagnosys || {
              BP: "",
              PR: "",
              SPO2: "",
              Temp: "",
              Height: "",
              Weight: "",
              BMI: "",
              Others: "",
            }
          );
          setMedicineAdvice(
            Array.isArray(r.medicineAdvice)
              ? r.medicineAdvice
              : r.medicineAdvice
              ? [r.medicineAdvice]
              : []
          );

          // load structured advice if present (backwards compatible with string)
          const adv = r.advice;
          if (!adv) {
            // nothing
          } else if (typeof adv === "string") {
            // legacy: treat as medication advice text
            setMedicationAdvice(adv);
            setSelectedTestTypes(["Medication"]);
          } else if (typeof adv === "object") {
            if (Array.isArray(adv.testAdvice))
              setTestAdviceRows(adv.testAdvice);
            if (adv.medication) setMedicationAdvice(adv.medication);
            if (adv.diet) setDietAdvice(adv.diet);
            const sel = [];
            if (adv.testAdvice && adv.testAdvice.length)
              sel.push("Test Advice");
            if (adv.medication) sel.push("Medication");
            if (adv.diet) sel.push("Diet");
            setSelectedTestTypes(sel);
          }
          // capture original payload for dirty-check
          const initialAdviceObj = (() => {
            if (!r.advice) return {};
            if (typeof r.advice === "string") return { medication: r.advice };
            return r.advice;
          })();
          const payloadSnap = {
            // initialComplain: r.initialComplain || "",
            initialComplain: r.initialComplain || rDiagnosis || "",
            medicalHistory: r.medicalHistory || "",
            clinical_findings: r.clinical_findings || {
              patientCondition: {
                c1: "",
                c2: "",
                c3: "",
                c4: "",
              },
              polar: "",
              icterus: "",
              edema: "",
              cyanosis: "",
              clubbing: "",
              lymph_nodes: "",
              chest: "",
              cvs: "",
              per_abdomen: {
                pt: "",
                pv: "",
              },
              others: "",
            },
            diagnosys_heading: r.diagnosys_heading || "Provisional Diagnosis",
            femaleTests: {
              Gravida: r.femaleTests?.Gravida || r.gravida || "",
              Parity: r.femaleTests?.Parity || "",
              LMP: r.femaleTests?.LMP || r.LMP || "",
              EDD: r.femaleTests?.EDD || r.EDD || "",
              POG: r.femaleTests?.POG || "",
              LCB: r.femaleTests?.LCB || "",
              MOD: r.femaleTests?.MOD || "",
            },
            diagnosys: r.diagnosys || {},
            additionalAdvice: r.additionalAdvice || "",
            followUp: r.followUp || "",
            medicineAdvice: Array.isArray(r.medicineAdvice)
              ? r.medicineAdvice
              : r.medicineAdvice
              ? [r.medicineAdvice]
              : [],
            advice: initialAdviceObj,
          };
          setOriginalPayload(payloadSnap);
        }
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    };

    if (patientId) fetchLatestAppointment();
  }, [patientId]);

  // compute dirty state whenever key fields change
  useEffect(() => {
    try {
      const currentAdvice = {};
      if (selectedTestTypes.includes("Test Advice"))
        currentAdvice.testAdvice = testAdviceRows.filter(
          (r) => r.testName && r.testName.trim() !== ""
        );
      if (selectedTestTypes.includes("Medication"))
        currentAdvice.medication = medicationAdvice;
      if (selectedTestTypes.includes("Diet")) currentAdvice.diet = dietAdvice;
      const currentSnap = {
        // initialComplain: initialComplain || "",
        initialComplain: rDiagnosis || "",
        medicalHistory: medicalHistory || "",
        clinical_findings: clinical_findings || {
          patientCondition: {
            c1: "",
            c2: "",
            c3: "",
            c4: "",
          },
          polar: "",
          icterus: "",
          edema: "",
          cyanosis: "",
          clubbing: "",
          lymph_nodes: "",
          chest: "",
          cvs: "",
          per_abdomen: {
            pt: "",
            pv: "",
          },
          others: "",
        },
        diagnosys_heading: diagnosys_heading || "Provisional Diagnosis",
        femaleTests: {
          Gravida: gravida || "",
          Parity: `${parity.Pa}+${parity.Pb}`,
          LMP: LMP || "",
          EDD: EDD || "",
          POG: POG || "",
          LCB: LCB || "",
          MOD: MOD || "",
        },
        diagnosys: diagnosys || {},
        additionalAdvice: additionalAdvice || "",
        followUp: followUp || "",
        medicineAdvice: medicineAdvice || [],
        advice: currentAdvice,
      };
      const dirty =
        JSON.stringify(originalPayload) !== JSON.stringify(currentSnap);
      setIsDirty(Boolean(dirty));
    } catch (e) {
      setIsDirty(false);
    }
  }, [
    rDiagnosis,
    medicalHistory,
    clinical_findings,
    diagnosys_heading,
    gravida,
    parity,
    LMP,
    EDD,
    diagnosys,
    medicineAdvice,
    selectedTestTypes,
    testAdviceRows,
    medicationAdvice,
    dietAdvice,
    additionalAdvice,
    followUp,
    POG,
    LCB,
    MOD,
    originalPayload,
  ]);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const { data } = await api.get(`/api/v1/user/doctors/list`);
        setDoctorsList(data.doctors || []);
      } catch (e) {
        snackbar.error(
          e?.response?.data?.message || "Failed to save prescription"
        );
      }
    };
    fetchDoctors();
  }, []);

  useEffect(() => {
    if (!doctorId) return;
    (async () => {
      try {
        const { data } = await api.get(`/api/v1/user/doctor/${doctorId}`);
        setDoctorContact(data.doctor?.email || data.doctor?.phone || "");
      } catch (e) {}
    })();
  }, [doctorId]);

  // keyboard navigation handlers (supports Enter combos and Ctrl/Cmd equivalents)
  useEffect(() => {
    const selector =
      "input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])";

    const getFocusable = (container) => {
      if (!container) return [];
      return Array.from(container.querySelectorAll(selector)).filter(
        (el) => el.offsetParent !== null
      );
    };

    const focusNext = (current) => {
      const container = rootRef.current;
      if (!container) return;
      const focusables = getFocusable(container);
      const idx = focusables.indexOf(current);
      if (idx >= 0 && idx < focusables.length - 1) {
        focusables[idx + 1].focus();
        return true;
      }
      return false;
    };

    const focusFirstInStep = (stepIndex) => {
      const container = rootRef.current;
      if (!container) return;
      const slides = Array.from(container.querySelectorAll(".step-slide"));
      const stepEl = slides[stepIndex];
      if (!stepEl) return;
      const focusables = getFocusable(stepEl);
      if (focusables.length) {
        focusables[0].focus();
      }
    };

    const handleEnterActions = (e, modifiers = {}) => {
      // keep textareas normal
      const active = document.activeElement;
      // let native controls (textareas, buttons, links, selects, checkboxes/radios) handle Enter
      if (active) {
        const tag = active.tagName;
        const type = active.type || "";
        if (tag === "TEXTAREA") return true;
        if (tag === "BUTTON" || tag === "A" || tag === "SELECT") return true;
        if (tag === "INPUT" && (type === "checkbox" || type === "radio"))
          return true;
      }

      const { ctrlOrMeta = false, tab = false, p = false } = modifiers;

      // Ctrl/Cmd+P or Enter+P -> save & print
      if (p || keysPressed.current.has("p") || keysPressed.current.has("P")) {
        e.preventDefault();
        handleSave(true);
        return true;
      }

      // Ctrl/Cmd+Tab or Enter+Tab -> next step
      if (tab) {
        e.preventDefault();
        setCurrentStep((s) => {
          const next = Math.min(s + 1, steps.length - 1);
          setTimeout(() => focusFirstInStep(next), 120);
          return next;
        });
        return true;
      }

      // plain Enter or Ctrl/Cmd+Enter -> focus next field
      e.preventDefault();
      const moved = focusNext(active);
      if (!moved) {
        setCurrentStep((s) => {
          const next = Math.min(s + 1, steps.length - 1);
          setTimeout(() => focusFirstInStep(next), 120);
          return next;
        });
      }
      return true;
    };

    const onKeyDown = (e) => {
      // handle Ctrl/Cmd shortcuts first
      const isCtrl = e.ctrlKey || e.metaKey;
      const active = document.activeElement;
      if (active && active.tagName === "BUTTON") {
        // don't intercept Enter/Tab when a button is focused
        if (e.key === "Enter" || e.key === "Tab") return;
      }
      if (isCtrl && (e.key === "p" || e.key === "P")) {
        // override browser print
        e.preventDefault();
        handleSave(true);
        return;
      }
      if (isCtrl && e.key === "Tab") {
        e.preventDefault();
        handleEnterActions(e, { ctrlOrMeta: true, tab: true });
        return;
      }
      if (isCtrl && e.key === "Enter") {
        e.preventDefault();
        handleEnterActions(e, { ctrlOrMeta: true });
        return;
      }

      // Arrow keys: navigate fields/steps
      if (e.key === "ArrowRight") {
        // go to next step (only if not inside editing text in middle)
        const active = document.activeElement;
        let allow = true;
        if (
          active &&
          (active.tagName === "INPUT" || active.tagName === "TEXTAREA")
        ) {
          const val = active.value || "";
          try {
            // only navigate step if caret is at end
            allow = active.selectionEnd === val.length;
          } catch (err) {
            allow = false;
          }
        }
        if (allow) {
          e.preventDefault();
          setCurrentStep((s) => {
            const next = Math.min(s + 1, steps.length - 1);
            setTimeout(() => {
              const slides = Array.from(
                rootRef.current.querySelectorAll(".step-slide")
              );
              const stepEl = slides[next];
              if (stepEl) {
                const focusables = Array.from(
                  stepEl.querySelectorAll("input, select, textarea, button")
                ).filter((el) => el.offsetParent !== null);
                if (focusables.length) focusables[0].focus();
              }
            }, 80);
            return next;
          });
          return;
        }
      }
      if (e.key === "ArrowLeft") {
        const active = document.activeElement;
        let allow = true;
        if (
          active &&
          (active.tagName === "INPUT" || active.tagName === "TEXTAREA")
        ) {
          try {
            allow = active.selectionStart === 0;
          } catch (err) {
            allow = false;
          }
        }
        if (allow) {
          e.preventDefault();
          setCurrentStep((s) => {
            const prev = Math.max(s - 1, 0);
            setTimeout(() => {
              const slides = Array.from(
                rootRef.current.querySelectorAll(".step-slide")
              );
              const stepEl = slides[prev];
              if (stepEl) {
                const focusables = Array.from(
                  stepEl.querySelectorAll("input, select, textarea, button")
                ).filter((el) => el.offsetParent !== null);
                if (focusables.length) focusables[0].focus();
              }
            }, 80);
            return prev;
          });
          return;
        }
      }

      // keep track for Enter+P and Enter+Tab combos
      keysPressed.current.add(e.key);
      if (e.key === "Enter") {
        // delegate to handler which checks pressed keys for Tab or P
        const set = keysPressed.current;
        // Enter+P
        if (set.has("p") || set.has("P")) {
          e.preventDefault();
          handleSave(true);
          return;
        }
        // Enter+Tab
        if (set.has("Tab")) {
          e.preventDefault();
          handleEnterActions(e, { tab: true });
          return;
        }
        // plain Enter
        handleEnterActions(e, {});
      }

      // ArrowDown: next focusable field (if caret at end or not an input/textarea)
      if (e.key === "ArrowDown") {
        const active = document.activeElement;
        let doNavigate = true;
        if (
          active &&
          (active.tagName === "INPUT" || active.tagName === "TEXTAREA")
        ) {
          const val = active.value || "";
          try {
            doNavigate = active.selectionEnd === val.length;
          } catch (err) {
            doNavigate = false;
          }
        }
        if (doNavigate) {
          e.preventDefault();
          const moved = (function () {
            const container = rootRef.current;
            if (!container) return false;
            const selector =
              "input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])";
            const focusables = Array.from(
              container.querySelectorAll(selector)
            ).filter((el) => el.offsetParent !== null);
            const idx = focusables.indexOf(document.activeElement);
            if (idx >= 0 && idx < focusables.length - 1) {
              focusables[idx + 1].focus();
              return true;
            }
            return false;
          })();
          if (!moved) {
            setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
          }
        }
      }

      // ArrowUp: previous focusable field (if caret at start or not an input/textarea)
      if (e.key === "ArrowUp") {
        const active = document.activeElement;
        let doNavigate = true;
        if (
          active &&
          (active.tagName === "INPUT" || active.tagName === "TEXTAREA")
        ) {
          try {
            doNavigate = active.selectionStart === 0;
          } catch (err) {
            doNavigate = false;
          }
        }
        if (doNavigate) {
          e.preventDefault();
          const moved = (function () {
            const container = rootRef.current;
            if (!container) return false;
            const selector =
              "input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])";
            const focusables = Array.from(
              container.querySelectorAll(selector)
            ).filter((el) => el.offsetParent !== null);
            const idx = focusables.indexOf(document.activeElement);
            if (idx > 0) {
              focusables[idx - 1].focus();
              return true;
            }
            return false;
          })();
          if (!moved) {
            setCurrentStep((s) => Math.max(s - 1, 0));
          }
        }
      }
    };

    const onKeyUp = (e) => {
      keysPressed.current.delete(e.key);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps.length, handleSave]);

  // Auto-populate medicines when rDiagnosis changes (debounced)
  useEffect(() => {
    if (!rDiagnosis || rDiagnosis.trim().length < 3) return; // wait for meaningful input
    // don't overwrite manual medicines
    if (medicineAdvice && medicineAdvice.length > 0) return;

    const id = setTimeout(() => {
      autoPopulateFromComplaint(rDiagnosis);
    }, 600);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rDiagnosis]);

  // improved scoring: count token matches, prefer advices matching ALL tokens, add bonuses for symptom matches and exact name match
  const scoreAdvice = (adviceObj, q) => {
    const text = (
      (adviceObj.name || "") +
      " " +
      (adviceObj.desese_description || "") +
      " " +
      (adviceObj.type || "") +
      " " +
      (adviceObj.route || "") +
      " " +
      (adviceObj.symptoms || []).join(" ")
    ).toLowerCase();
    const tokens = (q || "").toLowerCase().split(/\W+/).filter(Boolean);
    if (!tokens.length) return { score: 0, matches: 0, matchedAll: false };
    let matches = 0;
    tokens.forEach((t) => {
      if (!t) return;
      if (text.includes(t)) matches += 1;
    });
    // bonus: symptoms match weight
    let symptomBonus = 0;
    if (Array.isArray(adviceObj.symptoms)) {
      const lowerSymptoms = adviceObj.symptoms.map((s) =>
        (s || "").toLowerCase()
      );
      tokens.forEach((t) => {
        if (lowerSymptoms.some((s) => s.includes(t))) symptomBonus += 1;
      });
    }
    // bonus for exact name match of whole query
    const exactName = (adviceObj.name || "").toLowerCase() === tokens.join(" ");
    let score = matches + symptomBonus;
    if (exactName) score += 2;
    const matchedAll = matches === tokens.length;
    // final score accentuates matchedAll
    if (matchedAll) score += 2;
    return { score, matches, matchedAll };
  };

  // Accept either a string query or an object (selected advice) to populate medicines/tests/advice
  // append: when true, merge into existing lists (used when multiple complaints selected)
  const autoPopulateFromComplaint = async (
    queryOrObject,
    force = false,
    append = false
  ) => {
    if (!queryOrObject || (!force && medicineAdvice.length > 0 && !append))
      return;
    setAutoPopulating(true);
    try {
      let advices = [];
      if (typeof queryOrObject === "object" && queryOrObject !== null) {
        advices = [queryOrObject];
      } else {
        const { data } = await api.get(`/api/v1/medical/search`, {
          params: { q: queryOrObject },
        });
        advices = data.advices || [];
      }
      if (!advices.length) return;
      // scoring if string query
      let selected = advices;
      if (typeof queryOrObject === "string") {
        const scored = advices.map((a) => ({
          a,
          ...scoreAdvice(a, queryOrObject),
        }));
        scored.sort((x, y) => {
          if (x.matchedAll && !y.matchedAll) return -1;
          if (!x.matchedAll && y.matchedAll) return 1;
          return (y.score || 0) - (x.score || 0);
        });
        selected = scored
          .filter((s) => s.score > 0)
          .slice(0, 12)
          .map((s) => ({
            ...s.a,
            _score: s.score,
            _matches: s.matches,
            _matchedAll: s.matchedAll,
          }));
        if (!selected.length) selected = advices.slice(0, 6);
      }

      // build medicines
      const meds = [];
      selected.forEach((t) => {
        if (Array.isArray(t.medicines) && t.medicines.length) {
          t.medicines.forEach((m) => {
            meds.push({
              name: m.name || m.label || t.name || "",
              type: m.type || t.type || "",
              dose: m.dose || t.dose || "",
              frequency: m.frequency || t.frequency || "",
              route: m.route || "mouth",
              duration: m.duration || "",
              notes: m.notes || "",
              selected: m.selected || false,
            });
          });
        } else {
          meds.push({
            name: t.name || "",
            type: t.type || "",
            dose: t.dose || "",
            frequency: t.frequency || "",
            route: t.route || "mouth",
            duration: t.duration || "",
            notes: t.notes || "",
            selected: t.selected || false,
          });
        }
      });

      if (append) {
        setMedicineAdvice((prev) => {
          const map = new Map();
          (prev || []).forEach((p) => {
            if (p && p.name) map.set(p.name, p);
          });
          meds.forEach((m) => {
            if (m && m.name) map.set(m.name, m);
          });
          return Array.from(map.values());
        });
      } else if (force) {
        setMedicineAdvice(meds);
      } else {
        setMedicineAdvice((prev) => (prev && prev.length ? prev : meds));
      }

      const tests = [];
      const medsText = [];
      let diet = "";
      selected.forEach((t) => {
        if (Array.isArray(t.testAdvice) && t.testAdvice.length)
          t.testAdvice.forEach((x) => tests.push(x));
        if (t.medication) medsText.push(t.medication);
        if (t.diet) diet = diet ? diet + "\n" + t.diet : t.diet;
      });

      if (tests.length) {
        setTestAdviceRows((prev) => {
          if (append) {
            const map = new Map();
            (prev || []).forEach((r) => {
              if (r && r.testName) map.set(r.testName, r);
            });
            tests.forEach((t) => {
              if (t && t.testName) map.set(t.testName, t);
            });
            return Array.from(map.values());
          }
          if (prev && prev.length && prev.some((r) => r.testName)) return prev;
          return tests;
        });
        setSelectedTestTypes((prev) =>
          Array.from(new Set([...(prev || []), "Test Advice", "Medication"]))
        );
      }
      if (medsText.length)
        setMedicationAdvice((prev) =>
          prev ? prev + "\n" + medsText.join("\n") : medsText.join("\n")
        );
      if (diet) setDietAdvice((prev) => (prev ? prev + "\n" + diet : diet));
    } catch (e) {
      // ignore
    } finally {
      setAutoPopulating(false);
    }
  };

  async function handleSave(printAfter = false) {
    try {
      if (!appointmentId)
        return alert("No appointment found to attach the prescription to.");
      // Build structured advice
      const adviceToSave = {};
      const selectedMedicines = medicineAdvice.filter((m) => m.selected);
      let selectedTests = [];
      if (selectedTestTypes.includes("Test Advice")) {
        selectedTests = testAdviceRows.filter(
          (r) => r.selected && r.testName && r.testName.trim() !== ""
        );
        adviceToSave.testAdvice = selectedTests;
      }
      if (selectedTestTypes.includes("Medication")) {
        adviceToSave.medication = medicationAdvice;
      }
      if (selectedTestTypes.includes("Diet")) {
        adviceToSave.diet = dietAdvice;
      }
      // validation: ensure something meaningful is present
      const diagnosysHasContent =
        diagnosys &&
        Object.keys(diagnosys).some(
          (k) => (diagnosys[k] || "").toString().trim() !== ""
        );
      const hasContent =
        (rDiagnosis && rDiagnosis.trim()) ||
        (Array.isArray(selectedMedicines) && selectedMedicines.length > 0) ||
        Object.keys(adviceToSave).length > 0 ||
        diagnosysHasContent;
      if (!hasContent) {
        snackbar.error(
          "Please add at least one of: Diagnosis, medicines or test advice before saving."
        );
        return;
      }
      await api.put(`/api/v1/appointment/patient/update/${patientId}`, {
        followup_date: followUp, // Moved to root level as per schema
        result: [
          {
            initialComplain: rDiagnosis,
            medicalHistory,
            clinical_findings,
            diagnosys_heading,
            additionalAdvice,
            followUp,
            presentingComplaints: complaints,
            Gravida: gravida,
            Parity: `${parity.Pa}+${parity.Pb}`,
            LMP,
            EDD,
            POG,
            LCB,
            MOD,
            diagnosys,
            medicineAdvice: selectedMedicines,
            advice: adviceToSave, // Contains selected tests
          },
        ],
        status: "Completed",
        doctorId: doctorId || undefined,
      });
      if (doctorContact) {
        await api.post(`/api/v1/message/send`, {
          firstName: "System",
          lastName: "Notification",
          email: doctorContact.includes("@") ? doctorContact : "",
          phone: doctorContact.includes("@") ? "01234567891" : doctorContact,
          message: `Prescription completed for patient NIC: ${nic} -
           🌐download link: ${window.location.origin}/preview/${patientId}`,
        });
      }
      playSaveSound();
      snackbar.success("Prescription saved");
      // refresh original snapshot to current state
      const advSaved = adviceToSave;
      const newSnap = {
        // initialComplain: initialComplain || "",
        initialComplain: rDiagnosis || "",
        medicalHistory: medicalHistory || "",
        clinical_findings: clinical_findings || {
          patientCondition: {
            c1: "",
            c2: "",
            c3: "",
            c4: "",
          },
          polar: "",
          icterus: "",
          edema: "",
          cyanosis: "",
          clubbing: "",
          lymph_nodes: "",
          chest: "",
          cvs: "",
          per_abdomen: {
            pt: "",
            pv: "",
          },
          others: "",
        },
        diagnosys_heading: diagnosys_heading || "Provisional Diagnosis",
        femaleTests: {
          Gravida: gravida || "",
          Parity: `${parity.Pa}+${parity.Pb}`,
          LMP: LMP || "",
          EDD: EDD || "",
          POG: POG || "",
          LCB: LCB || "",
          MOD: MOD || "",
        },
        diagnosys: diagnosys || {},
        medicineAdvice: selectedMedicines,
        advice: advSaved, // Contains selected tests
        additionalAdvice: additionalAdvice || "",
        followUp: followUp || "",
      };
      setOriginalPayload(newSnap);
      setIsDirty(false);
      if (printAfter) {
        if (onClose) onClose();
        navigate(`/preview/${patientId}`);
      } else {
        if (onClose) onClose();
      }
    } catch (e) {
      snackbar.error("Failed to save prescription or notify doctor.");
    }
  }

  const handleClose = () => {
    if (isDirty) {
      snackbar.confirm("You have unsaved changes. Discard and close?", () => {
        if (onClose) onClose();
      });
    } else {
      if (onClose) onClose();
    }
  };

  // const nextStep = () =>
  //   setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
  // const prevStep = () => setCurrentStep((s) => Math.max(s - 1, 0));
  // const goToStep = (i) => setCurrentStep(i);

  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); // normalize to local date
  const todayStr = d.toISOString().split("T")[0];

  useEffect(() => {
    // compute BMI from Height (cm) and Weight (kg)
    let bmiValue = "";
    const heightInMeters = Number(diagnosys.Height) / 100;
    const weightInKg = Number(diagnosys.Weight);
    if (heightInMeters > 0 && weightInKg > 0) {
      const bmi = (weightInKg / (heightInMeters * heightInMeters)).toFixed(2);
      bmiValue = bmi;
    }
    // avoid unnecessary state updates
    if ((diagnosys.BMI || "") !== bmiValue) {
      setDiagnosys({ ...diagnosys, BMI: bmiValue });
      // console.log("Calculated BMI:", bmiValue);
    }
  }, [diagnosys.Height, diagnosys.Weight]);


  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    // <section className="main">
    <div className=" content-box" ref={rootRef}>
      <div className="pres-header">
        Prescription
        <p className="sub-header">
          {name} | {gender} | {age}years
        </p>
      </div>
      <div
        className="shortcuts-hint"
        style={{
          margin: "0.5rem 0 1rem 0",
          color: "#334155",
          fontSize: "0.9rem",
          opacity: 0.4,
        }}
      >
        Shortcuts: <kbd>Enter/Tab</kbd>=next field, <kbd>Tab</kbd>+
        <kbd>Enter</kbd>
        =Go to the top, <kbd>Ctrl/⌘</kbd>+<kbd>Enter</kbd>=next field,{" "}
        <kbd>Ctrl/⌘</kbd>+<kbd>P</kbd>=Save & Print
      </div>

      <div className="form-main">
        {gender.toLowerCase() === "female" && (
          <div
            className="pres-form-group pres-form-row toggle-content"
            style={{ borderRadius: "0.5rem" }}
          >
            <div className="pres-form-row">
              <div className="pres-form-group">
                <label>Gravida</label>
                <AutoSuggestInput
                  single
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={gravida}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, ""); // Allow only digits
                    setGravida(v);
                  }}
                  suggestions={Array.from({ length: 16 }, (_, i) => String(i))}
                  placeholder="G"
                />
              </div>
              <div className="pres-form-group">
                <label>Parity</label>
                <div className="parity-box">
                  <AutoSuggestInput
                    single
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={parity?.Pa}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, ""); // Allow only digits
                      setParity({ ...parity, Pa: v });
                    }}
                    suggestions={Array.from({ length: 16 }, (_, i) =>
                      String(i)
                    )}
                    placeholder="P"
                  />
                  <div style={{ padding: "0.55rem", textAlign: "center" }}>
                    +
                  </div>
                  <AutoSuggestInput
                    single
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={parity?.Pb}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, ""); // Allow only digits
                      setParity({ ...parity, Pb: v });
                    }}
                    suggestions={Array.from({ length: 16 }, (_, i) =>
                      String(i)
                    )}
                    placeholder="P"
                  />
                </div>
              </div>
              <div className="pres-form-group">
                <label>LMP</label>
                <input
                  style={{ display: "flex", alignItems: "center" }}
                  type="date"
                  value={LMP}
                  onChange={(e) => setLMP(e.target.value)}
                />
              </div>
              <div className="pres-form-group">
                <label>EDD</label>
                <input
                  style={{ display: "flex", alignItems: "center" }}
                  type="date"
                  // readOnly
                  value={EDD}
                  onChange={(e) => setEDD(e.target.value)}
                />
              </div>
            </div>
            <div className="pres-form-row">
              <div className="pres-form-group">
                <label>LCB</label>
                <input
                  type="text"
                  value={LCB}
                  onChange={(e) => setLCB(e.target.value)}
                />
              </div>
              <div className="pres-form-group">
                <label>MOD</label>
                <select value={MOD} onChange={(e) => setMOD(e.target.value)}>
                  <option value="">Select MOD</option>
                  <option value="NVD">NVD</option>
                  <option value="LUCS">LUCS</option>
                </select>
              </div>
              <div className="pres-form-group">
                <label>POG</label>
                <input
                  type="text"
                  value={POG}
                  readOnly
                  placeholder="Calculated from EDD"
                />
              </div>
            </div>
          </div>
        )}
        <div
          className="pres-form-group pres-form-row toggle-content"
          style={{ borderRadius: "0.5rem" }}
        >
          <div className="pres-form-row">
            <div className="pres-form-group">
              <label>BP (mm of Hg)</label>
              <input
                type="text"
                placeholder="BP (e.g., 120/80 mmHg)"
                maxLength={7}
                value={diagnosys.BP}
                onChange={(e) =>
                  setDiagnosys({ ...diagnosys, BP: e.target.value })
                }
              />
            </div>
            <div className="pres-form-group">
              <label>PR (bpm)</label>
              <input
                type="number"
                // placeholder="PR (bpm)"
                min="20"
                max="500"
                value={diagnosys.PR}
                onChange={(e) => {
                  const v = e.target.value;
                  setDiagnosys({ ...diagnosys, PR: v && v > 500 ? 500 : v });
                }}
              />
            </div>
            <div className="pres-form-group">
              <label>SPO2 (% in RA)</label>
              <input
                type="number"
                // placeholder="SPO2 (%)"
                min="0"
                max="100"
                inputMode="numeric"
                value={diagnosys.SPO2}
                onChange={(e) => {
                  const v = e.target.value;
                  setDiagnosys({ ...diagnosys, SPO2: v && v > 100 ? 100 : v });
                }}
              />
            </div>
            <div className="pres-form-group">
              <label>Temp (F)</label>
              <input
                type="number"
                // placeholder="Temp (F)"
                min="50"
                max="200"
                value={diagnosys.Temp}
                onChange={(e) => {
                  const v = e.target.value;
                  setDiagnosys({ ...diagnosys, Temp: v && v > 200 ? 200 : v });
                }}
              />
            </div>
          </div>
          <div className="pres-form-row">
            <div className="pres-form-group">
              <label>Height (cm)</label>
              <input
                type="number"
                // placeholder="Height (cm)"
                min="30"
                max="250"
                value={diagnosys.Height}
                onChange={(e) => {
                  const v = e.target.value;
                  setDiagnosys({
                    ...diagnosys,
                    Height: v && v > 250 ? 250 : v,
                  });
                }}
              />
            </div>
            <div className="pres-form-group">
              <label>Weight (kg)</label>
              <input
                type="number"
                // placeholder="Weight (kg)"
                min="1"
                max="300"
                value={diagnosys.Weight}
                onChange={(e) => {
                  const v = e.target.value;
                  setDiagnosys({
                    ...diagnosys,
                    Weight: v && v > 300 ? 300 : v,
                  });
                }}
              />
            </div>
            <div className="pres-form-group">
              <label>BMI</label>
              <input value={diagnosys.BMI} readOnly />
            </div>
            <div className="pres-form-group">
              <label>Others</label>
              <input
                value={diagnosys.Others}
                onChange={(e) =>
                  setDiagnosys({ ...diagnosys, Others: e.target.value })
                }
              />
            </div>
          </div>
        </div>

        <div className="pres-form-group full-width toggle-section">
          <label
            className="toggle-title"
            style={{ justifyContent: "start", gap: "0.5rem" }}
          >
            Presenting Complaints
            <div
              className="refresh-btn"
              onClick={async () => {
                try {
                  const complaints_arr = complaints.split(",");
                  const complaints_arr_cln = complaints_arr.filter(
                    (c) => c.trim() !== ""
                  );

                  const diseases = [];
                  const uniqueDiseases = [];

                  for (const query of complaints_arr_cln) {
                    try {
                      // console.log("|", query.trim(), "|");
                      const { data } = await api.get(
                        `/api/v1/medical/advance-search-symptoms`,
                        {
                          params: { query },
                        }
                      );
                      diseases.push(...data.results);
                      // console.log(data.results);
                    } catch (err) {
                      console.log(
                        "Failed to fetch advices for query:",
                        query,
                        err
                      );
                    }
                  }
                  // console.log("Diseases fetched:", diseases);

                  for (const d of diseases) {
                    if (!uniqueDiseases.includes(d)) {
                      uniqueDiseases.push(d);
                    }
                  }
                  // console.log("Unique Diseases:", uniqueDiseases);
                  dispatch(changeSdisease(uniqueDiseases));
                } catch (err) {
                  console.log("Failed to process diagnoses");
                }
              }}
            >
              <TbRefresh />
            </div>
          </label>
          <div className="pres-form-group pres-form-row toggle-content">
            <div className="pres-form-row" style={{ gap: "0.5rem" }}>
              {temp_complain.map((com) => (
                <button
                  className={
                    "medicalHistory-btns" +
                    (complaints.includes(com) ? "-active" : "")
                  }
                  onClick={() => {
                    complaints.includes(com + ", ")
                      ? setComplaints(complaints.replace(com + ", ", ""))
                      : complaints.includes(com + ",")
                      ? setComplaints(complaints.replace(com + ",", ""))
                      : complaints.includes(com)
                      ? setComplaints(complaints.replace(com, ""))
                      : setComplaints(complaints + com + ", ");
                  }}
                >
                  {com}
                </button>
              ))}
            </div>
            <AutoSuggestInputforSymptom
              value={complaints || ""}
              onChange={(e) => {
                setComplaints(e.target.value);
              }}
              onSelect={(item, newValue) => {
                setComplaints(newValue);
              }}
              placeholder="Enter presenting complaints..."
            />
          </div>
        </div>
        <div className="pres-form-group full-width pres-form-row toggle-section">
          <label
            onClick={() => {
              setToggleOpen({
                ...toggleOpen,
                medicalHistory: !toggleOpen.medicalHistory,
              });
            }}
            className="toggle-title"
          >
            Medical History
            {toggleOpen.medicalHistory == true ? (
              <FaChevronUp />
            ) : (
              <FaChevronDown />
            )}
          </label>
          {toggleOpen.medicalHistory == true && (
            <div className="pres-form-group pres-form-row toggle-content">
              <div className="pres-form-row" style={{ gap: "0.5rem" }}>
                {temp_medicalHistory.map((history, index) => (
                  <button
                    className={
                      "medicalHistory-btns" +
                      (medicalHistory.includes(history) ? "-active" : "")
                    }
                    onClick={() => {
                      medicalHistory.includes(history + ", ")
                        ? setMedicalHistory(
                            medicalHistory.replace(history + ", ", "")
                          )
                        : medicalHistory.includes(history + ",")
                        ? setMedicalHistory(
                            medicalHistory.replace(history + ",", "")
                          )
                        : medicalHistory.includes(history)
                        ? setMedicalHistory(medicalHistory.replace(history, ""))
                        : setMedicalHistory(medicalHistory + history + ", ");
                    }}
                  >
                    {history}
                  </button>
                ))}
              </div>
              <input
                placeholder="Enter medical history..."
                value={medicalHistory}
                onChange={(e) => setMedicalHistory(e.target.value)}
              />
            </div>
          )}
        </div>
        <div className="pres-form-group toggle-section">
          <label
            className="toggle-title"
            onClick={() => {
              setToggleOpen({
                ...toggleOpen,
                clinicalFindings: !toggleOpen.clinicalFindings,
              });
            }}
          >
            On Examination
            {toggleOpen.clinicalFindings == true ? (
              <FaChevronUp />
            ) : (
              <FaChevronDown />
            )}
          </label>
          {toggleOpen.clinicalFindings == true && (
            <div className="toggle-content ">
              <div className="pres-form-row">
                <label>Patient is</label>
              </div>
              <div className="pres-form-row">
                <div className="pres-form-group">
                  <select
                    value={clinical_findings.patientCondition.c1}
                    onChange={(e) => {
                      setClinical_findings({
                        ...clinical_findings,
                        patientCondition: {
                          ...clinical_findings.patientCondition,
                          c1: e.target.value,
                        },
                      });
                    }}
                  >
                    <option value="">Select</option>
                    <option value="Alert">Alert</option>
                  </select>
                </div>
                <div className="pres-form-group">
                  <select
                    value={clinical_findings.patientCondition.c2}
                    onChange={(e) => {
                      setClinical_findings({
                        ...clinical_findings,
                        patientCondition: {
                          ...clinical_findings.patientCondition,
                          c2: e.target.value,
                        },
                      });
                    }}
                  >
                    <option value="">Select</option>
                    <option value="Conscious">Conscious</option>
                    <option value="Semi conscious">Semi conscious</option>
                    <option value="Unconscious">Unconscious</option>
                  </select>
                </div>
                <div className="pres-form-group">
                  <select
                    value={clinical_findings.patientCondition.c3}
                    onChange={(e) => {
                      setClinical_findings({
                        ...clinical_findings,
                        patientCondition: {
                          ...clinical_findings.patientCondition,
                          c3: e.target.value,
                        },
                      });
                    }}
                  >
                    <option value="">Select</option>
                    <option value="Co-operative">Co-operative</option>
                    <option value="Confused">Confused</option>
                    <option value="Drowsy">Drowsy</option>
                  </select>
                </div>
                <div className="pres-form-group">
                  <select
                    value={clinical_findings.patientCondition.c4}
                    onChange={(e) => {
                      setClinical_findings({
                        ...clinical_findings,
                        patientCondition: {
                          ...clinical_findings.patientCondition,
                          c4: e.target.value,
                        },
                      });
                    }}
                  >
                    <option value="">Select</option>
                    <option value="Active">Active</option>
                    <option value="Looking Toxic">Looking Toxic</option>
                    <option value="Ill-looking">Ill-looking</option>
                  </select>
                </div>
              </div>

              <div className="pres-form-row">
                <div className="pres-form-group">
                  <label className="OE-label">Polar</label>
                  <select
                    value={clinical_findings.polar}
                    onChange={(e) => {
                      setClinical_findings({...clinical_findings, polar: e.target.value});
                    }}
                  >
                    <option value="">Select</option>
                    <option value="Absent">Absent</option>
                    <option value="Mild">Mild</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Severe">Severe</option>
                  </select>
                </div>
                <div className="pres-form-group">
                  <label className="OE-label">Icterus</label>
                  <select
                    value={clinical_findings.icterus}
                    onChange={(e) => {
                      setClinical_findings({...clinical_findings, icterus: e.target.value});
                    }}
                  >
                    <option value="">Select</option>
                    <option value="Absent">Absent</option>
                    <option value="Mild">Mild</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Severe">Severe</option>
                  </select>
                </div>
                <div className="pres-form-group">
                  <label className="OE-label">Edema</label>
                  <select
                    value={clinical_findings.edema}
                    onChange={(e) => {
                      setClinical_findings({...clinical_findings, edema: e.target.value});
                    }}
                  >
                    <option value="">Select</option>
                    <option value="Absent">Absent</option>
                    <option value="Present">Present</option>
                    <option value="B/L Pedal">B/L Pedal</option>
                  </select>
                </div>
                <div className="pres-form-group">
                  <label className="OE-label">Cyanosis</label>
                  <select
                    value={clinical_findings.cyanosis}
                    onChange={(e) => {
                      setClinical_findings({...clinical_findings, cyanosis: e.target.value});
                    }}
                  >
                    <option value="">Select</option>
                    <option value="Absent">Absent</option>
                    <option value="Present">Present</option>
                  </select>
                </div>
                <div className="pres-form-group">
                  <label className="OE-label">Clubbing</label>
                  <select
                    value={clinical_findings.clubbing}
                    onChange={(e) => {
                      setClinical_findings({...clinical_findings, clubbing: e.target.value});
                    }}
                  >
                    <option value="">Select</option>
                    <option value="Absent">Absent</option>
                    <option value="Present">Present</option>
                  </select>
                </div>
                <div className="pres-form-group">
                  <label className="OE-label">Lymph Nodes</label>
                  <select
                    value={clinical_findings.lymph_nodes}
                    onChange={(e) => {
                      setClinical_findings({...clinical_findings, lymph_nodes: e.target.value});
                    }}
                  >
                    <option value="">Select</option>
                    <option value="Not Palpable">Not Palpable</option>
                    <option value="Palpable">Palpable</option>
                  </select>
                </div>
              </div>

              <div className="pres-form-row">
                <div className="pres-form-group">
                  <label className="OE-label">Chest</label>
                  <select
                    value={clinical_findings.chest}
                    onChange={(e) => {
                      setClinical_findings({...clinical_findings, chest: e.target.value});
                    }}
                  >
                    <option value="">Select</option>
                    <option value="B/L VBS">B/L VBS</option>
                    <option value="Wheeze">Wheeze</option>
                    <option value="Crepitations">Crepitations</option>
                    <option value="Rhonchi/Wheeze">Rhonchi/Wheeze</option>
                  </select>
                </div>
                <div className="pres-form-group">
                  <label className="OE-label">CVS</label>
                  <select
                    value={clinical_findings.cvs}
                    onChange={(e) => {
                      setClinical_findings({...clinical_findings, cvs: e.target.value});
                    }}
                  >
                    <option value="">Select</option>
                    <option value="S1,S2 normal">S1,S2 normal</option>
                    <option value="Mid-Diastolic murmur">
                      Mid-Diastolic murmur
                    </option>
                    <option value="Pansystolic murmur">
                      Pansystolic murmur
                    </option>
                    <option value="Mid-systolic murmur">
                      Mid-systolic murmur
                    </option>
                    <option value="Systolic murmur">Systolic murmur</option>
                    <option value="Diastolic murmur">Diastolic murmur</option>
                  </select>
                </div>
                <div className="pres-form-group">
                  <label className="OE-label">Per Abdomen</label>
                  <div className="pres-form-row">
                    <div className="pres-form-group">
                      <select
                        value={clinical_findings.per_abdomen.pt}
                        onChange={(e) => {
                          setClinical_findings({...clinical_findings, per_abdomen: {
                            ...clinical_findings.per_abdomen, pt: e.target.value
                          }});
                        }}
                      >
                        <option value="">Select</option>
                        <option value="Soft, Nontender">Soft, Nontender</option>
                        <option value="Tender">Tender</option>
                      </select>
                    </div>
                    <div className="pres-form-group">
                      {clinical_findings.per_abdomen.pt !== "Tender" ? (
                      <select
                        value={clinical_findings.per_abdomen.pv}
                        onChange={(e) => {
                          setClinical_findings({...clinical_findings, per_abdomen: {
                            ...clinical_findings.per_abdomen, pv: e.target.value
                          }});
                        }}
                      >
                        <option value="">Select</option>
                        <option value="No Organomegaly">No Organomegaly</option>
                        <option value="Hepatomegaly">Hepatomegaly</option>
                        <option value="Spleenomegaly">Spleenomegaly</option>
                        <option value="Hepatospleenomegaly">
                          Hepatospleenomegaly
                        </option>
                        </select>
                          
                      ) :(
                      <select
                        value={clinical_findings.per_abdomen.pv}
                        onChange={(e) => {
                          setClinical_findings({...clinical_findings, per_abdomen: {
                            ...clinical_findings.per_abdomen, pv: e.target.value
                          }});
                        }}
                      >
                        {/* for Tender  */}
                        <option value="">Select</option>
                        <option value="Epigastric">Epigastric</option>
                        <option value="hypogastric">hypogastric</option>
                        <option value="Umbilical">Umbilical</option>
                        <option value="RUQ">RUQ</option>
                        <option value="LUQ">LUQ</option>
                        <option value="RIF">RIF</option>
                        <option value="LIF">LIF</option>
                        <option value="Rt. Lumber">Rt. Lumber</option>
                        <option value="Lt. Lumber">Lt. Lumber</option>
                        <option value="Both Lumber">Both Lumber</option>
                        <option value="Lower Abd.">Lower Abd.</option>
                        <option value="Upper Abd.">Upper Abd.</option>
                      </select>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pres-form-row">
                <div className="pres-form-group">
                  <label className="OE-label">Others</label>
                  <input type="text" 
                    value={clinical_findings.others}
                    onChange={(e)=>setClinical_findings({...clinical_findings, others: e.target.value})}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        <div>
          <div className="pres-form-group full-width toggle-section">
            <label style={{ justifyContent: "start", gap: "0.5rem" }}>
              <select
                // style={{ padding: "0", border: "none", fontSize: "1rem" }}
                style={{
                  background: "#dae4f1",
                  marginBottom: "0",
                  borderRadius: "0.5rem 0.5rem 0 0",
                  padding: "0.5rem 1rem",
                  fontWeight: "600",
                  color: "#1e293b",
                }}
                className="toggle-title"
                value={diagnosys_heading}
                onChange={(e) => setDiagnosys_heading(e.target.value)}
              >
                <option value="Provisional Diagnosis">
                  Provisional Diagnosis
                </option>
                <option value="Diagnosis">Diagnosis</option>
                <option value="Diffential Diagnosis">
                  Diffential Diagnosis
                </option>
              </select>
              <div
                className="refresh-btn"
                onClick={async () => {
                  try {
                    const rDiagnosis_arr = rDiagnosis.split(",");
                    const rDiagnosis_arr_cln = rDiagnosis_arr.filter(
                      (d) => d.trim() !== ""
                    );

                    const medicinesMap = new Map(); // Use Map with name as key for true deduplication

                    // Fix: use for...of instead of .map() to properly await async calls
                    for (const query of rDiagnosis_arr_cln) {
                      try {
                        // console.log("|", query.trim(), "|");
                        const { data } = await api.get(
                          `/api/v1/medical/suggestions/advices`,
                          { params: { q: query.trim(), limit: 20 } }
                        );

                        // console.log(data.advices);

                        // Flatten medicines into Map (deduplicate by medicine name)
                        if (data.advices && Array.isArray(data.advices)) {
                          data.advices.forEach((a) => {
                            if (a.medicines && Array.isArray(a.medicines)) {
                              a.medicines.forEach((med) => {
                                // Use medicine name as key to prevent duplicates
                                const key = (med.name || "")
                                  .toLowerCase()
                                  .trim();
                                if (key && !medicinesMap.has(key)) {
                                  medicinesMap.set(key, med);
                                }
                              });
                            }
                          });
                        }
                      } catch (err) {
                        console.log(
                          "Failed to fetch advices for query:",
                          query,
                          err
                        );
                      }
                    }

                    // Convert Map back to array and update state
                    const finalMedicines = Array.from(medicinesMap.values());
                    console.log("Final medicines:", finalMedicines);
                    setMedicineAdvice(finalMedicines);
                  } catch (err) {
                    console.log("Failed to process diagnoses");
                  }
                }}
              >
                <TbRefresh />
              </div>
            </label>
            <div
              className="pres-form-group pres-form-row toggle-content"
              style={{ borderRadius: "0 0.5rem 0.5rem 0.5rem" }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    width: "100%",
                    gap: "0.5rem",
                  }}
                >
                  <AutoSuggestInput
                    style={{ flex: 1 }}
                    value={rDiagnosis}
                    // value={initialComplain}
                    onChange={(e) => {
                      // allow manual typing to show in the input
                      // setInitialComplain(e.target.value);
                      dispatch(change(e.target.value));
                      setComplaintQuery(e.target.value);
                      // debounce server query (only for last token after last comma)
                      if (complainDebounceRef.current)
                        clearTimeout(complainDebounceRef.current);
                      complainDebounceRef.current = setTimeout(async () => {
                        const val = e.target.value || "";
                        // Token to search is the last part of the string after a comma, or the whole string if no comma.
                        const lastToken = (val.split(",").pop() || "").trim();
                        if (!lastToken) {
                          setComplaintSuggestions([]);
                          return;
                        }
                        try {
                          setIsFetchingComplaints(true);
                          const { data } = await api.get(
                            `/api/v1/medical/suggestions/advices`,
                            { params: { q: lastToken, limit: 100 } }
                          );
                          // server returns advices
                          setComplaintSuggestions(
                            (data.advices || []).map((a) => ({
                              ...a,
                              label: a.name,
                            }))
                          );
                        } catch (err) {
                          setComplaintSuggestions([]);
                        } finally {
                          setIsFetchingComplaints(false);
                        }
                      }, 280);
                    }}
                    suggestions={
                      complaintSuggestions.length
                        ? complaintSuggestions
                        : symptomSuggestions
                    }
                    placeholder="Type to search complaints or symptoms..."
                    onSelect={(item, newVal) => {
                      // determine label
                      const label =
                        item && typeof item === "object"
                          ? item.name ||
                            (typeof newVal === "string" ? newVal : "")
                          : typeof newVal === "string"
                          ? newVal
                          : item || "";
                      // Replace last partial token (if present) or append selected label as a new token.
                      // AutoSuggestInput already updated the value via onChange. Just ensure trailing comma and space.
                      setComplaintSuggestions([]);
                      // track selected complaints list (preserve old behavior)
                      setSelectedComplaints((prev) => {
                        const names = new Set(
                          (prev || []).map((p) => p.name || p)
                        );
                        if (item && typeof item === "object") {
                          if (names.has(item.name)) return prev || [];
                          return [...(prev || []), item];
                        }
                        if (names.has(label)) return prev || [];
                        return [...(prev || []), label];
                      });
                      // append mapped items to medicines/tests/diet if item is object
                      if (item && typeof item === "object")
                        autoPopulateFromComplaint(item, true, true);
                      else autoPopulateFromComplaint(label, false, true);
                    }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  {(selectedComplaints || []).map((c, i) => (
                    <div
                      key={i}
                      style={{
                        padding: "6px 10px",
                        background: "#e8f2ff",
                        border: "1px solid #dae4f1",
                        borderRadius: 6,
                      }}
                    >
                      <span>{typeof c === "string" ? c : c.name}</span>
                      <button
                        type="button"
                        className="remove-btn"
                        style={{
                          marginLeft: 8,
                          display: "inline-flex",
                          alignItems: "center",
                        }}
                        onClick={() =>
                          setSelectedComplaints((prev) =>
                            prev.filter((_, idx) => idx !== i)
                          )
                        }
                      >
                        <BsTrash />
                      </button>
                    </div>
                  ))}
                  {analyzeResult && (
                    <div
                      style={{
                        padding: "6px 10px",
                        background: "#ecfdf5",
                        borderRadius: 6,
                      }}
                    >
                      <strong>Analyze applied</strong>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="pres-form-group full-width medicine-section">
            <label>Medicine Advice</label>
            <div className="medicine-data">
              <div className="medicine-head medicine-row">
                <span></span>
                <span>Medicine Name</span>
                <span>Type</span>
                <span>Dose</span>
                <span>Route</span>
                <span>Frequency</span>
                <span>Duration</span>
                <span>notes</span>
                <span>Action</span>
              </div>
              <div className="medicines-list">
                {medicineAdvice.map((m, idx) => (
                  <div className="medicine-row" key={idx}>
                    <div className="medicine-checkbox">
                      <input
                        type="checkbox"
                        checked={m.selected}
                        onChange={(e) => {
                          const copy = [...medicineAdvice];
                          copy[idx] = {
                            ...copy[idx],
                            selected: e.target.checked,
                          };
                          setMedicineAdvice(copy);
                        }}
                      />
                    </div>
                    <AutoSuggestInput
                      single
                      placeholder="Name"
                      value={m.name || ""}
                      suggestions={medSuggestions.medicines}
                      onChange={(e) => {
                        const copy = [...medicineAdvice];
                        copy[idx] = { ...copy[idx], name: e.target.value };
                        setMedicineAdvice(copy);
                      }}
                      onSelect={(item, label) => {
                        // item can be medicine object (from useMedicineSuggestions) or string
                        const copy = [...medicineAdvice];
                        if (item && typeof item === "object") {
                          copy[idx] = {
                            ...copy[idx],
                            name: item.name || label || copy[idx].name,
                            type: item.type || copy[idx].type,
                            dose: item.dose || copy[idx].dose,
                            frequency: item.frequency || copy[idx].frequency,
                            route: item.route || copy[idx].route,
                            duration: item.duration || copy[idx].duration,
                            notes: item.notes || copy[idx].notes,
                            selected: item.selected || copy[idx].selected,
                          };
                        } else {
                          copy[idx] = { ...copy[idx], name: label || item };
                        }
                        setMedicineAdvice(copy);
                      }}
                    />
                    <AutoSuggestInput
                      single
                      placeholder="Type"
                      value={m.type || ""}
                      suggestions={medSuggestions.lists.types}
                      onChange={(e) => {
                        const copy = [...medicineAdvice];
                        copy[idx] = { ...copy[idx], type: e.target.value };
                        setMedicineAdvice(copy);
                      }}
                    />
                    <AutoSuggestInput
                      single
                      placeholder="Dose"
                      value={m.dose || ""}
                      suggestions={medSuggestions.lists.doses}
                      onChange={(e) => {
                        const copy = [...medicineAdvice];
                        copy[idx] = { ...copy[idx], dose: e.target.value };
                        setMedicineAdvice(copy);
                      }}
                    />
                    <AutoSuggestInput
                      single
                      placeholder="Route"
                      value={m.route || ""}
                      suggestions={medSuggestions.lists.routes}
                      onChange={(e) => {
                        const copy = [...medicineAdvice];
                        copy[idx] = { ...copy[idx], route: e.target.value };
                        setMedicineAdvice(copy);
                      }}
                    />
                    <AutoSuggestInput
                      single
                      placeholder="Frequency"
                      value={m.frequency || ""}
                      suggestions={medSuggestions.lists.frequencies}
                      onChange={(e) => {
                        const copy = [...medicineAdvice];
                        copy[idx] = {
                          ...copy[idx],
                          frequency: e.target.value,
                        };
                        setMedicineAdvice(copy);
                      }}
                    />
                    <AutoSuggestInput
                      single
                      placeholder="Duration"
                      value={m.duration || ""}
                      suggestions={medSuggestions.lists.durations}
                      onChange={(e) => {
                        const copy = [...medicineAdvice];
                        copy[idx] = {
                          ...copy[idx],
                          duration: e.target.value,
                        };
                        setMedicineAdvice(copy);
                      }}
                    />
                    <AutoSuggestInput
                      single
                      placeholder="Notes"
                      value={m.notes || ""}
                      suggestions={medSuggestions.lists.notes}
                      onChange={(e) => {
                        const copy = [...medicineAdvice];
                        copy[idx] = {
                          ...copy[idx],
                          notes: e.target.value,
                        };
                        setMedicineAdvice(copy);
                      }}
                    />
                    <div className="medicine-actions">
                      <button
                        type="button"
                        className="remove-btn"
                        onClick={() => {
                          const copy = [...medicineAdvice];
                          copy.splice(idx, 1);
                          setMedicineAdvice(copy);
                        }}
                      >
                        <BsTrash />
                      </button>
                      {m.name &&
                        !medSuggestions.medicines.find(
                          (med) =>
                            med.name.toLowerCase() === m.name.toLowerCase()
                        ) && (
                          <button
                            type="button"
                            className="save-btn"
                            title="Save this medicine to the database"
                            onClick={() => {
                              dispatch(addMedicineRequest({ name: m.name }));
                              snackbar.success(`Medicine "${m.name}" saved!`);
                            }}
                          >
                            <FaSave />
                          </button>
                        )}
                    </div>
                  </div>
                ))}
                <div className="medicine-actions">
                  <button
                    type="button"
                    className="add-btn"
                    onClick={() =>
                      setMedicineAdvice([
                        ...medicineAdvice,
                        {
                          name: "",
                          type: "",
                          dose: "",
                          frequency: "",
                          route: "",
                          duration: "",
                          selected: true,
                        },
                      ])
                    }
                  >
                    Add Medicine
                  </button>
                  <button
                    type="button"
                    className="clear-btn"
                    onClick={() => setMedicineAdvice([])}
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="toggle-section">
          <div className="pres-form-row">
            {["Test Advice"].map((testType, index) => (
              <label
                key={index}
                style={{ marginRight: "1rem" }}
                className="toggle-title"
              >
                <input
                  type="checkbox"
                  value={testType}
                  checked={selectedTestTypes.includes(testType)}
                  onChange={(e) => handleCheckboxToggle(e, testType)}
                  style={{ marginRight: "1rem" }}
                />{" "}
                {testType}
              </label>
            ))}
          </div>
          {/* Test Advice Table */}
          {selectedTestTypes.includes("Test Advice") && (
            <div
              className="pres-form-group full-width toggle-content"
              style={{
                overflowX: "auto",
                borderRadius: "0 0.5rem 0.5rem 0.5rem",
              }}
            >
              {/* <label>Test Name</label> */}
              <table className="test-advice-table">
                <thead>
                  <tr>
                    <th></th>
                    {/* <th style={{ minWidth: "9rem", textAlign: "left" }}>
                      Test Name
                    </th> */}
                    <th></th>
                    {/* <th>Test Type</th>
                    <th>Precautions</th>
                    <th>Test Date</th> */}
                  </tr>
                </thead>
                <tbody>
                  {testAdviceRows.map((row, idx) => (
                    <tr key={idx}>
                      <td>
                        <input
                          type="checkbox"
                          checked={row.selected}
                          onChange={(e) =>
                            handleTestAdviceChange(
                              idx,
                              "selected",
                              e.target.checked
                            )
                          }
                        />
                      </td>
                      <td>
                        <AutoSuggestInput
                          single
                          placeholder="Test Name"
                          value={row.testName}
                          suggestions={testSuggestions}
                          onChange={(e) =>
                            handleTestAdviceChange(
                              idx,
                              "testName",
                              e.target.value
                            )
                          }
                          onSelect={(item, label) => {
                            // item will be test object with name and possibly testType/precautions/testDate
                            if (item && typeof item === "object") {
                              handleTestAdviceChange(
                                idx,
                                "testName",
                                item.name || label
                              );
                              handleTestAdviceChange(
                                idx,
                                "testType",
                                item.testType || ""
                              );
                              handleTestAdviceChange(
                                idx,
                                "precautions",
                                item.precautions || ""
                              );
                              handleTestAdviceChange(
                                idx,
                                "testDate",
                                item.testDate || ""
                              );
                            } else {
                              handleTestAdviceChange(
                                idx,
                                "testName",
                                label || item
                              );
                            }
                          }}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="remove-btn"
                          style={{ width: "100%" }}
                          onClick={() => {
                            const copy = [...testAdviceRows];
                            copy.splice(idx, 1);
                            setTestAdviceRows(copy);
                          }}
                        >
                          <BsTrash />
                        </button>
                      </td>
                      {/* <td>
                        <input
                          type="text"
                          value={row.testType}
                          onChange={(e) =>
                            handleTestAdviceChange(
                              idx,
                              "testType",
                              e.target.value
                            )
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={row.precautions}
                          onChange={(e) =>
                            handleTestAdviceChange(
                              idx,
                              "precautions",
                              e.target.value
                            )
                          }
                        />
                      </td>
                      <td>
                        <input
                          style={{ display: "flex", alignItems: "center" }}
                          type="date"
                          value={row.testDate}
                          onChange={(e) =>
                            handleTestAdviceChange(
                              idx,
                              "testDate",
                              e.target.value
                            )
                          }
                        />
                      </td> */}
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                type="button"
                className="add-btn"
                onClick={addNewTestAdviceRow}
                style={{ marginTop: 8 }}
              >
                Add Test Row
              </button>
            </div>
          )}
          {/* Medication Advice Textarea */}
          {/* {selectedTestTypes.includes("Medication") && (
            <div className="pres-form-group full-width">
              <label>Medication Advice</label>
              <textarea
                value={medicationAdvice}
                onChange={(e) => setMedicationAdvice(e.target.value)}
                placeholder="Enter medication advice..."
                rows={2}
              />
            </div>
          )} */}
          {/* Diet Advice Textarea */}
          {/* {selectedTestTypes.includes("Diet") && (
            <div className="pres-form-group full-width">
              <label>Diet Advice</label>
              <textarea
                value={dietAdvice}
                onChange={(e) => setDietAdvice(e.target.value)}
                placeholder="Enter diet advice..."
                rows={2}
              />
            </div>
          )} */}
        </div>

        <div
          className="pres-form-group full-width toggle-content"
          style={{ borderRadius: "0.5rem" }}
        >
          <label>Advice</label>
          <textarea
            value={additionalAdvice}
            onChange={(e) => setAdditionalAdvice(e.target.value)}
            placeholder="Enter advice..."
            rows={2}
          />
        </div>

        {/* <div className="pres-form-row"> */}
        <div
          className="pres-form-group toggle-content"
          style={{ borderRadius: "0.5rem" }}
        >
          <label>Next Follow-up Date</label>
          <input
            style={{ display: "flex", alignItems: "center" }}
            type="date"
            min={todayStr}
            value={followUp}
            onChange={(e) => {
              const v = e.target.value;
              setFollowUp(v);
            }}
          />
        </div>
        {/* </div> */}
      </div>

      <div className="wizard-footer">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FaSave
            title="Save"
            onClick={() => handleSave(false)}
            disabled={!isDirty}
            style={{ fontSize: "2rem", color: "#096dd9", cursor: "pointer" }}
          />
          <button
            className="btn btn-primary"
            onClick={() => handleSave(true)}
            disabled={!isDirty}
          >
            <BsPrinter />
          </button>
        </div>
        <div className="cross-box">
          {isDirty ? (
            <span
              style={{
                cursor: "pointer",
                fontSize: "2rem",
                color: "#e3ea20ff",
                position: "fixed",
                top: "0.2rem",
                right: "3.5rem",
              }}
            >
              <TbLoader3 />
            </span>
          ) : (
            <span style={{ color: "#0f766e" }}>Saved</span>
          )}
          <IoIosCloseCircleOutline
            onClick={handleClose}
            title="Close"
            style={{
              cursor: "pointer",
              fontSize: "2rem",
              color: "#f03368ff",
              position: "fixed",
              top: "0.2rem",
              left: "3.5rem",
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Prescription;
