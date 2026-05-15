import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom"; // ✅ Import useNavigate
import "../styles/AdminDashboard.css";

// ============================================
// INTERFACES (Keep existing interfaces...)
// ============================================
interface Timesheet {
  id: number;
  employeeName: string;
  companyName: string;
  project: string;
  hours: string;
  date: string;
  status: "Pending" | "Approved" | "Invoice Generated";
}

interface EmployeeData {
  id: string;
  name: string;
  profileType: "Basic" | "Premium";
  payStructure: "Standard" | "Revised";
  revisedPay: string;      
  leaveBalance: number;
  contractStatus: string;  
  annexure: string;        
  otherComponents: string;
  isActive: boolean;
}

const AdminDashboard = () => {
  const navigate = useNavigate(); // ✅ Initialize navigate
  const [activeTab, setActiveTab] = useState("customerData");
  const [showModal, setShowModal] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<EmployeeData | null>(null);
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [employees, setEmployees] = useState<EmployeeData[]>([]);

  const STORAGE_KEY = "sap_timesheets_v2"; 

  useEffect(() => {
    // Check if user is logged in, otherwise redirect
    const user = localStorage.getItem("loggedInUser");
    if (!user) {
      navigate("/");
    }

    const mockEmployees: EmployeeData[] = [
      { id: "ACS1001", name: "Ashish", profileType: "Premium", payStructure: "Revised", revisedPay: "$3,500", leaveBalance: 12, contractStatus: "Active", annexure: "Signed", otherComponents: "Medical Allowance", isActive: true },
      { id: "ACS1002", name: "Poorna", profileType: "Basic", payStructure: "Standard", revisedPay: "$2,200", leaveBalance: 8, contractStatus: "Active", annexure: "Signed", otherComponents: "N/A", isActive: true },
      { id: "ACS1003", name: "Ravi", profileType: "Basic", payStructure: "Standard", revisedPay: "$2,200", leaveBalance: 15, contractStatus: "Expired", annexure: "Pending Renewal", otherComponents: "N/A", isActive: false },
      { id: "ACS1004", name: "Veera", profileType: "Premium", payStructure: "Revised", revisedPay: "$4,000", leaveBalance: 5, contractStatus: "Active", annexure: "Signed", otherComponents: "Shift Bonus", isActive: true },
      { id: "ACS1005", name: "Karthik", profileType: "Basic", payStructure: "Standard", revisedPay: "$2,500", leaveBalance: 20, contractStatus: "Active", annexure: "Signed", otherComponents: "Travel Allowance", isActive: true },
    ];
    setEmployees(mockEmployees);

    const mockTimesheets: Timesheet[] = [
      { id: 501, employeeName: "Ashish", companyName: "Samsung", project: "AI Integration", hours: "45", date: "2026-05-01", status: "Invoice Generated" },
      { id: 502, employeeName: "Poorna", companyName: "Samsung", project: "Cloud Migration", hours: "40", date: "2026-05-02", status: "Invoice Generated" },
      { id: 503, employeeName: "Veera", companyName: "Samsung", project: "UI/UX Design", hours: "38", date: "2026-05-03", status: "Invoice Generated" },
      { id: 504, employeeName: "Karthik", companyName: "Samsung", project: "Database Optimization", hours: "40", date: "2026-05-04", status: "Approved" },
      { id: 505, employeeName: "Ravi", companyName: "Samsung", project: "Security Audit", hours: "10", date: "2026-04-28", status: "Pending" },
    ];
    
    const storedTimesheets = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    setTimesheets(storedTimesheets || mockTimesheets);
  }, [navigate]);

  // ✅ LOGOUT FUNCTION
  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("loggedInUser");
      navigate("/");
    }
  };

  const stats = {
    active: employees.filter(e => e.isActive).length,
    inactive: employees.filter(e => !e.isActive).length,
    total: employees.length
  };

  const openEmployeeProfile = (name: string) => {
    const emp = employees.find(e => e.name === name);
    if (emp) {
      setSelectedEmp(emp);
      setShowModal(true);
    }
  };

  const invoicedOnly = timesheets.filter(item => item.status === "Invoice Generated");

  return (
    <div className="admin-dashboard">
      <div className="topbar">
        <div className="logo">TASC Workforce Portal</div>
        
        <div className="topbar-center">
          <div className="topbar-tabs">
            <button className={activeTab === "customerData" ? "active" : ""} onClick={() => setActiveTab("customerData")}>Employee Directory</button>
            <button className={activeTab === "timesheets" ? "active" : ""} onClick={() => setActiveTab("timesheets")}>All Timesheets</button>
            <button className={activeTab === "invoices" ? "active" : ""} onClick={() => setActiveTab("invoices")}>Invoices</button>
          </div>
        </div>

        {/* ✅ NEW: LOGOUT SECTION */}
        <div className="topbar-right">
          <div className="admin-profile">
            <div className="admin-avatar">AD</div>
            <span className="admin-name">Admin</span>
            <button className="logout-button" onClick={handleLogout} title="Logout">
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* ... (Rest of the tabs code remains exactly the same) ... */}
      {activeTab === "customerData" && (
        <div className="content-wrapper">
          <div className="stats-container">
            <div className="stat-card">
              <span className="stat-label">Active Employees</span>
              <span className="stat-value active-color">{stats.active}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Inactive Employees</span>
              <span className="stat-value inactive-color">{stats.inactive}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Current Total</span>
              <span className="stat-value">{stats.total}</span>
            </div>
          </div>

          <div className="glass-box">
            <h2>Client : Samsung</h2>
            <p className="subtitle">Select an employee name below to view full profiles.</p>
            <table>
              <thead>
                <tr>
                  <th>Full Name</th>
                  <th>Profile Level</th>
                  <th>Employee ID</th>
                  <th>Work Status</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id}>
                    <td className="clickable-name" onClick={() => openEmployeeProfile(emp.name)}>
                      <strong>{emp.name}</strong>
                    </td>
                    <td>{emp.profileType}</td>
                    <td>{emp.id}</td>
                    <td>
                      <span className={`status-badge ${emp.isActive ? "approved" : "standard"}`}>
                        {emp.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "timesheets" && (
        <div className="glass-box">
          <h2>Timesheet Overview</h2>
          <table>
            <thead>
              <tr><th>Employee</th><th>Project</th><th>Hours</th><th>Status</th></tr>
            </thead>
            <tbody>
              {timesheets.map((item) => (
                <tr key={item.id}>
                  <td>{item.employeeName}</td><td>{item.project}</td><td>{item.hours}</td>
                  <td><span className={`status-badge ${item.status.toLowerCase().replace(/\s+/g, "-")}`}>{item.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "invoices" && (
        <div className="glass-box">
          <h2>Processed Invoices</h2>
          <p className="subtitle">Official billed records for the current billing cycle.</p>
          <table>
            <thead>
              <tr>
                <th>Invoice ID</th>
                <th>Employee</th>
                <th>Project</th>
                <th>Billable Hours</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {invoicedOnly.length > 0 ? (
                invoicedOnly.map((item) => (
                  <tr key={item.id}>
                    <td><strong>#INV-{item.id}</strong></td>
                    <td>{item.employeeName}</td>
                    <td>{item.project}</td>
                    <td>{item.hours} hrs</td>
                    <td>
                      <button className="btn-view" onClick={() => openEmployeeProfile(item.employeeName)}>
                        View Profile
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5} style={{textAlign: "center", padding: "20px"}}>No generated invoices found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && selectedEmp && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Employee Profile: {selectedEmp.name}</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="info-grid">
                <div className="info-item"><label>Employee ID:</label> <span>{selectedEmp.id}</span></div>
                <div className="info-item"><label>Pay Structure:</label> <span>{selectedEmp.payStructure}</span></div>
                <div className="info-item"><label>Revised Pay:</label> <span className="highlight-text">{selectedEmp.revisedPay}</span></div>
                <div className="info-item"><label>Leave Balance:</label> <span>{selectedEmp.leaveBalance} Days</span></div>
                <div className="info-item"><label>Contract/Agreement:</label> <span className="status-badge standard">{selectedEmp.contractStatus}</span></div>
                <div className="info-item"><label>Annexure Details:</label> <span>{selectedEmp.annexure}</span></div>
                <div className="info-item"><label>Other Benefits:</label> <span>{selectedEmp.otherComponents}</span></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-close-modal" onClick={() => setShowModal(false)}>Close Window</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;