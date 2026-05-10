import React, { useState, useEffect } from "react";
import "./ManagerTimeSheets.css";
import * as XLSX from "xlsx";
import { FaTasks, FaClock, FaEye, FaCheck, FaTimes, FaUsers, FaSearch } from "react-icons/fa";
import API_URL from "../../apiConfig"; // ✅ FIX: Imported the working API config

const ManagerTimeSheets = () => {
  const [activeTab, setActiveTab] = useState("timesheets");
  const [activeSubTab, setActiveSubTab] = useState("submit");

  const [timesheets, setTimesheets] = useState([]);
  const [tlTimesheets, setTlTimesheets] = useState([]);
  const [managerProjects, setManagerProjects] = useState([]);
  const [editId, setEditId] = useState(null);
  const [empSearch, setEmpSearch] = useState("");

  const now = new Date();
  const [filter, setFilter] = useState({ 
    year: String(now.getFullYear()), 
    month: String(now.getMonth() + 1), 
    week: "" 
  });
  const [summaryFilter, setSummaryFilter] = useState({ from: "", to: "" });
  const [reportFilter, setReportFilter] = useState({ from: "", to: "" });

  const [viewDesc, setViewDesc] = useState("");

  const currentUser = JSON.parse(localStorage.getItem("user")) || {
    id: 0,
    employee_id: "N/A",
    name: "User",
  };

  const [formData, setFormData] = useState({
    user_id: currentUser.id,
    name: currentUser.name,
    entryDate: new Date().toISOString().split("T")[0],
    taskDate: "",
    project: "",
    task: "",
    hours: "",
    description: "",
    status: "Pending"
  });

  // --- HELPER FUNCTIONS ---
  const getWeekNumber = (dateString) => {
    if (!dateString) return null;
    const d = new Date(dateString);
    const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
    return Math.ceil((d.getDate() + firstDay.getDay()) / 7);
  };

  const getWeeksInMonth = (year, month) => {
    if (!year || !month) return [];
    const weeks = new Set();
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month - 1, i);
      weeks.add(getWeekNumber(date));
    }
    return Array.from(weeks).sort((a, b) => a - b);
  };

  // --- FETCH DATA ---
  const loadTimesheets = async () => {
    try {
      // ✅ FIX: Using imported API_URL
      const res = await fetch(`${API_URL}/api/manager/all-timesheets`);
      const data = await res.json();
      setTimesheets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Load Error:", err);
    }
  };

  const loadTLTimesheets = async () => {
    try {
      // ✅ FIX: Using imported API_URL
      const res = await fetch(
        `${API_URL}/api/manager/team-leads-timesheets/${currentUser?.id}`
      );
      const data = await res.json();
      setTlTimesheets(Array.isArray(data) ? data : []);
      console.log("✅ TL Timesheets loaded:", data);
    } catch (err) {
      console.error("Error loading TL timesheets:", err);
    }
  };

  // ✅ NEW: LOAD MANAGER'S PROJECTS
  const loadManagerProjects = async () => {
    try {
      // ✅ FIX: Using imported API_URL
      const res = await fetch(
        `${API_URL}/api/manager/projects/${currentUser?.id}`
      );
      const data = await res.json();
      setManagerProjects(Array.isArray(data) ? data : []);
      console.log("✅ Manager Projects loaded:", data);
    } catch (err) {
      console.error("Error loading manager projects:", err);
    }
  };

  useEffect(() => {
    loadTimesheets();
    loadTLTimesheets();
    loadManagerProjects();
  }, [currentUser?.id]);
  
  useEffect(() => {
    setFilter(prev => ({ ...prev, week: "" }));
  }, [filter.year, filter.month]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.taskDate || !formData.project || !formData.task || !formData.hours) {
      alert("Please fill all required fields");
      return;
    }

    const today = new Date();
    const selected = new Date(formData.taskDate);
    const format = (d) => d.toISOString().split("T")[0];

    if (format(selected) > format(today)) {
      alert("You cannot submit future timesheets");
      return;
    }

    const payload = {
      id: editId,
      user_id: currentUser.id,
      project: formData.project,
      task: formData.task,
      hours: formData.hours,
      description: formData.description,
      task_date: formData.taskDate 
    };
    try {
      // ✅ FIX: Using imported API_URL
      const res = await fetch(`${API_URL}/api/manager/save-timesheet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert("Timesheet Saved Successfully ✅");
        setEditId(null);
        setFormData({ ...formData, taskDate: "", project: "", task: "", hours: "", description: "" });
        await loadTimesheets(); 
      }
    } catch (err) {
      console.error("Save error:", err);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      // ✅ FIX: Using imported API_URL
      const res = await fetch(`${API_URL}/api/manager/timesheets/status/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        loadTimesheets();
      }
    } catch (err) {
      console.error("Status update error:", err);
    }
  };

  // ✅ APPROVE TEAM LEAD TIMESHEET
  const handleApproveTLTimesheet = async (timesheetId, status) => {
    try {
      // ✅ FIX: Using imported API_URL
      const res = await fetch(
        `${API_URL}/api/manager/approve-timesheet/${timesheetId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            status: status,
            comments: `${status} by Manager`
          })
        }
      );
      
      if (res.ok) {
        alert(`✅ Timesheet ${status}!`);
        loadTLTimesheets(); // Refresh list
      } else {
        alert("❌ Failed to update timesheet");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error updating timesheet");
    }
  };

  const myData = timesheets.filter((t) => String(t.user_id) === String(currentUser.id));

  const allEmployeeData = timesheets.filter((t) => {
    return String(t.user_id) !== String(currentUser.id);
  }).filter(t => {
    const searchTerm = empSearch.toLowerCase();
    const nameMatch = (t.name || "").toLowerCase().includes(searchTerm);
    const idMatch = (t.employee_id || "").toLowerCase().includes(searchTerm);
    const roleMatch = (t.role || "").toLowerCase().includes(searchTerm);
    return nameMatch || idMatch || roleMatch;
  });

  const filteredData = myData.filter((t) => {
    if (!t.task_date) return false;
    const d = new Date(t.task_date);
    const matchYear = filter.year ? d.getFullYear() === Number(filter.year) : true;
    const matchMonth = filter.month ? (d.getMonth() + 1) === Number(filter.month) : true;
    const matchWeek = filter.week ? getWeekNumber(t.task_date) === Number(filter.week) : true;
    return matchYear && matchMonth && matchWeek;
  });

  const summaryData = myData.filter((t) => {
    if (!t.task_date) return false;
    const d = new Date(t.task_date);
    if (summaryFilter.from && d < new Date(summaryFilter.from)) return false;
    if (summaryFilter.to && d > new Date(summaryFilter.to)) return false;
    return true;
  });

  const totalHours = summaryData.reduce((a, b) => a + Number(b.hours), 0);

  const downloadReport = (dataToExport, fileName) => {
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Timesheets");
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  };

  const handleEdit = (item) => {
    setFormData({
      ...formData,
      project: item.project,
      task: item.task,
      hours: item.hours,
      description: item.description,
      taskDate: new Date(item.task_date).toISOString().split('T')[0]
    });
    setEditId(item.id);
    setActiveSubTab("submit");
  };

  return (
    <div className="page-container">
      <h2>Manager TimeSheets</h2>

      <div className="tabs">
        <button className={activeTab === "timesheets" ? "active" : ""} onClick={() => setActiveTab("timesheets")}>TimeSheets</button>
        <button className={activeTab === "reports" ? "active" : ""} onClick={() => setActiveTab("reports")}>Reports</button>
        <button className={activeTab === "teamleader" ? "active" : ""} onClick={() => setActiveTab("teamleader")}>Team Management</button>
      </div>

      {activeTab === "timesheets" && (
        <>
          <div className="sub-tabs">
            <button className={activeSubTab === "submit" ? "active" : ""} onClick={() => setActiveSubTab("submit")}>Submit</button>
            <button className={activeSubTab === "weekly" ? "active" : ""} onClick={() => setActiveSubTab("weekly")}>Weekly</button>
            <button className={activeSubTab === "summary" ? "active" : ""} onClick={() => setActiveSubTab("summary")}>Summary</button>
          </div>

          {activeSubTab === "submit" && (
            <form className="form-card" onSubmit={handleSubmit}>
              <div className="form-section">
                <h3>Manager Details</h3>
                <div className="grid-3">
                  <input value={formData.name} disabled />
                  <input value={currentUser.employee_id} disabled />
                  <input value={formData.entryDate} disabled />
                </div>
              </div>
              <div className="form-section">
                <h3>Task Details</h3>
                <div className="grid-2">
                  <input
                    type="date"
                    name="taskDate"
                    value={formData.taskDate}
                    onChange={handleChange}
                    max={new Date().toISOString().split("T")[0]}
                    required
                  />
                  {/* ✅ UPDATED: Show only manager's projects */}
                  <select 
                    name="project" 
                    value={formData.project} 
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select Project</option>
                    {managerProjects && managerProjects.length > 0 ? (
                      managerProjects.map((proj) => (
                        <option 
                          key={proj.id} 
                          value={proj.projectName || proj.name}
                        >
                          {proj.projectName || proj.name}
                        </option>
                      ))
                    ) : (
                      <option disabled>No projects assigned</option>
                    )}
                  </select>
                  <input 
                    name="task" 
                    value={formData.task} 
                    onChange={handleChange} 
                    placeholder="Task"
                    required
                  />
                  <input 
                    type="number" 
                    name="hours" 
                    value={formData.hours} 
                    onChange={handleChange} 
                    placeholder="Hours"
                    required
                  />
                </div>
                <textarea 
                  name="description" 
                  value={formData.description} 
                  onChange={handleChange} 
                  placeholder="Description" 
                />
              </div>
              <button className="submit-btn" type="submit">
                {editId !== null ? "Update Entry" : "Submit Entry"}
              </button>
            </form>
          )}

          {activeSubTab === "weekly" && (
            <div className="table-container">
              <div className="filter-row">
                <select 
                  name="year" 
                  value={filter.year} 
                  onChange={(e) => setFilter({...filter, year: e.target.value})}
                >
                  <option value="">Select Year</option>
                  {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                </select>

                <select 
                  name="month" 
                  value={filter.month} 
                  onChange={(e) => setFilter({...filter, month: e.target.value})}
                >
                  <option value="">Select Month</option>
                  {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
                    .map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>

                <select 
                  name="week" 
                  value={filter.week} 
                  disabled={!filter.month || !filter.year}
                  onChange={(e) => setFilter({...filter, week: e.target.value})}
                >
                  <option value="">All Weeks</option>
                  {filter.year && filter.month && 
                    getWeeksInMonth(filter.year, filter.month).map(w => (
                      <option key={w} value={w}>Week {w}</option>
                    ))
                  }
                </select>
              </div>

              <table className="table">
                <thead>
                  <tr>
                    <th>Project</th><th>Task</th><th>Hours</th><th>Date</th><th>Status</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.length > 0 ? (
                    filteredData.map((t) => (
                      <tr key={t.id}>
                        <td>{t.project}</td>
                        <td>{t.task}</td>
                        <td>{t.hours}</td>
                        <td>{new Date(t.task_date).toLocaleDateString()}</td>
                        <td>
                          <span className={`status-badge ${t.status.toLowerCase()}`}>
                            {t.status}
                          </span>
                        </td>
                        <td>
                          {t.status !== "Approved" && <button onClick={() => handleEdit(t)}>Edit</button>}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ textAlign: "center", padding: "20px", color: "#888" }}>
                        {(!filter.year || !filter.month) 
                          ? "Please select a Year and Month to view data." 
                          : `No data found for ${filter.month}/${filter.year} ${filter.week ? `(Week ${filter.week})` : ""}`}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeSubTab === "summary" && (
            <>
              <div className="filter-row">
                <input type="date" name="from" onChange={(e) => setSummaryFilter({...summaryFilter, from: e.target.value})}/>
                <input type="date" name="to" onChange={(e) => setSummaryFilter({...summaryFilter, to: e.target.value})}/>
              </div>
              <div className="summary-cards">
                <div className="card"><FaTasks/><h4>Total Entries</h4><p>{summaryData.length}</p></div>
                <div className="card"><FaClock/><h4>Total Hours</h4><p>{totalHours}</p></div>
              </div>
              <table className="table">
                <thead><tr><th>Project</th><th>Task</th><th>Date</th><th>Hours</th><th>Status</th></tr></thead>
                <tbody>
                  {summaryData.map((t)=>(
                    <tr key={t.id}>
                      <td>{t.project}</td><td>{t.task}</td>
                      <td>{new Date(t.task_date).toLocaleDateString()}</td>
                      <td>{t.hours}</td>
                      <td><span className={`status-badge ${t.status.toLowerCase()}`}>{t.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </>
      )}

      {activeTab === "teamleader" && (
        <div className="management-container">
          {/* ✅ TEAM LEAD PENDING TIMESHEETS FOR APPROVAL */}
          <div className="table-card" style={{marginBottom: '40px'}}>
            <div className="header-flex">
              <h3><FaCheck style={{color: 'green', marginRight: '10px'}}/>Team Lead TimeSheets (Approvals Required)</h3>
              <button className="download-btn" onClick={() => downloadReport(tlTimesheets, "TL_Pending_Report")}>Download TL Data</button>
            </div>
            <table className="table">
              <thead>
                <tr><th>Emp ID</th><th>Name</th><th>Project</th><th>Task</th><th>Date</th><th>Hours</th><th>Status</th><th>Action</th></tr>
              </thead>
              <tbody>
                {tlTimesheets.length > 0 ? tlTimesheets.map((t) => (
                  <tr key={t.id}>
                    <td>{t.employee_id}</td>
                    <td>{t.submittedBy}</td>
                    <td>{t.project}</td>
                    <td>{t.task}</td>
                    <td>{new Date(t.task_date).toLocaleDateString()}</td>
                    <td>{t.hours}</td>
                    <td><span className={`status-badge ${t.status.toLowerCase()}`}>{t.status}</span></td>
                    <td>
                      {t.status === "Pending" && (
                        <div className="action-btns">
                          <button
                            className="approve-btn"
                            onClick={() => handleApproveTLTimesheet(t.id, "Approved")}
                          >
                            ✅ Approve
                          </button>
                          <button
                            className="reject-btn"
                            onClick={() => handleApproveTLTimesheet(t.id, "Rejected")}
                          >
                            ❌ Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )) : <tr><td colSpan="8" style={{textAlign: 'center', padding: '20px'}}>✅ No pending timesheets from team leads!</td></tr>}
              </tbody>
            </table>
          </div>

          {/* ALL EMPLOYEES TIMESHEETS */}
          <div className="table-card">
            <div className="header-flex">
              <h3><FaUsers style={{color: '#4a90e2', marginRight: '10px'}}/>All Employees TimeSheets (Monitoring)</h3>
              <div className="search-box">
                <FaSearch className="search-icon"/>
                <input 
                  type="text" 
                  placeholder="Search ID, Name, or Role..." 
                  value={empSearch}
                  onChange={(e) => setEmpSearch(e.target.value)}
                  className="emp-search-input"
                />
              </div>
              <button className="download-btn" onClick={() => downloadReport(allEmployeeData, "All_Employees_Report")}>Download Full Report</button>
            </div>
            <table className="table">
              <thead>
                <tr><th>Emp ID</th><th>Name</th><th>Role</th><th>Project</th><th>Task</th><th>Date</th><th>Hours</th><th>Status</th></tr>
              </thead>
              <tbody>
                {allEmployeeData.length > 0 ? allEmployeeData.map((t) => (
                  <tr key={t.id}>
                    <td>{t.employee_id}</td>
                    <td>{t.name}</td>
                    <td style={{textTransform: 'capitalize'}}>{t.role}</td>
                    <td>{t.project}</td>
                    <td>{t.task}</td>
                    <td>{new Date(t.task_date).toLocaleDateString()}</td>
                    <td>{t.hours}</td>
                    <td><span className={`status-badge ${t.status.toLowerCase()}`}>{t.status}</span></td>
                  </tr>
                )) : <tr><td colSpan="8" style={{textAlign: 'center', padding: '20px'}}>No results found for "{empSearch}".</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "reports" && (
        <div className="report-card">
          <h3>Generate Personal Report</h3>
          <div className="filter-row">
            <input type="date" name="from" onChange={(e) => setReportFilter({...reportFilter, from: e.target.value})}/>
            <input type="date" name="to" onChange={(e) => setReportFilter({...reportFilter, to: e.target.value})}/>
          </div>
          <button className="download-btn" onClick={() => downloadReport(myData, "Manager_Personal_Report")}>Download Excel</button>
        </div>
      )}

      {viewDesc && (
        <div className="modal">
          <div className="modal-content">
            <h3>Task Description</h3>
            <p>{viewDesc}</p>
            <button className="close-btn" onClick={() => setViewDesc("")}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerTimeSheets;