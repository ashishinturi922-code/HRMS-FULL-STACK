import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Login.css";
import { loginUser } from "../services/authService";

const Login = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    const user = loginUser(username, password);

    if (user) {
      localStorage.setItem("loggedInUser", JSON.stringify(user));
      if (user.role === "admin") {
        navigate("/admin-dashboard");
      } else if (user.role === "b_manager") {
        navigate("/b-company-portal");
      } else {
        navigate("/user-dashboard");
      }
    } else {
      alert("Invalid Credentials.");
    }
  };

  return (
    <div className="tw-login-page">
      <div className="tw-glass-card">
        <h1 className="tw-title">TASC Workforce</h1>
        <p className="tw-subtitle">Login to continue</p>

        <input
          className="tw-input"
          type="text"
          placeholder="Email Address"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          className="tw-input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button className="tw-login-btn" onClick={handleLogin}>Login</button>

        <p className="tw-bottom-text">
          Don't have an account? <span className="tw-link" onClick={() => navigate("/signup")}>Signup</span>
        </p>

        <div className="tw-dummy-box">
          <h3 className="tw-dummy-title">Test Credentials</h3>
          
          <div className="tw-credential-group">
            <p><strong>Admin (TASC):</strong> admin@abc.com</p>
            <p><strong>Password:</strong> admin123</p>
          </div>

          <div className="tw-credential-group tw-highlight">
            <p><strong>Samsung HR:</strong> hr@samsung.com</p>
            <p><strong>Password:</strong> samsung123</p>
          </div>

          <div className="tw-credential-group">
            <p><strong>Employee:</strong> john@infosys.com</p>
            <p><strong>Password:</strong> john123</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;