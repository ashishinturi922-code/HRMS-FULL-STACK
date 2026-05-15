import React, { useState, useEffect } from "react";
import "./Leaveapprovals.css"; 
import API_URL from "../../apiConfig"; 

const AdminLeaveApproval = () => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [wfhRequests, setWfhRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("leaves"); // "leaves" or "wfh"

  const fetchAllManagerData = async () => {
    try {
      setLoading(true);
      const [leaveRes, wfhRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/all-leaves`),
        fetch(`${API_URL}/api/admin/wfh/pending-managers`)
      ]);
      
      const leaveData = await leaveRes.json();
      const wfhData = await wfhRes.json();
      
      // ✅ FIX 1: Safely check if leaveData is an array before filtering
      const safeLeaveData = Array.isArray(leaveData) ? leaveData : [];
      const onlyManagers = safeLeaveData.filter(
        (req) => req.employeeRole?.toLowerCase() === "manager"
      );
      
      // ✅ FIX 2: Safely check if wfhData is an array before setting state
      setLeaveRequests(onlyManagers);
      setWfhRequests(Array.isArray(wfhData) ? wfhData : []);

    } catch (error) {
      console.error("Error fetching admin approvals:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllManagerData();
  }, []);

  const handleLeaveAction = async (id, status) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/update-leave/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (response.ok) {
        alert(`Manager leave ${status}!`);
        fetchAllManagerData();
      } else {
        alert("Failed to update leave status.");
      }
    } catch (error) {
      alert("Error updating leave status");
    }
  };

  const handleWfhAction = async (id, status) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/wfh/approve/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (response.ok) {
        alert(`Manager WFH ${status}!`);
        fetchAllManagerData();
      } else {
        alert("Failed to update WFH status.");
      }
    } catch (error) {
      alert("Error updating WFH status");
    }
  };

  if (loading) return <div className="loading">Loading Manager Requests...</div>;

  return (
    <div className="admin-approval-container">
      <h2>Manager Approval Portal</h2>

      {/* Tabs for switching between Leave and WFH */}
      <div style={{ marginBottom: "20px", display: "flex", gap: "10px" }}>
        <button
          onClick={() => setActiveTab("leaves")}
          style={{
            padding: "10px 20px",
            backgroundColor: activeTab === "leaves" ? "#007bff" : "#ccc",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer"
          }}
        >
          Manager Leaves ({leaveRequests.length})
        </button>
        <button
          onClick={() => setActiveTab("wfh")}
          style={{
            padding: "10px 20px",
            backgroundColor: activeTab === "wfh" ? "#007bff" : "#ccc",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer"
          }}
        >
          Manager WFH ({wfhRequests.length})
        </button>
      </div>
      
      <table className="approval-table">
        <thead>
          <tr>
            <th>Manager Name</th>
            {activeTab === "leaves" && <th>Leave Type</th>}
            <th>Dates</th>
            <th>Days</th>
            <th>Reason</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {/* Empty States */}
          {activeTab === "leaves" && leaveRequests.length === 0 && (
            <tr><td colSpan="6" style={{textAlign: "center"}}>No pending manager leave requests.</td></tr>
          )}
          {activeTab === "wfh" && wfhRequests.length === 0 && (
            <tr><td colSpan="5" style={{textAlign: "center"}}>No pending manager WFH requests.</td></tr>
          )}

          {/* Render Leave Requests */}
          {activeTab === "leaves" && leaveRequests.map((req) => (
            <tr key={req.id}>
              <td><strong>{req.employeeName}</strong></td>
              <td>{req.leave_type}</td>
              <td>{new Date(req.from_date).toLocaleDateString()} to {new Date(req.to_date).toLocaleDateString()}</td>
              <td>{req.days}</td>
              <td className="reason-cell">{req.reason}</td>
              <td>
                {req.status === "Pending" ? (
                  <div className="btn-group">
                    <button className="approve-btn" onClick={() => handleLeaveAction(req.id, "Approved")}>Approve</button>
                    <button className="reject-btn" onClick={() => handleLeaveAction(req.id, "Rejected")}>Reject</button>
                  </div>
                ) : (
                  <span className="processed">{req.status}</span>
                )}
              </td>
            </tr>
          ))}

          {/* Render WFH Requests */}
          {activeTab === "wfh" && wfhRequests.map((req) => (
            <tr key={req.id}>
              <td><strong>{req.manager_name}</strong></td>
              <td>{new Date(req.from_date).toLocaleDateString()} to {new Date(req.to_date).toLocaleDateString()}</td>
              <td>{req.days}</td>
              <td className="reason-cell">{req.reason}</td>
              <td>
                <div className="btn-group">
                  <button className="approve-btn" onClick={() => handleWfhAction(req.id, "Approved")}>Approve</button>
                  <button className="reject-btn" onClick={() => handleWfhAction(req.id, "Denied")}>Reject</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminLeaveApproval;