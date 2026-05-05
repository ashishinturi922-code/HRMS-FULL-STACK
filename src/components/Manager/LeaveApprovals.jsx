import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import "./ManagerLeaveApprovals.css";

const ManagerLeaveApprovals = () => {
  const currentUser = JSON.parse(localStorage.getItem("user")) || {
    id: 1,
    role: "Manager"
  };

  const [leaves, setLeaves] = useState([]);
  const [tlLeaves, setTlLeaves] = useState([]);
  const [activeTab, setActiveTab] = useState("employee"); // "employee" or "teamleader"
  const [rejectIndex, setRejectIndex] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [approvalStatus, setApprovalStatus] = useState("");
  const [managerReason, setManagerReason] = useState("");
  const [loading, setLoading] = useState(false);

  const BACKEND_URL = `${process.env.REACT_APP_API_URL}`;

  // ✅ FETCH EMPLOYEE LEAVES
  const fetchEmployeeLeaves = useCallback(async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/manager/pending-approvals`);
      
      // The logic here ensures the Manager sees:
      // 1. Employee leaves that are 'TL Approved' (which means they were > 2 days)
      // 2. Or standard Pending leaves if your backend logic directs them here
      const filtered = res.data.filter(l =>
        l.role === "Employee" || 
        (l.role === "TeamLeader" && l.status === "Pending")
      );

      setLeaves(filtered);
    } catch (err) {
      console.error("Error fetching employee leaves:", err);
    }
  }, []);

  // ✅ FETCH TEAM LEADER LEAVES
  const fetchTeamLeaderLeaves = useCallback(async () => {
    try {
      const res = await axios.get(
        `${BACKEND_URL}/api/tl-leave/requests/${currentUser.id}`
      );

      setTlLeaves(res.data);
    } catch (err) {
      console.error("Error fetching TL leaves:", err);
    }
  }, [currentUser.id]);

  useEffect(() => {
    fetchEmployeeLeaves();
    fetchTeamLeaderLeaves();
  }, [fetchEmployeeLeaves, fetchTeamLeaderLeaves]);

  // ✅ APPROVE EMPLOYEE LEAVE
  const handleApproveEmployee = async (leaveId) => {
    try {
      setLoading(true);
      await axios.put(`${BACKEND_URL}/api/manager/approve-leave/${leaveId}`, {
        status: "Approved"
      });
      alert("Leave Approved ✅");
      fetchEmployeeLeaves();
    } catch (err) {
      alert("Failed to approve leave");
    } finally {
      setLoading(false);
    }
  };

  // ✅ REJECT EMPLOYEE LEAVE
  const handleRejectEmployee = async (leaveId) => {
    if (!rejectReason) {
      alert("Please enter a reason for rejection");
      return;
    }

    try {
      setLoading(true);
      await axios.put(`${BACKEND_URL}/api/manager/approve-leave/${leaveId}`, {
        status: "Rejected",
        reason: rejectReason
      });
      alert("Leave Rejected ❌");
      setRejectReason("");
      setRejectIndex(null);
      fetchEmployeeLeaves();
    } catch (err) {
      alert("Failed to reject leave");
    } finally {
      setLoading(false);
    }
  };

  // ✅ APPROVE/DENY TEAM LEADER LEAVE
  const handleApproveTLLeave = async () => {
    if (!approvalStatus) {
      alert("Select Approve or Deny");
      return;
    }

    if (approvalStatus === "Denied" && !managerReason) {
      alert("Please provide a reason for denial");
      return;
    }

    try {
      setLoading(true);
      const response = await axios.put(
        `${BACKEND_URL}/api/tl-leave/approve/${selectedLeave.id}`,
        {
          status: approvalStatus,
          manager_reason: managerReason || null
        }
      );

      alert(`✅ Leave ${approvalStatus} successfully`);

      setSelectedLeave(null);
      setApprovalStatus("");
      setManagerReason("");
      fetchTeamLeaderLeaves();

    } catch (error) {
      console.error("Error updating leave:", error);
      alert("Failed to update leave request");
    } finally {
      setLoading(false);
    }
  };

  const openTLApprovalModal = (leave) => {
    setSelectedLeave(leave);
    setApprovalStatus("");
    setManagerReason("");
  };

  return (
    <div className="page-container">
      <h2>Leave Approvals</h2>

      {/* TABS */}
      <div style={{ marginBottom: "20px", borderBottom: "2px solid #ddd" }}>
        <button
          onClick={() => setActiveTab("employee")}
          style={{
            padding: "10px 20px",
            backgroundColor: activeTab === "employee" ? "#007bff" : "#f0f0f0",
            color: activeTab === "employee" ? "white" : "black",
            border: "none",
            cursor: "pointer",
            marginRight: "10px"
          }}
        >
          Employee Leaves ({leaves.length})
        </button>
        <button
          onClick={() => setActiveTab("teamleader")}
          style={{
            padding: "10px 20px",
            backgroundColor: activeTab === "teamleader" ? "#007bff" : "#f0f0f0",
            color: activeTab === "teamleader" ? "white" : "black",
            border: "none",
            cursor: "pointer"
          }}
        >
          Team Leader Leaves ({tlLeaves.length})
        </button>
      </div>

      {/* EMPLOYEE LEAVES TAB */}
      {activeTab === "employee" && (
        <table className="approval-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Dates</th>
              <th>Days</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {leaves.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: "center" }}>No Pending Requests</td>
              </tr>
            ) : (
              leaves.map((l, i) => (
                <tr key={l.id}>
                  <td>{l.name}</td>
                  <td>{l.role}</td>
                  <td>
                    {new Date(l.from_date).toLocaleDateString()} → {new Date(l.to_date).toLocaleDateString()}
                  </td>
                  <td>{l.days}</td>
                  <td>{l.reason}</td>
                  {/* Logic check: If status is TL Approved, it means TL already said yes */}
                  <td>
                    {l.status === 'TL Approved' ? (
                      <span style={{ color: "#007bff", fontWeight: "bold" }}>TL Approved</span>
                    ) : (
                      l.manager_status || "Pending"
                    )}
                  </td>

                  <td>
                    {/* Allow action if it's Pending or TL Approved (needing final manager sign-off) */}
                    {(l.manager_status === "Pending" || !l.manager_status || l.status === "TL Approved") && (
                      <div className="action-buttons">
                        <button 
                          className="approve-btn" 
                          onClick={() => handleApproveEmployee(l.id)}
                          disabled={loading}
                        >
                          Approve
                        </button>

                        {rejectIndex === i ? (
                          <div className="reject-confirm">
                            <input
                              placeholder="Rejection Reason"
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              autoFocus
                            />
                            <button 
                              className="confirm-btn" 
                              onClick={() => handleRejectEmployee(l.id)}
                              disabled={loading}
                            >
                              Confirm
                            </button>
                            <button 
                              className="cancel-btn" 
                              onClick={() => setRejectIndex(null)}
                              disabled={loading}
                            >
                              X
                            </button>
                          </div>
                        ) : (
                          <button 
                            className="reject-btn" 
                            onClick={() => setRejectIndex(i)}
                            disabled={loading}
                          >
                            Reject
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {/* TEAM LEADER LEAVES TAB */}
      {activeTab === "teamleader" && (
        <table className="approval-table">
          <thead>
            <tr>
              <th>Team Leader Name</th>
              <th>Leave Type</th>
              <th>From Date</th>
              <th>To Date</th>
              <th>Days</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {tlLeaves.length > 0 ? (
              tlLeaves.map((leave, index) => (
                <tr key={index}>
                  <td>{leave.tl_name}</td>
                  <td>
                    {leave.leave_type} {leave.session && `(${leave.session})`}
                  </td>
                  <td>{leave.from_date}</td>
                  <td>{leave.to_date}</td>
                  <td>{leave.days}</td>
                  <td>{leave.reason}</td>
                  <td>
                    <span
                      style={{
                        padding: "5px 10px",
                        borderRadius: "5px",
                        backgroundColor:
                          leave.status === "Pending"
                            ? "#fff3cd"
                            : leave.status === "Approved"
                            ? "#d4edda"
                            : "#f8d7da",
                        color:
                          leave.status === "Pending"
                            ? "#856404"
                            : leave.status === "Approved"
                            ? "#155724"
                            : "#721c24"
                      }}
                    >
                      {leave.status === "Denied" ? "Rejected" : leave.status}
                    </span>
                  </td>
                  <td>
                    {leave.status === "Pending" ? (
                      <button
                        onClick={() => openTLApprovalModal(leave)}
                        disabled={loading}
                      >
                        Review
                      </button>
                    ) : (
                      <span style={{ color: "#999" }}>Done</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" style={{ textAlign: "center", color: "#999" }}>
                  No pending leave requests
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {/* TL APPROVAL MODAL */}
      {selectedLeave && (
        <div className="modal" style={{ display: "flex" }}>
          <div className="modal-box" style={{ width: "500px" }}>
            <h3>Review Leave Request</h3>

            <div style={{ marginBottom: "20px", padding: "15px", backgroundColor: "#f9f9f9", borderRadius: "5px" }}>
              <p><strong>Team Leader:</strong> {selectedLeave.tl_name}</p>
              <p><strong>Leave Type:</strong> {selectedLeave.leave_type} {selectedLeave.session && `(${selectedLeave.session})`}</p>
              <p><strong>From:</strong> {selectedLeave.from_date}</p>
              <p><strong>To:</strong> {selectedLeave.to_date}</p>
              <p><strong>Days:</strong> {selectedLeave.days}</p>
              <p><strong>Reason:</strong> {selectedLeave.reason}</p>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "10px" }}>
                <strong>Decision:</strong>
              </label>
              <div style={{ display: "flex", gap: "10px" }}>
                <label>
                  <input
                    type="radio"
                    value="Approved"
                    checked={approvalStatus === "Approved"}
                    onChange={(e) => {
                      setApprovalStatus(e.target.value);
                      setManagerReason("");
                    }}
                    disabled={loading}
                  />
                  ✅ Approve
                </label>
                <label>
                  <input
                    type="radio"
                    value="Denied"
                    checked={approvalStatus === "Denied"}
                    onChange={(e) => setApprovalStatus(e.target.value)}
                    disabled={loading}
                  />
                  ❌ Deny
                </label>
              </div>
            </div>

            {approvalStatus === "Denied" && (
              <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "block", marginBottom: "5px" }}>
                  <strong>Reason for Denial:</strong>
                </label>
                <textarea
                  placeholder="Enter reason for denial"
                  value={managerReason}
                  onChange={(e) => setManagerReason(e.target.value)}
                  disabled={loading}
                  style={{
                    width: "100%",
                    height: "80px",
                    padding: "10px",
                    border: "1px solid #ddd",
                    borderRadius: "5px",
                    fontFamily: "Arial"
                  }}
                />
              </div>
            )}

            <div className="modal-actions">
              <button
                onClick={() => setSelectedLeave(null)}
                disabled={loading}
                style={{ backgroundColor: "#6c757d" }}
              >
                Cancel
              </button>
              <button
                onClick={handleApproveTLLeave}
                disabled={loading || !approvalStatus}
                style={{
                  backgroundColor: approvalStatus === "Denied" ? "#dc3545" : "#28a745"
                }}
              >
                {loading
                  ? "Processing..."
                  : approvalStatus === "Denied"
                  ? "Deny"
                  : "Approve"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerLeaveApprovals;