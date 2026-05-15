import React, { useEffect, useState } from "react";
import axios from "axios";
import API_URL from "../../apiConfig";
import "./TeamLeaderCommon.css";

const TeamLeaderLeaveApprovals = () => {
  const [leaves, setLeaves] = useState([]);
  const [wfhRequests, setWfhRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("leaves"); // "leaves" or "wfh"

  const currentUser = JSON.parse(localStorage.getItem("user")) || { id: null };

  const fetchLeaves = async () => {
    if (!currentUser.id) return;
    try {
      const response = await axios.get(`${API_URL}/api/teamleader/leaves/pending/${currentUser.id}`);
      setLeaves(response.data);
    } catch (error) {
      console.error("Error fetching leaves:", error);
    }
  };

  const fetchWfh = async () => {
    if (!currentUser.id) return;
    try {
      const response = await axios.get(`${API_URL}/api/teamleader/wfh/pending/${currentUser.id}`);
      setWfhRequests(response.data);
    } catch (error) {
      console.error("Error fetching WFH:", error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchLeaves(), fetchWfh()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [currentUser.id]);

  const handleLeaveAction = async (leaveId, status) => {
    try {
      await axios.put(`${API_URL}/api/teamleader/leaves/approve/${leaveId}`, { status });
      alert(`Leave ${status} ✅`);
      fetchLeaves(); 
    } catch (error) {
      alert("Failed to update leave");
    }
  };

  const handleWfhAction = async (wfhId, status) => {
    try {
      await axios.put(`${API_URL}/api/teamleader/wfh/approve/${wfhId}`, { status });
      alert(`WFH ${status} ✅`);
      fetchWfh(); 
    } catch (error) {
      alert("Failed to update WFH");
    }
  };

  if (loading) return <div className="leave-container">Loading requests...</div>;

  return (
    <div className="leave-container">
      <h2>Team Leader Approval</h2>

      {/* TABS */}
      <div style={{ marginBottom: "20px", borderBottom: "2px solid #ddd", display: "flex", gap: "10px" }}>
        <button
          onClick={() => setActiveTab("leaves")}
          style={{
            padding: "10px 20px",
            backgroundColor: activeTab === "leaves" ? "#007bff" : "#f0f0f0",
            color: activeTab === "leaves" ? "white" : "black",
            border: "none",
            cursor: "pointer",
            borderRadius: "5px 5px 0 0"
          }}
        >
          Leave Requests ({leaves.length})
        </button>
        <button
          onClick={() => setActiveTab("wfh")}
          style={{
            padding: "10px 20px",
            backgroundColor: activeTab === "wfh" ? "#007bff" : "#f0f0f0",
            color: activeTab === "wfh" ? "white" : "black",
            border: "none",
            cursor: "pointer",
            borderRadius: "5px 5px 0 0"
          }}
        >
          WFH Requests ({wfhRequests.length})
        </button>
      </div>

      <table className="leave-table">
        <thead>
          <tr>
            <th>Employee Name</th>
            {activeTab === "leaves" && <th>Leave Type</th>}
            <th>Dates</th>
            <th>Days</th>
            <th>Reason</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {activeTab === "leaves" && leaves.length === 0 && (
            <tr><td colSpan="6" style={{ textAlign: "center", padding: "20px" }}>No pending leave requests found.</td></tr>
          )}
          {activeTab === "wfh" && wfhRequests.length === 0 && (
            <tr><td colSpan="5" style={{ textAlign: "center", padding: "20px" }}>No pending WFH requests found.</td></tr>
          )}

          {activeTab === "leaves" && leaves.map((l) => (
            <tr key={l.id}>
              <td>{l.employeeName || l.name}</td>
              <td>{l.leave_type}</td>
              <td>{new Date(l.from_date).toLocaleDateString()} to {new Date(l.to_date).toLocaleDateString()}</td>
              <td>{l.days}</td>
              <td>{l.reason}</td>
              <td>
                <div className="action-buttons">
                  <button className="approve-btn" onClick={() => handleLeaveAction(l.id, "Approved")}>Approve</button>
                  <button className="reject-btn" onClick={() => handleLeaveAction(l.id, "Rejected")}>Reject</button>
                </div>
              </td>
            </tr>
          ))}

          {activeTab === "wfh" && wfhRequests.map((w) => (
            <tr key={w.id}>
              <td>{w.employee_name}</td>
              <td>{new Date(w.from_date).toLocaleDateString()} to {new Date(w.to_date).toLocaleDateString()}</td>
              <td>{w.days}</td>
              <td>{w.reason}</td>
              <td>
                <div className="action-buttons">
                  <button className="approve-btn" onClick={() => handleWfhAction(w.id, "Approved")}>Approve</button>
                  <button className="reject-btn" onClick={() => handleWfhAction(w.id, "Rejected")}>Reject</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TeamLeaderLeaveApprovals;