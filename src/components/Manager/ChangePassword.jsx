import React, { useState, useEffect } from "react";
import axios from "axios";
import "./ManagerChangePassword.css";

const ManagerChangePassword = () => {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [message, setMessage] = useState("");
  const [user, setUser] = useState(null);
  const [showPopup, setShowPopup] = useState(false);

  // ✅ Load current user from session on mount
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    setUser(storedUser);
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setMessage("");
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
      return;
    }

    // 1. Basic Frontend Validations
    if (form.newPassword !== form.confirmPassword) {
      setMessage("New passwords do not match");
      return;
    }

    if (form.currentPassword === form.newPassword) {
      setMessage("New password must be different from current password");
      return;
    }

    if (!validatePassword(form.newPassword)) {
      setMessage(
        "Password must be 8+ chars, include uppercase, lowercase, number & special character"
      );
      return;
    }

    try {
      // 2. 🔥 BACKEND API CALL
      const response = await axios.put(`${process.env.REACT_APP_API_URL}/api/manager/change-password`, {
        userId: user.id || user.empId, // Matches your DB primary key
        currentPassword: form.currentPassword,
        newPassword: form.newPassword
      });

      if (response.data.success) {
        // 3. Update local session so the new password is remembered
        const updatedUser = { ...user, password: form.newPassword };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setUser(updatedUser);

        // 4. Success Feedback
        setShowPopup(true);
        setForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: ""
        });

        setTimeout(() => {
          setShowPopup(false);
        }, 2500);
      }
    } catch (err) {
      // Handle incorrect current password or server errors
      const errorMsg = err.response?.data?.message || "Failed to update password. Try again.";
      setMessage(errorMsg);
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

      <form className="password-form" onSubmit={handleSubmit}>
        <div className="input-group">
          <label>Current Password</label>
          <input
            type="password"
            name="currentPassword"
            placeholder="Enter current password"
            value={form.currentPassword}
            onChange={handleChange}
            required
          />
        </div>

        <div className="input-group">
          <label>New Password</label>
          <input
            type="password"
            name="newPassword"
            placeholder="8+ characters required"
            value={form.newPassword}
            onChange={handleChange}
            required
          />
        </div>

        <div className="input-group">
          <label>Confirm New Password</label>
          <input
            type="password"
            name="confirmPassword"
            placeholder="Repeat new password"
            value={form.confirmPassword}
            onChange={handleChange}
            required
          />
        </div>

        <button type="submit" className="update-btn">Update Password</button>
      </form>

      {message && <p className={`message ${message.includes('success') ? 'success' : 'error'}`}>{message}</p>}

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