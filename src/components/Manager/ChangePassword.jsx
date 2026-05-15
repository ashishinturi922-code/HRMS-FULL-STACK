import React, { useState, useEffect } from "react";
import axios from "axios";
import "./ManagerChangePassword.css";
import { FaEye, FaEyeSlash } from "react-icons/fa";

const ManagerChangePassword = () => {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  // ✅ NEW: Track password visibility for each field
  const [showPasswords, setShowPasswords] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false
  });

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [user, setUser] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [loading, setLoading] = useState(false);

  // ✅ FIX 1: Added fallback URL to prevent routing errors if .env is missing
  const API_URL = process.env.REACT_APP_API_URL ||" http://localhost:5000";

  // ✅ FIX 2: Helper function to attach the auth token to requests
  const getAuthConfig = () => {
    const token = localStorage.getItem("token");
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    const finalToken = token || storedUser?.token || "";

    return {
      headers: {
        Authorization: `Bearer ${finalToken}`,
        "Content-Type": "application/json"
      }
    };
  };

  // ✅ Load current user from session on mount
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    setUser(storedUser);
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setMessage("");
  };

  // ✅ NEW: Toggle password visibility
  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  // 🔒 STRONG PASSWORD VALIDATION
  const validatePassword = (password) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return regex.test(password);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      setMessage("User session not found. Please log in again.");
      setMessageType("error");
      return;
    }

    if (!form.currentPassword) {
      setMessage("Please enter your current password");
      setMessageType("error");
      return;
    }

    // 1. Basic Frontend Validations
    if (form.newPassword !== form.confirmPassword) {
      setMessage("New passwords do not match");
      setMessageType("error");
      return;
    }

    if (form.currentPassword === form.newPassword) {
      setMessage("New password must be different from current password");
      setMessageType("error");
      return;
    }

    if (!validatePassword(form.newPassword)) {
      setMessage(
        "Password must be 8+ chars, include uppercase, lowercase, number & special character"
      );
      setMessageType("error");
      return;
    }

    try {
      setLoading(true);
      const targetUserId = user.id || user.empId;

      // 2. 🔥 BACKEND API CALL 
      // ✅ FIX 3: Added getAuthConfig() so the backend knows you are authenticated
      const response = await axios.post(`${API_URL}/api/profile/update-password`, {
        id: targetUserId, 
        currentPassword: form.currentPassword,
        newPassword: form.newPassword
      }, getAuthConfig());

      if (response.data.success || response.status === 200) {
        // 3. Success Feedback
        setShowPopup(true);
        setForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: ""
        });
        setMessage("Password updated successfully!");
        setMessageType("success");

        setTimeout(() => {
          setShowPopup(false);
        }, 2500);
      }
    } catch (err) {
      // Handle incorrect current password or server errors
      const errorMsg = err.response?.data?.message || err.response?.data?.error || "Failed to update password. Try again.";
      setMessage(errorMsg);
      setMessageType("error");
      console.error("Password Update Error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <h2>Change Password</h2>

      {user && (
        <div className="user-info">
          <h3>{user.name}</h3>
          <p>{user.role}</p>
        </div>
      )}

      {message && (
        <div className={`message ${messageType}`}>
          {message}
        </div>
      )}

      <form className="password-form" onSubmit={handleSubmit}>
        {/* ✅ Current Password with Eye Icon */}
        <div className="input-group">
          <label>Current Password</label>
          <div className="password-input-wrapper">
            <input
              type={showPasswords.currentPassword ? "text" : "password"}
              name="currentPassword"
              placeholder="Enter current password"
              value={form.currentPassword}
              onChange={handleChange}
              required
            />
            <button
              type="button"
              className="eye-btn"
              onClick={() => togglePasswordVisibility("currentPassword")}
              title={showPasswords.currentPassword ? "Hide password" : "Show password"}
            >
              {showPasswords.currentPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
        </div>

        {/* ✅ New Password with Eye Icon */}
        <div className="input-group">
          <label>New Password</label>
          <div className="password-input-wrapper">
            <input
              type={showPasswords.newPassword ? "text" : "password"}
              name="newPassword"
              placeholder="8+ characters required"
              value={form.newPassword}
              onChange={handleChange}
              required
            />
            <button
              type="button"
              className="eye-btn"
              onClick={() => togglePasswordVisibility("newPassword")}
              title={showPasswords.newPassword ? "Hide password" : "Show password"}
            >
              {showPasswords.newPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
        </div>

        {/* ✅ Confirm Password with Eye Icon */}
        <div className="input-group">
          <label>Confirm New Password</label>
          <div className="password-input-wrapper">
            <input
              type={showPasswords.confirmPassword ? "text" : "password"}
              name="confirmPassword"
              placeholder="Repeat new password"
              value={form.confirmPassword}
              onChange={handleChange}
              required
            />
            <button
              type="button"
              className="eye-btn"
              onClick={() => togglePasswordVisibility("confirmPassword")}
              title={showPasswords.confirmPassword ? "Hide password" : "Show password"}
            >
              {showPasswords.confirmPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
        </div>

        <button type="submit" className="update-btn" disabled={loading}>
          {loading ? "Updating..." : "Update Password"}
        </button>
      </form>

      {/* 🔥 SUCCESS POPUP */}
      {showPopup && (
        <div className="popup-overlay">
          <div className="popup-content">
            <span className="icon">✅</span>
            <p>Password Updated Successfully</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerChangePassword;
