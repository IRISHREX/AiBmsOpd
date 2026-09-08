import React, { useContext, useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useSnackbar } from "../context/SnackbarContext";
import { Context } from "../main";
import { dobToAgeYears, ageToDob } from "../utils/ageUtils";
import { makeNIC } from "../utils/nicMaker";
import { useDispatch, useSelector } from "react-redux";
import {
  createDoctorRequest,
  resetDoctorCreate,
} from "../store/doctorCreateSlice";
import { updateDoctorRequest } from "../store/doctorUpdateSlice";
import useClickSound from "../hooks/useClickSound";
import { FaUserEdit } from "react-icons/fa";
import "./AddNewDoctor.css";


const AddNewDoctor = ({ initialData, isEditing }) => {
  const snackbar = useSnackbar();
  const { isAuthenticated, setIsAuthenticated } = useContext(Context);
  const setupClickSound = useClickSound();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [nic, setNic] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [password, setPassword] = useState("");
  const [doctorDepartment, setDoctorDepartment] = useState("");
  const [qualifications, setQualifications] = useState("");
  const [docAvatar, setDocAvatar] = useState("");
  const [docAvatarPreview, setDocAvatarPreview] = useState("");
  const [signImage, setSignImage] = useState("");
  const [signImagePreview, setSignImagePreview] = useState("");
  const [headerImage, setHeaderImage] = useState("");
  const [headerImagePreview, setHeaderImagePreview] = useState("");
  const [age, setAge] = useState("");

  useEffect(() => {
    if (isEditing && initialData) {
      setFirstName(initialData.firstName || "");
      setLastName(initialData.lastName || "");
      setEmail(initialData.email || "");
      setPhone(initialData.phone || "");
      setNic(initialData.nic || "");
      setDob(initialData.dob ? String(initialData.dob).substring(0, 10) : "");
      setGender(initialData.gender || "");
      setDoctorDepartment(initialData.doctorDepartment || "");
      setQualifications(initialData.qualifications || "");
      setDocAvatarPreview(initialData.docAvatar?.url || "");
      setSignImagePreview(initialData.signImage?.url || "");
      setHeaderImagePreview(initialData.headerImage?.url || "");
      const ageFromDob = initialData.dob ? dobToAgeYears(initialData.dob) : "";
      setAge(ageFromDob);
    }
  }, [isEditing, initialData]);

  const navigateTo = useNavigate();
  const dispatch = useDispatch();
  const doctorCreate = useSelector((s) => s.doctorCreate);
  const navigate = useNavigate();

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

  const handleAvatar = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      setDocAvatarPreview(reader.result);
      setDocAvatar(file);
    };
  };

  const handleSignImage = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      setSignImagePreview(reader.result);
      setSignImage(file);
    };
  };

  const handleHeaderImage = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      setHeaderImagePreview(reader.result);
      setHeaderImage(file);
    };
  };

  const handleAddNewDoctor = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (
      !firstName ||
      !lastName ||
      !email ||
      !phone ||
      !gender ||
      !doctorDepartment
    ) {
      snackbar.error("Please fill all required fields!");
      return;
    }

    // Always recalculate NIC from phone and age
    const calculatedNic = makeNIC(phone, age);
    setNic(calculatedNic);
    // Always recalculate DOB from age
    const calculatedDob = ageToDob(age);
    setDob(calculatedDob);

    // Build FormData with files (FormData is non-serializable, so handle outside Redux)
    const formData = new FormData();
    formData.append("firstName", firstName);
    formData.append("lastName", lastName);
    formData.append("email", email);
    formData.append("phone", phone);
    if (password) formData.append("password", password);
    formData.append("nic", calculatedNic);
    formData.append("dob", calculatedDob);
    formData.append("gender", gender);
    formData.append("doctorDepartment", doctorDepartment);
    if (qualifications) formData.append("qualifications", qualifications);
    if (docAvatar) formData.append("docAvatar", docAvatar);
    if (signImage) formData.append("signImage", signImage);
    if (headerImage) formData.append("headerImage", headerImage);

    if (isEditing) {
      // Pass FormData directly to saga (bypasses Redux serialization check)
      dispatch(updateDoctorRequest({ id: initialData._id, formData }));
    } else {
      // Pass FormData directly to saga (bypasses Redux serialization check)
      dispatch(createDoctorRequest({ formData }));
    }
  };

  // Reset form and redirect on success
  useEffect(() => {
    if (doctorCreate.success) {
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setNic("");
      setDob("");
      setAge("");
      setGender("");
      setPassword("");
      setDoctorDepartment("");
      setQualifications("");
      setDocAvatar("");
      setDocAvatarPreview("");
      setSignImage("");
      setSignImagePreview("");
      setHeaderImage("");
      setHeaderImagePreview("");
      dispatch(resetDoctorCreate());
      setIsAuthenticated(true);
      navigateTo("/");
    }
  }, [doctorCreate.success]);

  if (!isAuthenticated && !isEditing) {
    return <Navigate to={"/login"} />;
  }

  const formContent = (
    <div className="add-doctor-form">
      <div className="doctpr-form-header">
        <FaUserEdit />
        <p>{isEditing ? "Edit Doctor" : "Register A New Doctor"}</p>
      </div>
      {/* <img
        src="/logo.svg"
        alt="logo"
        className="logo"
        style={{
          width: "150px",
          height: "150px",
          borderRadius: "50%",
          objectFit: "cover",
        }}
      /> */}
      <h1 className="form-title">
        {isEditing ? "EDIT DOCTOR" : "REGISTER A NEW DOCTOR"}
      </h1>
      <form onSubmit={handleAddNewDoctor}>
        <div className="first-wrapper">
          <div className="form-field-wrap left">
            <div className="doctor-avatar-imgbox">
              <img
                src={docAvatarPreview ? `${docAvatarPreview}` : "/doc1.jpg"}
                alt="Doctor Avatar"
              />
            </div>
            <input type="file" onChange={handleAvatar} accept="image/*" />
            <div style={{ marginTop: 8 }}>
              <label style={{ display: "block", marginBottom: 6 }}>
                Sign Image (optional)
              </label>
              <input type="file" onChange={handleSignImage} accept="image/*" />
              {signImagePreview && (
                <img
                  src={signImagePreview}
                  alt="Sign Preview"
                  style={{ width: 120, marginTop: 6 }}
                />
              )}
            </div>
            <div style={{ marginTop: 8 }}>
              <label style={{ display: "block", marginBottom: 6 }}>
                Header Image (optional)
              </label>
              <input
                type="file"
                onChange={handleHeaderImage}
                accept="image/*"
              />
              {headerImagePreview && (
                <img
                  src={headerImagePreview}
                  alt="Header Preview"
                  style={{ width: 180, marginTop: 6 }}
                />
              )}
            </div>
          </div>
          <div className="form-field-wrap right">
            <input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={doctorCreate.creating}
            />
            <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={doctorCreate.creating}
            />
            <input
              type="text"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={doctorCreate.creating}
            />

            {/* Age and DOB fields, sync both ways. NIC is always readonly and auto-populated. */}
            <input
              type="number"
              placeholder="Mobile Number"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (e.target.value && age) setNic(makeNIC(e.target.value, age));
              }}
              disabled={doctorCreate.creating}
            />
            <input
              type="number"
              placeholder="Age (years)"
              value={age}
              min={0}
              max={120}
              onChange={(e) => {
                const val = e.target.value;
                setAge(val);
                setDob(ageToDob(val));
                if (phone && val) setNic(makeNIC(phone, val));
              }}
              disabled={doctorCreate.creating}
            />
            <input
              type="date"
              placeholder="Date of Birth"
              value={dob}
              onChange={(e) => {
                setDob(e.target.value);
                const newAgeYears = dobToAgeYears(e.target.value);
                setAge(newAgeYears);
                if (phone && newAgeYears) setNic(makeNIC(phone, newAgeYears));
              }}
              readOnly
              style={{ background: "#f4f4f4", color: "#888" }}
              disabled={doctorCreate.creating}
            />
            <input
              type="text"
              placeholder="NIC (auto)"
              value={nic}
              readOnly
              style={{ background: "#f4f4f4", color: "#888" }}
              disabled={doctorCreate.creating}
            />
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              disabled={doctorCreate.creating}
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
            {isEditing ? null : (
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={doctorCreate.creating}
              />
            )}
            <select
              value={doctorDepartment}
              onChange={(e) => {
                setDoctorDepartment(e.target.value);
              }}
              disabled={doctorCreate.creating}
            >
              <option value="">Select Department</option>
              {departmentsArray.map((depart, index) => {
                return (
                  <option value={depart} key={index}>
                    {depart}
                  </option>
                );
              })}
            </select>
            <input
              type="text"
              placeholder="Qualifications (e.g., MBBS, MD)"
              value={qualifications}
              onChange={(e) => setQualifications(e.target.value)}
              disabled={doctorCreate.creating}
            />
            <button type="submit" disabled={doctorCreate.creating}>
              {isEditing
                ? "Update Doctor"
                : doctorCreate.creating
                ? "Registering..."
                : "Register New Doctor"}
            </button>
            {doctorCreate.error && (
              <div
                className="error-message"
                style={{ color: "red", marginTop: 8 }}
              >
                {doctorCreate.error}
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );

  if (isEditing) {
    return formContent;
  }

  return (
    <section className="page bg-light-blue">
      <div className="dashboard-title-block add-form">
        <button
          ref={setupClickSound}
          className="arrow-btn icon-btn"
          onClick={() => navigate("/doctors")}
          // style={{ marginLeft: 8 }}
        ></button>
        <p>{isEditing ? "Edit Doctor" : "Register New Doctor"}</p>
      </div>
      <div className="container">{formContent}</div>
    </section>
  );
};

export default AddNewDoctor;
