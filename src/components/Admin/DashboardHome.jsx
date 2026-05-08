import React, { useEffect, useState } from "react";
import "./DashboardHome.css";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend
} from "recharts";

import {
  FaUsers,
  FaBuilding,
  FaProjectDiagram,
  FaCheckCircle,
  FaUserClock,
  FaTimes
} from "react-icons/fa";

// ✅ FIX: Use localhost instead of hardcoded LAN IP
const API_URL = "http://localhost:5000";

const DashboardHome = () => {

  const [dashboardData, setDashboardData] = useState({
    adminName: "",
    totalEmployees: 0,
    departments: 0,
    activeProjects: 0,
    completedProjects: 0,
    present: 0,
    absent: 0,
    attendanceStats: []
  });

  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveEmployees, setLeaveEmployees] = useState([]);
  const [loadingLeave, setLoadingLeave] = useState(false);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning ☀️";
    if (hour < 18) return "Good Afternoon 🌤️";
    return "Good Evening 🌙";
  };

  useEffect(() => {
<<<<<<< HEAD
    // ✅ FIX: Use API_URL constant
    fetch(`${API_URL}/api/admin/stats`)
=======
    fetch(`${process.env.REACT_APP_API_URL}/api/admin/stats`)
>>>>>>> 8123286f8c8411ce164d7e89a3eaee37521f5a5d
      .then(res => res.json())
      .then(data => {
         setDashboardData(prevState => ({
           ...prevState,
           ...data,
           adminName: JSON.parse(localStorage.getItem("user"))?.name || "Admin"
         }));
      })
      .catch(err => console.error("Frontend fetch error:", err));
  }, []);

  const handleLeaveCardClick = () => {
    setShowLeaveModal(true);
    fetchLeaveEmployees();
  };

  const fetchLeaveEmployees = () => {
    setLoadingLeave(true);
    const today = new Date().toISOString().split('T')[0];
<<<<<<< HEAD

    // ✅ FIX: Use API_URL constant
    fetch(`${API_URL}/api/admin/leave-today?date=${today}`)
=======
    
    fetch(`${process.env.REACT_APP_API_URL}/api/admin/leave-today?date=${today}`)
>>>>>>> 8123286f8c8411ce164d7e89a3eaee37521f5a5d
      .then(res => res.json())
      .then(data => {
        console.log("Leave employees data:", data);
        // ✅ FIX: AdminController now returns { employees: [] } shape (was returning flat array)
        setLeaveEmployees(data.employees || []);
        setLoadingLeave(false);
      })
      .catch(err => {
        console.error("Error fetching leave employees:", err);
        setLoadingLeave(false);
      });
  };

  const closeLeaveModal = () => {
    setShowLeaveModal(false);
    setLeaveEmployees([]);
  };

  const COLORS = ["#22c55e", "#ef4444"];

  return (
    <div className="dashboard-home">

      <div className="dashboard-wrapper">

        {/* ===== GREETING ===== */}
        <div className="greeting-card">
          <h2>{getGreeting()}, {dashboardData.adminName} 👋</h2>
          <p>Welcome back to your HRMS dashboard</p>
        </div>

        {/* ===== STATS ===== */}
        <div className="stats-container">

          <div className="stat-card employees">
            <div className="icon-box"><FaUsers /></div>
            <div className="stat-info">
              <h4>Total Employees</h4>
              <p>{dashboardData.totalEmployees}</p>
            </div>
          </div>

          <div className="stat-card departments">
            <div className="icon-box"><FaBuilding /></div>
            <div className="stat-info">
              <h4>Departments</h4>
              <p>{dashboardData.departments}</p>
            </div>
          </div>

          <div className="stat-card active">
            <div className="icon-box"><FaProjectDiagram /></div>
            <div className="stat-info">
              <h4>Active Projects</h4>
              <p>{dashboardData.activeProjects}</p>
            </div>
          </div>

          <div className="stat-card completed">
            <div className="icon-box"><FaCheckCircle /></div>
            <div className="stat-info">
              <h4>Completed Projects</h4>
              <p>{dashboardData.completedProjects}</p>
            </div>
          </div>

          <div 
            className="stat-card leave"
            onClick={handleLeaveCardClick}
            style={{ cursor: 'pointer' }}
          >
            <div className="icon-box"><FaUserClock /></div>
            <div className="stat-info">
              <h4>On Leave</h4>
              <p>{dashboardData.absent}</p>
            </div>
          </div>

        </div>

        {/* ===== CHART ===== */}
        <div className="chart-card">
          <h3>Attendance Overview</h3>

          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={dashboardData.attendanceStats}
                cx="50%"
                cy="50%"
                outerRadius={90}
                dataKey="value"
                label
              >
                {dashboardData.attendanceStats.map((entry, index) => (
                  <Cell key={index} fill={COLORS[index]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>

        </div>

      </div>

      {/* ===== LEAVE MODAL ===== */}
      {showLeaveModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Employees On Leave Today</h2>
              <button 
                className="close-btn"
                onClick={closeLeaveModal}
              >
                <FaTimes />
              </button>
            </div>

            <div className="modal-body">
              {loadingLeave ? (
                <p className="loading-text">Loading...</p>
              ) : leaveEmployees.length > 0 ? (
                <div className="leave-list">
                  {leaveEmployees.map((employee, index) => (
                    <div key={employee.id} className="leave-item">
                      <div className="leave-item-number">{index + 1}</div>
                      <div className="leave-item-info">
                        <h4>{employee.name}</h4>
                        <p className="emp-id">{employee.employee_id ? `ID: ${employee.employee_id}` : "ID: N/A"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-leave-text">No employees on leave today</p>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DashboardHome;