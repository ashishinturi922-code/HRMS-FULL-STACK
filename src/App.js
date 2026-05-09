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

  // ✅ THE FIX: We strictly define valid roles. 
  // If a role is empty or spelled wrong in the database, it gets caught here to prevent the infinite loop.
  const validRoles = ["admin", "manager", "teamleader", "employee"];
  const isValidRole = currentRole && validRoles.includes(currentRole);

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

    // ✅ THE FIX: Stop the loop if the role is invalid
    if (!isValidRole) {
      return <Navigate to="/invalid-role" replace />;
    }
    
    if (currentRole !== allowedRole) {
      // Safety check: Go to their specific home
      return <Navigate to={`/${currentRole}`} replace />;
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
            ) : isValidRole ? (
              // ✅ Dynamic redirect based on the role currently in Storage
              <Navigate to={`/${currentRole}`} replace />
            ) : (
              // ✅ Send them to a safe error page if the role is broken
              <Navigate to="/invalid-role" replace />
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

        {/* ✅ THE FIX: Safe landing zone for unrecognized or blank roles from the database */}
        <Route 
          path="/invalid-role" 
          element={
            <div style={{ textAlign: "center", marginTop: "100px", fontFamily: "sans-serif" }}>
              <h2 style={{ color: "#d9534f" }}>❌ Access Denied: Invalid Role</h2>
              <p>Your account does not have a valid role assigned to access a dashboard.</p>
              <p style={{ color: "gray" }}>(Detected Role: "{currentRole || "None"}")</p>
              <button 
                onClick={handleLogout} 
                style={{ padding: "10px 20px", marginTop: "20px", background: "#d9534f", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}
              >
                Logout & Go Back
              </button>
            </div>
          } 
        />

        {/* ✅ Catch-all: Always go back to root logic safely */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;