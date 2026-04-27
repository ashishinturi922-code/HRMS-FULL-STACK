import React, { useState, useEffect } from "react";
import "./AdminTimeSheets.css";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { FaEye, FaSearch } from "react-icons/fa";

const AdminTimeSheets = () => {
  const [activeTab, setActiveTab] = useState("approval");
  const [viewDesc, setViewDesc] = useState("");
  const [timesheets, setTimesheets] = useState([]);
  
  // Search states for each tab
  const [approvalSearch, setApprovalSearch] = useState("");
  const [teamleaderSearch, setTeamleaderSearch] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");

  // ✅ FETCH DATA FROM LIVE DATABASE
  const loadTimesheets = async () => {
    try {
      const res = await fetch("http://192.168.0.165:5000/api/admin/all-timesheets");
      const data = await res.json();
      
      console.log("Database response:", data); 
      
      setTimesheets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Database Load Error:", err);
    }
  };

  // Initial load on component mount
  useEffect(() => {
    loadTimesheets();
  }, []);

  // ✅ UPDATE STATUS IN LIVE DATABASE
  const handleStatusChange = async (id, status) => {
    try {
      const res = await fetch(`http://192.168.0.165:5000/api/admin/timesheets/status/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });

      if (res.ok) {
        alert(`Timesheet ${status} successfully!`);
        loadTimesheets();
      } else {
        alert("Failed to update status on server.");
      }
    } catch (err) {
      console.error("Update Error:", err);
    }
  };

  // ✅ DOWNLOAD
  const downloadData = (data, fileName) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Timesheets");

    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buffer]), fileName);
  };

  // ✅ NORMALIZED ROLE HELPER
  const getNormalizedRole = (role) => {
    if (!role) return "";
    return role.toLowerCase().replace(/\s/g, "").trim();
  };

  // ✅ SEARCH FILTER HELPER
  const filterBySearch = (data, searchTerm) => {
    if (!searchTerm.trim()) return data;
    
    const term = searchTerm.toLowerCase();
    return data.filter((t) => {
      const name = (t.name || "").toLowerCase();
      const empId = (t.employee_id || t.empId || "").toLowerCase();
      const role = (t.role || "").toLowerCase();
      
      return name.includes(term) || empId.includes(term) || role.includes(term);
    });
  };

  // Get filtered data for each role
  const managerData = timesheets.filter(
    (t) =>
      getNormalizedRole(t.role) === "manager" ||
      getNormalizedRole(t.role) === "projectmanager"
  );

  const teamleaderData = timesheets.filter(
    (t) => getNormalizedRole(t.role) === "teamleader"
  );

  const employeeData = timesheets.filter(
    (t) => getNormalizedRole(t.role) === "employee"
  );

  // Apply search filters
  const filteredManagerData = filterBySearch(managerData, approvalSearch);
  const filteredTeamleaderData = filterBySearch(teamleaderData, teamleaderSearch);
  const filteredEmployeeData = filterBySearch(employeeData, employeeSearch);

  return (
    <div className="page-container">
      <h2>Admin TimeSheets</h2>

      {/* TABS */}
      <div className="tabs">
        <button 
          className={activeTab === "approval" ? "active" : ""} 
          onClick={() => setActiveTab("approval")}
        >
          Manager Approval
        </button>
        <button 
          className={activeTab === "teamleader" ? "active" : ""} 
          onClick={() => setActiveTab("teamleader")}
        >
          TeamLeader
        </button>
        <button 
          className={activeTab === "employee" ? "active" : ""} 
          onClick={() => setActiveTab("employee")}
        >
          Employee
        </button>
      </div>

      {/* ================= APPROVAL (MANAGERS) ================= */}
      {activeTab === "approval" && (
        <div className="table-card">
          <div className="card-header">
            <h3>Manager TimeSheet Approval</h3>
            <button
              className="download-btn"
              onClick={() => downloadData(managerData, "Manager_Timesheets.xlsx")}
            >
              📥 Download
            </button>
          </div>

          {/* SEARCH BOX */}
          <div className="search-container">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search by Name, Employee ID, or Role..."
              value={approvalSearch}
              onChange={(e) => setApprovalSearch(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Emp ID</th>
                  <th>Name</th>
                  <th>Project</th>
                  <th>Task</th>
                  <th>Date</th>
                  <th>Hours</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredManagerData.length > 0 ? (
                  filteredManagerData.map((t) => (
                    <tr key={t.id}>
                      <td>{t.employee_id || t.empId}</td>
                      <td>{t.name}</td>
                      <td>{t.project}</td>
                      <td>{t.task}</td>
                      <td>{new Date(t.task_date || t.taskDate).toLocaleDateString()}</td>
                      <td>{t.hours}</td>

                      <td>
                        <div className="status-with-icon">
                          <span className={t.status.toLowerCase()}>{t.status}</span>
                          <FaEye
                            className="eye-icon"
                            onClick={() => setViewDesc(t.description)}
                            title="View Description"
                          />
                        </div>
                      </td>

                      <td>
                        {t.status === "Pending" ? (
                          <div className="action-buttons">
                            <button
                              className="approve-btn"
                              onClick={() => handleStatusChange(t.id, "Approved")}
                              title="Approve"
                            >
                              ✓
                            </button>

                            <button
                              className="reject-btn"
                              onClick={() => handleStatusChange(t.id, "Rejected")}
                              title="Reject"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <span className="status-done">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="no-data">
                      No matching records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TEAM LEADER ================= */}
      {activeTab === "teamleader" && (
        <div className="table-card">
          <div className="card-header">
            <h3>TeamLeader TimeSheets</h3>
            <button
              className="download-btn"
              onClick={() => downloadData(teamleaderData, "TeamLeader_Timesheets.xlsx")}
            >
              📥 Download
            </button>
          </div>

          {/* SEARCH BOX */}
          <div className="search-container">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search by Name, Employee ID, or Role..."
              value={teamleaderSearch}
              onChange={(e) => setTeamleaderSearch(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Emp ID</th>
                  <th>Name</th>
                  <th>Project</th>
                  <th>Task</th>
                  <th>Date</th>
                  <th>Hours</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {filteredTeamleaderData.length > 0 ? (
                  filteredTeamleaderData.map((t) => (
                    <tr key={t.id}>
                      <td>{t.employee_id || t.empId}</td>
                      <td>{t.name}</td>
                      <td>{t.project}</td>
                      <td>{t.task}</td>
                      <td>{new Date(t.task_date || t.taskDate).toLocaleDateString()}</td>
                      <td>{t.hours}</td>

                      <td>
                        <div className="status-with-icon">
                          <span className={t.status.toLowerCase()}>{t.status}</span>
                          <FaEye
                            className="eye-icon"
                            onClick={() => setViewDesc(t.description)}
                            title="View Description"
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="no-data">
                      No matching records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= EMPLOYEE ================= */}
      {activeTab === "employee" && (
        <div className="table-card">
          <div className="card-header">
            <h3>Employee TimeSheets</h3>
            <button
              className="download-btn"
              onClick={() => downloadData(employeeData, "Employee_Timesheets.xlsx")}
            >
              📥 Download
            </button>
          </div>

          {/* SEARCH BOX */}
          <div className="search-container">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search by Name, Employee ID, or Role..."
              value={employeeSearch}
              onChange={(e) => setEmployeeSearch(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Emp ID</th>
                  <th>Name</th>
                  <th>Project</th>
                  <th>Task</th>
                  <th>Date</th>
                  <th>Hours</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {filteredEmployeeData.length > 0 ? (
                  filteredEmployeeData.map((t) => (
                    <tr key={t.id}>
                      <td>{t.employee_id || t.empId}</td>
                      <td>{t.name}</td>
                      <td>{t.project}</td>
                      <td>{t.task}</td>
                      <td>{new Date(t.task_date || t.taskDate).toLocaleDateString()}</td>
                      <td>{t.hours}</td>

                      <td>
                        <div className="status-with-icon">
                          <span className={t.status.toLowerCase()}>{t.status}</span>
                          <FaEye
                            className="eye-icon"
                            onClick={() => setViewDesc(t.description)}
                            title="View Description"
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="no-data">
                      No matching records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ✅ DESCRIPTION MODAL */}
      {viewDesc && (
        <div className="modal">
          <div className="modal-content">
            <h3>Task Description</h3>
            <p>{viewDesc}</p>
            <button className="modal-close-btn" onClick={() => setViewDesc("")}>Close</button>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminTimeSheets;