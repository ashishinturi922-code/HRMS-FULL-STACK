import React, { useEffect, useState } from "react";
import "../styles/BCompanyPortal.css";

// ============================================
// INTERFACES
// ============================================
interface Timesheet {
  id: number;
  employeeName: string;
  companyName: string;
  project: string;
  task: string;
  hours: string;
  date: string;
  status: "Pending" | "Approved" | "Invoice Generated";
}

interface EmployeeData {
  id: string;
  name: string;
  profileType: "Basic" | "Premium";
  payStructure: "Standard" | "Revised";
  leaveBalance: number;
  otherComponents: string;
}

interface LeaveRequest {
  id: number;
  employeeName: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
}

const BCompanyPortal = () => {
  const [activeTab, setActiveTab] = useState("timesheets");

  // DATA STATES
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [employees, setEmployees] = useState<EmployeeData[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);

  // CONSTANTS
  const COMPANY_NAME = "Samsung"; 
  const MANAGER_NAME = "Samsung HR Admin";
  const TIMESHEET_STORAGE_KEY = "sap_timesheets_v2"; 

  // ============================================
  // LOAD FULL DUMMY DATA FOR PROTOTYPE
  // ============================================
  useEffect(() => {
    // 1. Team Profiles
    const mockEmployees: EmployeeData[] = [
      { id: "ACS-S-001", name: "Ashish", profileType: "Premium", payStructure: "Revised", leaveBalance: 12, otherComponents: "Medical Allowance" },
      { id: "ACS-S-002", name: "Poorna", profileType: "Basic", payStructure: "Standard", leaveBalance: 8, otherComponents: "N/A" },
      { id: "ACS-S-003", name: "Ravi", profileType: "Basic", payStructure: "Standard", leaveBalance: 15, otherComponents: "Travel Bonus" },
      { id: "ACS-S-004", name: "Veera", profileType: "Premium", payStructure: "Revised", leaveBalance: 5, otherComponents: "Shift Allowance" },
      { id: "ACS-S-005", name: "Karthik", profileType: "Basic", payStructure: "Standard", leaveBalance: 20, otherComponents: "N/A" },
    ];
    setEmployees(mockEmployees);

    // 2. Timesheets
    const mockTimesheets: Timesheet[] = [
      { id: 101, employeeName: "Ashish", companyName: COMPANY_NAME, project: "AI Integration", task: "Model Training", hours: "45", date: "2026-05-10", status: "Invoice Generated" },
      { id: 102, employeeName: "Poorna", companyName: COMPANY_NAME, project: "Cloud Migration", task: "S3 Setup", hours: "40", date: "2026-05-10", status: "Approved" },
      { id: 103, employeeName: "Ravi", companyName: COMPANY_NAME, project: "Security Audit", task: "Code Review", hours: "38", date: "2026-05-11", status: "Pending" },
      { id: 104, employeeName: "Veera", companyName: COMPANY_NAME, project: "UI/UX Design", task: "Figma Export", hours: "42", date: "2026-05-11", status: "Pending" },
      { id: 105, employeeName: "Karthik", companyName: COMPANY_NAME, project: "DB Tune", task: "Indexing", hours: "40", date: "2026-05-11", status: "Pending" },
    ];
    setTimesheets(mockTimesheets);

    // 3. Leave Requests
    const mockLeaves: LeaveRequest[] = [
      { id: 201, employeeName: "Poorna", startDate: "2026-05-15", endDate: "2026-05-16", reason: "Personal Work", status: "Pending" },
      { id: 202, employeeName: "Ravi", startDate: "2026-05-20", endDate: "2026-05-22", reason: "Vacation", status: "Approved" },
      { id: 203, employeeName: "Ashish", startDate: "2026-04-10", endDate: "2026-04-11", reason: "Sick Leave", status: "Rejected" },
    ];
    setLeaves(mockLeaves);
  }, []);

  // ============================================
  // ACTIONS
  // ============================================
  const handleApproveTimesheet = (id: number) => {
    const updated = timesheets.map(ts => ts.id === id ? { ...ts, status: "Approved" as const } : ts);
    setTimesheets(updated);
    alert("Timesheet Approved! It will now show in Payroll.");
  };

  const handleLeaveAction = (id: number, action: "Approved" | "Rejected") => {
    if(!window.confirm(`Are you sure you want to ${action} this leave request?`)) return;
    const updated = leaves.map(l => l.id === id ? { ...l, status: action } : l);
    setLeaves(updated);
  };

  const calculatePayroll = (employeeName: string, hours: string) => {
    const emp = employees.find(e => e.name === employeeName);
    const hourlyRate = emp?.payStructure === "Revised" ? 80 : 50; 
    return (parseInt(hours) * hourlyRate).toLocaleString();
  };

  const handleLogout = () => {
    window.location.href = "/";
  };

  // Filtered Logic for Tabs
  const invoicedOnly = timesheets.filter(ts => ts.status === "Invoice Generated");
  const payrollReady = timesheets.filter(ts => ts.status === "Approved" || ts.status === "Invoice Generated");

  // ... (Keep all your imports, interfaces, and logic the same)

    return (
      <div className="scp-dashboard-wrapper">
        <div className="scp-topbar">
          <div className="scp-topbar-left">
            <h1 className="scp-logo">{COMPANY_NAME}</h1>
          </div>
          <div className="scp-topbar-center">
            <div className={`scp-nav-link ${activeTab === "timesheets" ? "scp-active" : ""}`} onClick={() => setActiveTab("timesheets")}>Approvals</div>
            <div className={`scp-nav-link ${activeTab === "leaves" ? "scp-active" : ""}`} onClick={() => setActiveTab("leaves")}>Leaves</div>
            <div className={`scp-nav-link ${activeTab === "profiles" ? "scp-active" : ""}`} onClick={() => setActiveTab("profiles")}>Team</div>
            <div className={`scp-nav-link ${activeTab === "payroll" ? "scp-active" : ""}`} onClick={() => setActiveTab("payroll")}>Payroll</div>
            <div className={`scp-nav-link ${activeTab === "invoices" ? "scp-active" : ""}`} onClick={() => setActiveTab("invoices")}>Invoices</div>
          </div>
          <div className="scp-topbar-right">
            <div className="scp-profile-box">
              <span className="scp-manager-name">{MANAGER_NAME}</span>
              <button className="scp-logout-btn" onClick={handleLogout}>Logout</button>
            </div>
          </div>
        </div>

        <div className="scp-content-area">
          {/* 1. TIMESHEET APPROVALS */}
          {activeTab === "timesheets" && (
            <div className="scp-glass-card">
              <h2 className="scp-card-title">Timesheet Approvals</h2>
              <table className="scp-table">
                <thead>
                  <tr><th>Employee</th><th>Date</th><th>Project</th><th>Hours</th><th>Status</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {timesheets.map(ts => (
                    <tr key={ts.id}>
                      <td><strong>{ts.employeeName}</strong></td><td>{ts.date}</td><td>{ts.project}</td><td>{ts.hours}h</td>
                      <td><span className={`scp-badge scp-badge-${ts.status.toLowerCase().replace(/\s+/g, "-")}`}>{ts.status}</span></td>
                      <td>{ts.status === "Pending" ? <button className="scp-btn-approve" onClick={() => handleApproveTimesheet(ts.id)}>Approve</button> : <span className="scp-done-icon">✓</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 2. LEAVE REQUESTS */}
          {activeTab === "leaves" && (
            <div className="scp-glass-card">
              <h2 className="scp-card-title">Team Leave Requests</h2>
              <table className="scp-table">
                <thead>
                  <tr><th>Employee</th><th>Dates</th><th>Reason</th><th>Status</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {leaves.map((l) => (
                    <tr key={l.id}>
                      <td><strong>{l.employeeName}</strong></td>
                      <td>{l.startDate} to {l.endDate}</td>
                      <td>{l.reason}</td>
                      <td><span className={`scp-badge scp-badge-${l.status.toLowerCase()}`}>{l.status}</span></td>
                      <td>
                        {l.status === "Pending" ? (
                          <div className="scp-action-group">
                            <button className="scp-btn-circle scp-btn-yes" onClick={() => handleLeaveAction(l.id, "Approved")}>✓</button>
                            <button className="scp-btn-circle scp-btn-no" onClick={() => handleLeaveAction(l.id, "Rejected")}>✕</button>
                          </div>
                        ) : <span className="scp-resolved-text">Resolved</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 3. PAYROLL */}
          {activeTab === "payroll" && (
            <div className="scp-glass-card">
              <h2 className="scp-card-title">Vendor Payroll Calculation</h2>
              <table className="scp-table">
                <thead>
                  <tr><th>Employee</th><th>Type</th><th>Hours</th><th>Total Payout</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {payrollReady.map(item => (
                    <tr key={item.id}>
                      <td><strong>{item.employeeName}</strong></td><td>{employees.find(e => e.name === item.employeeName)?.payStructure}</td>
                      <td>{item.hours} hrs</td><td className="scp-amount-text">${calculatePayroll(item.employeeName, item.hours)}</td>
                      <td><span className="scp-badge scp-badge-approved">Ready</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 4. INVOICES */}
          {activeTab === "invoices" && (
            <div className="scp-glass-card">
              <h2 className="scp-card-title">Billed Invoices</h2>
              <table className="scp-table">
                <thead>
                  <tr><th>Invoice ID</th><th>Resource</th><th>Hours</th><th>Billable Project</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {invoicedOnly.map(inv => (
                    <tr key={inv.id}>
                      <td><strong>#INV-00{inv.id}</strong></td><td>{inv.employeeName}</td><td>{inv.hours} hrs</td><td>{inv.project}</td>
                      <td><span className="scp-badge scp-badge-invoice-generated">Payment Due</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 5. TEAM DIRECTORY */}
          {activeTab === "profiles" && (
            <div className="scp-glass-card">
              <h2 className="scp-card-title">Team Directory</h2>
              <table className="scp-table">
                <thead>
                  <tr><th>ID</th><th>Name</th><th>Profile</th><th>Structure</th><th>Balance</th></tr>
                </thead>
                <tbody>
                  {employees.map(emp => (
                    <tr key={emp.id}>
                      <td>{emp.id}</td><td><strong>{emp.name}</strong></td><td>{emp.profileType}</td><td>{emp.payStructure}</td><td>{emp.leaveBalance}d</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  export default BCompanyPortal;