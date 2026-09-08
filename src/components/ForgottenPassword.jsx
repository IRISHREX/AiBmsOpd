import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "../context/SnackbarContext";
import api from "../utils/api";
import {
  LOGIN_LOGO_WIDTH,
  LOGIN_LOGO_BORDER_RADIUS,
  LOGIN_BUTTON_BORDER,
  LOGIN_BUTTON_BORDER_RADIUS,
} from "../utils/constants";

const ForgottenPassword = () => {
  const snackbar = useSnackbar();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [loading, setLoading] = useState(false);

  const navigateTo = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!firstName || !lastName || !email || !phone || !dob) {
      snackbar.error("Please fill all fields!");
      return;
    }

    if (phone.length < 10 || phone.length > 11) {
      snackbar.error("Phone number must be 10-11 digits!");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post(
        `/api/v1/message/forgot-password`,
        {
          firstName,
          lastName,
          email,
          phone,
          dob,
        }
      );

      if (response.data.success) {
        snackbar.success("Password reset request sent to admin for verification!");
        // Reset form
        setFirstName("");
        setLastName("");
        setEmail("");
        setPhone("");
        setDob("");
        // Navigate back to login after 2 seconds
        setTimeout(() => {
          navigateTo("/login");
        }, 2000);
      }
    } catch (error) {
      const message = error.response?.data?.message || "Failed to send password reset request";
      snackbar.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <section className="container form-component">
        <img
          src="/logo.svg"
          alt="logo"
          className="logo"
          style={{
            width: `${LOGIN_LOGO_WIDTH}px`,
            borderRadius: LOGIN_LOGO_BORDER_RADIUS,
          }}
        />
        <h1 className="form-title">FORGOTTEN PASSWORD</h1>
        <p>Request password reset by providing your details for admin verification.</p>
        
        {loading ? (
          <div className="loader" style={{ Height: "3rem" }}></div>
        ) : (
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="tel"
              placeholder="Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            <input
              type="date"
              placeholder="Date of Birth"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              required
            />
            <div style={{ justifyContent: "center", alignItems: "center" }}>
              <button
                type="submit"
                style={{
                  border: LOGIN_BUTTON_BORDER,
                  borderRadius: LOGIN_BUTTON_BORDER_RADIUS,
                }}
                disabled={loading}
              >
                {loading ? "Submitting..." : "Submit Request"}
              </button>
            </div>
            <div style={{ marginTop: "1rem", textAlign: "center" }}>
              <p>
                Remember your password?{" "}
                <span
                  onClick={() => navigateTo("/login")}
                  style={{
                    color: "#007bff",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Back to Login
                </span>
              </p>
            </div>
          </form>
        )}
      </section>
    </>
  );
};

export default ForgottenPassword;
