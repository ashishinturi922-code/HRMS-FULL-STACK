import React, { useState, useEffect, useCallback } from "react";
import API_URL from "../../apiConfig"; // ✅ FIX: Imported the working API config
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

  // ✅ FIX: Safe Date Parser to prevent the 1-Day Timezone Shift Bug
  const parseDateLocal = (dateStr) => {
    if (!dateStr) return null;
    const cleanDate = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
    const [yyyy, mm, dd] = cleanDate.split('-');
    return new Date(yyyy, mm - 1, dd);
  };

  // ✅ DATE WINDOW: up to 15 days in the past, unlimited future
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minAllowedDate = new Date(today);
  minAllowedDate.setDate(today.getDate() - 15);

  // ✅ FIX: Generate minDateStr locally, not using toISOString (which uses UTC)
  const minDateStr = `${minAllowedDate.getFullYear()}-${String(minAllowedDate.getMonth() + 1).padStart(2, '0')}-${String(minAllowedDate.getDate()).padStart(2, '0')}`;

  const leaveOptions = [
    "Sick Leave", "Casual Leave", "Work From Home (WFH)",
    "Half Day Leave"
  ];

  const isWeekend = (dateStr) => {
    const d = parseDateLocal(dateStr);
    if (!d) return false;
    const day = d.getDay();
    return day === 0 || day === 6;
  };

  const isOutOfRange = (dateStr) => {
    const d = parseDateLocal(dateStr);
    if (!d) return false;
    d.setHours(0, 0, 0, 0);
    return d < minAllowedDate; 
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

  useEffect(() => {
    if (fromDate && toDate) {
      setWorkingDays(calculateWorkingDays(fromDate, toDate));
    } else {
      setWorkingDays(0);
    }
  }, [fromDate, toDate]);

  const fetchLeaves = useCallback(async () => {
    if (!currentUser.id) return;
    try {
      setLoading(true);
      // ✅ FIX: Use API_URL from config
      const response = await fetch(`${API_URL}/api/employee/leaves/${currentUser.id}`);
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

  const isOverlapping = (newFromStr, newToStr) => {
    const newFrom = parseDateLocal(newFromStr);
    const newTo = parseDateLocal(newToStr);
    if (!newFrom || !newTo) return false;

    return requests.some((req) => {
      if (!['Pending', 'TL Approved'].includes(req.status)) return false;
      
      const from = parseDateLocal(req.from_date || req.fromDate);
      const to = parseDateLocal(req.to_date || req.toDate);
      if (!from || !to) return false;
      
      return (
        (newFrom >= from && newFrom <= to) ||
        (newTo >= from && newTo <= to) ||
        (newFrom <= from && newTo >= to)
      );
    });
  };

  const handleSubmit = async () => {
    if (!leaveType || !fromDate || !toDate || !reason) {
      alert("❌ Fill all fields");
      return;
    }
    if (leaveType === "Half Day Leave" && !session) {
      alert("❌ Select session");
      return;
    }
    const newFrom = parseDateLocal(fromDate);
    const newTo = parseDateLocal(toDate);
    if (newFrom > newTo) {
      alert("❌ Invalid date range");
      return;
    }
    
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

      // ✅ FIX: Use API_URL from config
      const response = await fetch(`${API_URL}/api/employee/apply-leave`, {
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

  const handleDelete = async (leaveId) => {
    if (!window.confirm("Are you sure you want to cancel this leave request?")) return;
    try {
      setLoading(true);
      // ✅ FIX: Use API_URL from config
      const response = await fetch(`${API_URL}/api/employee/delete-leave/${leaveId}`, {
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

      <div style={{
        background: "#fff3cd", border: "1px solid #ffc107", borderRadius: "8px",
        padding: "10px 16px", marginBottom: "12px", fontSize: "14px", color: "#856404"
      }}>
        📅 You can apply leave from <strong>{minDateStr}</strong> (15 days ago) onwards — including <strong>future dates</strong>.
      </div>

      <div className="calendar-header">
        <button onClick={() => changeMonth("prev")}>◀</button>
        <h3>
          {currentDate.toLocaleString("default", { month: "long" })}{" "}
          {currentDate.getFullYear()}
        </h3>
        <button onClick={() => changeMonth("next")}>▶</button>
      </div>

      <div className="calendar-days">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
          <div key={d} className={d === "Sun" || d === "Sat" ? "weekend-header" : ""}>
            {d}
          </div>
        ))}
      </div>

      <div className="calendar-grid">
        {getDays().map((day, index) => {
          if (!day) return <div key={index} className="empty"></div>;

          const date = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1)
            .toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;

          const isWeekendDay  = isWeekend(date);
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

      {selectedDate && (
        <div className="modal">
          <div className="modal-box">
            <h3>📋 Apply Leave</h3>

            <label>From Date:</label>
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
            <input
              type="date"
              value={toDate}
              min={fromDate || minDateStr} 
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
                  {parseDateLocal(req.from_date || req.fromDate)?.toLocaleDateString()} → {parseDateLocal(req.to_date || req.toDate)?.toLocaleDateString()}
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