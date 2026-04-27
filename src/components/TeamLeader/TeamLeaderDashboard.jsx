import React, { useState, useEffect } from "react";
import "./TeamLeaderDashboard.css"; // reuse same CSS
import logo from "./assets/logo.jpeg"; // Updated path to match assets folder

import TeamLeaderDashboardHome from "./TeamLeaderDashboardHome";
import TeamLeaderProjects from "./TeamLeaderProjects";
import TeamLeaderCalendar from "./TeamLeaderCalendar";
import TeamLeaderLeaveApprovals from "./TeamLeaderLeaveApprovals";
import TeamLeaderTimeSheets from "./TeamLeaderTimeSheets";
import TeamLeaderProfile from "./TeamLeaderProfile";
import TeamLeaderApplyLeave from "./TeamLeaderApplyLeave";
import TeamLeaderResignation from "./TeamLeaderResignation";
import TeamLeaderChangePassword from "./TeamLeaderChangePassword";

import {
  FaTachometerAlt,
  FaProjectDiagram,
  FaCalendarAlt,
  FaClock,
  FaUserCircle,
  FaUserClock,
  FaKey,
  FaSignOutAlt
} from "react-icons/fa";

const TeamLeaderDashboard = ({ onLogout }) => {
  const [activePage, setActivePage] = useState("dashboard");

  const [user, setUser] = useState({
    id: "", // Added ID to the state for backend queries
    name: "",
    photo: ""
  });

  useEffect(() => {
    const loadUser = () => {
      try {
        const storedUser = JSON.parse(localStorage.getItem("user"));
        if (storedUser) {
          setUser({
            id: storedUser.id || "", // Ensure ID is captured from login session
            name: storedUser.name || "Team Leader",
            photo: storedUser.photo || ""
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
    // ✅ Shared props ensure child components hit the correct backend endpoints
    const sharedProps = { 
      leaderId: user.id, 
      userId: user.id 
    };

    switch (activePage) {
      case "dashboard":
        return <TeamLeaderDashboardHome {...sharedProps} />;
      
      case "projects":
        return <TeamLeaderProjects {...sharedProps} />;

      case "leaveApprovals":
        return <TeamLeaderLeaveApprovals {...sharedProps} />;

      case "timesheets":
        return <TeamLeaderTimeSheets {...sharedProps} />;

      case "applyLeave":
        return <TeamLeaderApplyLeave {...sharedProps} />;

      case "resignation":
        return <TeamLeaderResignation {...sharedProps} />;

      case "calendar":
        return <TeamLeaderCalendar />;

      case "profile":
        return <TeamLeaderProfile userId={user.id} />;

      case "changePassword":
        return <TeamLeaderChangePassword userId={user.id} />;

      default:
        return <TeamLeaderDashboardHome {...sharedProps} />;
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
            <li onClick={() => setActivePage("projects")} className={activePage === "projects" ? "active" : ""}>
              <FaProjectDiagram /> <span>Projects</span>
            </li>
            <li onClick={() => setActivePage("leaveApprovals")} className={activePage === "leaveApprovals" ? "active" : ""}>
              <FaUserClock /> <span>Leave Approvals</span>
            </li>
            <li onClick={() => setActivePage("timesheets")} className={activePage === "timesheets" ? "active" : ""}>
              <FaClock /> <span>Time Sheets</span>
            </li>
            <li onClick={() => setActivePage("applyLeave")} className={activePage === "applyLeave" ? "active" : ""}>
              <FaUserClock /> <span>Apply Leave</span>
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
                {user.name ? user.name.charAt(0).toUpperCase() : "T"}
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

export default TeamLeaderDashboard;