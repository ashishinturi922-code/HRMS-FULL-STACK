import React, { useState, useEffect } from "react";
import "./EmployeeTimeSheets.css";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { FaTasks, FaClock } from "react-icons/fa";



const EmployeeTimeSheets = () => {
	
  const [projects, setProjects] = useState([]);
  const [activeTab, setActiveTab] = useState("timesheets");
  const [activeSubTab, setActiveSubTab] = useState("submit");
  const [timesheets, setTimesheets] = useState([]);
  const [editId, setEditId] = useState(null);

  const [filter, setFilter] = useState({ year: "", month: "", week: "" });
  const [summaryFilter, setSummaryFilter] = useState({ from: "", to: "" });
  const [reportFilter, setReportFilter] = useState({ from: "", to: "" });

  const currentUser = JSON.parse(localStorage.getItem("user")) || {
    id: null,
    name: "Employee",
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

  // ✅ FETCH FROM DB
  const loadTimesheets = async () => {
    if (!currentUser.id) return;
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/employee/my-timesheets/${currentUser.id}`);
      const data = await res.json();
      setTimesheets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch Error:", err);
    }
  };

  const loadProjects = async () => {
  if (!currentUser.id) return;

  try {
    const res = await fetch(
      `${process.env.REACT_APP_API_URL}/api/employee/projects/${currentUser.id}`
    );
    const data = await res.json();
    setProjects(Array.isArray(data) ? data : []);
  } catch (err) {
    console.error("Project Fetch Error:", err);
  }
};

useEffect(() => {
  loadTimesheets();
  loadProjects();   // ✅ ADD THIS
}, [currentUser.id]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFilterChange = (e) => {
    setFilter({ ...filter, [e.target.name]: e.target.value });
  };

  const handleSummaryFilter = (e) => {
    setSummaryFilter({ ...summaryFilter, [e.target.name]: e.target.value });
  };

  const handleReportFilter = (e) => {
    setReportFilter({ ...reportFilter, [e.target.name]: e.target.value });
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

  // ✅ SUBMIT LOGIC
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.taskDate || !formData.project || !formData.task || !formData.hours) {
      alert("Please fill all required fields");
      return;
    }

    // ✅ Allow only current week
const today = new Date();
const selected = new Date(formData.taskDate);

// normalize
const format = (d) => d.toISOString().split("T")[0];

if (format(selected) > format(today)) {
  alert("Future dates are not allowed");
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
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/employee/save-timesheet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert(editId ? "Updated successfully! ✅" : "Submitted successfully! ✅");
        setEditId(null);
        setFormData({ ...formData, taskDate: "", project: "", task: "", hours: "", description: "" });
        loadTimesheets();
      } else {
        alert("Server error while saving.");
      }
    } catch (err) {
      console.error("Save Error:", err);
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

  // ✅ FILTERING LOGIC
  const filteredData = timesheets.filter((t) => {
    const d = new Date(t.task_date);
    if (filter.year && d.getFullYear() !== Number(filter.year)) return false;
    if (filter.month && d.getMonth() + 1 !== Number(filter.month)) return false;
    if (filter.week && getWeekNumber(t.task_date) !== Number(filter.week)) return false;
    return true;
  });

  const summaryData = timesheets.filter((t) => {
    const d = new Date(t.task_date);
    if (summaryFilter.from && d < new Date(summaryFilter.from)) return false;
    if (summaryFilter.to && d > new Date(summaryFilter.to)) return false;
    return true;
  });

  const totalHours = summaryData.reduce((sum, item) => sum + Number(item.hours), 0);

  const downloadReport = () => {
    const dataToExport = summaryData.length > 0 ? summaryData : timesheets;
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "MyTimesheets");
    XLSX.writeFile(workbook, "Timesheet_Report.xlsx");
  };

  return (
    <div className="page-container">
      <h2>Employee TimeSheets</h2>

      <div className="tabs">
        <button className={activeTab === "timesheets" ? "active" : ""} onClick={() => setActiveTab("timesheets")}>TimeSheets</button>
        <button className={activeTab === "reports" ? "active" : ""} onClick={() => setActiveTab("reports")}>Reports</button>
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
                <h3>Details</h3>
                <div className="grid-3">
                  <input value={formData.name} disabled />
                  <input value={currentUser.employee_id || currentUser.id || "N/A"} disabled />
                  <input value={formData.entryDate} disabled />
                </div>
              </div>

              <div className="form-section">
                <h3>Task Entry</h3>
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
                <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Describe your work..." />
              </div>

              <button className="submit-btn" type="submit">
                {editId ? "Update Record" : "Submit to Database"}
              </button>
            </form>
          )}

          {activeSubTab === "weekly" && (
            <div className="table-container">
              <div className="filter-row">
			  <select name="year" value={filter.year} onChange={handleFilterChange}>
			  <option value="">Year</option>
			    {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
			  </select>
				<select name="month" value={filter.month} onChange={handleFilterChange}>
				<option value="">Month</option>
				  {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
				    .map((m,i)=> <option key={i} value={i+1}>{m}</option>)}
				</select>
				<select name="week" value={filter.week} onChange={handleFilterChange}>
				<option value="">Week</option>
				  {getWeeksInMonth(Number(filter.year), Number(filter.month)).map((w) => (
				<option key={w} value={w}>Week {w}</option>
				  ))}
				</select>
              </div>

              <table className="table">
                <thead>
                  <tr>
                    <th>Project</th><th>Task</th><th>Hours</th><th>Date</th><th>Status</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((t) => (
                    <tr key={t.id}>
                      <td>{t.project}</td>
                      <td>{t.task}</td>
                      <td>{t.hours}</td>
                      <td>{new Date(t.task_date).toLocaleDateString()}</td>
                      <td><span className={`status-badge ${t.status.toLowerCase()}`}>{t.status}</span></td>
                      <td>
                        {t.status === "Pending" &&
                          <button className="edit-link" onClick={()=>handleEdit(t)}>Edit</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeSubTab === "summary" && (
            <>
              <div className="filter-row">
                <input type="date" name="from" value={summaryFilter.from} onChange={handleSummaryFilter} />
                <input type="date" name="to" value={summaryFilter.to} onChange={handleSummaryFilter} />
              </div>

              <div className="summary-cards">
                <div className="card">
                  <FaTasks />
                  <h4>Total Entries</h4>
                  <p>{summaryData.length}</p>
                </div>
                <div className="card">
                  <FaClock />
                  <h4>Total Hours</h4>
                  <p>{totalHours}</p>
                </div>
              </div>

              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr><th>Project</th><th>Task</th><th>Date</th><th>Hours</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {summaryData.map((t) => (
                      <tr key={t.id}>
                        <td>{t.project}</td>
                        <td>{t.task}</td>
                        <td>{new Date(t.task_date).toLocaleDateString()}</td>
                        <td>{t.hours}</td>
                        <td><span className={`status-badge ${t.status.toLowerCase()}`}>{t.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {activeTab === "reports" && (
        <div className="report-card">
          <p>Generate Excel report for your records</p>
          <button className="download-btn" onClick={downloadReport}>Download Report (.xlsx)</button>
        </div>
      )}
    </div>
  );
};

export default EmployeeTimeSheets;