import React, { useEffect, useState } from "react";
import axios from "axios";
import "./TeamLeaderCommon.css";

const TeamLeaderLeaveApprovals = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  // Get current TL info from localStorage
  const currentUser = JSON.parse(localStorage.getItem("user")) || { id: null };
  const BACKEND_URL = "http://192.168.0.165:5000"; 

  // 1. Fetch leaves using the correct route defined in index.js
  const fetchLeaves = async () => {
    if (!currentUser.id) return;
    try {
      setLoading(true);
      // Fixed URL: Matches app.get('/api/teamleader/leaves/pending/:tlId', ...)
      const response = await axios.get(`${BACKEND_URL}/api/teamleader/leaves/pending/${currentUser.id}`);
      setLeaves(response.data);
    } catch (error) {
      console.error("Error fetching leaves:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, [currentUser.id]);

  // 2. Handle Approval using the correct put route
  const handleApprove = async (leaveId) => {
    try {
      // Fixed URL: Matches app.put('/api/teamleader/leaves/approve/:leaveId', ...)
      await axios.put(`${BACKEND_URL}/api/teamleader/leaves/approve/${leaveId}`, {
        status: "Approved"
      });
      alert("Leave Approved ✅");
      fetchLeaves(); 
    } catch (error) {
      alert("Failed to update leave");
    }
  };

  // 3. Handle Rejection
  const handleReject = async (leaveId) => {
    try {
      // Fixed URL: Matches app.put('/api/teamleader/leaves/approve/:leaveId', ...)
      await axios.put(`${BACKEND_URL}/api/teamleader/leaves/approve/${leaveId}`, {
        status: "Rejected"
      });
      alert("Leave Rejected ❌");
      fetchLeaves(); 
    } catch (error) {
      alert("Failed to update leave");
    }
  };

  if (loading) return <div className="leave-container">Loading requests...</div>;

  return (
    <div className="leave-container">
      <h2>Team Leader Approval</h2>

      <table className="leave-table">
        <thead>
          <tr>
            <th>Employee Name</th>
            <th>Leave Type</th>
            <th>Dates</th>
            <th>Days</th>
            <th>Reason</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {leaves.length === 0 ? (
            <tr>
              <td colSpan="6" style={{ textAlign: "center", padding: "20px" }}>
                No pending requests found for your department.
              </td>
            </tr>
          ) : (
            leaves.map((l) => (
              <tr key={l.id}>
                <td>{l.employeeName}</td>
                <td>{l.leave_type}</td>
                <td>
                  {new Date(l.from_date).toLocaleDateString()} to {new Date(l.to_date).toLocaleDateString()}
                </td>
                <td>{l.days}</td>
                <td>{l.reason}</td>
                <td>
                  <div className="action-buttons">
                    <button 
                      className="approve-btn" 
                      onClick={() => handleApprove(l.id)}
                    >
                      Approve
                    </button>
                    <button 
                      className="reject-btn" 
                      onClick={() => handleReject(l.id)}
                    >
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TeamLeaderLeaveApprovals;