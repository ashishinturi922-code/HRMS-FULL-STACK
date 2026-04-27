import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import Login from "./components/Login";
import AdminDashboard from "./components/Admin/AdminDashboard";
import ManagerDashboard from "./components/Manager/ManagerDashboard";
import TeamLeaderDashboard from "./components/TeamLeader/TeamLeaderDashboard";
import EmployeeDashboard from "./components/Employee/EmployeeDashboard";

function App() {
  // ✅ The authState key forces a full re-evaluation of the logic below
  const [authState, setAuthState] = useState(Date.now());

  // ✅ These are now "Live" variables that update whenever authState changes
  const userData = localStorage.getItem("user");
  const isLoggedIn = !!userData;
  
  const getNormalizedRole = () => {
    if (!userData) return null;
    try {
      const user = JSON.parse(userData);
      // Maps "Team Leader" -> "teamleader", "Admin" -> "admin"
      return user.role ? user.role.toLowerCase().replace(/\s+/g, "") : null;
    } catch (e) {
      return null;
    }
  };

  const currentRole = getNormalizedRole();

  useEffect(() => {
    const handleAuthChange = () => {
      setAuthState(Date.now()); 
    };

    window.addEventListener("storage", handleAuthChange);
    window.addEventListener("authUpdate", handleAuthChange); 

    return () => {
      window.removeEventListener("storage", handleAuthChange);
      window.removeEventListener("authUpdate", handleAuthChange);
    };
  }, []);

  const handleLogout = () => {
   localStorage.removeItem("user"); // ✅ This only logs the user out
    setAuthState(Date.now());
    // Use replace to prevent back-button loops
    window.location.replace("/");
  };

  // Helper component to protect routes
  const ProtectedRoute = ({ children, allowedRole }) => {
    if (!isLoggedIn) {
      return <Navigate to="/" replace />;
    }
    
    if (currentRole !== allowedRole) {
      // ✅ Safety check: If role is missing, go to login, else go to their specific home
      return currentRole ? <Navigate to={`/${currentRole}`} replace /> : <Navigate to="/" replace />;
    }

    return children;
  };

  return (
    <Router>
      <Routes>
        {/* LOGIN: Strict check for redirect */}
        <Route 
          path="/" 
          element={
            !isLoggedIn ? (
              <Login setIsLoggedIn={() => setAuthState(Date.now())} />
            ) : (
              // ✅ Dynamic redirect based on the role currently in Storage
              <Navigate to={`/${currentRole}`} replace />
            )
          } 
        />

        <Route 
          path="/admin/*" 
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminDashboard onLogout={handleLogout} />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/manager/*" 
          element={
            <ProtectedRoute allowedRole="manager">
              <ManagerDashboard onLogout={handleLogout} />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/teamleader/*" 
          element={
            <ProtectedRoute allowedRole="teamleader">
              <TeamLeaderDashboard onLogout={handleLogout} />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/employee/*" 
          element={
            <ProtectedRoute allowedRole="employee">
              <EmployeeDashboard onLogout={handleLogout} />
            </ProtectedRoute>
          } 
        />

        {/* ✅ Catch-all: Always go back to root logic */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;