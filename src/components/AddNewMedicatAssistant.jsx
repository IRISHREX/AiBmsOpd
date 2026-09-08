import React, { useContext, useEffect, useState } from "react";
import { Context } from "../main";
import { Navigate, useNavigate } from "react-router-dom";
import { useSnackbar } from "../context/SnackbarContext";
import api from "../utils/api";
import { useDispatch, useSelector } from "react-redux";
import {
  createAdminRequest,
  resetAdminCreate,
} from "../store/adminCreateSlice";
import useClickSound from "../hooks/useClickSound";

const AddNewAdmin = () => {
  const snackbar = useSnackbar();
  const { isAuthenticated, setIsAuthenticated, admin } = useContext(Context);
  const setupClickSound = useClickSound();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [nic, setNic] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [password, setPassword] = useState("");
  const [availableDoctors, setAvailableDoctors] = useState([]);
  const [assignedDoctors, setAssignedDoctors] = useState([]);
  const role = admin?.role || admin?.userRole || "Admin";
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDoctors = async () => {
      if (role !== "Admin") return;
      try {
        const { data } = await api.get("/api/v1/user/doctors");
        setAvailableDoctors(data.doctors || []);
      } catch (err) {
        // show friendly message
        console.log("Error fetching doctors for assignment", err);
        snackbar.error("Failed to fetch doctors for assignment");
      }
    };
    if (role === "Doctor" && admin?._id) {
      setAssignedDoctors([admin._id]);
    }
    fetchDoctors();
  }, [role, admin]);

  const navigateTo = useNavigate();
  const dispatch = useDispatch();
  const adminCreate = useSelector((s) => s.adminCreate);

  const handleAddNewAdmin = async (e) => {
    e.preventDefault();
    const payload = {
      firstName,
      lastName,
      email,
      phone,
      nic,
      dob,
      gender,
      password,
      assignedDoctors,
    };
    dispatch(createAdminRequest(payload));
  };

  // Reset form and redirect on success
  useEffect(() => {
    if (adminCreate.success) {
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setNic("");
      setDob("");
      setGender("");
      setPassword("");
      setAssignedDoctors([]);
      dispatch(resetAdminCreate());
      setIsAuthenticated(true);
      navigateTo("/");
    }
  }, [adminCreate.success]);

  if (!isAuthenticated) {
    return <Navigate to={"/login"} />;
  }

  return (
    <section className="page bg-light-blue">
      <div className="dashboard-title-block add-form">
        <button
          ref={setupClickSound}
          className="arrow-btn icon-btn"
          onClick={() => navigate("/compounders")}
          // style={{ marginLeft: 8 }}
        >
        </button>
        <p>Register New Assistant</p>
      </div>
      <div className="container">
      <div className="form-component add-admin-form">
        <img
          src="/logo.svg"
          alt="logo"
          className="logo"
          style={{
            width: "150px",
            height: "150px",
            borderRadius: "50%",
            objectFit: "cover",
          }}
        />
        <h1 className="form-title">ADD NEW MEDICAL ASSISTANT</h1>
        <form onSubmit={handleAddNewAdmin}>
          <div>
            <input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={adminCreate.creating}
            />
            <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={adminCreate.creating}
            />
          </div>
          <div>
            <input
              type="text"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={adminCreate.creating}
            />
            <input
              type="number"
              placeholder="Mobile Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={adminCreate.creating}
            />
          </div>
          <div>
            <input
              type="number"
              placeholder="NIC"
              value={nic}
              onChange={(e) => setNic(e.target.value)}
              disabled={adminCreate.creating}
            />
            <input
              type={"date"}
              placeholder="Date of Birth"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              disabled={adminCreate.creating}
            />
          </div>
          <div className="outer-gnp-box" style={{ flexDirection: "column" }}>
            <div className="gnp-box">
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                disabled={adminCreate.creating}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={adminCreate.creating}
              />
            </div>
            {/* If Admin creating a compounder, allow assignment to multiple doctors. If doctor creating, assign to themselves */}
            {role === "Admin" ? (
              <div
                style={{
                  marginTop: "0.75rem",
                  justifyContent: "space-between",
                }}
                className="assign-doctor-box"
              >
                <label style={{ fontWeight: 700 }}>
                  Assign to doctors (multiple):
                </label>
                <div
                  style={{
                    maxHeight: "100px",
                    width: "400px",
                    overflowY: "auto",
                    marginTop: "0.5rem",
                    flexDirection: "column",
                    alignItems: "start",
                  }}
                >
                  {availableDoctors.map((d) => (
                    <label
                      key={d._id}
                      style={{
                        minHeight: "1.2rem",
                        overflow: "hidden",
                        display: "flex",
                        gap: "0.5rem",
                        alignItems: "center",
                        padding: "0.25rem",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={assignedDoctors.includes(d._id)}
                        disabled={adminCreate.creating}
                        onChange={(e) => {
                          if (e.target.checked)
                            setAssignedDoctors((s) => [...s, d._id]);
                          else
                            setAssignedDoctors((s) =>
                              s.filter((id) => id !== d._id)
                            );
                        }}
                      />
                      <span>{`${d.firstName || ""} ${d.lastName || ""} (${
                        d.doctorDepartment || "General"
                      })`}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ marginTop: "0.75rem" }}>
                <label style={{ fontWeight: 700 }}>Assigned Doctor:</label>
                <div>
                  {admin?.firstName
                    ? `${admin.firstName} ${admin.lastName}`
                    : "You"}
                </div>
              </div>
            )}
          </div>
          <div style={{ justifyContent: "center", alignItems: "center" }}>
            <button type="submit" disabled={adminCreate.creating}>
              {adminCreate.creating ? "Creating..." : "CREATE ASSISTANT"}
            </button>
            {adminCreate.error && (
              <div
                className="error-message"
                style={{ color: "red", marginTop: 8 }}
              >
                {adminCreate.error}
              </div>
            )}
          </div>
        </form>
      </div>
</div>
    </section>
  );
};

export default AddNewAdmin;
