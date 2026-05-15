// ============================================
// App.tsx
// ============================================

import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AdminDashboard from "./pages/AdminDashboard";
import UserDashboard from "./pages/UserDashboard";

// ✅ Added the import for your new Company B Portal
import BCompanyPortal from "./pages/BCompanyPortal";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        
        <Route path="/signup" element={<Signup />} />
        
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        
        <Route path="/user-dashboard" element={<UserDashboard />} />

        {/* ✅ Added the new route exactly as the Login page expects it */}
        <Route path="/b-company-portal" element={<BCompanyPortal />} />
        
      </Routes>
    </BrowserRouter>
  );
}

export default App;