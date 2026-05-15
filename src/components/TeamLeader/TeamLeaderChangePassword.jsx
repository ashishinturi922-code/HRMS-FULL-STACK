import React, { useState, useEffect } from "react";
import "./TeamLeaderChangePassword.css";
import { FaEye, FaEyeSlash } from "react-icons/fa";

const TeamLeaderChangePassword = () => {
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

  // ✅ FIX 1: Safe fallback so URL never becomes "undefined/api/..."
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

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

  const validatePassword = (password) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
    return regex.test(password);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user || !user.id) {
      setMessage("User session expired. Please login again.");
      setMessageType("error");
      return;
    }

    if (!form.currentPassword) {
      setMessage("Please enter your current password");
      setMessageType("error");
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setMessage("New passwords do not match!");
      setMessageType("error");
      return;
    }

    if (form.currentPassword === form.newPassword) {
      setMessage("New password must be different from the old one");
      setMessageType("error");
      return;
    }

    if (!validatePassword(form.newPassword)) {
      setMessage("Password must be 8+ chars, with Uppercase, Lowercase, Number & Symbol.");
      setMessageType("error");
      return;
    }

    try {
      setLoading(true);

      // ✅ FIX 2: Correct route is /update-password not /change-password
      // The backend index.js registers: PUT /api/teamleader/update-password
      const response = await fetch(`${API_URL}/api/teamleader/update-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: user.id,
          currentPassword: form.currentPassword,
          newPassword: form.newPassword
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setShowPopup(true);
        setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        setMessage("Password updated successfully!");
        setMessageType("success");
        setTimeout(() => setShowPopup(false), 2500);
      } else {
        setMessage(result.error || result.message || "Failed to update password.");
        setMessageType("error");
      }
    } catch (error) {
      console.error("Error updating password:", error);
      setMessage("Server connection failed. Ensure backend is running.");
      setMessageType("error");
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
        <div className="input-field">
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
        <div className="input-field">
          <label>New Password</label>
          <div className="password-input-wrapper">
            <input
              type={showPasswords.newPassword ? "text" : "password"}
              name="newPassword"
              placeholder="Enter new password"
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
        <div className="input-field">
          <label>Confirm New Password</label>
          <div className="password-input-wrapper">
            <input
              type={showPasswords.confirmPassword ? "text" : "password"}
              name="confirmPassword"
              placeholder="Re-type new password"
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
          {loading ? "Processing..." : "Update Password"}
        </button>
      </form>

      {message && (
        <p className={`message ${messageType}`}>
          {message}
        </p>
      )}

      {showPopup && (
        <div className="popup">
          <div className="popup-content">
            <div className="check-icon">✔</div>
            <h3>Security Updated!</h3>
            <p>Your password has been changed successfully.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamLeaderChangePassword;
