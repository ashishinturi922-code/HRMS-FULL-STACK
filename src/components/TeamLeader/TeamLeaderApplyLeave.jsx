import React, { useState, useEffect } from "react";
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

  const today = new Date().toISOString().split("T")[0];
  
  const BACKEND_URL = "http://192.168.0.165:5000";

  const leaveOptions = [
    "Sick Leave",
    "Casual Leave",
    "Work From Home (WFH)",
    "Maternity Leave",
    "Paternity Leave",
    "Bereavement Leave",
    "Privilege Leave",
    "Compensatory Off",
    "Loss of Pay",
    "Marriage Leave",
    "Half Day Leave",
    "Menstruation Leave"
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
      if (day !== 0 && day !== 6) count++;
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

  // ✅ FETCH LEAVE REQUESTS FROM BACKEND
  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${BACKEND_URL}/api/tl-leave/my-leaves/${currentUser.id}`
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log("✅ Fetched leaves:", data);
        setRequests(data);
        localStorage.setItem("leaveRequests", JSON.stringify(data));
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.warn("Error fetching leaves from API, using localStorage:", error);
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

  // ✅ FIXED OVERLAP CHECK - PROPER DATE COMPARISON
  const isOverlapping = (newFromStr, newToStr) => {
    if (!newFromStr || !newToStr) return false;

    const newFrom = new Date(newFromStr);
    const newTo = new Date(newToStr);

    return requests.some((req) => {
      // Skip if this is the request being edited
      if (editIndex !== null && req.id === requests[editIndex]?.id) {
        return false;
      }

      // Skip if status is not Pending
      if (req.status !== "Pending") {
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

  // ✅ SUBMIT - WITH OVERLAP CHECK (PAST DATES ALLOWED)
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

    // ✅ CHECK FOR OVERLAPPING LEAVES (FIXED)
    if (isOverlapping(fromDate, toDate)) {
      alert("❌ You already have a leave request during this period");
      return;
    }

    // ✅ CHECK WORKING DAYS
    if (workingDays === 0) {
      alert("❌ Only weekends selected - no working days available");
      return;
    }

    try {
      setLoading(true);

      let finalDays = workingDays;
      if (leaveType === "Half Day Leave") {
        finalDays = 0.5;
      }

      const payload = {
        tl_user_id: currentUser.id,
        leave_type: leaveType,
        session: leaveType === "Half Day Leave" ? session : null,
        from_date: fromDate,
        to_date: toDate,
        days: finalDays,
        reason: reason
      };

      console.log("📤 Sending leave request:", payload);

      const response = await fetch(`${BACKEND_URL}/api/tl-leave/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        alert(`❌ ${data.error || "Failed to apply leave"}`);
        return;
      }

      alert(`✅ ${data.message || "Leave applied successfully"}`);

      // ✅ RESET FORM
      setSelectedDate(null);
      setFromDate("");
      setLeaveType("");
      setSession("");
      setToDate("");
      setReason("");
      setEditIndex(null);
      setWorkingDays(0);

      // REFRESH LEAVE REQUESTS
      fetchLeaveRequests();

    } catch (error) {
      console.error("Error:", error);
      alert("❌ Failed to apply leave");
    } finally {
      setLoading(false);
    }
  };

  // ✅ DELETE LEAVE REQUEST
  const handleDelete = async (index) => {
    const req = requests[index];
    
    if (req.status !== "Pending") {
      alert("❌ Can only delete pending requests");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this leave request?")) {
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${BACKEND_URL}/api/tl-leave/delete/${req.id}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        alert("✅ Leave request deleted");
        fetchLeaveRequests();
      } else {
        alert("❌ Failed to delete request");
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("❌ Error deleting leave request");
    } finally {
      setLoading(false);
    }
  };

  // ✅ EDIT LEAVE REQUEST
  const handleEdit = (index) => {
    const req = requests[index];

    if (req.status !== "Pending") {
      alert("❌ Can only edit pending requests");
      return;
    }

    setLeaveType(req.leave_type || req.leaveType);
    setSession(req.session || "");
    setFromDate(req.from_date || req.fromDate);
    setSelectedDate(req.from_date || req.fromDate);
    setToDate(req.to_date || req.toDate);
    setReason(req.reason);
    setEditIndex(index);

    const days = calculateWorkingDays(
      req.from_date || req.fromDate,
      req.to_date || req.toDate
    );
    setWorkingDays(days);
  };

  // ✅ GET STATUS DISPLAY
  const getStatus = (req) => {
    const status = req.status;
    if (status === "Denied" || status === "Rejected") return "Rejected ❌";
    if (status === "Approved") return "Approved ✅";
    if (status === "Pending") return "Pending ⏳";
    return "Pending ⏳";
  };

  const getManagerReason = (req) => {
    return req.manager_reason || "";
  };

  return (
    <div className="leave-container">
      <h2>⏳ Team Leader Leave Management</h2>

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
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className={d === "Sun" || d === "Sat" ? "weekend-header" : ""}>
            {d}
          </div>
        ))}
      </div>

      {/* CALENDAR GRID */}
      <div className="calendar-grid">
        {getDays().map((day, index) => {
          if (!day) return <div key={index} className="empty"></div>;

          const date = `${currentDate.getFullYear()}-${(
            currentDate.getMonth() + 1
          )
            .toString()
            .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;

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
                setEditIndex(null);
              }}
              title={isWeekendDay ? "Weekend" : "Available"}
            >
              {day}
            </div>
          );
        })}
      </div>

      {/* MODAL - APPLY/EDIT LEAVE */}
      {selectedDate && (
        <div className="modal">
          <div className="modal-box">
            <h3>{editIndex !== null ? "✏️ Edit Leave" : "📋 Apply Leave"}</h3>

            <label>From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              disabled={loading}
            />

            <label>Leave Type</label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value)}
              disabled={loading}
            >
              <option value="">Select Leave Type</option>
              {leaveOptions.map((l, i) => (
                <option key={i} value={l}>
                  {l}
                </option>
              ))}
            </select>

            {leaveType === "Half Day Leave" && (
              <>
                <label>Session</label>
                <select
                  value={session}
                  onChange={(e) => setSession(e.target.value)}
                  disabled={loading}
                >
                  <option value="">Select Session</option>
                  <option value="Morning">Morning</option>
                  <option value="Afternoon">Afternoon</option>
                </select>
              </>
            )}

            <label>To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
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

            <label>Reason</label>
            <textarea
              placeholder="Enter reason for leave..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={loading}
              rows={4}
            />

            <div className="modal-actions">
              <button
                onClick={() => {
                  setSelectedDate(null);
                  setEditIndex(null);
                  setWorkingDays(0);
                }}
                disabled={loading}
                className="btn-cancel"
              >
                ✕ Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || workingDays === 0}
                className="btn-submit"
              >
                {loading
                  ? "⏳ Processing..."
                  : editIndex !== null
                  ? `✏️ Update (${workingDays} days)`
                  : `✓ Apply (${workingDays} days)`}
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
            <th>Manager Feedback</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {requests.length > 0 ? (
            requests.map((req, index) => {
              // Filter by current user
              if (req.tl_user_id && req.tl_user_id !== currentUser.id)
                return null;

              return (
                <tr key={index}>
                  <td>
                    {req.leave_type || req.leaveType}
                    {req.session && ` (${req.session})`}
                  </td>
                  <td>
                    {req.from_date || req.fromDate} → {req.to_date || req.toDate}
                  </td>
                  <td style={{ fontWeight: "bold", textAlign: "center" }}>
                    {req.days}
                  </td>
                  <td>{req.reason}</td>
                  <td className={`status-${(req.status || "pending").toLowerCase()}`}>
                    {getStatus(req)}
                  </td>
                  <td>
                    {getManagerReason(req) ? (
                      <span style={{ color: "red", fontSize: "0.9em" }}>
                        {getManagerReason(req)}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>
                    {req.status === "Pending" && (
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          onClick={() => handleEdit(index)}
                          disabled={loading}
                          className="btn-edit"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDelete(index)}
                          disabled={loading}
                          className="btn-delete"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan="7" style={{ textAlign: "center", color: "#999" }}>
                No leave requests found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TeamLeaderApplyLeave;