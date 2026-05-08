import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaEnvelope, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import "./Login.css";
import bg from "./assets/bgimage.jpg"; 

const Login = ({ setIsLoggedIn }) => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!form.username || !form.password) {
      setError("Please fill all fields");
      return;
    }

    setLoading(true);
    setError("");

    try {
      localStorage.removeItem("user");

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Check if response is ok
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.message || `Server error: ${response.status}`);
        setLoading(false);
        return;
      }

      const data = await response.json();

      if (data.success && data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));

        const dbRole = data.user.role || "";
        const normalizedRole = dbRole.toLowerCase().replace(/\s+/g, "");

        if (typeof setIsLoggedIn === "function") {
          setIsLoggedIn(true);
        }
        window.dispatchEvent(new Event("authUpdate"));

        navigate(`/${normalizedRole}`, { replace: true });
      } else {
        setError(data.message || "Invalid credentials");
      }
    } catch (err) {
      console.error("Login Error:", err);

      // Handle different error types
      if (err.name === "AbortError") {
        setError(
          `Connection timeout. Please check if backend server is running on ${
            process.env.REACT_APP_API_URL || "your configured API URL"
          }`
        );
      } else if (err instanceof TypeError) {
        setError("Cannot reach server. Make sure:\n1. Backend is running\n2. IP address is correct\n3. Firewall allows port 5000");
      } else {
        setError(err.message || "Unable to connect to server. Ensure backend is running.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="left-section" style={{ backgroundImage: `url(${bg})` }}>
        <div className="overlay-card">
          <img
            src="https://additionservice.com/wp-content/uploads/2023/12/Logo-01-copy.png"
            alt="logo"
            className="logo-img"
          />
          <p>Consulting Service Private Limited</p>
        </div>
      </div>

      <div className="right-section">
        <form className="login-form" onSubmit={handleLogin}>
          <h2>Welcome Back</h2>
          <p className="subtitle">Enter credentials to access infrastructure core</p>

          {error && (
            <div className="error-message" style={{ 
              color: 'white', 
              background: '#d9534f', 
              padding: '12px', 
              borderRadius: '5px', 
              marginBottom: '15px', 
              fontSize: '13px',
              textAlign: 'center',
              lineHeight: '1.5',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}>
              {error}
            </div>
          )}

          <label>Email Address / Username</label>
          <div className="input-group">
            <FaEnvelope className="input-icon" />
            <input
              type="text"
              name="username"
              placeholder="Username"
              value={form.username}
              onChange={handleChange}
              autoComplete="username"
              disabled={loading}
            />
          </div>

          <label>Password</label>
          <div className="input-group">
            <FaLock className="input-icon" />
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
              disabled={loading}
            />
            <span
              className="eye-icon"
              style={{ cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1 }}
              onClick={() => !loading && setShowPassword(!showPassword)}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>

          <button 
            type="submit"
            disabled={loading}
            style={{
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? "Signing in..." : "Sign In →"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;