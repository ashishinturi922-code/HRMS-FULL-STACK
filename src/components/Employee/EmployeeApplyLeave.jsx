import React, { useState, useEffect, useCallback } from "react";
import API_URL from "../../apiConfig";
import "./EmployeeApplyLeave.css";

// ─────────────────────────────────────────────
//  SHARED HELPERS
// ─────────────────────────────────────────────
const parseDateLocal = (dateStr) => {
  if (!dateStr) return null;
  const clean = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
  const [yyyy, mm, dd] = clean.split("-");
  return new Date(yyyy, mm - 1, dd);
};

const isWeekendStr = (dateStr) => {
  const d = parseDateLocal(dateStr);
  if (!d) return false;
  return d.getDay() === 0 || d.getDay() === 6;
};

const calculateWorkingDays = (startStr, endStr) => {
  const current = parseDateLocal(startStr);
  const endDate = parseDateLocal(endStr);
  if (!current || !endDate) return 0;
  let count = 0;
  while (current <= endDate) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return count > 0 ? count : 0;
};

const today = new Date();
today.setHours(0, 0, 0, 0);
const minAllowedDate = new Date(today);
minAllowedDate.setDate(today.getDate() - 15);
const minDateStr = `${minAllowedDate.getFullYear()}-${String(minAllowedDate.getMonth() + 1).padStart(2, "0")}-${String(minAllowedDate.getDate()).padStart(2, "0")}`;

// ─────────────────────────────────────────────
//  LEAVE OPTIONS  (WFH removed)
// ─────────────────────────────────────────────
const leaveOptions = [
  "Sick Leave", "Casual Leave",
  "Maternity Leave", "Paternity Leave", "Bereavement Leave",
  "Privilege Leave", "Compensatory Off", "Loss of Pay",
  "Marriage Leave", "Half Day Leave", "Menstruation Leave"
];

// ─────────────────────────────────────────────
//  SHARED CALENDAR COMPONENT
// ─────────────────────────────────────────────
const MiniCalendar = ({ onSelectDate }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDays = () => {
    const year  = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay  = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= totalDays; i++) days.push(i);
    return days;
  };

  const changeMonth = (dir) => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + (dir === "next" ? 1 : -1));
    setCurrentDate(d);
  };

  const isOutOfRange = (dateStr) => {
    const d = parseDateLocal(dateStr);
    if (!d) return false;
    d.setHours(0, 0, 0, 0);
    return d < minAllowedDate;
  };

  return (
    <>
      <div className="calendar-header">
        <button onClick={() => changeMonth("prev")}>◀</button>
        <h3>
          {currentDate.toLocaleString("default", { month: "long" })}{" "}
          {currentDate.getFullYear()}
        </h3>
        <button onClick={() => changeMonth("next")}>▶</button>
      </div>

      <div className="calendar-days">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className={d === "Sun" || d === "Sat" ? "weekend-header" : ""}>{d}</div>
        ))}
      </div>

      <div className="calendar-grid">
        {getDays().map((day, index) => {
          if (!day) return <div key={index} className="empty" />;
          const date = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isWknd    = isWeekendStr(date);
          const isDisabled = isOutOfRange(date) || isWknd;
          return (
            <div
              key={index}
              className={`calendar-cell ${isWknd ? "weekend" : ""} ${isDisabled && !isWknd ? "out-of-range" : ""}`}
              style={isDisabled && !isWknd ? { opacity: 0.35, cursor: "not-allowed", background: "#f0f0f0" } : {}}
              onClick={() => { if (!isDisabled) onSelectDate(date); }}
              title={isWknd ? "Weekend" : isDisabled ? `Cannot select before ${minDateStr}` : "Click to select"}
            >
              {day}
            </div>
          );
        })}
      </div>
    </>
  );
};

// ─────────────────────────────────────────────
//  APPROVAL BADGE HELPER
// ─────────────────────────────────────────────
const ApprovalInfo = ({ days }) => {
  const moreThanTwo = days > 2;
  return (
    <div style={{
      background: moreThanTwo ? "#fff3cd" : "#e8f4ff",
      border: `1px solid ${moreThanTwo ? "#ffc107" : "#90caf9"}`,
      borderRadius: "8px", padding: "8px 14px", marginBottom: "12px",
      fontSize: "13px", color: moreThanTwo ? "#856404" : "#1565c0"
    }}>
      {moreThanTwo
        ? "⚠️ More than 2 days — Requires approval from both Team Lead & Manager"
        : "ℹ️ Up to 2 days — Requires approval from Team Lead only"}
    </div>
  );
};

// ─────────────────────────────────────────────
//  STATUS DISPLAY HELPER
// ─────────────────────────────────────────────
const getStatusDisplay = (req) => {
  if (req.status === "Approved")
    return <b style={{ color: "green" }}>Approved ✅</b>;
  if (req.status === "Rejected" || req.status === "Denied")
    return <b style={{ color: "red" }}>Rejected ❌</b>;
  if (req.status === "TL Approved")
    return <span style={{ color: "#007bff" }}>Approved by TL (Pending Manager)</span>;
  return (
    <span style={{ color: "orange" }}>
      Pending {req.days > 2 ? "(TL & Manager)" : "(Team Lead)"}
    </span>
  );
};

// ══════════════════════════════════════════════
//  TAB 1 — APPLY LEAVE
// ══════════════════════════════════════════════
const ApplyLeaveTab = ({ currentUser }) => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [fromDate,   setFromDate]   = useState("");
  const [toDate,     setToDate]     = useState("");
  const [leaveType,  setLeaveType]  = useState("");
  const [session,    setSession]    = useState("");
  const [reason,     setReason]     = useState("");
  const [workingDays, setWorkingDays] = useState(0);
  const [requests,   setRequests]   = useState([]);
  const [loading,    setLoading]    = useState(false);

  useEffect(() => {
    setWorkingDays(fromDate && toDate ? calculateWorkingDays(fromDate, toDate) : 0);
  }, [fromDate, toDate]);

  const fetchLeaves = useCallback(async () => {
    if (!currentUser.id) return;
    try {
      setLoading(true);
      const res  = await fetch(`${API_URL}/api/employee/leaves/${currentUser.id}`);
      const data = await res.json();
      if (res.ok) setRequests(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [currentUser.id]);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  const isOverlapping = (newFrom, newTo) => {
    const nf = parseDateLocal(newFrom);
    const nt = parseDateLocal(newTo);
    return requests.some((r) => {
      if (!["Pending", "TL Approved"].includes(r.status)) return false;
      const f = parseDateLocal(r.from_date || r.fromDate);
      const t = parseDateLocal(r.to_date   || r.toDate);
      if (!f || !t) return false;
      return (nf >= f && nf <= t) || (nt >= f && nt <= t) || (nf <= f && nt >= t);
    });
  };

  const handleSubmit = async () => {
    if (!leaveType || !fromDate || !toDate || !reason) { alert("❌ Fill all fields"); return; }
    if (leaveType === "Half Day Leave" && !session)    { alert("❌ Select session"); return; }
    if (parseDateLocal(fromDate) > parseDateLocal(toDate)) { alert("❌ Invalid date range"); return; }
    if (isWeekendStr(fromDate)) { alert("❌ Cannot start leave on a weekend"); return; }
    if (isWeekendStr(toDate))   { alert("❌ Cannot end leave on a weekend");   return; }
    if (isOverlapping(fromDate, toDate)) { alert("❌ You already have a leave during this period"); return; }
    if (workingDays === 0) { alert("❌ No working days in range"); return; }

    const finalDays = leaveType === "Half Day Leave" ? 0.5 : workingDays;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/employee/apply-leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: currentUser.id, leave_type: leaveType, from_date: fromDate,
          to_date: toDate, reason, session: leaveType === "Half Day Leave" ? session : null,
          days: finalDays
        })
      });
      const result = await res.json();
      if (res.ok) {
        alert(`✅ Leave Applied Successfully (${finalDays} days)`);
        setSelectedDate(null); setFromDate(""); setLeaveType(""); setSession("");
        setToDate(""); setReason(""); setWorkingDays(0);
        fetchLeaves();
      } else {
        alert(`❌ ${result.error || "Failed to apply leave"}`);
      }
    } catch (e) { alert("❌ Server connection error"); }
    finally { setLoading(false); }
  };

  const handleDelete = async (leaveId) => {
    if (!window.confirm("Cancel this leave request?")) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/employee/delete-leave/${leaveId}`, { method: "DELETE" });
      if (res.ok) { alert("✅ Leave request cancelled"); fetchLeaves(); }
      else { const e = await res.json(); alert(`❌ ${e.error || "Delete failed"}`); }
    } catch (e) { alert("❌ Delete failed"); }
    finally { setLoading(false); }
  };

  return (
    <>
      <div style={{
        background: "#fff3cd", border: "1px solid #ffc107", borderRadius: "8px",
        padding: "10px 16px", marginBottom: "12px", fontSize: "14px", color: "#856404"
      }}>
        📅 You can apply leave from <strong>{minDateStr}</strong> (15 days ago) onwards — including <strong>future dates</strong>.
      </div>

      {/* Approval rule legend */}
      <div style={{
        display: "flex", gap: "12px", marginBottom: "14px", flexWrap: "wrap"
      }}>
        <div style={{
          flex: 1, minWidth: "200px", background: "#e8f4ff", border: "1px solid #90caf9",
          borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "#1565c0"
        }}>
          📌 <strong>≤ 2 days:</strong> Approved by <strong>Team Lead</strong>
        </div>
        <div style={{
          flex: 1, minWidth: "200px", background: "#fff3cd", border: "1px solid #ffc107",
          borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "#856404"
        }}>
          📌 <strong>&gt; 2 days:</strong> Approved by <strong>Team Lead &amp; Manager</strong>
        </div>
      </div>

      <MiniCalendar onSelectDate={(date) => { setSelectedDate(date); setFromDate(date); }} />

      {selectedDate && (
        <div className="modal">
          <div className="modal-box">
            <h3>📋 Apply Leave</h3>

            <label>From Date:</label>
            <input type="date" value={fromDate} min={minDateStr}
              onChange={(e) => setFromDate(e.target.value)} disabled={loading} />

            <label>Leave Type:</label>
            <select value={leaveType} onChange={(e) => { setLeaveType(e.target.value); if (e.target.value !== "Half Day Leave") setSession(""); }} disabled={loading}>
              <option value="">Select Leave Type</option>
              {leaveOptions.map((l, i) => <option key={i} value={l}>{l}</option>)}
            </select>

            {leaveType === "Half Day Leave" && (
              <>
                <label>Session:</label>
                <select value={session} onChange={(e) => setSession(e.target.value)} disabled={loading}>
                  <option value="">Select Session</option>
                  <option value="Morning">Morning</option>
                  <option value="Afternoon">Afternoon</option>
                </select>
              </>
            )}

            <label>To Date:</label>
            <input type="date" value={toDate} min={fromDate || minDateStr}
              onChange={(e) => setToDate(e.target.value)} disabled={loading} />

            {fromDate && toDate && (
              <>
                <div style={{
                  backgroundColor: "#e8f5e9", padding: "12px", borderRadius: "6px",
                  marginBottom: "8px", border: "2px solid #4caf50",
                  fontWeight: "bold", color: "#2e7d32", textAlign: "center"
                }}>
                  📅 Working Days: <span style={{ fontSize: "18px" }}>{workingDays}</span>
                  <br /><small style={{ fontSize: "12px", color: "#558b2f" }}>(Weekends excluded)</small>
                </div>
                <ApprovalInfo days={workingDays} />
              </>
            )}

            <label>Reason:</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)}
              disabled={loading} placeholder="Enter reason for leave..." rows={4} />

            <div className="modal-actions">
              <button onClick={() => { setSelectedDate(null); setWorkingDays(0); }}
                disabled={loading} className="btn-cancel">✕ Cancel</button>
              <button onClick={handleSubmit} className="submit-btn"
                disabled={loading || workingDays === 0}>
                {loading ? "⏳ Submitting..." : `✓ Submit (${workingDays} days)`}
              </button>
            </div>
          </div>
        </div>
      )}

      <h3>📋 Your Leave History</h3>
      {loading && <p style={{ textAlign: "center", color: "#666" }}>⏳ Loading...</p>}

      <table className="leave-table">
        <thead>
          <tr>
            <th>Leave Type</th><th>Dates</th><th>Days</th>
            <th>Reason</th><th>Status</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {requests.length === 0 ? (
            <tr><td colSpan="6" style={{ textAlign: "center", color: "#999" }}>No leave requests found</td></tr>
          ) : (
            requests.map((req, i) => (
              <tr key={i}>
                <td>{req.leave_type}{req.session && ` (${req.session})`}</td>
                <td>
                  {parseDateLocal(req.from_date || req.fromDate)?.toLocaleDateString()} →{" "}
                  {parseDateLocal(req.to_date   || req.toDate)?.toLocaleDateString()}
                </td>
                <td style={{ fontWeight: "bold", textAlign: "center" }}>{req.days}</td>
                <td>{req.reason}</td>
                <td>{getStatusDisplay(req)}</td>
                <td>
                  {(req.status === "Pending" || req.status === "TL Approved") && (
                    <button className="delete-btn" onClick={() => handleDelete(req.id)} disabled={loading}>❌ Cancel</button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </>
  );
};

// ══════════════════════════════════════════════
//  TAB 2 — APPLY WFH
// ══════════════════════════════════════════════
const ApplyWFHTab = ({ currentUser }) => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [fromDate,  setFromDate]  = useState("");
  const [toDate,    setToDate]    = useState("");
  const [reason,    setReason]    = useState("");
  const [workingDays, setWorkingDays] = useState(0);
  const [requests,  setRequests]  = useState([]);
  const [loading,   setLoading]   = useState(false);

  useEffect(() => {
    setWorkingDays(fromDate && toDate ? calculateWorkingDays(fromDate, toDate) : 0);
  }, [fromDate, toDate]);

  const fetchWFH = useCallback(async () => {
    if (!currentUser.id) return;
    try {
      setLoading(true);
      const res  = await fetch(`${API_URL}/api/employee/wfh/${currentUser.id}`);
      const data = await res.json();
      if (res.ok) setRequests(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [currentUser.id]);

  useEffect(() => { fetchWFH(); }, [fetchWFH]);

  const isOverlapping = (newFrom, newTo) => {
    const nf = parseDateLocal(newFrom);
    const nt = parseDateLocal(newTo);
    return requests.some((r) => {
      if (!["Pending", "TL Approved"].includes(r.status)) return false;
      const f = parseDateLocal(r.from_date || r.fromDate);
      const t = parseDateLocal(r.to_date   || r.toDate);
      if (!f || !t) return false;
      return (nf >= f && nf <= t) || (nt >= f && nt <= t) || (nf <= f && nt >= t);
    });
  };

  const handleSubmit = async () => {
    if (!fromDate || !toDate || !reason) { alert("❌ Fill all fields"); return; }
    if (parseDateLocal(fromDate) > parseDateLocal(toDate)) { alert("❌ Invalid date range"); return; }
    if (isWeekendStr(fromDate)) { alert("❌ Cannot start WFH on a weekend"); return; }
    if (isWeekendStr(toDate))   { alert("❌ Cannot end WFH on a weekend");   return; }
    if (isOverlapping(fromDate, toDate)) { alert("❌ You already have a WFH request during this period"); return; }
    if (workingDays === 0) { alert("❌ No working days in range"); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/employee/apply-wfh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: currentUser.id, from_date: fromDate,
          to_date: toDate, reason, days: workingDays
        })
      });
      const result = await res.json();
      if (res.ok) {
        alert(`✅ WFH Request Submitted (${workingDays} days)`);
        setSelectedDate(null); setFromDate(""); setToDate(""); setReason(""); setWorkingDays(0);
        fetchWFH();
      } else {
        alert(`❌ ${result.error || "Failed to apply WFH"}`);
      }
    } catch (e) { alert("❌ Server connection error"); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Cancel this WFH request?")) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/employee/delete-wfh/${id}`, { method: "DELETE" });
      if (res.ok) { alert("✅ WFH request cancelled"); fetchWFH(); }
      else { const e = await res.json(); alert(`❌ ${e.error || "Delete failed"}`); }
    } catch (e) { alert("❌ Delete failed"); }
    finally { setLoading(false); }
  };

  return (
    <>
      <div style={{
        background: "#e8f5e9", border: "1px solid #66bb6a", borderRadius: "8px",
        padding: "10px 16px", marginBottom: "12px", fontSize: "14px", color: "#2e7d32"
      }}>
        🏠 Work From Home requests follow the same approval rules as leave.
      </div>

      {/* Approval rule legend */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "14px", flexWrap: "wrap" }}>
        <div style={{
          flex: 1, minWidth: "200px", background: "#e8f4ff", border: "1px solid #90caf9",
          borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "#1565c0"
        }}>
          📌 <strong>≤ 2 days:</strong> Approved by <strong>Team Lead</strong>
        </div>
        <div style={{
          flex: 1, minWidth: "200px", background: "#fff3cd", border: "1px solid #ffc107",
          borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "#856404"
        }}>
          📌 <strong>&gt; 2 days:</strong> Approved by <strong>Team Lead &amp; Manager</strong>
        </div>
      </div>

      <MiniCalendar onSelectDate={(date) => { setSelectedDate(date); setFromDate(date); }} />

      {selectedDate && (
        <div className="modal">
          <div className="modal-box">
            <h3>🏠 Apply Work From Home</h3>

            <label>From Date:</label>
            <input type="date" value={fromDate} min={minDateStr}
              onChange={(e) => setFromDate(e.target.value)} disabled={loading} />

            <label>To Date:</label>
            <input type="date" value={toDate} min={fromDate || minDateStr}
              onChange={(e) => setToDate(e.target.value)} disabled={loading} />

            {fromDate && toDate && (
              <>
                <div style={{
                  backgroundColor: "#e8f5e9", padding: "12px", borderRadius: "6px",
                  marginBottom: "8px", border: "2px solid #4caf50",
                  fontWeight: "bold", color: "#2e7d32", textAlign: "center"
                }}>
                  📅 Working Days: <span style={{ fontSize: "18px" }}>{workingDays}</span>
                  <br /><small style={{ fontSize: "12px", color: "#558b2f" }}>(Weekends excluded)</small>
                </div>
                <ApprovalInfo days={workingDays} />
              </>
            )}

            <label>Reason / Work Plan:</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)}
              disabled={loading} placeholder="Describe your work plan for WFH days..." rows={4} />

            <div className="modal-actions">
              <button onClick={() => { setSelectedDate(null); setWorkingDays(0); }}
                disabled={loading} className="btn-cancel">✕ Cancel</button>
              <button onClick={handleSubmit} className="submit-btn"
                disabled={loading || workingDays === 0}>
                {loading ? "⏳ Submitting..." : `✓ Submit (${workingDays} days)`}
              </button>
            </div>
          </div>
        </div>
      )}

      <h3>🏠 Your WFH History</h3>
      {loading && <p style={{ textAlign: "center", color: "#666" }}>⏳ Loading...</p>}

      <table className="leave-table">
        <thead>
          <tr>
            <th>Type</th><th>Dates</th><th>Days</th>
            <th>Reason</th><th>Status</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {requests.length === 0 ? (
            <tr><td colSpan="6" style={{ textAlign: "center", color: "#999" }}>No WFH requests found</td></tr>
          ) : (
            requests.map((req, i) => (
              <tr key={i}>
                <td>Work From Home</td>
                <td>
                  {parseDateLocal(req.from_date || req.fromDate)?.toLocaleDateString()} →{" "}
                  {parseDateLocal(req.to_date   || req.toDate)?.toLocaleDateString()}
                </td>
                <td style={{ fontWeight: "bold", textAlign: "center" }}>{req.days}</td>
                <td>{req.reason}</td>
                <td>{getStatusDisplay(req)}</td>
                <td>
                  {(req.status === "Pending" || req.status === "TL Approved") && (
                    <button className="delete-btn" onClick={() => handleDelete(req.id)} disabled={loading}>❌ Cancel</button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </>
  );
};

// ══════════════════════════════════════════════
//  ROOT COMPONENT
// ══════════════════════════════════════════════
const EmployeeApplyLeave = () => {
  const currentUser = JSON.parse(localStorage.getItem("user")) || { id: null, name: "User", role: "Employee" };
  const [activeTab, setActiveTab] = useState("leave"); // "leave" | "wfh"

  const tabStyle = (tab) => ({
    padding: "10px 28px",
    borderRadius: "8px 8px 0 0",
    border: "none",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "14px",
    transition: "all 0.2s",
    background: activeTab === tab ? "#4a90d9" : "#e9ecef",
    color:      activeTab === tab ? "#fff"    : "#555",
    borderBottom: activeTab === tab ? "3px solid #2c6fad" : "3px solid transparent"
  });

  return (
    <div className="leave-container">
      <h2>📋 Employee Leave &amp; WFH Management</h2>

      {/* ── TABS ── */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "0", borderBottom: "2px solid #dee2e6" }}>
        <button style={tabStyle("leave")}  onClick={() => setActiveTab("leave")}>
          🗓️ Apply Leave
        </button>
        <button style={tabStyle("wfh")}    onClick={() => setActiveTab("wfh")}>
          🏠 Work From Home
        </button>
      </div>

      <div style={{
        background: "#fff", border: "1px solid #dee2e6", borderTop: "none",
        borderRadius: "0 8px 8px 8px", padding: "20px"
      }}>
        {activeTab === "leave"
          ? <ApplyLeaveTab  currentUser={currentUser} />
          : <ApplyWFHTab    currentUser={currentUser} />
        }
      </div>
    </div>
  );
};

export default EmployeeApplyLeave;