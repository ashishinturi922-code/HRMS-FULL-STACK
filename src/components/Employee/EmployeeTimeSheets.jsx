// =========================================
// EmployeeTimeSheets.jsx — Fixed & Polished
// =========================================

import React, { useState, useEffect } from "react";
import "./EmployeeTimeSheets.css";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { FaTasks, FaClock, FaFileAlt, FaHistory, FaChartBar } from "react-icons/fa";

// ✅ FIX 1: Hardcoded to localhost — was pointing to LAN IP 192.168.0.165
const API_URL = "http://localhost:5000";

const EmployeeTimeSheets = () => {
  const [projects, setProjects]           = useState([]);
  const [activeTab, setActiveTab]         = useState("timesheets");
  const [activeSubTab, setActiveSubTab]   = useState("submit");
  const [timesheets, setTimesheets]       = useState([]);
  const [editId, setEditId]               = useState(null);
  const [pageLoading, setPageLoading]     = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [filter, setFilter]               = useState({ year: "", month: "", week: "" });
  const [summaryFilter, setSummaryFilter] = useState({ from: "", to: "" });
  const [successMsg, setSuccessMsg]       = useState("");
  const [errorMsg, setErrorMsg]           = useState("");

  // ✅ FIX 2: Read employee data from localStorage safely
  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || {};
    } catch {
      return {};
    }
  })();

  // ✅ FIX 3: employee_id is the display code (e.g. "ACS1001"), id is the numeric DB id
  const empNumericId  = currentUser.id || null;
  const empDisplayId  = currentUser.employee_id || currentUser.employeeId || currentUser.id || "N/A";
  const empName       = currentUser.name || "Employee";

  const [formData, setFormData] = useState({
    entryDate:   new Date().toISOString().split("T")[0],
    taskDate:    "",
    project:     "",
    task:        "",
    hours:       "",
    description: "",
  });

  // =========================================
  // LOAD DATA
  // =========================================
  const loadTimesheets = async () => {
    if (!empNumericId) return;
    setPageLoading(true);
    try {
      const res  = await fetch(`${API_URL}/api/employee/my-timesheets/${empNumericId}`);
      const data = await res.json();
      setTimesheets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Timesheet fetch error:", err);
      setTimesheets([]);
    } finally {
      setPageLoading(false);
    }
  };

  const loadProjects = async () => {
    if (!empNumericId) return;
    try {
      const res  = await fetch(`${API_URL}/api/employee/projects/${empNumericId}`);
      const data = await res.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Projects fetch error:", err);
      setProjects([]);
    }
  };

  useEffect(() => {
    loadTimesheets();
    loadProjects();
  }, [empNumericId]);

  // =========================================
  // HANDLERS
  // =========================================
  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleFilterChange = (e) =>
    setFilter({ ...filter, [e.target.name]: e.target.value });

  const handleSummaryFilter = (e) =>
    setSummaryFilter({ ...summaryFilter, [e.target.name]: e.target.value });

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setErrorMsg("");
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  const showError = (msg) => {
    setErrorMsg(msg);
    setSuccessMsg("");
    setTimeout(() => setErrorMsg(""), 5000);
  };

  // =========================================
  // WEEK HELPERS
  // =========================================
  const getWeekNumber = (dateString) => {
    if (!dateString) return null;
    const d        = new Date(dateString);
    const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
    return Math.ceil((d.getDate() + firstDay.getDay()) / 7);
  };

  const getWeeksInMonth = (year, month) => {
    if (!year || !month) return [];
    const weeks       = new Set();
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      weeks.add(getWeekNumber(new Date(year, month - 1, i)));
    }
    return Array.from(weeks);
  };

  // =========================================
  // SUBMIT
  // =========================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitLoading) return;

    if (!formData.taskDate || !formData.project || !formData.task || !formData.hours) {
      showError("Please fill all required fields");
      return;
    }

    const today    = new Date();
    const selected = new Date(formData.taskDate);
    if (selected.toISOString().split("T")[0] > today.toISOString().split("T")[0]) {
      showError("Future dates are not allowed");
      return;
    }

    const payload = {
      id:          editId,
      user_id:     empNumericId,
      project:     formData.project,
      task:        formData.task,
      hours:       formData.hours,
      description: formData.description,
      task_date:   formData.taskDate,
    };

    setSubmitLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/employee/save-timesheet`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });

      if (res.ok) {
        showSuccess(editId ? "Timesheet updated successfully!" : "Timesheet submitted successfully!");
        setEditId(null);
        setFormData({ ...formData, taskDate: "", project: "", task: "", hours: "", description: "" });
        loadTimesheets();
      } else {
        const err = await res.json().catch(() => ({}));
        showError(err.message || "Server error while saving.");
      }
    } catch (err) {
      console.error("Save error:", err);
      showError("Cannot reach server. Make sure backend is running.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleEdit = (item) => {
    setFormData({
      ...formData,
      project:     item.project,
      task:        item.task,
      hours:       item.hours,
      description: item.description || "",
      taskDate:    new Date(item.task_date).toISOString().split("T")[0],
    });
    setEditId(item.id);
    setActiveSubTab("submit");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // =========================================
  // FILTER + SUMMARY
  // =========================================
  const filteredData = timesheets.filter((t) => {
    const d = new Date(t.task_date);
    if (filter.year  && d.getFullYear()     !== Number(filter.year))  return false;
    if (filter.month && d.getMonth() + 1    !== Number(filter.month)) return false;
    if (filter.week  && getWeekNumber(t.task_date) !== Number(filter.week)) return false;
    return true;
  });

  const summaryData  = timesheets.filter((t) => {
    const d = new Date(t.task_date);
    if (summaryFilter.from && d < new Date(summaryFilter.from)) return false;
    if (summaryFilter.to   && d > new Date(summaryFilter.to))   return false;
    return true;
  });

  const totalHours = summaryData.reduce((sum, item) => sum + Number(item.hours), 0);

  const downloadReport = () => {
    const dataToExport = summaryData.length > 0 ? summaryData : timesheets;
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MyTimesheets");
    XLSX.writeFile(wb, "Timesheet_Report.xlsx");
  };

  // =========================================
  // RENDER
  // =========================================
  return (
    <div className="ts-page">

      {/* FULL-PAGE LOADER */}
      {pageLoading && (
        <div className="ts-loader">
          <div className="ts-loader__spinner" />
          <p>Loading timesheets...</p>
        </div>
      )}

      {/* PAGE HEADER */}
      <div className="ts-header">
        <h2>My Timesheets</h2>
        <p>Track, submit and review your daily work entries</p>
      </div>

      {/* GLOBAL BANNERS */}
      {successMsg && <div className="ts-banner ts-banner--success">✅ {successMsg}</div>}
      {errorMsg   && <div className="ts-banner ts-banner--error">⚠️ {errorMsg}</div>}

      {/* MAIN TABS */}
      <div className="ts-tabs">
        <button
          className={activeTab === "timesheets" ? "active" : ""}
          onClick={() => setActiveTab("timesheets")}
        >
          <FaTasks /> Timesheets
        </button>
        <button
          className={activeTab === "reports" ? "active" : ""}
          onClick={() => setActiveTab("reports")}
        >
          <FaFileAlt /> Reports
        </button>
      </div>

      {/* ========= TIMESHEETS TAB ========= */}
      {activeTab === "timesheets" && (
        <>
          {/* SUB TABS */}
          <div className="ts-subtabs">
            <button
              className={activeSubTab === "submit" ? "active" : ""}
              onClick={() => setActiveSubTab("submit")}
            >
              {editId ? "✏️ Edit Entry" : "➕ New Entry"}
            </button>
            <button
              className={activeSubTab === "weekly" ? "active" : ""}
              onClick={() => setActiveSubTab("weekly")}
            >
              <FaHistory /> History
            </button>
            <button
              className={activeSubTab === "summary" ? "active" : ""}
              onClick={() => setActiveSubTab("summary")}
            >
              <FaChartBar /> Summary
            </button>
          </div>

          {/* ---- SUBMIT / EDIT FORM ---- */}
          {activeSubTab === "submit" && (
            <form className="ts-form" onSubmit={handleSubmit}>

              {/* EMPLOYEE INFO */}
              <div className="ts-section">
                <h3>Employee Details</h3>
                <div className="ts-grid ts-grid--3">
                  <div className="ts-field">
                    <label>Employee Name</label>
                    {/* ✅ FIX 4: Show name from localStorage */}
                    <input value={empName} disabled />
                  </div>
                  <div className="ts-field">
                    <label>Employee ID</label>
                    {/* ✅ FIX 5: Show display code (e.g. ACS1001), fallback to numeric id */}
                    <input value={empDisplayId} disabled />
                  </div>
                  <div className="ts-field">
                    <label>Entry Date</label>
                    <input value={formData.entryDate} disabled />
                  </div>
                </div>
              </div>

              {/* TASK ENTRY */}
              <div className="ts-section">
                <h3>Task Entry</h3>
                <div className="ts-grid ts-grid--2">

                  <div className="ts-field">
                    <label>Task Date <span className="req">*</span></label>
                    <input
                      type="date"
                      name="taskDate"
                      value={formData.taskDate}
                      onChange={handleChange}
                      max={new Date().toISOString().split("T")[0]}
                    />
                  </div>

                  <div className="ts-field">
                    <label>Project <span className="req">*</span></label>
                    <select name="project" value={formData.project} onChange={handleChange}>
                      <option value="">— Select Project —</option>
                      {projects.length > 0 ? (
                        projects.map((p) => {
                          const name = p.projectName || p.name || p.project_name || "";
                          return (
                            <option key={p.id} value={name}>{name}</option>
                          );
                        })
                      ) : (
                        <option disabled>No projects assigned</option>
                      )}
                    </select>
                  </div>

                  <div className="ts-field">
                    <label>Task <span className="req">*</span></label>
                    <input
                      name="task"
                      value={formData.task}
                      onChange={handleChange}
                      placeholder="Enter task name"
                    />
                  </div>

                  <div className="ts-field">
                    <label>Hours <span className="req">*</span></label>
                    <input
                      type="number"
                      name="hours"
                      value={formData.hours}
                      onChange={handleChange}
                      placeholder="e.g. 8"
                      min="0.5"
                      max="24"
                      step="0.5"
                    />
                  </div>

                </div>

                <div className="ts-field ts-field--full" style={{ marginTop: "16px" }}>
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Describe your work..."
                  />
                </div>
              </div>

              <div className="ts-form-actions">
                {editId && (
                  <button
                    type="button"
                    className="ts-btn ts-btn--ghost"
                    onClick={() => {
                      setEditId(null);
                      setFormData({ ...formData, taskDate: "", project: "", task: "", hours: "", description: "" });
                    }}
                  >
                    Cancel
                  </button>
                )}
                <button type="submit" className="ts-btn ts-btn--primary" disabled={submitLoading}>
                  {submitLoading
                    ? <><span className="ts-spinner" /> Saving...</>
                    : editId ? "Update Record" : "Submit Timesheet"
                  }
                </button>
              </div>

            </form>
          )}

          {/* ---- HISTORY TAB ---- */}
          {activeSubTab === "weekly" && (
            <div className="ts-card">
              <div className="ts-filter-row">
                <select name="year" value={filter.year} onChange={handleFilterChange}>
                  <option value="">All Years</option>
                  {[2023, 2024, 2025, 2026].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <select name="month" value={filter.month} onChange={handleFilterChange}>
                  <option value="">All Months</option>
                  {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
                <select name="week" value={filter.week} onChange={handleFilterChange}>
                  <option value="">All Weeks</option>
                  {getWeeksInMonth(Number(filter.year), Number(filter.month)).map((w) => (
                    <option key={w} value={w}>Week {w}</option>
                  ))}
                </select>
              </div>

              {filteredData.length === 0 ? (
                <div className="ts-empty">📋 No timesheet records found</div>
              ) : (
                <div className="ts-table-wrap">
                  <table className="ts-table">
                    <thead>
                      <tr>
                        <th>Project</th>
                        <th>Task</th>
                        <th>Hours</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.map((t) => (
                        <tr key={t.id}>
                          <td><strong>{t.project}</strong></td>
                          <td>{t.task}</td>
                          <td><strong>{t.hours}h</strong></td>
                          <td>{new Date(t.task_date).toLocaleDateString()}</td>
                          <td>
                            <span className={`ts-badge ts-badge--${(t.status || "pending").toLowerCase()}`}>
                              {t.status || "Pending"}
                            </span>
                          </td>
                          <td>
                            {(!t.status || t.status === "Pending") && (
                              <button className="ts-edit-btn" onClick={() => handleEdit(t)}>
                                ✏️ Edit
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ---- SUMMARY TAB ---- */}
          {activeSubTab === "summary" && (
            <div className="ts-card">
              <div className="ts-filter-row">
                <label className="ts-filter-label">From</label>
                <input type="date" name="from" value={summaryFilter.from} onChange={handleSummaryFilter} />
                <label className="ts-filter-label">To</label>
                <input type="date" name="to"   value={summaryFilter.to}   onChange={handleSummaryFilter} />
              </div>

              <div className="ts-stat-cards">
                <div className="ts-stat">
                  <FaTasks className="ts-stat__icon" />
                  <div>
                    <p className="ts-stat__label">Total Entries</p>
                    <p className="ts-stat__value">{summaryData.length}</p>
                  </div>
                </div>
                <div className="ts-stat">
                  <FaClock className="ts-stat__icon" />
                  <div>
                    <p className="ts-stat__label">Total Hours</p>
                    <p className="ts-stat__value">{totalHours}h</p>
                  </div>
                </div>
              </div>

              {summaryData.length === 0 ? (
                <div className="ts-empty">📋 No records in selected date range</div>
              ) : (
                <div className="ts-table-wrap">
                  <table className="ts-table">
                    <thead>
                      <tr>
                        <th>Project</th><th>Task</th><th>Date</th><th>Hours</th><th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryData.map((t) => (
                        <tr key={t.id}>
                          <td><strong>{t.project}</strong></td>
                          <td>{t.task}</td>
                          <td>{new Date(t.task_date).toLocaleDateString()}</td>
                          <td><strong>{t.hours}h</strong></td>
                          <td>
                            <span className={`ts-badge ts-badge--${(t.status || "pending").toLowerCase()}`}>
                              {t.status || "Pending"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ========= REPORTS TAB ========= */}
      {activeTab === "reports" && (
        <div className="ts-card ts-report">
          <FaFileAlt className="ts-report__icon" />
          <p>Export all your timesheet records as an Excel file</p>
          <button className="ts-btn ts-btn--purple" onClick={downloadReport}>
            📥 Download Report (.xlsx)
          </button>
        </div>
      )}

    </div>
  );
};

export default EmployeeTimeSheets;