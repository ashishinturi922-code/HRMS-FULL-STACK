import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import API_URL from "../../apiConfig"; // ✅ FIX: Importing your config file
import "./ApplyLeave.css";

const ManagerApplyLeave = () => {
  const currentUser =
    JSON.parse(localStorage.getItem("user")) || {
      id: 1,
      name: "Manager",
      role: "Manager",
    };

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [fromDate, setFromDate] = useState("");
  const [leaveType, setLeaveType] = useState("");
  const [session, setSession] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");

  const [requests, setRequests] = useState([]);
  const [editId, setEditId] = useState(null);
  const [workingDays, setWorkingDays] = useState(0); // ✅ NEW: Track calculated days

  const leaveOptions = [
    "Sick Leave","Casual Leave","Work From Home (WFH)",
    "Maternity Leave","Paternity Leave","Bereavement Leave",
    "Privilege Leave","Compensatory Off","Loss of Pay",
    "Marriage Leave","Half Day Leave","Menstruation Leave",
  ];

  // ✅ DATE WINDOW: past 15 days + unlimited future
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const minAllowedDate = new Date(todayDate);
  minAllowedDate.setDate(todayDate.getDate() - 15);
  const minDateStr = minAllowedDate.toISOString().split("T")[0];

  // 🚫 WEEKEND CHECK
  const isWeekend = (dateStr) => {
    const day = new Date(dateStr).getDay();
    return day === 0 || day === 6;
  };

  // ✅ BLOCK DATES OLDER THAN 15 DAYS (future is always allowed)
  const isOutOfRange = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    return d < minAllowedDate;
  };

  // ✅ WORKING DAYS (exclude Sat/Sun) - SAME LOGIC AS BACKEND
  const calculateWorkingDays = (start, end) => {
    let count = 0;
    let current = new Date(start);
    const endDate = new Date(end);

    while (current <= endDate) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) count++; // 0=Sun, 6=Sat
      current.setDate(current.getDate() + 1);
    }

    return count;
  };

  // ✅ UPDATE WORKING DAYS WHEN DATES CHANGE
  useEffect(() => {
    if (fromDate && toDate && new Date(fromDate) <= new Date(toDate)) {
      const days = calculateWorkingDays(fromDate, toDate);
      setWorkingDays(days);
    } else {
      setWorkingDays(0);
    }
  }, [fromDate, toDate]);

  // ✅ FETCH LEAVES
  const fetchMyLeaves = useCallback(async () => {
    try {
      const res = await axios.get(
        `${API_URL}/api/manager/my-leaves/${currentUser.id}` // ✅ FIX: Used API_URL
      );
      setRequests(res.data);
    } catch (err) {
      console.error("Error fetching leaves", err);
    }
  }, [currentUser.id]);

  useEffect(() => {
    fetchMyLeaves();
  }, [fetchMyLeaves]);

  // MONTH CHANGE
  const changeMonth = (type) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + (type === "next" ? 1 : -1));
    setCurrentDate(newDate);
  };

  // CALENDAR DAYS
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

  // ✅ SUBMIT - SEND CALCULATED WORKING DAYS
  const handleSubmit = async () => {
    if (!leaveType || !fromDate || !toDate || !reason) {
      alert("Fill all fields");
      return;
    }

    if (leaveType === "Half Day Leave" && !session) {
      alert("Please select session");
      return;
    }

    if (new Date(fromDate) > new Date(toDate)) {
      alert("Invalid date range");
      return;
    }

    // 🚫 Block weekends
    if (isWeekend(fromDate) || isWeekend(toDate)) {
      alert("Cannot apply leave on Saturday or Sunday");
      return;
    }

    // ✅ ENFORCE: no dates older than 15 days (future is allowed)
    if (isOutOfRange(fromDate) || isOutOfRange(toDate)) {
      alert(`❌ Dates cannot be earlier than ${minDateStr} (15 days in the past)`);
      return;
    }

    if (workingDays === 0) {
      alert("Only weekends selected");
      return;
    }

    const leaveData = {
      user_id: currentUser.id,
      leave_type: leaveType,
      from_date: fromDate,
      to_date: toDate,
      reason: reason,
      session: leaveType === "Half Day Leave" ? session : null,
      days: leaveType === "Half Day Leave" ? 0.5 : workingDays, // ✅ SEND CALCULATED DAYS
    };

    console.log("📤 Sending leave data:", leaveData); // DEBUG

    try {
      if (editId) {
        await axios.put(
          `${API_URL}/api/manager/update-my-leave/${editId}`, // ✅ FIX: Used API_URL
          leaveData
        );
        alert(`Updated (${workingDays} days) ✅`);
      } else {
        await axios.post(
          `${API_URL}/api/manager/apply-leave`, // ✅ FIX: Used API_URL
          leaveData
        );
        alert(`Applied (${workingDays} days) ✅`);
      }

      fetchMyLeaves();

      setSelectedDate(null);
      setEditId(null);
      setLeaveType("");
      setSession("");
      setReason("");
      setFromDate("");
      setToDate("");
      setWorkingDays(0); // ✅ RESET
    } catch (error) {
      console.error(error);
      alert("Error saving leave");
    }
  };

  // DELETE
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this request?")) return;

    try {
      await axios.delete(
        `${API_URL}/api/manager/delete-leave/${id}` // ✅ FIX: Used API_URL
      );
      fetchMyLeaves();
    } catch {
      alert("Delete failed");
    }
  };

  // EDIT
  const handleEdit = (req) => {
    setEditId(req.id);
    setLeaveType(req.leave_type);
    setSession(req.session || "");
    setFromDate(req.from_date.split("T")[0]);
    setToDate(req.to_date.split("T")[0]);
    setReason(req.reason);
    setSelectedDate(req.from_date);
    // ✅ CALCULATE DAYS FOR EDITING
    const days = calculateWorkingDays(
      req.from_date.split("T")[0],
      req.to_date.split("T")[0]
    );
    setWorkingDays(days);
  };

  return (
    <div className="leave-container">
      <h2>Leave Calendar</h2>

      {/* ✅ ALLOWED DATE RANGE BANNER */}
      <div style={{
        background: "#fff3cd", border: "1px solid #ffc107", borderRadius: "8px",
        padding: "10px 16px", marginBottom: "12px", fontSize: "14px", color: "#856404"
      }}>
        📅 You can apply leave from <strong>{minDateStr}</strong> (15 days ago) onwards — including <strong>future dates</strong>.
      </div>

      {/* HEADER */}
      <div className="calendar-header">
        <button onClick={() => changeMonth("prev")}>◀</button>
        <h3>
          {currentDate.toLocaleString("default", { month: "long" })}{" "}
          {currentDate.getFullYear()}
        </h3>
        <button onClick={() => changeMonth("next")}>▶</button>
      </div>

      {/* DAYS */}
      <div className="calendar-days">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
          <div key={d}>{d}</div>
        ))}
      </div>

      {/* GRID */}
      <div className="calendar-grid">
        {getDays().map((day, index) => {
          if (!day) return <div key={index} className="empty"></div>;

          const date = `${currentDate.getFullYear()}-${(currentDate.getMonth()+1)
            .toString().padStart(2,"0")}-${day.toString().padStart(2,"0")}`;

          const isWeekendDay = new Date(date).getDay() === 0 || new Date(date).getDay() === 6;
          const isDisabled   = isWeekendDay || isOutOfRange(date);

          return (
            <div
              key={index}
              className={`calendar-cell ${isWeekendDay ? "disabled" : ""} ${isOutOfRange(date) && !isWeekendDay ? "out-of-range" : ""}`}
              style={isOutOfRange(date) && !isWeekendDay ? { opacity: 0.35, cursor: "not-allowed", background: "#f0f0f0" } : {}}
              onClick={() => {
                if (isDisabled) return;
                setSelectedDate(date);
                setFromDate(date);
                setEditId(null);
              }}
              title={
                isWeekendDay       ? "Weekend" :
                isOutOfRange(date) ? `Cannot select dates before ${minDateStr}` :
                "Click to apply leave"
              }
            >
              {day}
            </div>
          );
        })}
      </div>

      {/* MODAL */}
      {selectedDate && (
        <div className="modal">
          <div className="modal-box">
            <h3>{editId ? "Edit Leave" : "Apply Leave"}</h3>

            <label>From Date</label>
            <input 
              type="date" 
              value={fromDate} 
              min={minDateStr}
              onChange={(e)=>setFromDate(e.target.value)} 
            />

            <label>Leave Type</label>
            <select 
              value={leaveType} 
              onChange={(e)=>setLeaveType(e.target.value)}
            >
              <option value="">Select Leave</option>
              {leaveOptions.map((l,i)=>(
                <option key={i} value={l}>{l}</option>
              ))}
            </select>

            {leaveType === "Half Day Leave" && (
              <>
                <label>Session</label>
                <select 
                  value={session} 
                  onChange={(e)=>setSession(e.target.value)}
                >
                  <option value="">Morning / Afternoon</option>
                  <option value="Morning">Morning</option>
                  <option value="Afternoon">Afternoon</option>
                </select>
              </>
            )}

            <label>To Date</label>
            <input 
              type="date" 
              value={toDate} 
              min={minDateStr}
              onChange={(e)=>setToDate(e.target.value)} 
            />

            {/* ✅ SHOW WORKING DAYS */}
            {fromDate && toDate && (
              <div className="working-days-display">
                <strong>Working Days: {workingDays}</strong>
              </div>
            )}

            <label>Reason</label>
            <textarea 
              value={reason} 
              onChange={(e)=>setReason(e.target.value)} 
            />

            <div className="modal-actions">
              <button onClick={()=>{
                setSelectedDate(null); 
                setEditId(null);
                setWorkingDays(0);
              }}>Cancel</button>
              <button onClick={handleSubmit}>
                {editId ? "Update" : "Submit"} ({workingDays} days)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TABLE */}
      <h3>Your Leave History</h3>
      <table className="leave-table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Dates</th>
            <th>Days</th>
            <th>Reason</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {requests.length > 0 ? (
            requests.map((req) => (
              <tr key={req.id}>
                <td>{req.leave_type}</td>
                <td>
                  {new Date(req.from_date).toLocaleDateString()} →{" "}
                  {new Date(req.to_date).toLocaleDateString()}
                </td>
                <td>{req.days}</td>
                <td>{req.reason}</td>
                <td className={`status-${req.status?.toLowerCase()}`}>
                  {req.status}
                </td>
                <td>
                  {req.status === "Pending" && (
                    <div className="action-btns">
                      <button onClick={() => handleEdit(req)}>Edit</button>
                      <button onClick={() => handleDelete(req.id)}>Delete</button>
                    </div>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="6" style={{ textAlign: "center" }}>
                No leave history found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ManagerApplyLeave;