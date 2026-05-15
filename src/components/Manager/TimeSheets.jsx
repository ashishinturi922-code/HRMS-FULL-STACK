import React, { useState, useEffect } from "react";
import "./ManagerTimeSheets.css";
import * as XLSX from "xlsx";
import { FaTasks, FaClock, FaCheck, FaUsers, FaSearch, FaDownload, FaEdit, FaChevronRight } from "react-icons/fa";
import API_URL from "../../apiConfig";

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
    id: 0, employee_id: "N/A", name: "User",
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
      weeks.add(getWeekNumber(new Date(year, month - 1, i)));
    }
    return Array.from(weeks).sort((a, b) => a - b);
  };

  const loadTimesheets = async () => {
    try {
      const res = await fetch(`${API_URL}/api/manager/all-timesheets`);
      const data = await res.json();
      setTimesheets(Array.isArray(data) ? data : []);
    } catch (err) { console.error("Load Error:", err); }
  };

  const loadTLTimesheets = async () => {
    try {
      const res = await fetch(`${API_URL}/api/manager/team-leads-timesheets/${currentUser?.id}`);
      const data = await res.json();
      setTlTimesheets(Array.isArray(data) ? data : []);
    } catch (err) { console.error("Error loading TL timesheets:", err); }
  };

  const loadManagerProjects = async () => {
    try {
      const res = await fetch(`${API_URL}/api/manager/projects/${currentUser?.id}`);
      const data = await res.json();
      setManagerProjects(Array.isArray(data) ? data : []);
    } catch (err) { console.error("Error loading manager projects:", err); }
  };

  useEffect(() => {
    loadTimesheets();
    loadTLTimesheets();
    loadManagerProjects();
  }, [currentUser?.id]);

  useEffect(() => {
    setFilter(prev => ({ ...prev, week: "" }));
  }, [filter.year, filter.month]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.taskDate || !formData.project || !formData.task || !formData.hours) {
      alert("Please fill all required fields"); return;
    }
    const today = new Date();
    const selected = new Date(formData.taskDate);
    const fmt = (d) => d.toISOString().split("T")[0];
    if (fmt(selected) > fmt(today)) { alert("You cannot submit future timesheets"); return; }

    const payload = {
      id: editId, user_id: currentUser.id,
      project: formData.project, task: formData.task,
      hours: formData.hours, description: formData.description,
      task_date: formData.taskDate
    };
    try {
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
    } catch (err) { console.error("Save error:", err); }
  };

  const handleStatusChange = async (id, status) => {
    try {
      const res = await fetch(`${API_URL}/api/manager/timesheets/status/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (res.ok) loadTimesheets();
    } catch (err) { console.error("Status update error:", err); }
  };

  const handleApproveTLTimesheet = async (timesheetId, status) => {
    try {
      const res = await fetch(`${API_URL}/api/manager/approve-timesheet/${timesheetId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, comments: `${status} by Manager` })
      });
      if (res.ok) { alert(`✅ Timesheet ${status}!`); loadTLTimesheets(); }
      else alert("❌ Failed to update timesheet");
    } catch (error) { console.error("Error:", error); alert("Error updating timesheet"); }
  };

  const myData = timesheets.filter((t) => String(t.user_id) === String(currentUser.id));

  const allEmployeeData = timesheets
    .filter((t) => String(t.user_id) !== String(currentUser.id))
    .filter(t => {
      const s = empSearch.toLowerCase();
      return (t.name || "").toLowerCase().includes(s) ||
             (t.employee_id || "").toLowerCase().includes(s) ||
             (t.role || "").toLowerCase().includes(s);
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
      project: item.project, task: item.task,
      hours: item.hours, description: item.description,
      taskDate: new Date(item.task_date).toISOString().split('T')[0]
    });
    setEditId(item.id);
    setActiveSubTab("submit");
  };

  const StatusBadge = ({ status }) => (
    <span className={`status-badge ${status?.toLowerCase()}`}>{status}</span>
  );

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  return (
    <div className="mts-page">
      {/* ── PAGE HEADER ── */}
      <div className="mts-page-header">
        <div>
          <h1>Manager TimeSheets</h1>
          <p className="mts-subtitle">Track, review and approve timesheet entries</p>
        </div>
        <div className="mts-user-chip">
          <div className="mts-avatar">{(currentUser.name || "M")[0]}</div>
          <div>
            <span className="mts-user-name">{currentUser.name}</span>
            <span className="mts-user-id">{currentUser.employee_id || "—"}</span>
          </div>
        </div>
      </div>

      {/* ── MAIN TABS ── */}
      <div className="mts-tabs">
        {[
          { key: "timesheets", label: "My TimeSheets" },
          { key: "teamleader", label: "Team Management" },
          { key: "reports",    label: "Reports" },
        ].map(t => (
          <button
            key={t.key}
            className={`mts-tab ${activeTab === t.key ? "active" : ""}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
            {activeTab === t.key && <span className="mts-tab-indicator" />}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════
          TAB: MY TIMESHEETS
      ══════════════════════════════════════════ */}
      {activeTab === "timesheets" && (
        <>
          <div className="mts-sub-tabs">
            {[
              { key: "submit",  label: "Submit Entry" },
              { key: "weekly",  label: "History" },
              { key: "summary", label: "Summary" },
            ].map(t => (
              <button
                key={t.key}
                className={`mts-sub-tab ${activeSubTab === t.key ? "active" : ""}`}
                onClick={() => setActiveSubTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ── SUBMIT FORM ── */}
          {activeSubTab === "submit" && (
            <form className="mts-form-card" onSubmit={handleSubmit}>
              {editId !== null && (
                <div className="mts-edit-banner">
                  <FaEdit /> Editing existing entry — changes will overwrite the saved record.
                  <button type="button" className="mts-cancel-edit" onClick={() => {
                    setEditId(null);
                    setFormData({ ...formData, taskDate: "", project: "", task: "", hours: "", description: "" });
                  }}>Cancel Edit</button>
                </div>
              )}

              <div className="mts-section-label">Manager Info</div>
              <div className="mts-info-row">
                <div className="mts-info-field">
                  <span className="mts-info-key">Name</span>
                  <span className="mts-info-val">{formData.name}</span>
                </div>
                <div className="mts-info-field">
                  <span className="mts-info-key">Employee ID</span>
                  <span className="mts-info-val">{currentUser.employee_id || "—"}</span>
                </div>
                <div className="mts-info-field">
                  <span className="mts-info-key">Entry Date</span>
                  <span className="mts-info-val">{formData.entryDate}</span>
                </div>
              </div>

              <div className="mts-divider" />
              <div className="mts-section-label">Task Details</div>

              <div className="mts-grid-2">
                <div className="mts-field">
                  <label>Task Date <span className="req">*</span></label>
                  <input
                    type="date" name="taskDate" value={formData.taskDate}
                    onChange={handleChange} max={new Date().toISOString().split("T")[0]}
                    required
                  />
                </div>
                <div className="mts-field">
                  <label>Project <span className="req">*</span></label>
                  <select name="project" value={formData.project} onChange={handleChange} required>
                    <option value="">Select Project</option>
                    {managerProjects.length > 0
                      ? managerProjects.map(p => (
                          <option key={p.id} value={p.projectName || p.name}>{p.projectName || p.name}</option>
                        ))
                      : <option disabled>No projects assigned</option>
                    }
                  </select>
                </div>
                <div className="mts-field">
                  <label>Task <span className="req">*</span></label>
                  <input name="task" value={formData.task} onChange={handleChange} placeholder="What did you work on?" required />
                </div>
                <div className="mts-field">
                  <label>Hours <span className="req">*</span></label>
                  <input type="number" name="hours" value={formData.hours} onChange={handleChange} placeholder="e.g. 4" min="0.5" step="0.5" required />
                </div>
              </div>

              <div className="mts-field" style={{ marginTop: "16px" }}>
                <label>Description</label>
                <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Optional notes about this task…" rows={3} />
              </div>

              <div className="mts-form-footer">
                <button className="mts-submit-btn" type="submit">
                  {editId !== null ? "Update Entry" : "Submit Entry"}
                  <FaChevronRight size={12} />
                </button>
              </div>
            </form>
          )}

          {/* ── HISTORY TABLE ── */}
          {activeSubTab === "weekly" && (
            <div className="mts-card">
              <div className="mts-card-header">
                <h3>Timesheet History</h3>
                <div className="mts-filter-row">
                  <select value={filter.year} onChange={e => setFilter({...filter, year: e.target.value})}>
                    <option value="">Year</option>
                    {[2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <select value={filter.month} onChange={e => setFilter({...filter, month: e.target.value})}>
                    <option value="">Month</option>
                    {MONTHS.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
                  </select>
                  <select value={filter.week} disabled={!filter.month || !filter.year}
                    onChange={e => setFilter({...filter, week: e.target.value})}>
                    <option value="">All Weeks</option>
                    {filter.year && filter.month &&
                      getWeeksInMonth(filter.year, filter.month).map(w => (
                        <option key={w} value={w}>Week {w}</option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="mts-table-wrap">
                <table className="mts-table">
                  <thead>
                    <tr><th>Project</th><th>Task</th><th>Hours</th><th>Date</th><th>Status</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {filteredData.length > 0 ? filteredData.map(t => (
                      <tr key={t.id}>
                        <td><span className="mts-project-pill">{t.project}</span></td>
                        <td>{t.task}</td>
                        <td><strong>{t.hours}h</strong></td>
                        <td>{new Date(t.task_date).toLocaleDateString()}</td>
                        <td><StatusBadge status={t.status} /></td>
                        <td>
                          {t.status !== "Approved" && (
                            <button className="mts-icon-btn" onClick={() => handleEdit(t)} title="Edit">
                              <FaEdit /> Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan="6" className="mts-empty">
                        {(!filter.year || !filter.month)
                          ? "Select a year and month to view history."
                          : `No entries for ${MONTHS[filter.month-1]} ${filter.year}${filter.week ? ` · Week ${filter.week}` : ""}.`}
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── SUMMARY ── */}
          {activeSubTab === "summary" && (
            <div className="mts-card">
              <div className="mts-card-header">
                <h3>Summary</h3>
                <div className="mts-filter-row">
                  <label style={{fontSize:"13px",color:"#64748b"}}>From</label>
                  <input type="date" value={summaryFilter.from} onChange={e => setSummaryFilter({...summaryFilter, from: e.target.value})} />
                  <label style={{fontSize:"13px",color:"#64748b"}}>To</label>
                  <input type="date" value={summaryFilter.to} onChange={e => setSummaryFilter({...summaryFilter, to: e.target.value})} />
                </div>
              </div>

              <div className="mts-stat-row">
                <div className="mts-stat-card">
                  <FaTasks className="mts-stat-icon blue" />
                  <div>
                    <div className="mts-stat-num">{summaryData.length}</div>
                    <div className="mts-stat-label">Total Entries</div>
                  </div>
                </div>
                <div className="mts-stat-card">
                  <FaClock className="mts-stat-icon green" />
                  <div>
                    <div className="mts-stat-num">{totalHours}h</div>
                    <div className="mts-stat-label">Total Hours</div>
                  </div>
                </div>
              </div>

              <div className="mts-table-wrap">
                <table className="mts-table">
                  <thead>
                    <tr><th>Project</th><th>Task</th><th>Date</th><th>Hours</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {summaryData.length > 0 ? summaryData.map(t => (
                      <tr key={t.id}>
                        <td><span className="mts-project-pill">{t.project}</span></td>
                        <td>{t.task}</td>
                        <td>{new Date(t.task_date).toLocaleDateString()}</td>
                        <td><strong>{t.hours}h</strong></td>
                        <td><StatusBadge status={t.status} /></td>
                      </tr>
                    )) : (
                      <tr><td colSpan="5" className="mts-empty">No records in selected range.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════
          TAB: TEAM MANAGEMENT
      ══════════════════════════════════════════ */}
      {activeTab === "teamleader" && (
        <div className="mts-stack">

          {/* TL Pending Approvals */}
          <div className="mts-card">
            <div className="mts-card-header">
              <h3>
                <span className="mts-header-dot green" />
                Team Lead Timesheets
                {tlTimesheets.filter(t => t.status === "Pending").length > 0 && (
                  <span className="mts-badge-count">{tlTimesheets.filter(t => t.status === "Pending").length} pending</span>
                )}
              </h3>
              <button className="mts-dl-btn" onClick={() => downloadReport(tlTimesheets, "TL_Pending_Report")}>
                <FaDownload /> Export
              </button>
            </div>
            <div className="mts-table-wrap">
              <table className="mts-table">
                <thead>
                  <tr><th>Emp ID</th><th>Name</th><th>Project</th><th>Task</th><th>Date</th><th>Hours</th><th>Status</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {tlTimesheets.length > 0 ? tlTimesheets.map(t => (
                    <tr key={t.id}>
                      <td className="mts-mono">{t.employee_id}</td>
                      <td><strong>{t.submittedBy}</strong></td>
                      <td><span className="mts-project-pill">{t.project}</span></td>
                      <td>{t.task}</td>
                      <td>{new Date(t.task_date).toLocaleDateString()}</td>
                      <td><strong>{t.hours}h</strong></td>
                      <td><StatusBadge status={t.status} /></td>
                      <td>
                        {t.status === "Pending" ? (
                          <div className="mts-action-pair">
                            <button className="mts-approve-btn" onClick={() => handleApproveTLTimesheet(t.id, "Approved")}>Approve</button>
                            <button className="mts-reject-btn"  onClick={() => handleApproveTLTimesheet(t.id, "Rejected")}>Reject</button>
                          </div>
                        ) : <span className="mts-done-text">Done</span>}
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="8" className="mts-empty mts-empty-green">✅ No pending timesheets from team leads</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* All Employees Monitor */}
          <div className="mts-card">
            <div className="mts-card-header">
              <h3>
                <span className="mts-header-dot blue" />
                All Employees
              </h3>
              <div className="mts-search-box">
                <FaSearch className="mts-search-icon" />
                <input
                  type="text" placeholder="Search by name, ID or role…"
                  value={empSearch} onChange={e => setEmpSearch(e.target.value)}
                />
              </div>
              <button className="mts-dl-btn" onClick={() => downloadReport(allEmployeeData, "All_Employees_Report")}>
                <FaDownload /> Export
              </button>
            </div>
            <div className="mts-table-wrap">
              <table className="mts-table">
                <thead>
                  <tr><th>Emp ID</th><th>Name</th><th>Role</th><th>Project</th><th>Task</th><th>Date</th><th>Hours</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {allEmployeeData.length > 0 ? allEmployeeData.map(t => (
                    <tr key={t.id}>
                      <td className="mts-mono">{t.employee_id}</td>
                      <td><strong>{t.name}</strong></td>
                      <td><span className="mts-role-tag">{t.role}</span></td>
                      <td><span className="mts-project-pill">{t.project}</span></td>
                      <td>{t.task}</td>
                      <td>{new Date(t.task_date).toLocaleDateString()}</td>
                      <td><strong>{t.hours}h</strong></td>
                      <td><StatusBadge status={t.status} /></td>
                    </tr>
                  )) : (
                    <tr><td colSpan="8" className="mts-empty">
                      {empSearch ? `No results for "${empSearch}"` : "No employee timesheets found."}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          TAB: REPORTS
      ══════════════════════════════════════════ */}
      {activeTab === "reports" && (
        <div className="mts-card mts-report-card">
          <h3>Generate Personal Report</h3>
          <p>Select a date range to filter your timesheet entries, then export to Excel.</p>
          <div className="mts-filter-row mts-report-filters">
            <div className="mts-field">
              <label>From</label>
              <input type="date" value={reportFilter.from} onChange={e => setReportFilter({...reportFilter, from: e.target.value})} />
            </div>
            <div className="mts-field">
              <label>To</label>
              <input type="date" value={reportFilter.to} onChange={e => setReportFilter({...reportFilter, to: e.target.value})} />
            </div>
          </div>
          <button className="mts-submit-btn" onClick={() => downloadReport(myData, "Manager_Personal_Report")}>
            <FaDownload /> Download Excel
          </button>
        </div>
      )}

      {/* ── DESCRIPTION MODAL ── */}
      {viewDesc && (
        <div className="mts-modal-overlay" onClick={() => setViewDesc("")}>
          <div className="mts-modal" onClick={e => e.stopPropagation()}>
            <h3>Task Description</h3>
            <p>{viewDesc}</p>
            <button className="mts-modal-close" onClick={() => setViewDesc("")}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerTimeSheets;