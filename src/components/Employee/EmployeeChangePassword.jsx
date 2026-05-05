import React, { useState, useEffect } from "react";
import "./EmployeeChangePassword.css";

const EmployeeChangePassword = () => {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [message, setMessage] = useState("");
  const [user, setUser] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [loading, setLoading] = useState(false);

  // LOAD USER FROM LOCALSTORAGE
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

    if (!user) {
      setMessage("User session expired. Please log in again.");
      return;
    }

    // Front-end validations
    if (form.currentPassword !== user.password) {
      setMessage("Current password is incorrect");
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setMessage("New passwords do not match");
      return;
    }

    if (form.currentPassword === form.newPassword) {
      setMessage("New password must be different from the old one");
      return;
    }

    if (!validatePassword(form.newPassword)) {
      setMessage(
        "Password must be 8+ chars, include uppercase, lowercase, number & special character"
      );
      return;
    }

    try {
      setLoading(true);
      // 🌐 API CALL TO BACKEND
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/employee/update-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          newPassword: form.newPassword,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // 1. Update the local user object with the new password
        const updatedUser = { ...user, password: form.newPassword };
        
        // 2. Persist to localStorage so the session reflects the change
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setUser(updatedUser);

        // 3. UI feedback
        setShowPopup(true);
        setForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: ""
        });
        setTimeout(() => setShowPopup(false), 2500);
      } else {
        setMessage(result.error || "Failed to update password in database");
      }
    } catch (error) {
      console.error("Database Update Error:", error);
      setMessage("Server connection error. Please try again later.");
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
        <input
          type="password"
          name="currentPassword"
          placeholder="Current Password"
          value={form.currentPassword}
          onChange={handleChange}
          required
        />

        <input
          type="password"
          name="newPassword"
          placeholder="New Password"
          value={form.newPassword}
          onChange={handleChange}
          required
        />

        <input
          type="password"
          name="confirmPassword"
          placeholder="Confirm Password"
          value={form.confirmPassword}
          onChange={handleChange}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Updating..." : "Update Password"}
        </button>
      </form>

      {message && <p className={`message ${message.includes("Successfully") ? "success" : "error"}`}>{message}</p>}

      {/* 🔥 SUCCESS POPUP */}
      {showPopup && (
        <div className="popup">
          <div className="popup-content">
            ✅ Password Updated Successfully in Database
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeChangePassword;