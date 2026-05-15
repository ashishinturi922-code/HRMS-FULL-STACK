import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import API_URL from "../../apiConfig";
import "./ApplyLeave.css";

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

const leaveOptions = [
  "Sick Leave", "Casual Leave",
  "Maternity Leave", "Paternity Leave", "Bereavement Leave",
  "Privilege Leave", "Compensatory Off", "Loss of Pay",
  "Marriage Leave", "Half Day Leave", "Menstruation Leave"
];

// ─────────────────────────────────────────────
//  MINI CALENDAR
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
              className={`calendar-cell ${isWknd ? "disabled" : ""} ${isDisabled && !isWknd ? "out-of-range" : ""}`}
              style={isDisabled && !isWknd ? { opacity: 0.35, cursor: "not-allowed", background: "#f0f0f0" } : {}}
              onClick={() => { if (!isDisabled) onSelectDate(date); }}
              title={isWknd ? "Weekend" : isDisabled ? `Cannot select before ${minDateStr}` : "Click to apply"}
            >
              {day}
            </div>
          );
        })}
      </div>
    </>
  );
};

// ── STATUS BADGE ──
const statusCell = (status) => {
  if (status === "Approved") return <b style={{ color: "green" }}>Approved ✅</b>;
  if (status === "Rejected" || status === "Denied") return <b style={{ color: "red" }}>Rejected ❌</b>;
  return <span style={{ color: "orange" }}>Pending</span>;
};

// ══════════════════════════════════════════════
//  TAB 1 — APPLY LEAVE
// ══════════════════════════════════════════════
const ApplyLeaveTab = ({ currentUser }) => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [fromDate,    setFromDate]    = useState("");
  const [toDate,      setToDate]      = useState("");
  const [leaveType,   setLeaveType]   = useState("");
  const [session,     setSession]     = useState("");
  const [reason,      setReason]      = useState("");
  const [workingDays, setWorkingDays] = useState(0);
  const [requests,    setRequests]    = useState([]);
  const [editId,      setEditId]      = useState(null);

  useEffect(() => {
    if (fromDate && toDate && parseDateLocal(fromDate) <= parseDateLocal(toDate)) {
      setWorkingDays(calculateWorkingDays(fromDate, toDate));
    } else {
      setWorkingDays(0);
    }
  }, [fromDate, toDate]);

  const fetchMyLeaves = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/manager/my-leaves/${currentUser.id}`);
      setRequests(res.data);
    } catch (err) { console.error("Error fetching leaves", err); }
  }, [currentUser.id]);

  useEffect(() => { fetchMyLeaves(); }, [fetchMyLeaves]);

  const handleSubmit = async () => {
    if (!leaveType || !fromDate || !toDate || !reason) { alert("Fill all fields"); return; }
    if (leaveType === "Half Day Leave" && !session)    { alert("Please select session"); return; }
    if (parseDateLocal(fromDate) > parseDateLocal(toDate)) { alert("Invalid date range"); return; }
    if (isWeekendStr(fromDate) || isWeekendStr(toDate)) { alert("Cannot apply leave on Saturday or Sunday"); return; }
    const fromD = parseDateLocal(fromDate);
    if (fromD && fromD < minAllowedDate) { alert(`❌ Dates cannot be earlier than ${minDateStr}`); return; }
    if (workingDays === 0) { alert("Only weekends selected"); return; }

    const leaveData = {
      user_id: currentUser.id,
      leave_type: leaveType,
      from_date: fromDate,
      to_date: toDate,
      reason,
      session: leaveType === "Half Day Leave" ? session : null,
      days: leaveType === "Half Day Leave" ? 0.5 : workingDays
    };

    try {
      if (editId) {
        await axios.put(`${API_URL}/api/manager/update-my-leave/${editId}`, leaveData);
        alert(`Updated (${workingDays} days) ✅`);
      } else {
        await axios.post(`${API_URL}/api/manager/apply-leave`, leaveData);
        alert(`Applied (${workingDays} days) ✅`);
      }
      fetchMyLeaves();
      setSelectedDate(null); setEditId(null); setLeaveType(""); setSession("");
      setReason(""); setFromDate(""); setToDate(""); setWorkingDays(0);
    } catch (error) {
      console.error(error);
      alert("Error saving leave");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this request?")) return;
    try {
      await axios.delete(`${API_URL}/api/manager/delete-leave/${id}`);
      fetchMyLeaves();
    } catch { alert("Delete failed"); }
  };

  const handleEdit = (req) => {
    setEditId(req.id);
    setLeaveType(req.leave_type);
    setSession(req.session || "");
    setFromDate(req.from_date.split("T")[0]);
    setToDate(req.to_date.split("T")[0]);
    setReason(req.reason);
    setSelectedDate(req.from_date);
    setWorkingDays(calculateWorkingDays(req.from_date.split("T")[0], req.to_date.split("T")[0]));
  };

  return (
    <>
      <div style={{
        background: "#fff3cd", border: "1px solid #ffc107", borderRadius: "8px",
        padding: "10px 16px", marginBottom: "12px", fontSize: "14px", color: "#856404"
      }}>
        📅 You can apply leave from <strong>{minDateStr}</strong> (15 days ago) onwards — including <strong>future dates</strong>.
      </div>

      <MiniCalendar onSelectDate={(date) => { setSelectedDate(date); setFromDate(date); setEditId(null); }} />

      {selectedDate && (
        <div className="modal">
          <div className="modal-box">
            <h3>{editId ? "Edit Leave" : "Apply Leave"}</h3>

            <label>From Date</label>
            <input type="date" value={fromDate} min={minDateStr}
              onChange={(e) => setFromDate(e.target.value)} />

            <label>Leave Type</label>
            <select value={leaveType} onChange={(e) => { setLeaveType(e.target.value); if (e.target.value !== "Half Day Leave") setSession(""); }}>
              <option value="">Select Leave</option>
              {leaveOptions.map((l, i) => <option key={i} value={l}>{l}</option>)}
            </select>

            {leaveType === "Half Day Leave" && (
              <>
                <label>Session</label>
                <select value={session} onChange={(e) => setSession(e.target.value)}>
                  <option value="">Morning / Afternoon</option>
                  <option value="Morning">Morning</option>
                  <option value="Afternoon">Afternoon</option>
                </select>
              </>
            )}

            <label>To Date</label>
            <input type="date" value={toDate} min={minDateStr}
              onChange={(e) => setToDate(e.target.value)} />

            {fromDate && toDate && (
              <div className="working-days-display">
                <strong>Working Days: {workingDays}</strong>
              </div>
            )}

            <label>Reason</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} />

            <div className="modal-actions">
              <button onClick={() => { setSelectedDate(null); setEditId(null); setWorkingDays(0); }}>Cancel</button>
              <button onClick={handleSubmit}>
                {editId ? "Update" : "Submit"} ({workingDays} days)
              </button>
            </div>
          </div>
        </div>
      )}

      <h3>Your Leave History</h3>
      <table className="leave-table">
        <thead>
          <tr><th>Type</th><th>Dates</th><th>Days</th><th>Reason</th><th>Status</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {requests.length === 0 ? (
            <tr><td colSpan="6" style={{ textAlign: "center" }}>No leave history found</td></tr>
          ) : requests.map((req) => (
            <tr key={req.id}>
              <td>{req.leave_type}{req.session && ` (${req.session})`}</td>
              <td>
                {new Date(req.from_date).toLocaleDateString()} →{" "}
                {new Date(req.to_date).toLocaleDateString()}
              </td>
              <td>{req.days}</td>
              <td>{req.reason}</td>
              <td className={`status-${req.status?.toLowerCase()}`}>{statusCell(req.status)}</td>
              <td>
                {req.status === "Pending" && (
                  <div className="action-btns">
                    <button onClick={() => handleEdit(req)}>Edit</button>
                    <button onClick={() => handleDelete(req.id)}>Delete</button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
};

// ══════════════════════════════════════════════
//  TAB 2 — WORK FROM HOME
// ══════════════════════════════════════════════
const ApplyWFHTab = ({ currentUser }) => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [fromDate,    setFromDate]    = useState("");
  const [toDate,      setToDate]      = useState("");
  const [reason,      setReason]      = useState("");
  const [workingDays, setWorkingDays] = useState(0);
  const [requests,    setRequests]    = useState([]);
  const [loading,     setLoading]     = useState(false);

  useEffect(() => {
    if (fromDate && toDate && parseDateLocal(fromDate) <= parseDateLocal(toDate)) {
      setWorkingDays(calculateWorkingDays(fromDate, toDate));
    } else {
      setWorkingDays(0);
    }
  }, [fromDate, toDate]);

  const fetchWFH = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/manager/my-wfh/${currentUser.id}`);
      setRequests(res.data);
    } catch (err) { console.error("Error fetching WFH", err); }
    finally { setLoading(false); }
  }, [currentUser.id]);

  useEffect(() => { fetchWFH(); }, [fetchWFH]);

  const isOverlapping = (newFromStr, newToStr) => {
    const nf = parseDateLocal(newFromStr);
    const nt = parseDateLocal(newToStr);
    return requests.some((r) => {
      if (r.status !== "Pending") return false;
      const f = parseDateLocal(r.from_date);
      const t = parseDateLocal(r.to_date);
      if (!f || !t) return false;
      return (nf >= f && nf <= t) || (nt >= f && nt <= t) || (nf <= f && nt >= t);
    });
  };

  const handleSubmit = async () => {
    if (!fromDate || !toDate || !reason) { alert("Fill all fields"); return; }
    if (parseDateLocal(fromDate) > parseDateLocal(toDate)) { alert("Invalid date range"); return; }
    if (isWeekendStr(fromDate) || isWeekendStr(toDate)) { alert("Cannot apply WFH on a weekend"); return; }
    if (isOverlapping(fromDate, toDate)) { alert("You already have a WFH request during this period"); return; }
    if (workingDays === 0) { alert("No working days selected"); return; }

    try {
      setLoading(true);
      await axios.post(`${API_URL}/api/manager/apply-wfh`, {
        user_id: currentUser.id,
        from_date: fromDate,
        to_date: toDate,
        reason,
        days: workingDays
      });
      alert(`✅ WFH Applied (${workingDays} days)`);
      setSelectedDate(null); setFromDate(""); setToDate(""); setReason(""); setWorkingDays(0);
      fetchWFH();
    } catch (error) {
      console.error(error);
      alert("Error applying WFH");
    } finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Cancel this WFH request?")) return;
    try {
      await axios.delete(`${API_URL}/api/manager/delete-wfh/${id}`);
      fetchWFH();
    } catch { alert("Delete failed"); }
  };

  return (
    <>
      <div style={{
        background: "#e8f5e9", border: "1px solid #66bb6a", borderRadius: "8px",
        padding: "10px 16px", marginBottom: "12px", fontSize: "14px", color: "#2e7d32"
      }}>
        🏠 WFH requests are tracked separately and <strong>do not</strong> count as "On Leave" in the dashboard.
      </div>

      <MiniCalendar onSelectDate={(date) => { setSelectedDate(date); setFromDate(date); }} />

      {selectedDate && (
        <div className="modal">
          <div className="modal-box">
            <h3>🏠 Apply Work From Home</h3>

            <label>From Date</label>
            <input type="date" value={fromDate} min={minDateStr}
              onChange={(e) => setFromDate(e.target.value)} />

            <label>To Date</label>
            <input type="date" value={toDate} min={fromDate || minDateStr}
              onChange={(e) => setToDate(e.target.value)} />

            {fromDate && toDate && (
              <div className="working-days-display" style={{ background: "#e8f5e9", border: "2px solid #4caf50", color: "#2e7d32" }}>
                <strong>📅 Working Days: {workingDays}</strong>
                <br /><small>(Weekends excluded)</small>
              </div>
            )}

            <label>Reason / Work Plan</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="Describe your work plan for WFH days..." />

            <div className="modal-actions">
              <button onClick={() => { setSelectedDate(null); setWorkingDays(0); }}>Cancel</button>
              <button onClick={handleSubmit} disabled={loading || workingDays === 0}>
                {loading ? "Submitting..." : `Submit (${workingDays} days)`}
              </button>
            </div>
          </div>
        </div>
      )}

      <h3>🏠 Your WFH History</h3>
      {loading && <p style={{ textAlign: "center", color: "#666" }}>⏳ Loading...</p>}
      <table className="leave-table">
        <thead>
          <tr><th>Type</th><th>Dates</th><th>Days</th><th>Reason</th><th>Status</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {requests.length === 0 ? (
            <tr><td colSpan="6" style={{ textAlign: "center" }}>No WFH requests found</td></tr>
          ) : requests.map((req) => (
            <tr key={req.id}>
              <td>Work From Home</td>
              <td>
                {new Date(req.from_date).toLocaleDateString()} →{" "}
                {new Date(req.to_date).toLocaleDateString()}
              </td>
              <td>{req.days}</td>
              <td>{req.reason}</td>
              <td>{statusCell(req.status)}</td>
              <td>
                {req.status === "Pending" && (
                  <div className="action-btns">
                    <button onClick={() => handleDelete(req.id)}>Cancel</button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
};

// ══════════════════════════════════════════════
//  ROOT COMPONENT
// ══════════════════════════════════════════════
const ManagerApplyLeave = () => {
  const currentUser = JSON.parse(localStorage.getItem("user")) || {
    id: 1, name: "Manager", role: "Manager"
  };
  const [activeTab, setActiveTab] = useState("leave");

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
      <h2>Leave Calendar</h2>

      {/* ── TABS ── */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "0", borderBottom: "2px solid #dee2e6" }}>
        <button style={tabStyle("leave")} onClick={() => setActiveTab("leave")}>
          🗓️ Apply Leave
        </button>
        <button style={tabStyle("wfh")} onClick={() => setActiveTab("wfh")}>
          🏠 Work From Home
        </button>
      </div>

      <div style={{
        background: "#fff", border: "1px solid #dee2e6", borderTop: "none",
        borderRadius: "0 8px 8px 8px", padding: "20px"
      }}>
        {activeTab === "leave"
          ? <ApplyLeaveTab currentUser={currentUser} />
          : <ApplyWFHTab   currentUser={currentUser} />
        }
      </div>
    </div>
  );
};

export default ManagerApplyLeave;