import React, { useContext, useState } from "react";
import { TiHome } from "react-icons/ti";
import { RiLogoutBoxFill } from "react-icons/ri";
import { FaBell, FaRegFileAlt, FaUserMd, FaUserNurse, FaUserPlus, FaChartBar } from "react-icons/fa";
import { GiHamburgerMenu } from "react-icons/gi";
import { IoPersonAddSharp } from "react-icons/io5";
import { FaPrescription } from "react-icons/fa";
import { IoMdSettings } from "react-icons/io";

import api from "../utils/api";
import { useSnackbar } from "../context/SnackbarContext";
import { Context } from "../main";
import { useNavigate } from "react-router-dom";
import RequirePermission from "./RequirePermission";
import { IoIosPersonAdd } from "react-icons/io";
import { FiLogOut } from "react-icons/fi";
import useClickSound from "../hooks/useClickSound";
import "./Sidebar.css";


const Sidebar = () => {
  const snackbar = useSnackbar();
  const [show, setShow] = useState(false);
  const setupClickSound = useClickSound();

  const { isAuthenticated, setIsAuthenticated } = useContext(Context);

  const handleLogout = async () => {
    try {
      setupClickSound();
      const res = await api.get(`/api/v1/user/admin/logout`, {
        withCredentials: true,
      });

      // 1. Update React state
      setIsAuthenticated(false);
      snackbar.success(res.data.message);

      // 2. Clear local storage and session storage
      localStorage.clear();
      sessionStorage.clear();

      // 3. Force a hard reload to the login page to clear all in-memory state
      // and fetch a fresh version of the app.
      window.location.href = "/login";

    } catch (err) {
      // Even if logout fails, attempt to clear local state and redirect
      setIsAuthenticated(false);
      localStorage.clear();
      sessionStorage.clear();
      snackbar.error(err?.response?.data?.message || 'Logout failed');
      window.location.href = "/login";
    }
  };

  const navigateTo = useNavigate();

  const createNavAction = (path) => () => {
    setupClickSound();
    navigateTo(path);
    setShow(!show);
  };

  const toggleSidebar = () => {
    setupClickSound();
    setShow(!show);
  };

  const navActions = {
    home: createNavAction("/"),
    doctors: createNavAction("/doctors"),
    "doctor-dashboard": createNavAction("/doctor-dashboard"),
    messages: createNavAction("/messages"),
    reports: createNavAction("/reports"),
    addNewDoctor: createNavAction("/doctor/addnew"),
    addNewHelper: createNavAction("/helper/addnew"),
    compounders: createNavAction("/compounders"),
    settings: createNavAction("/settings"),
  };


  return (
    <>
      <nav
        style={!isAuthenticated ? { display: "none" } : { display: "flex" }}
        className={show ? "show sidebar" : "sidebar"}
      >
        <div className="links">
          <TiHome className="icon-btn" onClick={navActions.home} title="Dashboard" />
          
          <RequirePermission allowedRoles={["Admin", "Doctor"]}>
            <FaChartBar className="icon-btn" onClick={navActions['doctor-dashboard']} title="Doctor Dashboard" />
          </RequirePermission>

          <RequirePermission allowedRoles={["Admin"]}>
            <FaUserMd className="icon-btn" onClick={navActions.doctors} title="Doctors" />
          </RequirePermission>

          {/* <RequirePermission allowedRoles={["Admin"]}>
            <IoPersonAddSharp onClick={navActions.addNewDoctor} title="Add New Doctor" />
          </RequirePermission> */}

          <RequirePermission allowedRoles={["Admin", "Doctor"]}>
            <FaUserNurse className="icon-btn" onClick={navActions.compounders} title="Assistants" />
            {/* <IoIosPersonAdd onClick={navActions.addNewHelper} title="Create Assistants" /> */}
          </RequirePermission>

          <RequirePermission allowedRoles={["Admin", "Doctor", "Compounder"]}>
            <FaBell className="icon-btn" onClick={navActions.messages} title="Messages" />
            <FaRegFileAlt className="icon-btn" onClick={navActions.reports} title="Reports" />
          </RequirePermission>

          <RequirePermission allowedRoles={["Admin", "Doctor"]}>
            <IoMdSettings className="icon-btn" onClick={navActions.settings} title="Settings" />
          </RequirePermission>

          <FiLogOut className="icon-btn" onClick={handleLogout} title="Logout" />
        </div>
      </nav>
      <div
        className="wrapper"
        style={!isAuthenticated ? { display: "none" } : { display: "flex" }}
      >
        <GiHamburgerMenu className="hamburger icon-btn" onClick={toggleSidebar} />
      </div>
    </>
  );
};

export default Sidebar;
