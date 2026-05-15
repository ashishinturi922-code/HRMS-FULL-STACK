import React, { useState, useEffect } from "react";
import "./TeamLeaderTimeSheets.css";
import * as XLSX from "xlsx";
import { FaEye, FaTasks, FaClock, FaDownload, FaEdit, FaChevronRight } from "react-icons/fa";
import API_URL from "../../apiConfig";

const TeamLeaderTimeSheets = () => {
  const [activeTab, setActiveTab]       = useState("timesheets");
  const [activeSubTab, setActiveSubTab] = useState("submit");

  const [projects, setProjects]     = useState([]);
  const [timesheets, setTimesheets] = useState([]);
  const [editId, setEditId]         = useState(null);

  const [filter, setFilter]               = useState({ year: "", month: "", week: "" });
  const [summaryFilter, setSummaryFilter] = useState({ from: "", to: "" });
  const [viewDesc, setViewDesc]           = useState("");

  const currentUser = JSON.parse(localStorage.getItem("user")) || {
    id: 1079, name: "TeamLeader",
  };

  const [formData, setFormData] = useState({
    user_id: currentUser.id,
    name: currentUser.name,
    entryDate: new Date().toISOString().split("T")[0],
    taskDate: "", project: "", task: "", hours: "", description: "", status: "Pending"
  });

  useEffect(() => {
    loadTimesheets();
    loadProjects();
  }, [currentUser.id]);

  const loadTimesheets = async () => {
    try {
      const [resPending, resMy] = await Promise.all([
        fetch(`${API_URL}/api/teamleader/timesheets/pending/${currentUser.id}`),
        fetch(`${API_URL}/api/teamleader/my-timesheets/${currentUser.id}`)
      ]);
      const teamData = await resPending.json();
      const myData   = await resMy.json();

      const safeTeam = Array.isArray(teamData) ? teamData : [];
      const safeMy   = Array.isArray(myData)   ? myData   : [];

      setTimesheets(prev => {
        const newIds = new Set([...safeMy, ...safeTeam].map(t => t.id));
        const retained = prev.filter(t => !newIds.has(t.id) && (t.status === "Approved" || t.status === "Rejected"));
        return [...safeMy, ...safeTeam, ...retained];
      });
    } catch (err) { console.error("Load Error:", err); }
  };

  const loadProjects = async () => {
    if (!currentUser?.id) return;
    try {
      const res  = await fetch(`${API_URL}/api/teamleader/projects/${currentUser.id}`);
      const data = await res.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) { console.error("Project Fetch Error:", err); }
  };

  const handleStatusChange = async (id, status) => {
    try {
      const res = await fetch(`${API_URL}/api/teamleader/timesheets/status/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (res.ok) setTimesheets(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    } catch (err) { console.error(err); }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleFilterChange       = (e) => setFilter({ ...filter, [e.target.name]: e.target.value });
  const handleSummaryFilterChange = (e) => setSummaryFilter({ ...summaryFilter, [e.target.name]: e.target.value });

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
    for (let i = 1; i <= daysInMonth; i++) weeks.add(getWeekNumber(new Date(year, month - 1, i)));
    return Array.from(weeks);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.taskDate || !formData.project || !formData.task || !formData.hours) {
      alert("Please fill all fields"); return;
    }
    const today    = new Date();
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
      const res = await fetch(`${API_URL}/api/teamleader/save-timesheet`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert("Timesheet Saved ✅");
        setEditId(null);
        setFormData({ ...formData, taskDate: "", project: "", task: "", hours: "", description: "" });
        loadTimesheets();
      }
    } catch (err) { console.error(err); }
  };

  const handleEdit = (item) => {
    setFormData({
      ...formData,
      project: item.project, task: item.task,
      hours: item.hours, description: item.description,
      taskDate: new Date(item.task_date).toISOString().split("T")[0]
    });
    setEditId(item.id);
    setActiveSubTab("submit");
  };

  const myData = timesheets.filter(t => t.user_id === currentUser.id);

  const filteredData = myData.filter(t => {
    const d = new Date(t.task_date);
    if (filter.year  && d.getFullYear()   !== Number(filter.year))  return false;
    if (filter.month && d.getMonth() + 1  !== Number(filter.month)) return false;
    if (filter.week  && getWeekNumber(t.task_date) !== Number(filter.week)) return false;
    return true;
  });

  const summaryData  = myData.filter(t => {
    const d = new Date(t.task_date);
    if (summaryFilter.from && d < new Date(summaryFilter.from)) return false;
    if (summaryFilter.to   && d > new Date(summaryFilter.to))   return false;
    return true;
  });
  const totalHours   = summaryData.reduce((a, b) => a + Number(b.hours), 0);
  const teamData     = timesheets.filter(t => t.user_id !== currentUser.id);
  const pendingCount = teamData.filter(t => t.status === "Pending").length;

  const downloadReport = () => {
    const ws = XLSX.utils.json_to_sheet(myData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MyTimesheets");
    XLSX.writeFile(wb, "My_Timesheet_Report.xlsx");
  };

  const downloadEmployeeReport = () => {
    const ws = XLSX.utils.json_to_sheet(teamData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "TeamTimesheets");
    XLSX.writeFile(wb, "Team_Timesheet_Report.xlsx");
  };

  const StatusBadge = ({ status }) => (
    <span className={`tl-badge ${status?.toLowerCase()}`}>{status}</span>
  );

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  return (
    <div className="tl-page">

      {/* ── PAGE HEADER ── */}
      <div className="tl-page-header">
        <div>
          <h1>Team Leader TimeSheets</h1>
          <p className="tl-subtitle">Manage your entries and approve team submissions</p>
        </div>
        <div className="tl-user-chip">
          <div className="tl-avatar">{(currentUser.name || "T")[0]}</div>
          <div>
            <span className="tl-user-name">{currentUser.name}</span>
            <span className="tl-user-id">{currentUser.employee_id || currentUser.id}</span>
          </div>
        </div>
      </div>

      {/* ── MAIN TABS ── */}
      <div className="tl-tabs">
        {[
          { key: "timesheets", label: "My TimeSheets" },
          { key: "employee",   label: "Team TimeSheets", badge: pendingCount },
          { key: "reports",    label: "Reports" },
        ].map(t => (
          <button
            key={t.key}
            className={`tl-tab ${activeTab === t.key ? "active" : ""}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
            {t.badge > 0 && <span className="tl-tab-badge">{t.badge}</span>}
            {activeTab === t.key && <span className="tl-tab-line" />}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════
          TAB: MY TIMESHEETS
      ══════════════════════════════════════════ */}
      {activeTab === "timesheets" && (
        <>
          <div className="tl-sub-tabs">
            {[
              { key: "submit",  label: "Submit Entry" },
              { key: "weekly",  label: "History" },
              { key: "summary", label: "Summary" },
            ].map(t => (
              <button
                key={t.key}
                className={`tl-sub-tab ${activeSubTab === t.key ? "active" : ""}`}
                onClick={() => setActiveSubTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ── SUBMIT FORM ── */}
          {activeSubTab === "submit" && (
            <form className="tl-form-card" onSubmit={handleSubmit}>
              {editId !== null && (
                <div className="tl-edit-banner">
                  <FaEdit /> Editing entry — save to apply changes.
                  <button type="button" className="tl-cancel-edit" onClick={() => {
                    setEditId(null);
                    setFormData({ ...formData, taskDate: "", project: "", task: "", hours: "", description: "" });
                  }}>Cancel</button>
                </div>
              )}

              <div className="tl-section-label">Your Details</div>
              <div className="tl-info-row">
                <div className="tl-info-field"><span className="tl-info-key">Name</span><span className="tl-info-val">{formData.name}</span></div>
                <div className="tl-info-field"><span className="tl-info-key">Employee ID</span><span className="tl-info-val">{currentUser.employee_id || currentUser.id}</span></div>
                <div className="tl-info-field"><span className="tl-info-key">Entry Date</span><span className="tl-info-val">{formData.entryDate}</span></div>
              </div>

              <div className="tl-divider" />
              <div className="tl-section-label">Task Details</div>

              <div className="tl-grid-2">
                <div className="tl-field">
                  <label>Task Date <span className="req">*</span></label>
                  <input type="date" name="taskDate" value={formData.taskDate}
                    onChange={handleChange} max={new Date().toISOString().split("T")[0]} required />
                </div>
                <div className="tl-field">
                  <label>Project <span className="req">*</span></label>
                  <select name="project" value={formData.project} onChange={handleChange} required>
                    <option value="">Select Project</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.projectName || p.name}>{p.projectName || p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="tl-field">
                  <label>Task <span className="req">*</span></label>
                  <input name="task" value={formData.task} onChange={handleChange} placeholder="What did you work on?" required />
                </div>
                <div className="tl-field">
                  <label>Hours <span className="req">*</span></label>
                  <input type="number" name="hours" value={formData.hours} onChange={handleChange}
                    placeholder="e.g. 4" min="0.5" step="0.5" required />
                </div>
              </div>

              <div className="tl-field" style={{ marginTop: "16px" }}>
                <label>Description</label>
                <textarea name="description" value={formData.description} onChange={handleChange}
                  placeholder="Optional notes…" rows={3} />
              </div>

              <div className="tl-form-footer">
                <button className="tl-submit-btn" type="submit">
                  {editId !== null ? "Update Entry" : "Submit Entry"}
                  <FaChevronRight size={12} />
                </button>
              </div>
            </form>
          )}

          {/* ── HISTORY ── */}
          {activeSubTab === "weekly" && (
            <div className="tl-card">
              <div className="tl-card-header">
                <h3>Timesheet History</h3>
                <div className="tl-filter-row">
                  <select name="year" value={filter.year} onChange={handleFilterChange}>
                    <option value="">Year</option>
                    {[2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <select name="month" value={filter.month} onChange={handleFilterChange}>
                    <option value="">Month</option>
                    {MONTHS.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
                  </select>
                  <select name="week" value={filter.week} onChange={handleFilterChange}
                    disabled={!filter.month || !filter.year}>
                    <option value="">All Weeks</option>
                    {filter.year && filter.month && getWeeksInMonth(filter.year, filter.month).map(w => (
                      <option key={w} value={w}>Week {w}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="tl-table-wrap">
                <table className="tl-table">
                  <thead>
                    <tr><th>Project</th><th>Task</th><th>Hours</th><th>Date</th><th>Status</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {filteredData.length > 0 ? filteredData.map(t => (
                      <tr key={t.id}>
                        <td><span className="tl-project-pill">{t.project}</span></td>
                        <td>{t.task}</td>
                        <td><strong>{t.hours}h</strong></td>
                        <td>{new Date(t.task_date).toLocaleDateString()}</td>
                        <td><StatusBadge status={t.status} /></td>
                        <td>
                          {t.status !== "Approved" && (
                            <button className="tl-icon-btn" onClick={() => handleEdit(t)}>
                              <FaEdit /> Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan="6" className="tl-empty">No entries match the selected filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── SUMMARY ── */}
          {activeSubTab === "summary" && (
            <div className="tl-card">
              <div className="tl-card-header">
                <h3>Summary</h3>
                <div className="tl-filter-row">
                  <label style={{fontSize:"13px",color:"#64748b"}}>From</label>
                  <input type="date" name="from" value={summaryFilter.from} onChange={handleSummaryFilterChange} />
                  <label style={{fontSize:"13px",color:"#64748b"}}>To</label>
                  <input type="date" name="to" value={summaryFilter.to} onChange={handleSummaryFilterChange} />
                </div>
              </div>

              <div className="tl-stat-row">
                <div className="tl-stat-card">
                  <FaTasks className="tl-stat-icon blue" />
                  <div>
                    <div className="tl-stat-num">{summaryData.length}</div>
                    <div className="tl-stat-label">Total Entries</div>
                  </div>
                </div>
                <div className="tl-stat-card">
                  <FaClock className="tl-stat-icon green" />
                  <div>
                    <div className="tl-stat-num">{totalHours}h</div>
                    <div className="tl-stat-label">Total Hours</div>
                  </div>
                </div>
              </div>

              <div className="tl-table-wrap">
                <table className="tl-table">
                  <thead>
                    <tr><th>Project</th><th>Task</th><th>Date</th><th>Hours</th><th>Status</th><th>Description</th></tr>
                  </thead>
                  <tbody>
                    {summaryData.length > 0 ? summaryData.map(t => (
                      <tr key={t.id}>
                        <td><span className="tl-project-pill">{t.project}</span></td>
                        <td>{t.task}</td>
                        <td>{new Date(t.task_date).toLocaleDateString()}</td>
                        <td><strong>{t.hours}h</strong></td>
                        <td><StatusBadge status={t.status} /></td>
                        <td className="tl-desc-cell">{t.description || <span style={{color:"#94a3b8"}}>—</span>}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan="6" className="tl-empty">No records in selected range.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════
          TAB: TEAM TIMESHEETS
      ══════════════════════════════════════════ */}
      {activeTab === "employee" && (
        <div className="tl-card">
          <div className="tl-card-header">
            <h3>
              <span className="tl-dot green" />
              Team Timesheets
              {pendingCount > 0 && (
                <span className="tl-pending-badge">{pendingCount} need approval</span>
              )}
            </h3>
            <button className="tl-dl-btn" onClick={downloadEmployeeReport}>
              <FaDownload /> Export Team
            </button>
          </div>

          <div className="tl-table-wrap">
            <table className="tl-table">
              <thead>
                <tr><th>Emp ID</th><th>Name</th><th>Project</th><th>Task</th><th>Date</th><th>Hours</th><th>Status</th><th>Action</th></tr>
              </thead>
              <tbody>
                {teamData.length > 0 ? teamData.map(t => (
                  <tr key={t.id}>
                    <td className="tl-mono">{t.employee_id || t.emp_id || t.user_id}</td>
                    <td><strong>{t.employeeName || t.name || "Employee"}</strong></td>
                    <td><span className="tl-project-pill">{t.project}</span></td>
                    <td>{t.task}</td>
                    <td>{new Date(t.task_date).toLocaleDateString()}</td>
                    <td><strong>{t.hours}h</strong></td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <StatusBadge status={t.status} />
                        {t.description && (
                          <FaEye
                            style={{ cursor: "pointer", color: "#94a3b8", fontSize: "13px" }}
                            title="View description"
                            onClick={() => setViewDesc(t.description)}
                          />
                        )}
                      </div>
                    </td>
                    <td>
                      {t.status === "Pending" ? (
                        <div className="tl-action-pair">
                          <button className="tl-approve-btn" onClick={() => handleStatusChange(t.id, "Approved")}>Approve</button>
                          <button className="tl-reject-btn"  onClick={() => handleStatusChange(t.id, "Rejected")}>Deny</button>
                        </div>
                      ) : (
                        <span className="tl-done-text">{t.status}</span>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="8" className="tl-empty">No team timesheets found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          TAB: REPORTS
      ══════════════════════════════════════════ */}
      {activeTab === "reports" && (
        <div className="tl-card tl-report-card">
          <h3>Download Reports</h3>
          <p>Export your personal or team timesheet data as Excel files.</p>
          <div className="tl-report-btns">
            <button className="tl-submit-btn" onClick={downloadReport}>
              <FaDownload /> My Timesheet Report
            </button>
            <button className="tl-dl-btn" onClick={downloadEmployeeReport}>
              <FaDownload /> Team Report
            </button>
          </div>
        </div>
      )}

      {/* ── DESCRIPTION MODAL ── */}
      {viewDesc && (
        <div className="tl-modal-overlay" onClick={() => setViewDesc("")}>
          <div className="tl-modal" onClick={e => e.stopPropagation()}>
            <h3>Task Description</h3>
            <p>{viewDesc}</p>
            <button className="tl-modal-close" onClick={() => setViewDesc("")}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamLeaderTimeSheets;