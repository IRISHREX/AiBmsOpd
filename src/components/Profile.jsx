import React, { useEffect, useState } from "react";
import { useSnackbar } from "../context/SnackbarContext";
import api from "../utils/api";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./Profile.css";
import CapacitySchedulerForm from "./CapacitySchedulerForm";
import { MdEmail } from "react-icons/md";
import { MdPhoneIphone } from "react-icons/md";
import { PiGenderIntersexBold } from "react-icons/pi";
import { RxLapTimer } from "react-icons/rx";
import { IoIosPerson } from "react-icons/io";
import { LuCalendarClock } from "react-icons/lu";
import { IoIosMail } from "react-icons/io";
import { BiSolidEditAlt } from "react-icons/bi";
import { MdOutlineLockPerson } from "react-icons/md";


// Password Change Modal Component
const PasswordChangeModal = ({
  isOpen,
  onClose,
  onSubmit,
  loading,
  passwordForm,
  setPasswordForm,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "white",
          padding: "2rem",
          borderRadius: "8px",
          maxWidth: "400px",
          width: "90%",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0, marginBottom: "1.5rem" }}>
          🔐 Change Password
        </h2>

        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label htmlFor="currentPassword">Current Password</label>
            <input
              id="currentPassword"
              type="password"
              placeholder="Enter your current password"
              value={passwordForm.currentPassword}
              onChange={(e) =>
                setPasswordForm({
                  ...passwordForm,
                  currentPassword: e.target.value,
                })
              }
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="newPassword">New Password</label>
            <input
              id="newPassword"
              type="password"
              placeholder="Enter new password (minimum 8 characters)"
              value={passwordForm.newPassword}
              onChange={(e) =>
                setPasswordForm({
                  ...passwordForm,
                  newPassword: e.target.value,
                })
              }
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="Confirm your new password"
              value={passwordForm.confirmPassword}
              onChange={(e) =>
                setPasswordForm({
                  ...passwordForm,
                  confirmPassword: e.target.value,
                })
              }
              required
            />
          </div>

          <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
            <button
              type="submit"
              disabled={loading}
              className="password-submit-btn"
              style={{ flex: 1 }}
            >
              {loading ? "Changing..." : "Change Password"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                flex: 1,
                padding: "0.75rem 1.5rem",
                background: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "4px",
                fontSize: "1rem",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Profile = () => {
  const snackbar = useSnackbar();
  const [userDetails, setUserDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [accountAge, setAccountAge] = useState(null);
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Fetch user details
  useEffect(() => {
    const fetchUserDetails = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/api/v1/user/dashboard/me`);
        if (response.data.success) {
          const user = response.data.user;
          setUserDetails(user);

          // Only set calendar date if createdAt exists and is valid
          if (user.createdAt) {
            const createdDate = new Date(user.createdAt);
            if (!isNaN(createdDate.getTime())) {
              setCalendarDate(createdDate);
              calculateAccountAge(user.createdAt);
            }
          }
        }
      } catch (error) {
        snackbar.error(
          error?.response?.data?.message || "Failed to load user details"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetails();
  }, []);

  // Calculate account age (years, months, days)
  const calculateAccountAge = (joinDate) => {
    const join = new Date(joinDate);
    const today = new Date();

    let years = today.getFullYear() - join.getFullYear();
    let months = today.getMonth() - join.getMonth();
    let days = today.getDate() - join.getDate();

    if (days < 0) {
      months--;
      const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days += lastMonth.getDate();
    }

    if (months < 0) {
      years--;
      months += 12;
    }

    setAccountAge({ years, months, days });
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    if (
      !passwordForm.currentPassword ||
      !passwordForm.newPassword ||
      !passwordForm.confirmPassword
    ) {
      snackbar.error("Please fill all password fields!");
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      snackbar.error("New password must be at least 8 characters long!");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      snackbar.error("New passwords don't match!");
      return;
    }

    setPasswordLoading(true);
    try {
      const response = await api.post(`/api/v1/user/change-own-password`, {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      if (response.data.success) {
        snackbar.success("Password changed successfully!");
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setPasswordModalOpen(false);
      }
    } catch (error) {
      snackbar.error(
        error?.response?.data?.message || "Failed to change password"
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="page">
        <div className="profile-page">
          <div
            className="loader"
            style={{ Height: "3rem", display: "block", marginInline: "auto" }}
          ></div>
        </div>
      </section>
    );
  }

  if (!userDetails) {
    return (
      <section className="page">
        <div className="profile-page">
          <p>Failed to load user details</p>
        </div>
      </section>
    );
  }

  return (
    <section className="page bg-light-blue">
      <div className="profile-page">
        <div className="profile-header">
          <h1>Profile Settings</h1>
          <p>Manage your personal & security settings</p>
        </div>

        <div className="profile-container">
          {/* User Details Section */}
          <div className="profile-section user-details-section">
            <h3>
              <IoIosPerson />
              Personal Overview
            </h3>
            <div className="details-grid">
              <div className="profile-avatar-block">
                <div className="profile-avatar">
                  <img src="../../public/profile-avatar.png" alt="" />
                </div>
                <div>
                  <p className="profile-name">
                    {userDetails.firstName} {userDetails.lastName}
                  </p>
                  <p
                    className="badge"
                    style={{
                      background:
                        userDetails.role === "Admin"
                          ? "#ff6b6b"
                          : userDetails.role === "Doctor"
                          ? "#4ecdc4"
                          : userDetails.role === "Compounder"
                          ? "#45b7d1"
                          : "#95a5a6",
                    }}
                  >
                    {userDetails.role}
                  </p>
                </div>
              </div>
              {/* <div className="detail-item">
                <label>First Name</label>
                <p>{userDetails.firstName}</p>
              </div>
              <div className="detail-item">
                <label>Last Name</label>
                <p>{userDetails.lastName}</p>
              </div> */}
              <div className="detail-item">
                <label>
                  <IoIosMail />
                  Email
                </label>
                <p>{userDetails.email}</p>
              </div>
              <div className="detail-item">
                <label>
                  <MdPhoneIphone />
                  Phone
                </label>
                <p>{userDetails.phone}</p>
              </div>
              {/* <div className="detail-item">
                <label>Role</label>
                <p
                  className="badge"
                  style={{
                    background:
                      userDetails.role === "Admin"
                        ? "#ff6b6b"
                        : userDetails.role === "Doctor"
                        ? "#4ecdc4"
                        : userDetails.role === "Compounder"
                        ? "#45b7d1"
                        : "#95a5a6",
                    color: "white",
                    padding: "0.25rem 0.75rem",
                    borderRadius: "20px",
                    display: "inline-block",
                    fontSize: "0.875rem",
                  }}
                >
                  {userDetails.role}
                </p>
              </div> */}
              {userDetails.gender && (
                <div className="detail-item">
                  <label>
                    <PiGenderIntersexBold /> Gender
                  </label>
                  <p>{userDetails.gender}</p>
                </div>
              )}
              {userDetails.doctorDepartment && (
                <div className="detail-item">
                  <label>Department</label>
                  <p>{userDetails.doctorDepartment}</p>
                </div>
              )}
              {userDetails.qualifications && (
                <div className="detail-item">
                  <label>Qualifications</label>
                  <p>{userDetails.qualifications}</p>
                </div>
              )}
            </div>
            <div className="edit-btn-block flex-center">
              <button className="edit-profile-btn">
                <BiSolidEditAlt />
                Edit Profile
              </button>
            </div>
          </div>

          <div className="">
            {/* Account Age Section */}
            <div className="profile-section account-age-section">
              <h3>
                <LuCalendarClock /> Account Age
              </h3>
              <div className="account-age-display">
                <div className="age-item">
                  <span className="age-number">{accountAge?.years || 0}</span>
                  <span className="age-label">
                    Year{accountAge?.years !== 1 ? "s" : ""}
                  </span>
                </div>
                <span className="age-separator">•</span>
                <div className="age-item">
                  <span className="age-number">{accountAge?.months || 0}</span>
                  <span className="age-label">
                    Month{accountAge?.months !== 1 ? "s" : ""}
                  </span>
                </div>
                <span className="age-separator">•</span>
                <div className="age-item">
                  <span className="age-number">{accountAge?.days || 0}</span>
                  <span className="age-label">
                    Day{accountAge?.days !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
              <p className="joined-date">
                Joined on:{" "}
                <strong>
                  {new Date(userDetails.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </strong>
              </p>
            </div>

            {/* Password Change Button Section */}
            <div className="profile-section password-section">
              <h3>
                <MdOutlineLockPerson />
                Security
              </h3>
              <p className="security-text">
                Manage your account password and security settings.
              </p>
              <button
                onClick={() => setPasswordModalOpen(true)}
                className="password-submit-btn"
                style={{ width: "100%" }}
              >
                Change Password
              </button>
            </div>
          </div>

          {/* Calendar Section */}
          {userDetails?.createdAt && (
            <div className="profile-section calendar-section">
              <h3>
               📅 Join Date Calendar
              </h3>
              <div className="calendar-container">
                <Calendar
                  value={calendarDate}
                  disabled={true}
                  tileClassName={({ date }) => {
                    const joinDate = new Date(userDetails.createdAt);
                    if (
                      !isNaN(joinDate.getTime()) &&
                      date.toDateString() === joinDate.toDateString()
                    ) {
                      return "join-date-tile";
                    }
                    return null;
                  }}
                />
                <p
                  style={{
                    marginTop: "1rem",
                    textAlign: "center",
                    fontSize: "0.875rem",
                    color: "#666",
                  }}
                >
                  📍 Your join date is highlighted in the calendar
                </p>
              </div>
            </div>
          )}

          {/* Doctor Capacity Settings Section */}

          <CapacitySchedulerForm doctorId={userDetails._id} />
        </div>

        {/* Password Change Modal */}
        <PasswordChangeModal
          isOpen={passwordModalOpen}
          onClose={() => {
            setPasswordModalOpen(false);
            setPasswordForm({
              currentPassword: "",
              newPassword: "",
              confirmPassword: "",
            });
          }}
          onSubmit={handlePasswordChange}
          loading={passwordLoading}
          passwordForm={passwordForm}
          setPasswordForm={setPasswordForm}
        />
      </div>
    </section>
  );
};

export default Profile;
