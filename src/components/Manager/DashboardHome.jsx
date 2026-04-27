import React, { useEffect, useState } from "react";
import "./DashboardHome.css";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend
} from "recharts";

import {
  FaUsers,
  FaProjectDiagram,
  FaCheckCircle,
  FaUserClock,
  FaClock,
  FaTimes
} from "react-icons/fa";

const ManagerDashboardHome = () => {

  const [dashboardData, setDashboardData] = useState({
    managerName: "",
    totalEmployees: 0,
    activeProjects: 0,
    completedProjects: 0,
    present: 0,
    onLeave: 0,
    pendingTimesheets: 0,
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
    const fetchDashboardData = async () => {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      if (!storedUser || !storedUser.id) return;

      try {
        const response = await fetch(`http://192.168.0.165:5000/api/manager/stats/${storedUser.id}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const stats = await response.json();
        
        console.log("Dashboard stats received:", stats);

        setDashboardData({
          managerName: storedUser.name || "Manager",
          totalEmployees: stats.totalEmployees || 0,  // ✅ All org employees
          activeProjects: stats.activeProjects || 0,
          completedProjects: stats.completedProjects || 0,
          pendingTimesheets: stats.pendingTimesheets || 0,
          present: stats.presentEmployees || 0,
          onLeave: stats.onLeave || 0,
          attendanceStats: stats.attendanceStats || []
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      }
    };

    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLeaveCardClick = () => {
    setShowLeaveModal(true);
    fetchLeaveEmployees();
  };

  const fetchLeaveEmployees = () => {
    setLoadingLeave(true);
    const storedUser = JSON.parse(localStorage.getItem("user"));
    const today = new Date().toISOString().split('T')[0];
    
    fetch(`http://192.168.0.165:5000/api/manager/leave-today?date=${today}&managerId=${storedUser.id}`)
      .then(res => res.json())
      .then(data => {
        console.log("Leave employees data:", data);
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
        <div className="greeting-card">
          <h2>{getGreeting()}, {dashboardData.managerName} 👋</h2>
          <p>Welcome back to your Manager Dashboard</p>
        </div>

        <div className="stats-container">
          <div className="stat-card employees">
            <div className="icon-box"><FaUsers /></div>
            <div className="stat-info">
              <h4>Total Employees</h4>
              <p>{dashboardData.totalEmployees}</p>
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

          <div className="stat-card timesheet">
            <div className="icon-box"><FaClock /></div>
            <div className="stat-info">
              <h4>Timesheet Approvals</h4>
              <p>{dashboardData.pendingTimesheets}</p>
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
              <p>{dashboardData.onLeave}</p>
            </div>
          </div>
        </div>

        <div className="chart-card">
          <h3>Attendance Overview</h3>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={dashboardData.attendanceStats}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {dashboardData.attendanceStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Legend verticalAlign="bottom" height={36}/>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
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

export default ManagerDashboardHome;