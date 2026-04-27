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
  const [workingDays, setWorkingDays] = useState(0); // ✅ NEW: Track working days

  const today = new Date().toISOString().split("T")[0];
  const BACKEND_URL = "http://192.168.0.165:5000";

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

  // ✅ CALCULATE WORKING DAYS (EXCLUDING WEEKENDS)
  const calculateWorkingDays = (start, end) => {
    if (!start || !end) return 0;
    
    let count = 0;
    let current = new Date(start);
    const endDate = new Date(end);

    while (current <= endDate) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) count++; // 0=Sun, 6=Sat
      current.setDate(current.getDate() + 1);
    }

    return count > 0 ? count : 0;
  };

  // ✅ UPDATE WORKING DAYS WHEN DATES CHANGE
  useEffect(() => {
    if (fromDate && toDate) {
      const days = calculateWorkingDays(fromDate, toDate);
      setWorkingDays(days);
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
        console.log("✅ Fetched leaves:", data);
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
      // Skip if status is not Pending or TL Approved
      if (!['Pending', 'TL Approved'].includes(req.status)) {
        return false;
      }

      // Parse dates properly
      let from, to;
      
      if (req.from_date) {
        from = new Date(req.from_date);
      } else if (req.fromDate) {
        from = new Date(req.fromDate);
      } else {
        return false;
      }

      if (req.to_date) {
        to = new Date(req.to_date);
      } else if (req.toDate) {
        to = new Date(req.toDate);
      } else {
        return false;
      }

      // Fix: Set time to midnight for accurate comparison
      from.setHours(0, 0, 0, 0);
      to.setHours(0, 0, 0, 0);
      newFrom.setHours(0, 0, 0, 0);
      newTo.setHours(0, 0, 0, 0);

      // Check if ranges overlap
      console.log("🔍 Checking overlap:", {
        existingFrom: from.toISOString().split("T")[0],
        existingTo: to.toISOString().split("T")[0],
        newFrom: newFrom.toISOString().split("T")[0],
        newTo: newTo.toISOString().split("T")[0]
      });

      const isOverlap = 
        (newFrom >= from && newFrom <= to) ||  // New start is within existing range
        (newTo >= from && newTo <= to) ||      // New end is within existing range
        (newFrom <= from && newTo >= to);      // New range covers entire existing range

      if (isOverlap) {
        console.log("⚠️ Overlap detected!");
      }

      return isOverlap;
    });
  };

  // ✅ SUBMIT LEAVE TO DB
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

    // ✅ BLOCK WEEKEND START/END
    if (isWeekend(fromDate)) {
      alert("❌ Cannot apply leave starting on a weekend (Sat/Sun)");
      return;
    }

    if (isWeekend(toDate)) {
      alert("❌ Cannot apply leave ending on a weekend (Sat/Sun)");
      return;
    }

    // ✅ CHECK FOR OVERLAPPING LEAVES
    if (isOverlapping(fromDate, toDate)) {
      alert("❌ You already have a leave request during this period");
      return;
    }

    // ✅ CHECK WORKING DAYS
    if (workingDays === 0) {
      alert("❌ Only weekends selected - no working days available");
      return;
    }

    setLoading(true);
    try {
      // ✅ PREPARE PAYLOAD WITH CALCULATED WORKING DAYS
      let finalDays = workingDays;
      if (leaveType === "Half Day Leave") {
        finalDays = 0.5;
      }

      const payload = {
        user_id: currentUser.id,
        leave_type: leaveType,
        from_date: fromDate,
        to_date: toDate,
        reason: reason,
        session: leaveType === "Half Day Leave" ? session : null,
        days: finalDays // ✅ SEND CALCULATED WORKING DAYS
      };

      console.log("📤 Sending leave request:", payload);

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
    if (!window.confirm("Are you sure you want to cancel this leave request?")) {
      return;
    }

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
    if (req.status === "Approved") return <b style={{color: "green"}}>Approved ✅</b>;
    if (req.status === "Rejected" || req.status === "Denied") return <b style={{color: "red"}}>Rejected ❌</b>;
    
    if (req.status === "TL Approved") {
      return <span style={{color: "#007bff"}}>Approved by TL (Pending Manager)</span>;
    }

    return (
      <span style={{color: "orange"}}>
        Pending {req.days > 2 ? "(TL & Manager)" : "(Team Lead)"}
      </span>
    );
  };

  return (
    <div className="leave-container">
      <h2>📋 Employee Leave Management</h2>

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
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
          <div key={d} className={d === "Sun" || d === "Sat" ? "weekend-header" : ""}>
            {d}
          </div>
        ))}
      </div>

      {/* CALENDAR GRID */}
      <div className="calendar-grid">
        {getDays().map((day, index) => {
          if (!day) return <div key={index} className="empty"></div>;

          const date = `${currentDate.getFullYear()}-${(currentDate.getMonth()+1)
            .toString().padStart(2,"0")}-${day.toString().padStart(2,"0")}`;

          const isWeekendDay = isWeekend(date);

          return (
            <div
              key={index}
              className={`calendar-cell ${
                isWeekendDay ? "weekend" : ""
              }`}
              onClick={() => {
                if (isWeekendDay) return;
                setSelectedDate(date);
                setFromDate(date);
              }}
              title={isWeekendDay ? "Weekend" : "Available"}
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
            <input 
              type="date" 
              value={fromDate} 
              onChange={(e)=>setFromDate(e.target.value)} 
              disabled={loading}
            />

            <label>Leave Type:</label>
            <select
              value={leaveType}
              onChange={(e) => {
                setLeaveType(e.target.value);
                if (e.target.value !== "Half Day Leave") {
                  setSession("");
                }
              }}
              disabled={loading}
            >
              <option value="">Select Leave Type</option>
              {leaveOptions.map((l,i)=>(
                <option key={i} value={l}>{l}</option>
              ))}
            </select>

            {leaveType === "Half Day Leave" && (
              <>
                <label>Session:</label>
                <select 
                  value={session} 
                  onChange={(e)=>setSession(e.target.value)}
                  disabled={loading}
                >
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
              onChange={(e)=>setToDate(e.target.value)} 
              disabled={loading}
            />

            {/* ✅ DISPLAY WORKING DAYS */}
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
                <small style={{ fontSize: "12px", color: "#558b2f" }}>
                  (Weekends excluded)
                </small>
              </div>
            )}

            <label>Reason:</label>
            <textarea 
              value={reason} 
              onChange={(e)=>setReason(e.target.value)} 
              disabled={loading}
              placeholder="Enter reason for leave..."
              rows={4}
            />

            <div className="modal-actions">
              <button 
                onClick={()=>{
                  setSelectedDate(null);
                  setWorkingDays(0);
                }} 
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
        <p style={{ textAlign: "center", color: "#666", margin: "20px 0" }}>
          ⏳ Loading...
        </p>
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
              <td colSpan="6" style={{textAlign: "center", color: "#999"}}>
                No leave requests found
              </td>
            </tr>
          ) : (
            requests.map((req, index)=>(
              <tr key={index}>
                <td>
                  {req.leave_type}
                  {req.session && ` (${req.session})`}
                </td>
                <td>
                  {new Date(req.from_date).toLocaleDateString()} → {new Date(req.to_date).toLocaleDateString()}
                </td>
                <td style={{ fontWeight: "bold", textAlign: "center" }}>
                  {req.days}
                </td>
                <td>{req.reason}</td>
                <td>{getStatusDisplay(req)}</td>
                <td>
                  {(req.status === "Pending" || req.status === "TL Approved") && (
                    <button 
                      className="delete-btn" 
                      onClick={()=>handleDelete(req.id)}
                      disabled={loading}
                    >
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