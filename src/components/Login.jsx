import React, { useContext, useEffect, useState, useRef } from "react";
import { Navigate, useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from 'react-redux';
import { useSnackbar } from "../context/SnackbarContext";
import { Context } from "../main";
import {
  LOGIN_LOGO_WIDTH,
  LOGIN_LOGO_BORDER_RADIUS,
  LOGIN_FORM_MARGIN,
  LOGIN_RADIO_LABEL_MARGIN_RIGHT,
  LOGIN_RADIO_LABEL_MARGIN_LEFT,
  LOGIN_BUTTON_BORDER,
  LOGIN_BUTTON_BORDER_RADIUS,
} from "../utils/constants";
import { loginRequest } from "../store/authSlice";
import "./Login.css";

const Login = () => {
  const snackbar = useSnackbar();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("Admin");
  const buttonRef = useRef(null);

  const { isAuthenticated, setIsAuthenticated } = useContext(Context);
  const dispatch = useDispatch();
  const auth = useSelector(state => state.auth);

  const navigateTo = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  const handleLogin = async (e) => {
    e.preventDefault();
    createSparks();
    buttonRef.current?.classList.add('struck');
    setTimeout(() => {
      buttonRef.current?.classList.remove('struck');
    }, 500);
    // dispatch redux login
    dispatch(loginRequest({ email, password, role }));
  };

  const createSparks = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    for (let i = 0; i < 16; i++) {
      const spark = document.createElement('div');
      spark.className = 'spark';
      
      const angle = (Math.PI * 2 * i) / 16;
      const distance = 50 + Math.random() * 30;
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance;
      
      spark.style.left = centerX + 'px';
      spark.style.top = centerY + 'px';
      spark.style.setProperty('--tx', tx + 'px');
      spark.style.setProperty('--ty', ty + 'px');
      spark.style.animation = `sparkFly ${0.5 + Math.random() * 0.3}s ease-out forwards`;
      
      document.body.appendChild(spark);
      
      setTimeout(() => spark.remove(), 800);
    }
  };

  useEffect(() => {
    if (auth.isAuthenticated) {
      setIsAuthenticated(true);
      navigateTo(from, { replace: true });
    }
    if (auth.error) {
      snackbar.error(auth.error);
    }
  }, [auth.isAuthenticated, auth.error, from, navigateTo, setIsAuthenticated, snackbar]);

  if (isAuthenticated || auth.isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  return (
    <div className="login-page">
      <div className="lightning-container">
        <div className="lightning lightning-tl"></div>
        <div className="lightning lightning-tr"></div>
        <div className="lightning lightning-bl"></div>
        <div className="lightning lightning-br"></div>
      </div>

      <div className="login-form-container">
        <img src="/logo.svg" alt="logo" className="logo" />
        <h1 className="form-title">WELCOME TO BIOMECASOFT</h1>

        {auth.loading ? <p>LOGING IN...</p> : <p>Dashboard access for Admins and Doctors. Choose role then login.</p>}
        
        {auth.loading ? <div className="login-loader" style={{ width: "3rem", height: "3rem" }}></div> : (
          <form className="login-form" onSubmit={handleLogin}>
            <input
              type="text"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            
            <div className="role-selection">
              <div className="role-option">
                <input 
                  type="radio" 
                  id="admin" 
                  name="role" 
                  value="Admin" 
                  checked={role === 'Admin'} 
                  onChange={() => setRole('Admin')} 
                />
                <label htmlFor="admin">Admin</label>
              </div>
              <div className="role-option">
                <input 
                  type="radio" 
                  id="doctor" 
                  name="role" 
                  value="Doctor" 
                  checked={role === 'Doctor'} 
                  onChange={() => setRole('Doctor')} 
                />
                <label htmlFor="doctor">Doctor</label>
              </div>
              <div className="role-option">
                <input 
                  type="radio" 
                  id="assistant" 
                  name="role" 
                  value="Compounder" 
                  checked={role === 'Compounder'} 
                  onChange={() => setRole('Compounder')} 
                />
                <label htmlFor="assistant">Assistant</label>
              </div>
            </div>
            
            <button 
              type="submit" 
              className="login-button"
              ref={buttonRef}
            >
              Login
            </button>
            
            <div className="forgot-password-link">
              <p>
                Forgot your password?{" "}
                <span onClick={() => navigateTo('/forgotten-password')}>
                  Click here
                </span>
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
