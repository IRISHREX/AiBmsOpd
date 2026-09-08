import api from "../utils/api";
import Modal from "react-modal";
import React, { useContext, useEffect, useState } from "react";
import { useSnackbar } from "../context/SnackbarContext";
import { Context } from "../main";
import { Navigate } from "react-router-dom";
import { FaSearch } from "./DoctorIcons";
import UserCard from "./UserCard";
import RequirePermission from "./RequirePermission";
import { useDispatch, useSelector } from "react-redux";
import { fetchDoctorsRequest } from "../store/doctorsSlice";
import { playSaveSound, playDeleteSound } from "../utils/soundUtils";
import CapacitySchedulerForm from "./CapacitySchedulerForm";
import { useNavigate } from "react-router-dom";
import Toolbar from "./Toolbar";
import AddNewDoctor from "./AddNewDoctor";
import { MdAdd } from "react-icons/md";
import useClickSound from "../hooks/useClickSound";
import { FaSearchDollar } from "react-icons/fa";
import "./Doctors.css";

const Doctors = () => {
  const snackbar = useSnackbar();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const { isAuthenticated } = useContext(Context);
  const dispatch = useDispatch();
  const storeDoctors = useSelector((s) => s.doctors.doctors || []);
  const doctorsLoading = useSelector((s) => s.doctors.loading);

  const navigate = useNavigate();
  const setupClickSound = useClickSound();

  useEffect(() => {
    dispatch(fetchDoctorsRequest({ query: searchTerm }));
  }, [searchTerm, dispatch]);

  const handleSearch = (e) => {
    e.preventDefault();
  };

  const handleRedirect = () => {
    navigate("/doctor/addnew");
  };

  if (!isAuthenticated) {
    return <Navigate to={"/login"} />;
  }

  return (
    <>
      <section className="page doctors bg-light-blue">
        <div className="doctors-body">
          <Toolbar>
            <div className="dashboard-title-block">
              <h1>Doctors</h1>
              <form
                onSubmit={handleSearch}
                style={{
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <input
                  type="text"
                  placeholder="Search by name, phone, department, NIC..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: "2.5rem",
                    height: "2.5rem",
                  }}
                />
                <button
                  ref={setupClickSound}
                type="button" className="compounders-search-btn">

                  <FaSearch/>Search
                </button>
              </form>
              <button
                ref={setupClickSound}
                type="submit"
                className="add-form-btn icon-btn"
                style={{
                  background: "#271776ca",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                }}
                onClick={handleRedirect}
              >
                <MdAdd title="Add New Doctors"/>
                {/* Add New Doctors */}
              </button>
            </div>
          </Toolbar>
          <div className="banner">
            {doctorsLoading ? (
              <span className="loader"></span>
            ) : storeDoctors && storeDoctors.length > 0 ? (
              storeDoctors.map((element) => (
                <UserCard
                  key={element._id}
                  user={element}
                  extraLines={[
                    <div key="dept">
                      <strong>Dept:</strong> {element.doctorDepartment}
                    </div>,
                    <div key="qual">
                      <strong>Qualifications:</strong>{" "}
                      {element?.qualifications || "N/A"}
                    </div>,
                  ]}
                  onView={(u) => {
                    setSelectedDoctor(u);
                    setShowViewModal(true);
                  }}
                  onEdit={(u) => {
                    setSelectedDoctor(u);
                    setShowUpdateModal(true);
                  }}
                  onDelete={(u) => {
                    snackbar.confirm(
                      "Are you sure you want to delete this doctor?",
                      async () => {
                        try {
                          await api.delete(`/api/v1/user/user/${u._id}`);
                          playDeleteSound();
                          snackbar.success("Doctor deleted");
                          dispatch(fetchDoctorsRequest({ query: searchTerm }));
                        } catch (err) {
                          snackbar.error("Delete failed");
                        }
                      }
                    );
                  }}
                />
              ))
            ) : (
              <h1>No Registered Doctors Found!</h1>
            )}
          </div>
        </div>
      </section>
      <Modal
        isOpen={showUpdateModal}
        onRequestClose={() => setShowUpdateModal(false)}
        contentLabel="Update Doctor"
        style={{
          overlay: { zIndex: 1000 },
          content: {
            maxWidth: "900px",
            margin: "auto",
            borderRadius: "12px",
            padding: "2rem",
          },
        }}
      >
        <AddNewDoctor isEditing={true} initialData={selectedDoctor} />
      </Modal>

      {/* View Modal with Capacity Scheduler */}
      <Modal
        isOpen={showViewModal}
        onRequestClose={() => setShowViewModal(false)}
        contentLabel="Doctor Profile"
        style={{
          overlay: { zIndex: 1000 },
          content: {
            maxWidth: "600px",
            margin: "auto",
            borderRadius: "12px",
            padding: "2rem",
            maxHeight: "90vh",
            overflow: "auto",
          },
        }}
      >
        {selectedDoctor && (
          <div>
            <h2 style={{ marginTop: 0, marginBottom: "1.5rem" }}>
              👨‍⚕️ {selectedDoctor.firstName} {selectedDoctor.lastName}
            </h2>

            <div
              style={{
                marginBottom: "1.5rem",
                borderBottom: "1px solid #eee",
                paddingBottom: "1.5rem",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1rem",
                  marginBottom: "1rem",
                }}
              >
                <div>
                  <span style={{ fontWeight: 600, color: "#271776" }}>
                    Email:
                  </span>{" "}
                  {selectedDoctor.email}
                </div>
                <div>
                  <span style={{ fontWeight: 600, color: "#271776" }}>
                    Phone:
                  </span>{" "}
                  {selectedDoctor.phone}
                </div>
                <div>
                  <span style={{ fontWeight: 600, color: "#271776" }}>
                    NIC:
                  </span>{" "}
                  {selectedDoctor.nic}
                </div>
                <div>
                  <span style={{ fontWeight: 600, color: "#271776" }}>
                    Gender:
                  </span>{" "}
                  {selectedDoctor.gender}
                </div>
                <div>
                  <span style={{ fontWeight: 600, color: "#271776" }}>
                    Department:
                  </span>{" "}
                  {selectedDoctor.doctorDepartment}
                </div>
                <div>
                  <span style={{ fontWeight: 600, color: "#271776" }}>
                    DOB:
                  </span>{" "}
                  {selectedDoctor.dob
                    ? String(selectedDoctor.dob).substring(0, 10)
                    : "N/A"}
                </div>
                {selectedDoctor.consultationFee && (
                  <div>
                    <span style={{ fontWeight: 600, color: "#271776" }}>
                      Consultation Fee:
                    </span>{" "}
                    Rs. {selectedDoctor.consultationFee}
                  </div>
                )}
                {selectedDoctor.qualifications && (
                  <div>
                    <span style={{ fontWeight: 600, color: "#271776" }}>
                      Qualifications:
                    </span>{" "}
                    {selectedDoctor.qualifications}
                  </div>
                )}
              </div>
            </div>

            {/* Capacity Scheduler Form for Admin */}
            <RequirePermission allowedRoles={["Admin"]}>
              <div
                style={{
                  background: "#f8f9fa",
                  padding: "1.5rem",
                  borderRadius: "8px",
                  marginBottom: "1.5rem",
                }}
              >
                <CapacitySchedulerForm
                  doctorId={selectedDoctor._id}
                  allowAdminSelfManagement={false}
                />
              </div>
            </RequirePermission>

            <button
              type="button"
              onClick={() => setShowViewModal(false)}
              style={{
                width: "100%",
                padding: "0.75rem 1.5rem",
                background: "#271776",
                color: "white",
                border: "none",
                borderRadius: "4px",
                fontSize: "1rem",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        )}
      </Modal>
    </>
  );
};

export default Doctors;