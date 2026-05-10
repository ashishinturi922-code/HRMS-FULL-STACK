import React, { useEffect, useState } from "react";
import "./TeamLeaderDashboardHome.css";
import API_URL from "../../apiConfig"; // ✅ FIX: Imported the working API config
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

const DashboardHome = () => {
  const [dashboardData, setDashboardData] = useState({
    name: "",
    totalEmployees: 0,
    activeProjects: 0,
    completedProjects: 0,
    pendingTimesheets: 0,
    onLeaveCount: 0,
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
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user || !user.id) return;

      try {
        // ✅ FIX: Replaced broken env variable with API_URL
        const response = await fetch(`${API_URL}/api/teamleader/stats/${user.id}`);
        const data = await response.json();

        if (response.ok) {
          const total = data.totalEmployees || 0;
          const leave = data.onLeaveCount || 0;
          const present = Math.max(0, total - leave);

          setDashboardData({
            name: user.name || "Team Leader",
            totalEmployees: total,
            activeProjects: data.activeProjects || 0,
            completedProjects: data.completedProjects || 0,
            pendingTimesheets: data.pendingTimesheets || 0,
            onLeaveCount: leave,
            attendanceStats: data.attendanceStats || [
              { name: "Present", value: present },
              { name: "On Leave", value: leave }
            ]
          });
        }
      } catch (error) {
        console.error("Data Fetch Error:", error);
      }
    };

    fetchDashboardData();
  }, []);

  const handleLeaveCardClick = () => {
    setShowLeaveModal(true);
    fetchLeaveEmployees();
  };

  const fetchLeaveEmployees = () => {
    setLoadingLeave(true);
    const user = JSON.parse(localStorage.getItem("user"));
    
    // ✅ FIX: Construct local date to prevent the UTC timezone shift bug
    const todayObj = new Date();
    const today = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;
    
    // ✅ FIX: Replaced broken env variable with API_URL
    fetch(`${API_URL}/api/teamleader/leave-today?date=${today}&tlId=${user.id}`)
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
          <p>Here's your team overview</p>
        </div>

        {/* STATS */}
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

          <div className="stat-card departments">
            <div className="icon-box"><FaClock /></div>
            <div className="stat-info">
              <h4>TimeSheet Approvals</h4>
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
              <p>{dashboardData.onLeaveCount}</p>
            </div>
          </div>

        </div>

        {/* CHART */}
        <div className="chart-card">
          <h3>Team Attendance Overview</h3>

          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={dashboardData.attendanceStats}
                cx="50%"
                cy="50%"
                outerRadius={90}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {dashboardData.attendanceStats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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