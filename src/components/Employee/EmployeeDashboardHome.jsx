import React, { useEffect, useState } from "react";
import "./EmployeeDashboardHome.css";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend
} from "recharts";

import {
  FaProjectDiagram,
  FaCheckCircle,
  FaUserClock,
  FaUsers,
  FaTimes
} from "react-icons/fa";

// ✅ FIX 1: Use localhost instead of hardcoded LAN IP
const API_URL = "http://localhost:5000";

const EmployeeDashboardHome = () => {
  const [dashboardData, setDashboardData] = useState({
    name: "",
    totalEmployees: 0,
    activeProjects: 0,
    completedProjects: 0,
    onLeave: 0,
    attendanceStats: [
      { name: "Present", value: 0 },
      { name: "Leave", value: 0 }
    ]
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
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user || !user.id) return;

      try {
<<<<<<< HEAD
        // ✅ FIX 2: Use API_URL constant
        const response = await fetch(`${API_URL}/api/employee/stats/${user.id}`);
=======
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/employee/stats/${user.id}`);
>>>>>>> 8123286f8c8411ce164d7e89a3eaee37521f5a5d
        const data = await response.json();

        if (response.ok) {
          const total = data.totalEmployees || 0;
          const leave = data.onLeave || 0;
          const present = Math.max(0, total - leave);

          setDashboardData({
            name: data.name || user.name || "Employee",
            totalEmployees: total,
            activeProjects: data.activeProjects || 0,
            completedProjects: data.completedProjects || 0,
            onLeave: leave,
            attendanceStats: [
              { name: "Present", value: present },
              { name: "Leave", value: leave }
            ]
          });
        }
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
    const user = JSON.parse(localStorage.getItem("user"));
    const today = new Date().toISOString().split("T")[0];

<<<<<<< HEAD
    // ✅ FIX 3: Use API_URL constant — was hardcoded to LAN IP
    fetch(`${API_URL}/api/employee/leave-today?date=${today}&empId=${user.id}`)
=======
    fetch(`${process.env.REACT_APP_API_URL}/api/employee/leave-today?date=${today}&empId=${user.id}`)
>>>>>>> 8123286f8c8411ce164d7e89a3eaee37521f5a5d
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

        {/* GREETING */}
        <div className="greeting-card">
          <h2>{getGreeting()}, {dashboardData.name} 👋</h2>
          <p>Welcome to your Employee Dashboard</p>
        </div>

        {/* STATS - 4 CARDS */}
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

          <div 
            className="stat-card leave"
            onClick={handleLeaveCardClick}
            style={{ cursor: "pointer" }}
          >
            <div className="icon-box"><FaUserClock /></div>
            <div className="stat-info">
              <h4>On Leave</h4>
              <p>{dashboardData.onLeave}</p>
            </div>
          </div>
        </div>

        {/* ATTENDANCE CHART */}
        <div className="chart-card">
          <h3>Department Attendance Overview</h3>
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
                <Legend verticalAlign="bottom" height={36} />
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
                        <p className="emp-id">
                          {employee.employee_id ? `ID: ${employee.employee_id}` : "ID: N/A"}
                        </p>
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

export default EmployeeDashboardHome;