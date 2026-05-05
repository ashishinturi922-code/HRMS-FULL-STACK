import React, { useState, useEffect } from "react";
import "./TeamLeaderChangePassword.css";

const TeamLeaderChangePassword = () => {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [message, setMessage] = useState("");
  const [user, setUser] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [loading, setLoading] = useState(false);

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
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
    return regex.test(password);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user || !user.id) {
      setMessage("User session expired. Please login again.");
      return;
    }

    // Frontend Validations
    if (form.newPassword !== form.confirmPassword) {
      setMessage("New passwords do not match!");
      return;
    }

    if (!validatePassword(form.newPassword)) {
      setMessage("Password must be 8+ chars, with Uppercase, Lowercase, Number & Symbol.");
      return;
    }

    try {
      setLoading(true);
      
      // ✅ CONNECTED TO PERMANENT BACKEND ENDPOINT
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/teamleader/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: user.id, // Using 'id' to match TeamLeaderController
          currentPassword: form.currentPassword,
          newPassword: form.newPassword
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Success logic
        setShowPopup(true);
        setForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: ""
        });
        
        // Update local storage so the session remains valid with the new password
        const updatedUser = { ...user, password: form.newPassword };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        
        setTimeout(() => setShowPopup(false), 2500);
      } else {
        // Handle database-level errors (like "Current password incorrect")
        setMessage(result.error || result.message || "Failed to update password.");
      }
    } catch (error) {
      console.error("Error updating password:", error);
      setMessage("Server connection failed. Ensure backend is running.");
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

      <form className="password-form" onSubmit={handleSubmit}>
        <div className="input-field">
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

        <div className="input-field">
          <label>New Password</label>
          <input
            type="password"
            name="newPassword"
            placeholder="Enter new password"
            value={form.newPassword}
            onChange={handleChange}
            required
          />
        </div>

        <div className="input-field">
          <label>Confirm New Password</label>
          <input
            type="password"
            name="confirmPassword"
            placeholder="Re-type new password"
            value={form.confirmPassword}
            onChange={handleChange}
            required
          />
        </div>

        <button type="submit" className="update-btn" disabled={loading}>
          {loading ? "Processing..." : "Update Password"}
        </button>
      </form>

      {message && (
        <p className={`message ${message.toLowerCase().includes("success") ? "success" : "error"}`}>
          {message}
        </p>
      )}

      {/* 🔥 SUCCESS POPUP */}
      {showPopup && (
        <div className="popup">
          <div className="popup-content">
            <div className="check-icon">✔</div>
            <h3>Security Updated!</h3>
            <p>Your password has been changed in our database.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamLeaderChangePassword;