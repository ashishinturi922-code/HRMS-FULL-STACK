import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import API_URL from "../../apiConfig";
import "./ManagerLeaveApprovals.css";

const ManagerLeaveApprovals = () => {
  const currentUser = JSON.parse(localStorage.getItem("user")) || { id: 1, role: "Manager" };

  const [leaves, setLeaves] = useState([]);
  const [tlLeaves, setTlLeaves] = useState([]);
  const [empWfh, setEmpWfh] = useState([]);
  const [tlWfh, setTlWfh] = useState([]);
  const [activeTab, setActiveTab] = useState("employee_leave"); 
  const [loading, setLoading] = useState(false);

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      const [empLeaveRes, tlLeaveRes, empWfhRes, tlWfhRes] = await Promise.all([
        axios.get(`${API_URL}/api/manager/pending-approvals`),
        axios.get(`${API_URL}/api/tl-leave/requests/${currentUser.id}`),
        axios.get(`${API_URL}/api/manager/wfh/pending-employees/${currentUser.id}`),
        axios.get(`${API_URL}/api/tl-wfh/pending/${currentUser.id}`)
      ]);

      const filteredLeaves = empLeaveRes.data.filter(l =>
        l.role === "Employee" || (l.role === "TeamLeader" && l.status === "Pending")
      );

      setLeaves(filteredLeaves);
      setTlLeaves(tlLeaveRes.data);
      setEmpWfh(empWfhRes.data);
      setTlWfh(tlWfhRes.data);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }, [currentUser.id]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleAction = async (id, type, status) => {
    try {
      setLoading(true);
      if (type === 'emp_leave') {
        await axios.put(`${API_URL}/api/manager/approve-leave/${id}`, { status });
      } else if (type === 'tl_leave') {
        await axios.put(`${API_URL}/api/tl-leave/approve/${id}`, { status });
      } else if (type === 'emp_wfh') {
        await axios.put(`${API_URL}/api/manager/wfh/approve/${id}`, { status });
      } else if (type === 'tl_wfh') {
        await axios.put(`${API_URL}/api/tl-wfh/approve/${id}`, { status });
      }
      alert(`Request ${status} ✅`);
      fetchAllData();
    } catch (err) {
      alert("Failed to process request");
    } finally {
      setLoading(false);
    }
  };

  const getTabStyle = (tabName) => ({
    padding: "10px 20px",
    backgroundColor: activeTab === tabName ? "#007bff" : "#f0f0f0",
    color: activeTab === tabName ? "white" : "black",
    border: "none",
    cursor: "pointer",
    marginRight: "5px",
    borderRadius: "5px 5px 0 0"
  });

  return (
    <div className="page-container">
      <h2>Manager Approvals</h2>

      <div style={{ marginBottom: "20px", borderBottom: "2px solid #ddd", display: "flex" }}>
        <button onClick={() => setActiveTab("employee_leave")} style={getTabStyle("employee_leave")}>Emp Leaves ({leaves.length})</button>
        <button onClick={() => setActiveTab("tl_leave")} style={getTabStyle("tl_leave")}>TL Leaves ({tlLeaves.length})</button>
        <button onClick={() => setActiveTab("employee_wfh")} style={getTabStyle("employee_wfh")}>Emp WFH ({empWfh.length})</button>
        <button onClick={() => setActiveTab("tl_wfh")} style={getTabStyle("tl_wfh")}>TL WFH ({tlWfh.length})</button>
      </div>

      <table className="approval-table">
        <thead>
          <tr>
            <th>Name</th>
            {(activeTab === "employee_leave" || activeTab === "tl_leave") && <th>Type</th>}
            <th>Dates</th>
            <th>Days</th>
            <th>Reason</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {/* EMP LEAVES */}
          {activeTab === "employee_leave" && leaves.map((l) => (
            <tr key={l.id}>
              <td>{l.name}</td>
              <td>{l.leave_type}</td>
              <td>{new Date(l.from_date).toLocaleDateString()} → {new Date(l.to_date).toLocaleDateString()}</td>
              <td>{l.days}</td>
              <td>{l.reason}</td>
              <td>
                <button className="approve-btn" onClick={() => handleAction(l.id, 'emp_leave', 'Approved')} disabled={loading}>Approve</button>
                <button className="reject-btn" onClick={() => handleAction(l.id, 'emp_leave', 'Rejected')} disabled={loading}>Reject</button>
              </td>
            </tr>
          ))}

          {/* TL LEAVES */}
          {activeTab === "tl_leave" && tlLeaves.map((l) => (
            <tr key={l.id}>
              <td>{l.tl_name}</td>
              <td>{l.leave_type}</td>
              <td>{new Date(l.from_date).toLocaleDateString()} → {new Date(l.to_date).toLocaleDateString()}</td>
              <td>{l.days}</td>
              <td>{l.reason}</td>
              <td>
                <button className="approve-btn" onClick={() => handleAction(l.id, 'tl_leave', 'Approved')} disabled={loading}>Approve</button>
                <button className="reject-btn" onClick={() => handleAction(l.id, 'tl_leave', 'Denied')} disabled={loading}>Reject</button>
              </td>
            </tr>
          ))}

          {/* EMP WFH */}
          {activeTab === "employee_wfh" && empWfh.map((w) => (
            <tr key={w.id}>
              <td>{w.employee_name} <br/><small>(TL Approved)</small></td>
              <td>{new Date(w.from_date).toLocaleDateString()} → {new Date(w.to_date).toLocaleDateString()}</td>
              <td>{w.days}</td>
              <td>{w.reason}</td>
              <td>
                <button className="approve-btn" onClick={() => handleAction(w.id, 'emp_wfh', 'Approved')} disabled={loading}>Approve</button>
                <button className="reject-btn" onClick={() => handleAction(w.id, 'emp_wfh', 'Denied')} disabled={loading}>Reject</button>
              </td>
            </tr>
          ))}

          {/* TL WFH */}
          {activeTab === "tl_wfh" && tlWfh.map((w) => (
            <tr key={w.id}>
              <td>{w.tl_name}</td>
              <td>{new Date(w.from_date).toLocaleDateString()} → {new Date(w.to_date).toLocaleDateString()}</td>
              <td>{w.days}</td>
              <td>{w.reason}</td>
              <td>
                <button className="approve-btn" onClick={() => handleAction(w.id, 'tl_wfh', 'Approved')} disabled={loading}>Approve</button>
                <button className="reject-btn" onClick={() => handleAction(w.id, 'tl_wfh', 'Denied')} disabled={loading}>Reject</button>
              </td>
            </tr>
          ))}

          {/* EMPTY STATES */}
          {activeTab === "employee_leave" && leaves.length === 0 && <tr><td colSpan="6" style={{textAlign:"center"}}>No pending Employee leaves</td></tr>}
          {activeTab === "tl_leave" && tlLeaves.length === 0 && <tr><td colSpan="6" style={{textAlign:"center"}}>No pending TL leaves</td></tr>}
          {activeTab === "employee_wfh" && empWfh.length === 0 && <tr><td colSpan="5" style={{textAlign:"center"}}>No pending Employee WFH</td></tr>}
          {activeTab === "tl_wfh" && tlWfh.length === 0 && <tr><td colSpan="5" style={{textAlign:"center"}}>No pending TL WFH</td></tr>}
        </tbody>
      </table>
    </div>
  );
};

export default ManagerLeaveApprovals;