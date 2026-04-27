import React, { useState, useEffect } from "react";
import "./AdminDashboard.css";

// Logo
import logo from "./assets/logo.jpeg";

// Pages
import DashboardHome from "./DashboardHome";
import CreateUser from "./CreateUser";
import Employees from "./Employees";
import Projects from "./Projects";
import Offers from "./Offers";
import Resignation from "./Resignation";
import Calendar from "./Calendar";
import LeaveApprovals from "./LeaveApprovals";
import TimeSheets from "./TimeSheets";
import Profile from "./Profile";
import Departments from "./Departments";

// Icons
import {
  FaTachometerAlt,
  FaUserPlus,
  FaUsers,
  FaProjectDiagram,
  FaFileAlt,
  FaSignOutAlt,
  FaCalendarAlt,
  FaClock,
  FaUserCircle,
  FaUserClock,
  FaBuilding 
} from "react-icons/fa";

const AdminDashboard = ({ onLogout }) => {
  const [activePage, setActivePage] = useState("dashboard");

  const [employees, setEmployees] = useState([]);
  const [offers, setOffers] = useState([]);

  const [user, setUser] = useState({
    name: "",
    photo: ""
  });

  useEffect(() => {
    const loadUser = () => {
      const storedUser = JSON.parse(localStorage.getItem("user"));

      if (storedUser) {
        setUser({
          name: storedUser.name || "User",
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
        return <DashboardHome />;
      case "departments": 
        return <Departments />;
      case "createUser":
        return <CreateUser setEmployees={setEmployees} />;
      case "employees":
        return <Employees employees={employees} />;
      case "projects":
        return <Projects />;
      case "offers":
        return <Offers offers={offers} setOffers={setOffers} />;
      case "resignation":
        return <Resignation />;
      case "calendar":
        return <Calendar />;
      case "leaves":
        return <LeaveApprovals />;
      case "timesheets":
        return <TimeSheets />;
      case "profile":
        return <Profile />;
      
      default:
        return <DashboardHome />;
    }
  };

  return (
    <div className="admin-container">

      {/* SIDEBAR */}
      <div className="sidebar">
        <div className="logo-container">
          <img src={logo} alt="Company Logo" />
        </div>

        <ul>
          <li onClick={() => setActivePage("dashboard")} className={activePage === "dashboard" ? "active" : ""}>
            <FaTachometerAlt /> Dashboard
          </li>

          <li onClick={() => setActivePage("createUser")} className={activePage === "createUser" ? "active" : ""}>
            <FaUserPlus /> Create User
          </li>

          <li onClick={() => setActivePage("employees")} className={activePage === "employees" ? "active" : ""}>
            <FaUsers /> Employees
          </li>

          <li onClick={() => setActivePage("departments")} className={activePage === "departments" ? "active" : ""}>
            <FaBuilding /> Departments
          </li>

          <li onClick={() => setActivePage("projects")} className={activePage === "projects" ? "active" : ""}>
            <FaProjectDiagram /> Projects
          </li>

          <li onClick={() => setActivePage("offers")} className={activePage === "offers" ? "active" : ""}>
            <FaFileAlt /> Offer Letters
          </li>

          <li onClick={() => setActivePage("resignation")} className={activePage === "resignation" ? "active" : ""}>
            <FaSignOutAlt /> Resignation
          </li>

          <li onClick={() => setActivePage("calendar")} className={activePage === "calendar" ? "active" : ""}>
            <FaCalendarAlt /> Calendar
          </li>

          <li onClick={() => setActivePage("leaves")} className={activePage === "leaves" ? "active" : ""}>
            <FaUserClock /> Leave Approvals
          </li>

          <li onClick={() => setActivePage("timesheets")} className={activePage === "timesheets" ? "active" : ""}>
            <FaClock /> Time Sheets
          </li>

          <li onClick={() => setActivePage("profile")} className={activePage === "profile" ? "active" : ""}>
            <FaUserCircle /> Profile
          </li>
        </ul>
      </div>

      {/* MAIN */}
      <div className="main-content">

        {/* TOPBAR */}
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

export default AdminDashboard;