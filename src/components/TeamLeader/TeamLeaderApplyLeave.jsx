import React, { useState, useEffect } from "react";
import API_URL from "../../apiConfig"; // ✅ FIX: Importing central config to avoid undefined URL errors
import "./TeamLeaderCommon.css";

const TeamLeaderApplyLeave = () => {
  const currentUser = JSON.parse(localStorage.getItem("user")) || {
    name: "Suresh",
    role: "TeamLeader",
    id: 1
  };

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [fromDate, setFromDate] = useState("");
  const [leaveType, setLeaveType] = useState("");
  const [session, setSession] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");
  const [requests, setRequests] = useState([]);
  const [editIndex, setEditIndex] = useState(null);
  const [loading, setLoading] = useState(false);
  const [workingDays, setWorkingDays] = useState(0);

  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const minAllowedDate = new Date(todayDate);
  minAllowedDate.setDate(todayDate.getDate() - 15);

  const minDateStr = minAllowedDate.toISOString().split("T")[0];

  const leaveOptions = [
    "Sick Leave", "Casual Leave", "Work From Home (WFH)",
    "Maternity Leave", "Paternity Leave", "Bereavement Leave",
    "Privilege Leave", "Compensatory Off", "Loss of Pay",
    "Marriage Leave", "Half Day Leave", "Menstruation Leave"
  ];

  const isWeekend = (dateStr) => {
    if (!dateStr) return false;
    const day = new Date(dateStr).getDay();
    return day === 0 || day === 6;
  };

  const isOutOfRange = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    return d < minAllowedDate;
  };

  const calculateWorkingDays = (start, end) => {
    if (!start || !end) return 0;
    let count = 0;
    let current = new Date(start);
    const endDate = new Date(end);
    while (current <= endDate) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) count++;
      current.setDate(current.getDate() + 1);
    }
    return count > 0 ? count : 0;
  };

  useEffect(() => {
    if (fromDate && toDate) {
      const days = calculateWorkingDays(fromDate, toDate);
      setWorkingDays(days);
    } else {
      setWorkingDays(0);
    }
  }, [fromDate, toDate]);

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);
      // ✅ FIX: Using API_URL from config instead of broken process.env
      const response = await fetch(`${API_URL}/api/tl-leave/my-leaves/${currentUser.id}`);
      if (response.ok) {
        const data = await response.json();
        setRequests(data);
        localStorage.setItem("leaveRequests", JSON.stringify(data));
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      const stored = JSON.parse(localStorage.getItem("leaveRequests")) || [];
      setRequests(stored);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveRequests();
  }, []);

  const getDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    let days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= totalDays; i++) days.push(i);
    return days;
  };

  const changeMonth = (type) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + (type === "next" ? 1 : -1));
    setCurrentDate(newDate);
  };

  const isOverlapping = (newFromStr, newToStr) => {
    if (!newFromStr || !newToStr) return false;
    const newFrom = new Date(newFromStr);
    const newTo = new Date(newToStr);
    return requests.some((req) => {
      if (editIndex !== null && req.id === requests[editIndex]?.id) return false;
      if (req.status !== "Pending") return false;
      const from = new Date(req.from_date || req.fromDate);
      const to = new Date(req.to_date || req.toDate);
      from.setHours(0, 0, 0, 0); to.setHours(0, 0, 0, 0);
      newFrom.setHours(0, 0, 0, 0); newTo.setHours(0, 0, 0, 0);
      return ((newFrom >= from && newFrom <= to) || (newTo >= from && newTo <= to) || (newFrom <= from && newTo >= to));
    });
  };

  const handleSubmit = async () => {
    if (!leaveType || !fromDate || !toDate || !reason) {
      alert("❌ Fill all fields"); return;
    }
    if (leaveType === "Half Day Leave" && !session) {
      alert("❌ Select session"); return;
    }
    if (new Date(fromDate) > new Date(toDate)) {
      alert("❌ Invalid date range"); return;
    }
    if (isOutOfRange(fromDate) || isOutOfRange(toDate)) {
      alert(`❌ Dates cannot be earlier than ${minDateStr}`); return;
    }
    if (isWeekend(fromDate) || isWeekend(toDate)) {
      alert("❌ Cannot apply leave on a weekend"); return;
    }
    if (isOverlapping(fromDate, toDate)) {
      alert("❌ You already have a pending request for these dates"); return;
    }
    if (workingDays === 0) {
      alert("❌ No working days selected"); return;
    }

    try {
      setLoading(true);
      const payload = {
        tl_user_id: currentUser.id,
        leave_type: leaveType,
        session: leaveType === "Half Day Leave" ? session : null,
        from_date: fromDate,
        to_date: toDate,
        days: leaveType === "Half Day Leave" ? 0.5 : workingDays,
        reason: reason
      };

      // ✅ FIX: Using API_URL from config
      const response = await fetch(`${API_URL}/api/tl-leave/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) { alert(`❌ ${data.error || "Failed to apply"}`); return; }
      alert(`✅ ${data.message || "Applied successfully"}`);
      setSelectedDate(null); setFromDate(""); setLeaveType(""); setSession("");
      setToDate(""); setReason(""); setEditIndex(null); setWorkingDays(0);
      fetchLeaveRequests();
    } catch (error) {
      alert("❌ Failed to apply leave");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (index) => {
    const req = requests[index];
    if (req.status !== "Pending") { alert("❌ Only pending requests can be deleted"); return; }
    if (!window.confirm("Delete this request?")) return;
    try {
      setLoading(true);
      // ✅ FIX: Using API_URL from config
      const response = await fetch(`${API_URL}/api/tl-leave/delete/${req.id}`, { method: "DELETE" });
      if (response.ok) { alert("✅ Deleted"); fetchLeaveRequests(); }
    } catch (error) {
      alert("❌ Error deleting request");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (index) => {
    const req = requests[index];
    if (req.status !== "Pending") { alert("❌ Only pending requests can be edited"); return; }
    setLeaveType(req.leave_type || req.leaveType);
    setSession(req.session || "");
    setFromDate(req.from_date || req.fromDate);
    setSelectedDate(req.from_date || req.fromDate);
    setToDate(req.to_date || req.toDate);
    setReason(req.reason);
    setEditIndex(index);
    setWorkingDays(calculateWorkingDays(req.from_date || req.fromDate, req.to_date || req.toDate));
  };

  return (
    <div className="leave-container">
      <h2>⏳ Team Leader Leave Management</h2>
      <div style={{ background: "#fff3cd", padding: "10px", borderRadius: "8px", marginBottom: "12px", fontSize: "14px", color: "#856404" }}>
        📅 Applying from <strong>{minDateStr}</strong> onwards (past 15 days allowed).
      </div>
      <div className="calendar-header">
        <button onClick={() => changeMonth("prev")}>◀</button>
        <h3>{currentDate.toLocaleString("default", { month: "long" })} {currentDate.getFullYear()}</h3>
        <button onClick={() => changeMonth("next")}>▶</button>
      </div>
      <div className="calendar-days">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => <div key={d}>{d}</div>)}
      </div>
      <div className="calendar-grid">
        {getDays().map((day, index) => {
          if (!day) return <div key={index} className="empty"></div>;
          const date = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
          const isWeekendDay = isWeekend(date);
          const isDisabled = isWeekendDay || isOutOfRange(date);
          return (
            <div
              key={index}
              className={`calendar-cell ${isWeekendDay ? "weekend" : ""} ${isOutOfRange(date) && !isWeekendDay ? "out-of-range" : ""}`}
              style={isOutOfRange(date) && !isWeekendDay ? { opacity: 0.35, cursor: "not-allowed", background: "#f0f0f0" } : {}}
              onClick={() => { if (isDisabled) return; setSelectedDate(date); setFromDate(date); setEditIndex(null); }}
            >
              {day}
            </div>
          );
        })}
      </div>

      {selectedDate && (
        <div className="modal">
          <div className="modal-box">
            <h3>{editIndex !== null ? "✏️ Edit Leave" : "📋 Apply Leave"}</h3>
            <label>From Date</label>
            <input type="date" value={fromDate} min={minDateStr} onChange={(e) => setFromDate(e.target.value)} disabled={loading} />
            <label>Leave Type</label>
            <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)} disabled={loading}>
              <option value="">Select Leave Type</option>
              {leaveOptions.map((l, i) => <option key={i} value={l}>{l}</option>)}
            </select>
            {leaveType === "Half Day Leave" && (
              <>
                <label>Session</label>
                <select value={session} onChange={(e) => setSession(e.target.value)} disabled={loading}>
                  <option value="">Select Session</option>
                  <option value="Morning">Morning</option>
                  <option value="Afternoon">Afternoon</option>
                </select>
              </>
            )}
            <label>To Date</label>
            <input type="date" value={toDate} min={minDateStr} onChange={(e) => setToDate(e.target.value)} disabled={loading} />
            {fromDate && toDate && (
              <div style={{ backgroundColor: "#e8f5e9", padding: "10px", borderRadius: "6px", marginBottom: "12px", border: "1px solid #4caf50", fontWeight: "bold", textAlign: "center" }}>
                📅 Working Days: {workingDays}
              </div>
            )}
            <label>Reason</label>
            <textarea placeholder="Enter reason..." value={reason} onChange={(e) => setReason(e.target.value)} disabled={loading} rows={4} />
            <div className="modal-actions">
              <button onClick={() => { setSelectedDate(null); setEditIndex(null); setWorkingDays(0); }} disabled={loading} className="btn-cancel">✕ Cancel</button>
              <button onClick={handleSubmit} disabled={loading || workingDays === 0} className="btn-submit">
                {loading ? "⏳ Loading..." : editIndex !== null ? "Update" : "Apply"}
              </button>
            </div>
          </div>
        </div>
      )}

      <h3>📋 Your Leave History</h3>
      <table className="leave-table">
        <thead>
          <tr><th>Type</th><th>Dates</th><th>Days</th><th>Reason</th><th>Status</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {requests.length > 0 ? (
            requests.map((req, index) => (
              <tr key={index}>
                <td>{req.leave_type || req.leaveType}{req.session && ` (${req.session})`}</td>
                <td>{req.from_date || req.fromDate} → {req.to_date || req.toDate}</td>
                <td>{req.days}</td>
                <td>{req.reason}</td>
                <td>{req.status}</td>
                <td>
                  {req.status === "Pending" && (
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button onClick={() => handleEdit(index)} className="btn-edit">✏️ Edit</button>
                      <button onClick={() => handleDelete(index)} className="btn-delete">🗑️ Delete</button>
                    </div>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr><td colSpan="6" style={{ textAlign: "center", color: "#999" }}>No requests found</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TeamLeaderApplyLeave;