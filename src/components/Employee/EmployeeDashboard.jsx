import React, { useState, useEffect } from "react";
import "./EmployeeDashboard.css";
import logo from "./assets/logo.jpeg";  // ✅ Correct

import EmployeeDashboardHome from "./EmployeeDashboardHome";
import EmployeeProjects from "./EmployeeProjects";
import EmployeeCalendar from "./EmployeeCalendar";
import EmployeeTimeSheets from "./EmployeeTimeSheets";
import EmployeeApplyLeave from "./EmployeeApplyLeave";
import EmployeeResignation from "./EmployeeResignation";
import EmployeeChangePassword from "./EmployeeChangePassword";
import EmployeeProfile from "./EmployeeProfile";
import EmployeeOfferLetter from "./EmployeeOfferLetter";

import {
  FaTachometerAlt,
  FaProjectDiagram,
  FaCalendarAlt,
  FaClock,
  FaUserCircle,
  FaUserClock,
  FaFileAlt,
  FaSignOutAlt,
  FaKey
} from "react-icons/fa";

const EmployeeDashboard = ({ onLogout }) => {
  const [activePage, setActivePage] = useState("dashboard");

  const [user, setUser] = useState({
    name: "",
    photo: ""
  });

  useEffect(() => {
    const loadUser = () => {
      const storedUser = JSON.parse(localStorage.getItem("user"));

      if (storedUser) {
        setUser({
          name: storedUser.name || "Employee",
          photo: storedUser.photo || ""
        });
      }
    };

    loadUser();
    window.addEventListener("userUpdated", loadUser);

    return () => {
      window.removeEventListener("userUpdated", loadUser);
    };
  }, []);

  const renderPage = () => {
    switch (activePage) {
      case "dashboard":
        return <EmployeeDashboardHome role="employee" />;

      case "projects":
        return <EmployeeProjects role="employee" />;

      case "applyLeave":
        return <EmployeeApplyLeave />;

      case "timesheets":
        return <EmployeeTimeSheets role="employee" />;

      case "calendar":
        return <EmployeeCalendar />;

      case "resignation":
        return <EmployeeResignation />;

      case "offerLetter":
        return <EmployeeOfferLetter />;

      case "profile":
        return <EmployeeProfile />;

      case "changePassword":
        return <EmployeeChangePassword />;

      default:
        return <EmployeeDashboardHome />;
    }
  };

  return (
    <div className="manager-container">

      {/* SIDEBAR */}
      <div className="sidebar">
        <div className="logo-container">
          <img src={logo} alt="Company Logo" />
        </div>

        <ul>
          <li onClick={() => setActivePage("dashboard")} className={activePage === "dashboard" ? "active" : ""}>
            <FaTachometerAlt /> Dashboard
          </li>

          <li onClick={() => setActivePage("projects")} className={activePage === "projects" ? "active" : ""}>
            <FaProjectDiagram /> My Projects
          </li>

          <li onClick={() => setActivePage("applyLeave")} className={activePage === "applyLeave" ? "active" : ""}>
            <FaUserClock /> Apply Leave
          </li>

          <li onClick={() => setActivePage("timesheets")} className={activePage === "timesheets" ? "active" : ""}>
            <FaClock /> My Time Sheets
          </li>

          <li onClick={() => setActivePage("calendar")} className={activePage === "calendar" ? "active" : ""}>
            <FaCalendarAlt /> Calendar
          </li>

          <li onClick={() => setActivePage("offerLetter")} className={activePage === "offerLetter" ? "active" : ""}>
            <FaFileAlt /> Offer Letter
          </li>

          <li onClick={() => setActivePage("resignation")} className={activePage === "resignation" ? "active" : ""}>
            <FaSignOutAlt /> Resignation
          </li>

          <li onClick={() => setActivePage("profile")} className={activePage === "profile" ? "active" : ""}>
            <FaUserCircle /> Profile
          </li>

          <li onClick={() => setActivePage("changePassword")} className={activePage === "changePassword" ? "active" : ""}>
            <FaKey /> Change Password
          </li>
        </ul>
      </div>

      {/* MAIN */}
      <div className="main-content">

        <div className="topbar">
          <h3>ADDITION CONSULTING SERVICE PVT LTD</h3>

          <div className="topbar-right">
            {user.photo ? (
              <img src={user.photo} alt="profile" className="topbar-img" />
            ) : (
              <div className="topbar-avatar">
                {user.name.charAt(0)}
              </div>
            )}

            <span className="topbar-name">{user.name}</span>

            <button onClick={onLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>

        <div className="content">
          {renderPage()}
        </div>

      </div>
    </div>
  );
};

export default EmployeeDashboard;