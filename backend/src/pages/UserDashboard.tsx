// ============================================
// pages/UserDashboard.tsx (Employee Portal)
// ============================================

import React, { useEffect, useState } from "react";
import "../styles/UserDashboard.css";

// ============================================
// INTERFACES
// ============================================
interface Timesheet {
  id: number;
  employeeName: string;
  companyName: string;
  project: string;
  task: string;
  hours: string;
  date: string;
  status: "Pending" | "Approved" | "Invoice Generated";
}

const UserDashboard = () => {
  const [activeTab, setActiveTab] = useState("upload");

  // TIMESHEET FORM STATES
  const [selectedDate, setSelectedDate] = useState("");
  const [project, setProject] = useState("");
  const [task, setTask] = useState("");
  const [hours, setHours] = useState("");

  // DATA STATES
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);

  // CONSTANTS FOR LOGGED IN USER
  const CURRENT_USER = "Ashish";
  const COMPANY_NAME = "Samsung";
  const TIMESHEET_STORAGE_KEY = "sap_timesheets_v2";

  // ============================================
  // LOAD DATA
  // ============================================
  useEffect(() => {
    // Load Timesheets from LocalStorage
    const storedTimesheets = JSON.parse(localStorage.getItem(TIMESHEET_STORAGE_KEY) || "[]");
    setTimesheets(storedTimesheets);
  }, []);

  // ============================================
  // SUBMIT TIMESHEET
  // ============================================
  const handleTimesheetSubmit = () => {
    if (!selectedDate || !project || !task || !hours) {
      alert("Please fill all fields for the timesheet.");
      return;
    }

    const newTimesheet: Timesheet = {
      id: Date.now(),
      employeeName: CURRENT_USER,
      companyName: COMPANY_NAME,
      date: selectedDate,
      project,
      task,
      hours,
      status: "Pending", 
    };

    const updatedTimesheets = [...timesheets, newTimesheet];
    setTimesheets(updatedTimesheets);
    localStorage.setItem(TIMESHEET_STORAGE_KEY, JSON.stringify(updatedTimesheets));

    alert("Timesheet Uploaded Successfully. Waiting for Manager Approval. ⏳");

    // Reset Form
    setSelectedDate("");
    setProject("");
    setTask("");
    setHours("");
    setActiveTab("summary"); 
  };

  // ============================================
  // LOGOUT
  // ============================================
  const handleLogout = () => {
    localStorage.removeItem("loggedInUser");
    window.location.href = "/";
  };

  // Filter so the user only sees their own data
  const myTimesheets = timesheets.filter((ts) => ts.employeeName === CURRENT_USER);

  return (
    <div className="user-dashboard">
      {/* ===================================== */}
      {/* TOPBAR */}
      {/* ===================================== */}
      <div className="topbar">
        <div className="topbar-left">
          <h1 className="logo">{COMPANY_NAME} Employee Portal</h1>
        </div>

        <div className="topbar-center">
          {/* NAVIGATION LINKS */}
          <div 
            className={`nav-link ${activeTab === "upload" ? "active-link" : ""}`} 
            onClick={() => setActiveTab("upload")}
          >
            Upload Timesheet
          </div>
          <div 
            className={`nav-link ${activeTab === "summary" ? "active-link" : ""}`} 
            onClick={() => setActiveTab("summary")}
          >
            My History
          </div>
        </div>

        <div className="topbar-right">
          <div className="profile-box">
            <div className="profile-circle">{CURRENT_USER.charAt(0)}</div>
            <span>{CURRENT_USER}</span>
            <div className="logout-btn" onClick={handleLogout}>Logout</div>
          </div>
        </div>
      </div>

      {/* ===================================== */}
      {/* CONTENT */}
      {/* ===================================== */}
      <div className="dashboard-content">

        {/* ================================= */}
        {/* UPLOAD TIMESHEET TAB */}
        {/* ================================= */}
        {activeTab === "upload" && (
          <div className="glass-card">
            <h2>Submit Daily Timesheet</h2>
            <p className="subtitle">Enter your work details for approval by the {COMPANY_NAME} manager.</p>
            
            <div className="form-row">
              <div className="form-group">
                <label>Select Date</label>
                <input 
                  type="date" 
                  value={selectedDate} 
                  onChange={(e) => setSelectedDate(e.target.value)} 
                />
              </div>
              <div className="form-group">
                <label>Project Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. AI Module" 
                  value={project} 
                  onChange={(e) => setProject(e.target.value)} 
                />
              </div>
              <div className="form-group">
                <label>Worked Hours</label>
                <input 
                  type="number" 
                  placeholder="Hours" 
                  value={hours} 
                  onChange={(e) => setHours(e.target.value)} 
                />
              </div>
            </div>

            <div className="form-group">
              <label>Task Description</label>
              <textarea 
                placeholder="Describe the tasks you performed today..." 
                value={task} 
                onChange={(e) => setTask(e.target.value)} 
              />
            </div>

            <button className="submit-btn" onClick={handleTimesheetSubmit}>
              Submit to Manager
            </button>
          </div>
        )}

        {/* ================================= */}
        {/* TIMESHEET SUMMARY TAB */}
        {/* ================================= */}
        {activeTab === "summary" && (
          <div className="glass-card">
            <h2>My Timesheet History</h2>
            <p className="subtitle">Track the status of your submitted hours.</p>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Project</th>
                  <th>Task Details</th>
                  <th>Hours</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {myTimesheets.length > 0 ? (
                  myTimesheets.map((item) => (
                    <tr key={item.id}>
                      <td><strong>{item.date}</strong></td>
                      <td>{item.project}</td>
                      <td>{item.task}</td>
                      <td>{item.hours} hrs</td>
                      <td>
                        <span className={`status-badge ${(item.status || "pending").toLowerCase().replace(/\s+/g, "-")}`}>
                          {item.status || "Pending"}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{textAlign: "center", padding: "40px", color: "#64748b"}}>
                      No timesheets submitted yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
};

export default UserDashboard;