import React, { useState, useEffect } from "react";
import "./Leaveapprovals.css"; 

const AdminLeaveApproval = () => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ Fetch and filter leaves for Managers only
  const fetchManagerLeavesForAdmin = async () => {
    try {
      // Accessing the shared API endpoint
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/admin/all-leaves`);
      const data = await response.json();
      
      // ✅ Filter: Only include requests where the role is 'manager'
      const onlyManagers = data.filter(
        (req) => req.employeeRole?.toLowerCase() === "manager"
      );
      
      setLeaveRequests(onlyManagers);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching leave requests:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManagerLeavesForAdmin();
  }, []);

  // ✅ Admin Action logic specifically for Manager requests
  const handleAction = async (leaveId, status) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/admin/update-leave/${leaveId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        alert(`Manager leave request ${status}!`);
        fetchManagerLeavesForAdmin(); // Refresh the filtered table
      }
    } catch (error) {
      alert("Error updating status");
    }
  };

  if (loading) return <div className="loading">Loading Manager Requests...</div>;

  return (
    <div className="admin-approval-container">
      <h2>Manager Leave Approval Portal</h2>
      
      <table className="approval-table">
        <thead>
          <tr>
            <th>Manager Name</th>
            <th>Leave Type</th>
            <th>Dates</th>
            <th>Days</th>
            <th>Reason</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {leaveRequests.length === 0 ? (
            <tr><td colSpan="7">No pending manager requests found.</td></tr>
          ) : (
            leaveRequests.map((req) => (
              <tr key={req.id}>
                <td><strong>{req.employeeName}</strong></td>
                <td>{req.leave_type}</td>
                <td>{req.from_date} to {req.to_date}</td>
                <td>{req.days}</td>
                <td className="reason-cell">{req.reason}</td>
                <td className={`status-${req.status.toLowerCase()}`}>{req.status}</td>
                <td>
                  {req.status === "Pending" ? (
                    <div className="btn-group">
                      <button className="approve-btn" onClick={() => handleAction(req.id, "Approved")}>Approve</button>
                      <button className="reject-btn" onClick={() => handleAction(req.id, "Rejected")}>Reject</button>
                    </div>
                  ) : (
                    <span className="processed">Processed</span>
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

export default AdminLeaveApproval;