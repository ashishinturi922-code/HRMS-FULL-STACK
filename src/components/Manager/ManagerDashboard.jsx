import React, { useState, useEffect } from "react";
import "./ManagerDashboard.css";

import logo from "./assets/logo.jpeg";

import DashboardHome from "./DashboardHome";
import Employees from "./Employees";
import Projects from "./Projects";
import Calendar from "./Calendar";
import LeaveApprovals from "./LeaveApprovals";
import TimeSheets from "./TimeSheets";
import Profile from "./Profile";
import ApplyLeave from "./ApplyLeave";
import Resignation from "./Resignation";
import ChangePassword from "./ChangePassword";

import {
  FaTachometerAlt,
  FaUsers,
  FaProjectDiagram,
  FaCalendarAlt,
  FaClock,
  FaUserCircle,
  FaUserClock,
  FaKey,
  FaSignOutAlt
} from "react-icons/fa";

// ✅ FIXED: Safe fallback so photo URL never becomes "undefined/..."
const BASE_URL = process.env.REACT_APP_API_URL || "https://hrms-api.hrapta.com";

const ManagerDashboard = ({ onLogout }) => {
  const [activePage, setActivePage] = useState("dashboard");

  const [user, setUser] = useState({
    id: "",
    name: "",
    photo: ""
  });

  useEffect(() => {
    const loadUser = () => {
      try {
        const storedUser = JSON.parse(localStorage.getItem("user"));
        if (storedUser) {
          setUser({
            id: storedUser.id || "",
            name: storedUser.name || "Manager",
            photo: storedUser.photo ? `${BASE_URL}${storedUser.photo}` : ""
          });
        }
      } catch (err) {
        console.error("Error parsing user data from localStorage", err);
      }
    };

    loadUser();
    window.addEventListener("userUpdated", loadUser);

    return () => {
      window.removeEventListener("userUpdated", loadUser);
    };
  }, []);

  const renderPage = () => {
    const sharedProps = { managerId: user.id, userId: user.id };

    switch (activePage) {
      case "dashboard":
        return <DashboardHome {...sharedProps} />;
      case "employees":
        return <Employees {...sharedProps} />;
      case "projects":
        return <Projects {...sharedProps} />;
      case "applyLeave":
        return <ApplyLeave {...sharedProps} />;
      case "leaveRequests":
        return <LeaveApprovals {...sharedProps} />;
      case "timesheets":
        return <TimeSheets {...sharedProps} />;
      case "resignation":
        return <Resignation {...sharedProps} />;
      case "calendar":
        return <Calendar />;
      case "profile":
        return <Profile userId={user.id} />;
      case "changePassword":
        return <ChangePassword userId={user.id} />;
      default:
        return <DashboardHome {...sharedProps} />;
    }
  };

  return (
    <div className="manager-container">
      <div className="sidebar">
        <div className="logo-container">
          <img src={logo} alt="Company Logo" />
        </div>

        <nav className="sidebar-nav">
          <ul>
            <li onClick={() => setActivePage("dashboard")} className={activePage === "dashboard" ? "active" : ""}>
              <FaTachometerAlt /> <span>Dashboard</span>
            </li>
            <li onClick={() => setActivePage("employees")} className={activePage === "employees" ? "active" : ""}>
              <FaUsers /> <span>Employees</span>
            </li>
            <li onClick={() => setActivePage("projects")} className={activePage === "projects" ? "active" : ""}>
              <FaProjectDiagram /> <span>Projects</span>
            </li>
            <li onClick={() => setActivePage("applyLeave")} className={activePage === "applyLeave" ? "active" : ""}>
              <FaUserClock /> <span>Apply Leave</span>
            </li>
            <li onClick={() => setActivePage("leaveRequests")} className={activePage === "leaveRequests" ? "active" : ""}>
              <FaUserClock /> <span>Leave Requests</span>
            </li>
            <li onClick={() => setActivePage("timesheets")} className={activePage === "timesheets" ? "active" : ""}>
              <FaClock /> <span>Time Sheets</span>
            </li>
            <li onClick={() => setActivePage("resignation")} className={activePage === "resignation" ? "active" : ""}>
              <FaSignOutAlt /> <span>Resignation</span>
            </li>
            <li onClick={() => setActivePage("calendar")} className={activePage === "calendar" ? "active" : ""}>
              <FaCalendarAlt /> <span>Calendar</span>
            </li>
            <li onClick={() => setActivePage("profile")} className={activePage === "profile" ? "active" : ""}>
              <FaUserCircle /> <span>Profile</span>
            </li>
            <li onClick={() => setActivePage("changePassword")} className={activePage === "changePassword" ? "active" : ""}>
              <FaKey /> <span>Change Password</span>
            </li>
          </ul>
        </nav>
      </div>

      <div className="main-content">
        <div className="topbar">
          <h3>ADDITION CONSULTING SERVICE PVT LTD</h3>
          <div className="topbar-right">
            {user.photo ? (
              <img src={user.photo} alt="profile" className="topbar-img" />
            ) : (
              <div className="topbar-avatar">
                {user.name ? user.name.charAt(0).toUpperCase() : "M"}
              </div>
            )}
            <span className="topbar-name">{user.name}</span>
            <button onClick={onLogout} className="logout-btn">Logout</button>
          </div>
        </div>
        <div className="content">
          {renderPage()}
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;