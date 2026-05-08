import React, { useState, useEffect } from "react";
import "./TeamLeaderTimeSheets.css";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { FaEye, FaCheck, FaTimes, FaTasks, FaClock } from "react-icons/fa";

const TeamLeaderTimeSheets = () => {
  const [activeTab, setActiveTab] = useState("timesheets");
  const [activeSubTab, setActiveSubTab] = useState("submit");
  
  const [projects, setProjects] = useState([]);
  const [timesheets, setTimesheets] = useState([]);
  const [editId, setEditId] = useState(null);

  const [filter, setFilter] = useState({ year: "", month: "", week: "" });
  const [summaryFilter, setSummaryFilter] = useState({ from: "", to: "" });

  const [viewDesc, setViewDesc] = useState("");

  const currentUser = JSON.parse(localStorage.getItem("user")) || {
    id: 1079,
    name: "TeamLeader",
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

 useEffect(() => {
  loadTimesheets();
  loadProjects();   
}, [currentUser.id]);

  const loadTimesheets = async () => {
    try {
      const resPending = await fetch(`${process.env.REACT_APP_API_URL}/api/teamleader/timesheets/pending/${currentUser.id}`);
      const teamData = await resPending.json();
      
      const resMy = await fetch(`${process.env.REACT_APP_API_URL}/api/teamleader/my-timesheets/${currentUser.id}`);
      const myData = await resMy.json();

      const safeTeamData = Array.isArray(teamData) ? teamData : [];
      const safeMyData = Array.isArray(myData) ? myData : [];

      setTimesheets((prev) => {
        // PERMANENT FIX: Merge new data but KEEP approved records in state
        // This ensures they don't disappear when the 'pending' API stops sending them
        const newIds = new Set([...safeMyData, ...safeTeamData].map(t => t.id));
        const approvedRecords = prev.filter(t => !newIds.has(t.id) && (t.status === "Approved" || t.status === "Rejected"));
        
        return [...safeMyData, ...safeTeamData, ...approvedRecords];
      });
    } catch (err) {
      console.error("Load Error:", err);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/teamleader/timesheets/status/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      
      if(res.ok) {
        // PERMANENT FIX: Update local state immediately so it persists in the UI
        setTimesheets(prev => 
          prev.map(t => t.id === id ? { ...t, status: status } : t)
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadProjects = async () => {
  if (!currentUser?.id) return;

  try {
    const res = await fetch(
      `${process.env.REACT_APP_API_URL}/api/teamleader/projects/${currentUser.id}`
    );
    const data = await res.json();

    setProjects(Array.isArray(data) ? data : []);
  } catch (err) {
    console.error("Project Fetch Error:", err);
  }
};

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFilterChange = (e) => {
    setFilter({ ...filter, [e.target.name]: e.target.value });
  };

  const handleSummaryFilter = (e) => {
    setSummaryFilter({ ...summaryFilter, [e.target.name]: e.target.value });
  };

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
    return Array.from(weeks);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.taskDate || !formData.project || !formData.task || !formData.hours) {
      alert("Please fill all fields");
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
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/teamleader/save-timesheet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if(res.ok) {
        alert("Timesheet Saved ✅");
        setEditId(null);
        setFormData({ ...formData, taskDate: "", project: "", task: "", hours: "", description: "" });
        loadTimesheets();
      }
    } catch (err) {
      console.error(err);
    }
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

  const myData = timesheets.filter((t) => t.user_id === currentUser.id);

  const filteredData = myData.filter((t) => {
    const d = new Date(t.task_date);
    if (filter.year && d.getFullYear() !== Number(filter.year)) return false;
    if (filter.month && d.getMonth() + 1 !== Number(filter.month)) return false;
    if (filter.week && getWeekNumber(t.task_date) !== Number(filter.week)) return false;
    return true;
  });

  const summaryData = myData.filter((t) => {
    const d = new Date(t.task_date);
    if (summaryFilter.from && d < new Date(summaryFilter.from)) return false;
    if (summaryFilter.to && d > new Date(summaryFilter.to)) return false;
    return true;
  });

  const totalHours = summaryData.reduce((a, b) => a + Number(b.hours), 0);

  const downloadReport = () => {
    const ws = XLSX.utils.json_to_sheet(myData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MyTimesheets");
    XLSX.writeFile(wb, "My_Timesheet_Report.xlsx");
  };

  const downloadEmployeeReport = () => {
    const employeeData = timesheets.filter(t => t.user_id !== currentUser.id);
    const ws = XLSX.utils.json_to_sheet(employeeData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "TeamTimesheets");
    XLSX.writeFile(wb, "Team_Timesheet_Report.xlsx");
  };

  return (
    <div className="page-container">
      <h2>Team Leader TimeSheets</h2>

      <div className="tabs">
        <button className={activeTab === "timesheets" ? "active" : ""} onClick={() => setActiveTab("timesheets")}>TimeSheets</button>
        <button className={activeTab === "reports" ? "active" : ""} onClick={() => setActiveTab("reports")}>Reports</button>
        <button className={activeTab === "employee" ? "active" : ""} onClick={() => setActiveTab("employee")}>Employee TimeSheets</button>
      </div>

      {activeTab === "timesheets" && (
        <>
          <div className="sub-tabs">
            <button onClick={() => setActiveSubTab("submit")}>Submit</button>
            <button onClick={() => setActiveSubTab("weekly")}>History</button>
            <button onClick={() => setActiveSubTab("summary")}>Summary</button>
          </div>

          {activeSubTab === "submit" && (
            <form className="form-card" onSubmit={handleSubmit}>
              <div className="form-section">
                <h3>Your Details</h3>
                <div className="grid-3">
                  <input value={formData.name} disabled />
                  <input value={currentUser.employee_id || currentUser.id} disabled />
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
/>
                  <select name="project" value={formData.project} onChange={handleChange}>
  <option value="">Select Project</option>

  {projects.map((p) => (
    <option key={p.id} value={p.projectName || p.name}>
      {p.projectName || p.name}
    </option>
  ))}
</select>
                  <input name="task" value={formData.task} onChange={handleChange} placeholder="Task" />
                  <input type="number" name="hours" value={formData.hours} onChange={handleChange} placeholder="Hours" />
                </div>
                <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Description" />
              </div>
              <button className="submit-btn" type="submit">{editId !== null ? "Update" : "Submit"}</button>
            </form>
          )}

          {activeSubTab === "weekly" && (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr><th>Project</th><th>Task</th><th>Hours</th><th>Date</th><th>Status</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {filteredData.map((t) => (
                    <tr key={t.id}>
                      <td>{t.project}</td><td>{t.task}</td><td>{t.hours}</td>
                      <td>{new Date(t.task_date).toLocaleDateString()}</td>
                      <td>{t.status}</td>
                      <td>{t.status !== "Approved" && <button onClick={()=>handleEdit(t)}>Edit</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeSubTab === "summary" && (
            <div className="table-container">
              <div className="filter-row">
                <input type="date" name="from" value={summaryFilter.from} onChange={handleSummaryFilter} />
                <input type="date" name="to" value={summaryFilter.to} onChange={handleSummaryFilter} />
              </div>
              <div className="summary-cards">
                <div className="card"><FaTasks /><h4>Total Entries</h4><p>{summaryData.length}</p></div>
                <div className="card"><FaClock /><h4>Total Hours</h4><p>{totalHours}</p></div>
              </div>
              <table className="table">
                <thead>
                  <tr><th>Project</th><th>Task</th><th>Date</th><th>Hours</th><th>Status</th><th>Description</th></tr>
                </thead>
                <tbody>
                  {summaryData.length > 0 ? (
                    summaryData.map((t) => (
                      <tr key={t.id}>
                        <td>{t.project}</td>
                        <td>{t.task}</td>
                        <td>{new Date(t.task_date).toLocaleDateString()}</td>
                        <td>{t.hours}</td>
                        <td><span className={`status-badge ${t.status.toLowerCase()}`}>{t.status}</span></td>
                        <td>{t.description || "-"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="6" style={{ textAlign: "center" }}>No records found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {activeTab === "reports" && (
        <div className="report-card">
          <button className="download-btn" onClick={downloadReport}>Download My Report</button>
        </div>
      )}

      {activeTab === "employee" && (
        <div className="table-card">
          <h3>Team Management</h3>
          <button className="download-btn" onClick={downloadEmployeeReport}>Download Team Report</button>
          <table className="table">
            <thead>
              <tr><th>EMP ID</th><th>NAME</th><th>PROJECT</th><th>TASK</th><th>DATE</th><th>HOURS</th><th>STATUS</th><th>ACTION</th></tr>
            </thead>
            <tbody>
              {timesheets.filter(t => t.user_id !== currentUser.id).map((t) => (
                <tr key={t.id}>
                  {/* PERMANENT ID FIX: Checks for 'employee_id' or 'emp_id' sent from your DTO join */}
                  <td>{t.employee_id || t.emp_id || t.employeeId || t.user_id}</td>
                  <td>{t.employeeName || t.name || "Employee"}</td>
                  <td>{t.project}</td><td>{t.task}</td>
                  <td>{new Date(t.task_date).toLocaleDateString()}</td>
                  <td>{t.hours}</td>
                  <td>
                    <span className={`status-badge ${t.status.toLowerCase()}`}>{t.status}</span>
                    <FaEye style={{ marginLeft: "10px", cursor: "pointer", color: "#2563eb" }} onClick={() => setViewDesc(t.description)} />
                  </td>
                  <td>
                    {t.status === "Pending" ? (
                      <>
  <button
    className="approve-btn"
    onClick={() => handleStatusChange(t.id, "Approved")}
  >
    Approve
  </button>

  <button
    className="reject-btn"
    onClick={() => handleStatusChange(t.id, "Rejected")}
  >
    Deny
  </button>
</>
                    ) : (
                      <span style={{color: t.status === "Approved" ? "green" : "red", fontWeight: "bold"}}>{t.status}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewDesc && (
        <div className="modal">
          <div className="modal-content">
            <h3>Task Description</h3>
            <p>{viewDesc}</p>
            <button onClick={() => setViewDesc("")}>Close</button>
          </div>
        </div> 
      )}
    </div>
  );
};

export default TeamLeaderTimeSheets;