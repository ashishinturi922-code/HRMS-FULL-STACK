import React, { useState, useEffect, useCallback } from "react";
import "./EmployeeApplyLeave.css";

const EmployeeApplyLeave = () => {
  const currentUser = JSON.parse(localStorage.getItem("user")) || {
    id: null,
    name: "User",
    role: "Employee"
  };

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  const [fromDate, setFromDate] = useState("");
  const [leaveType, setLeaveType] = useState("");
  const [session, setSession] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [workingDays, setWorkingDays] = useState(0);

  const BACKEND_URL = "http://localhost:5000";

  // ✅ DATE WINDOW: up to 15 days in the past, unlimited future
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minAllowedDate = new Date(today);
  minAllowedDate.setDate(today.getDate() - 15);

  const todayStr   = today.toISOString().split("T")[0];
  const minDateStr = minAllowedDate.toISOString().split("T")[0];

  const leaveOptions = [
    "Sick Leave", "Casual Leave", "Work From Home (WFH)",
    "Half Day Leave"
  ];

  // ✅ CHECK IF DATE IS WEEKEND
  const isWeekend = (dateStr) => {
    if (!dateStr) return false;
    const day = new Date(dateStr).getDay();
    return day === 0 || day === 6;
  };

  // ✅ CHECK IF DATE IS BEFORE THE 15-DAY PAST LIMIT (future is always allowed)
  const isOutOfRange = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    return d < minAllowedDate; // ✅ Only block beyond 15 past days; future is open
  };

  // ✅ CALCULATE WORKING DAYS (EXCLUDING WEEKENDS)
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
      setWorkingDays(calculateWorkingDays(fromDate, toDate));
    } else {
      setWorkingDays(0);
    }
  }, [fromDate, toDate]);

  // ✅ FETCH LEAVES FROM BACKEND
  const fetchLeaves = useCallback(async () => {
    if (!currentUser.id) return;
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/employee/leaves/${currentUser.id}`);
      const data = await response.json();
      if (response.ok) {
        setRequests(data);
      } else {
        console.error("Error fetching leaves:", data.error);
      }
    } catch (error) {
      console.error("Error fetching leaves:", error);
    } finally {
      setLoading(false);
    }
  }, [currentUser.id]);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

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

  // ✅ CHECK FOR OVERLAPPING LEAVES
  const isOverlapping = (newFromStr, newToStr) => {
    if (!newFromStr || !newToStr) return false;
    const newFrom = new Date(newFromStr);
    const newTo = new Date(newToStr);
    return requests.some((req) => {
      if (!['Pending', 'TL Approved'].includes(req.status)) return false;
      let from, to;
      if (req.from_date) from = new Date(req.from_date);
      else if (req.fromDate) from = new Date(req.fromDate);
      else return false;
      if (req.to_date) to = new Date(req.to_date);
      else if (req.toDate) to = new Date(req.toDate);
      else return false;
      from.setHours(0, 0, 0, 0);
      to.setHours(0, 0, 0, 0);
      newFrom.setHours(0, 0, 0, 0);
      newTo.setHours(0, 0, 0, 0);
      return (
        (newFrom >= from && newFrom <= to) ||
        (newTo >= from && newTo <= to) ||
        (newFrom <= from && newTo >= to)
      );
    });
  };

  // ✅ SUBMIT LEAVE
  const handleSubmit = async () => {
    if (!leaveType || !fromDate || !toDate || !reason) {
      alert("❌ Fill all fields");
      return;
    }
    if (leaveType === "Half Day Leave" && !session) {
      alert("❌ Select session");
      return;
    }
    const newFrom = new Date(fromDate);
    const newTo = new Date(toDate);
    if (newFrom > newTo) {
      alert("❌ Invalid date range");
      return;
    }
    // ✅ ENFORCE: no dates older than 15 days (future is allowed)
    if (isOutOfRange(fromDate) || isOutOfRange(toDate)) {
      alert(`❌ Dates cannot be earlier than ${minDateStr} (15 days in the past)`);
      return;
    }
    if (isWeekend(fromDate)) {
      alert("❌ Cannot apply leave starting on a weekend (Sat/Sun)");
      return;
    }
    if (isWeekend(toDate)) {
      alert("❌ Cannot apply leave ending on a weekend (Sat/Sun)");
      return;
    }
    if (isOverlapping(fromDate, toDate)) {
      alert("❌ You already have a leave request during this period");
      return;
    }
    if (workingDays === 0) {
      alert("❌ Only weekends selected - no working days available");
      return;
    }

    setLoading(true);
    try {
      let finalDays = workingDays;
      if (leaveType === "Half Day Leave") finalDays = 0.5;

      const payload = {
        user_id: currentUser.id,
        leave_type: leaveType,
        from_date: fromDate,
        to_date: toDate,
        reason: reason,
        session: leaveType === "Half Day Leave" ? session : null,
        days: finalDays
      };

      const response = await fetch(`${BACKEND_URL}/api/employee/apply-leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        alert(`✅ Leave Applied Successfully (${finalDays} days)`);
        setSelectedDate(null);
        setFromDate("");
        setLeaveType("");
        setSession("");
        setToDate("");
        setReason("");
        setWorkingDays(0);
        fetchLeaves();
      } else {
        alert(`❌ ${result.error || "Failed to apply leave"}`);
      }
    } catch (error) {
      console.error("Submit error:", error);
      alert("❌ Server connection error");
    } finally {
      setLoading(false);
    }
  };

  // ✅ DELETE LEAVE REQUEST
  const handleDelete = async (leaveId) => {
    if (!window.confirm("Are you sure you want to cancel this leave request?")) return;
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/employee/delete-leave/${leaveId}`, {
        method: "DELETE"
      });
      if (response.ok) {
        alert("✅ Leave request deleted");
        fetchLeaves();
      } else {
        const error = await response.json();
        alert(`❌ ${error.error || "Delete failed"}`);
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("❌ Delete failed");
    } finally {
      setLoading(false);
    }
  };

  const getStatusDisplay = (req) => {
    if (req.status === "Approved") return <b style={{ color: "green" }}>Approved ✅</b>;
    if (req.status === "Rejected" || req.status === "Denied") return <b style={{ color: "red" }}>Rejected ❌</b>;
    if (req.status === "TL Approved") return <span style={{ color: "#007bff" }}>Approved by TL (Pending Manager)</span>;
    return (
      <span style={{ color: "orange" }}>
        Pending {req.days > 2 ? "(TL & Manager)" : "(Team Lead)"}
      </span>
    );
  };

  return (
    <div className="leave-container">
      <h2>📋 Employee Leave Management</h2>

      {/* ✅ SHOW ALLOWED DATE RANGE */}
      <div style={{
        background: "#fff3cd", border: "1px solid #ffc107", borderRadius: "8px",
        padding: "10px 16px", marginBottom: "12px", fontSize: "14px", color: "#856404"
      }}>
        📅 You can apply leave from <strong>{minDateStr}</strong> (15 days ago) onwards — including <strong>future dates</strong>.
      </div>

      {/* CALENDAR HEADER */}
      <div className="calendar-header">
        <button onClick={() => changeMonth("prev")}>◀</button>
        <h3>
          {currentDate.toLocaleString("default", { month: "long" })}{" "}
          {currentDate.getFullYear()}
        </h3>
        <button onClick={() => changeMonth("next")}>▶</button>
      </div>

      {/* DAYS OF WEEK */}
      <div className="calendar-days">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
          <div key={d} className={d === "Sun" || d === "Sat" ? "weekend-header" : ""}>
            {d}
          </div>
        ))}
      </div>

      {/* CALENDAR GRID */}
      <div className="calendar-grid">
        {getDays().map((day, index) => {
          if (!day) return <div key={index} className="empty"></div>;

          const date = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1)
            .toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;

          const isWeekendDay  = isWeekend(date);
          // ✅ Grey out dates outside the 15-day window
          const isDisabled    = isOutOfRange(date) || isWeekendDay;

          return (
            <div
              key={index}
              className={`calendar-cell ${isWeekendDay ? "weekend" : ""} ${isDisabled && !isWeekendDay ? "out-of-range" : ""}`}
              style={isDisabled && !isWeekendDay ? { opacity: 0.35, cursor: "not-allowed", background: "#f0f0f0" } : {}}
              onClick={() => {
                if (isDisabled) return;
                setSelectedDate(date);
                setFromDate(date);
              }}
              title={
                isWeekendDay ? "Weekend" :
                isDisabled   ? `Cannot select dates before ${minDateStr}` :
                "Click to apply leave"
              }
            >
              {day}
            </div>
          );
        })}
      </div>

      {/* MODAL - APPLY LEAVE */}
      {selectedDate && (
        <div className="modal">
          <div className="modal-box">
            <h3>📋 Apply Leave</h3>

            <label>From Date:</label>
            {/* ✅ min enforces 15-day past limit; no max = future allowed */}
            <input
              type="date"
              value={fromDate}
              min={minDateStr}
              onChange={(e) => setFromDate(e.target.value)}
              disabled={loading}
            />

            <label>Leave Type:</label>
            <select
              value={leaveType}
              onChange={(e) => {
                setLeaveType(e.target.value);
                if (e.target.value !== "Half Day Leave") setSession("");
              }}
              disabled={loading}
            >
              <option value="">Select Leave Type</option>
              {leaveOptions.map((l, i) => (
                <option key={i} value={l}>{l}</option>
              ))}
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
            {/* ✅ min enforces 15-day past limit; no max = future allowed */}
            <input
              type="date"
              value={toDate}
              min={minDateStr}
              onChange={(e) => setToDate(e.target.value)}
              disabled={loading}
            />

            {fromDate && toDate && (
              <div
                className="working-days-display"
                style={{
                  backgroundColor: "#e8f5e9",
                  padding: "12px",
                  borderRadius: "6px",
                  marginBottom: "12px",
                  border: "2px solid #4caf50",
                  fontWeight: "bold",
                  color: "#2e7d32",
                  textAlign: "center"
                }}
              >
                📅 Working Days: <span style={{ fontSize: "18px" }}>{workingDays}</span>
                <br />
                <small style={{ fontSize: "12px", color: "#558b2f" }}>(Weekends excluded)</small>
              </div>
            )}

            <label>Reason:</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={loading}
              placeholder="Enter reason for leave..."
              rows={4}
            />

            <div className="modal-actions">
              <button
                onClick={() => { setSelectedDate(null); setWorkingDays(0); }}
                disabled={loading}
                className="btn-cancel"
              >
                ✕ Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="submit-btn"
                disabled={loading || workingDays === 0}
              >
                {loading ? "⏳ Submitting..." : `✓ Submit (${workingDays} days)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LEAVE HISTORY TABLE */}
      <h3>📋 Your Leave History</h3>

      {loading && (
        <p style={{ textAlign: "center", color: "#666", margin: "20px 0" }}>⏳ Loading...</p>
      )}

      <table className="leave-table">
        <thead>
          <tr>
            <th>Leave Type</th>
            <th>Dates</th>
            <th>Days</th>
            <th>Reason</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {requests.length === 0 ? (
            <tr>
              <td colSpan="6" style={{ textAlign: "center", color: "#999" }}>
                No leave requests found
              </td>
            </tr>
          ) : (
            requests.map((req, index) => (
              <tr key={index}>
                <td>{req.leave_type}{req.session && ` (${req.session})`}</td>
                <td>
                  {new Date(req.from_date).toLocaleDateString()} → {new Date(req.to_date).toLocaleDateString()}
                </td>
                <td style={{ fontWeight: "bold", textAlign: "center" }}>{req.days}</td>
                <td>{req.reason}</td>
                <td>{getStatusDisplay(req)}</td>
                <td>
                  {(req.status === "Pending" || req.status === "TL Approved") && (
                    <button className="delete-btn" onClick={() => handleDelete(req.id)} disabled={loading}>
                      ❌ Cancel
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default EmployeeApplyLeave;