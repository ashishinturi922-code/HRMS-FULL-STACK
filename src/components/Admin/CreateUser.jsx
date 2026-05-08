// =========================================
// CreateUser.jsx — Fixed & Polished
// =========================================

import React, { useState, useEffect } from "react";
import {
  FaUser,
  FaIdBadge,
  FaEnvelope,
  FaPhone,
  FaLock,
  FaBuilding,
  FaCheckCircle,
  FaEye,
  FaEyeSlash
} from "react-icons/fa";
import "./CreateUser.css";

// ✅ FIX: Hardcoded API URL — no .env needed
const API_URL = "http://localhost:5000";

const CreateUser = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    employeeId: "",
    email: "",
    phone: "+91 ",
    password: "",
    confirmPassword: "",
    role: "",
    department: "",
  });

  const [departments, setDepartments] = useState([]);

  // =========================================
  // FETCH DEPARTMENTS
  // =========================================
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
<<<<<<< HEAD
        // ✅ FIX: Using hardcoded API_URL
        const response = await fetch(`${API_URL}/api/departments`);
=======
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/departments`);
>>>>>>> 8123286f8c8411ce164d7e89a3eaee37521f5a5d
        if (response.ok) {
          const data = await response.json();
          setDepartments(data);
        } else {
          setDepartments([]);
        }
      } catch (err) {
        console.error("Failed to fetch departments:", err);
        setDepartments([]);
      }
    };
    fetchDepartments();
  }, []);

  // =========================================
  // HANDLE CHANGE
  // =========================================
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    // Clear field error on change
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: "" });
    }
  };

  // =========================================
  // HANDLE PHONE
  // =========================================
  const handlePhone = (e) => {
    let value = e.target.value;
    if (!value.startsWith("+91 ")) value = "+91 ";
    const digits = value.replace("+91 ", "").replace(/\D/g, "").slice(0, 10);
    setForm({ ...form, phone: `+91 ${digits}` });
    if (errors.phone) setErrors({ ...errors, phone: "" });
  };

  // =========================================
  // VALIDATE
  // =========================================
  const validate = () => {
    const newErrors = {};
    if (!form.firstName.trim()) newErrors.firstName = "Required";
    if (!form.lastName.trim()) newErrors.lastName = "Required";
    if (!form.employeeId.trim()) newErrors.employeeId = "Required";
    if (!form.email.includes("@")) newErrors.email = "Enter a valid email";
    const digits = form.phone.replace("+91 ", "").replace(/\D/g, "");
    if (digits.length !== 10) newErrors.phone = "Must be 10 digits";
    const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
    if (!passwordRegex.test(form.password))
      newErrors.password = "Min 8 chars, uppercase, lowercase, number, special char";
    if (form.password !== form.confirmPassword)
      newErrors.confirmPassword = "Passwords do not match";
    if (!form.role) newErrors.role = "Select a role";
    if (!form.department) newErrors.department = "Select a department";
    return newErrors;
  };

  // =========================================
  // HANDLE SUBMIT
  // =========================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
<<<<<<< HEAD
      setLoading(true);
      setErrors({});

      // ✅ FIX: Using hardcoded API_URL
      const response = await fetch(`${API_URL}/api/users/create`, {
=======
      // SEND DATA TO BACKEND
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/users/create`, {
>>>>>>> 8123286f8c8411ce164d7e89a3eaee37521f5a5d
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Server Error ${response.status}`);
      }

      setSuccess(true);
      setForm({
        firstName: "",
        lastName: "",
        employeeId: "",
        email: "",
        phone: "+91 ",
        password: "",
        confirmPassword: "",
        role: "",
        department: "",
      });

      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      console.error("Create user error:", err);
      setErrors({ submit: err.message || "Unable to create user. Please check backend server." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cu-container">
      <form className="cu-form" onSubmit={handleSubmit}>

        {/* HEADER */}
        <div className="cu-header">
          <h2>Create Employee</h2>
          <p>Add a new member to your organization</p>
        </div>

        {/* SUCCESS BANNER */}
        {success && (
          <div className="cu-banner cu-banner--success">
            <FaCheckCircle />
            Employee created successfully!
          </div>
        )}

        {/* ERROR BANNER */}
        {errors.submit && (
          <div className="cu-banner cu-banner--error">
            {errors.submit}
          </div>
        )}

        {/* GRID FIELDS */}
        <div className="cu-grid">

          {/* FIRST NAME */}
          <div className={`cu-field ${errors.firstName ? "cu-field--error" : ""}`}>
            <FaUser className="cu-field__icon" />
            <input
              type="text"
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
              placeholder=" "
              required
            />
            <label>First Name <span>*</span></label>
            {errors.firstName && <span className="cu-field__msg">{errors.firstName}</span>}
          </div>

          {/* LAST NAME */}
          <div className={`cu-field ${errors.lastName ? "cu-field--error" : ""}`}>
            <FaUser className="cu-field__icon" />
            <input
              type="text"
              name="lastName"
              value={form.lastName}
              onChange={handleChange}
              placeholder=" "
              required
            />
            <label>Last Name <span>*</span></label>
            {errors.lastName && <span className="cu-field__msg">{errors.lastName}</span>}
          </div>

          {/* EMPLOYEE ID */}
          <div className={`cu-field ${errors.employeeId ? "cu-field--error" : ""}`}>
            <FaIdBadge className="cu-field__icon" />
            <input
              type="text"
              name="employeeId"
              value={form.employeeId}
              onChange={handleChange}
              placeholder=" "
              required
            />
            <label>Employee ID <span>*</span></label>
            {errors.employeeId && <span className="cu-field__msg">{errors.employeeId}</span>}
          </div>

          {/* EMAIL */}
          <div className={`cu-field ${errors.email ? "cu-field--error" : ""}`}>
            <FaEnvelope className="cu-field__icon" />
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder=" "
              required
            />
            <label>Email Address <span>*</span></label>
            {errors.email && <span className="cu-field__msg">{errors.email}</span>}
          </div>

          {/* PHONE — full width */}
          <div className={`cu-field cu-field--full ${errors.phone ? "cu-field--error" : ""}`}>
            <FaPhone className="cu-field__icon" />
            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handlePhone}
              placeholder="+91 Enter Mobile Number"
              maxLength={14}
              required
            />
            <label>Mobile Number <span>*</span></label>
            {errors.phone && <span className="cu-field__msg">{errors.phone}</span>}
          </div>

          {/* PASSWORD */}
          <div className={`cu-field ${errors.password ? "cu-field--error" : ""}`}>
            <FaLock className="cu-field__icon" />
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder=" "
              required
            />
            <label>Password <span>*</span></label>
            <button
              type="button"
              className="cu-field__eye"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
            {errors.password && <span className="cu-field__msg">{errors.password}</span>}
          </div>

          {/* CONFIRM PASSWORD */}
          <div className={`cu-field ${errors.confirmPassword ? "cu-field--error" : ""}`}>
            <FaLock className="cu-field__icon" />
            <input
              type={showConfirm ? "text" : "password"}
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder=" "
              required
            />
            <label>Confirm Password <span>*</span></label>
            <button
              type="button"
              className="cu-field__eye"
              onClick={() => setShowConfirm(!showConfirm)}
              tabIndex={-1}
            >
              {showConfirm ? <FaEyeSlash /> : <FaEye />}
            </button>
            {errors.confirmPassword && <span className="cu-field__msg">{errors.confirmPassword}</span>}
          </div>

          {/* ROLE */}
          <div className={`cu-select-wrap ${errors.role ? "cu-field--error" : ""}`}>
            <label className="cu-select-label">Role <span>*</span></label>
            <div className="cu-select-box">
              <FaUser className="cu-field__icon" />
              <select name="role" value={form.role} onChange={handleChange} required>
                <option value="">Select Role</option>
                <option value="Employee">Employee</option>
                <option value="Manager">Manager</option>
                <option value="Team Leader">Team Leader</option>
              </select>
            </div>
            {errors.role && <span className="cu-field__msg">{errors.role}</span>}
          </div>

          {/* DEPARTMENT */}
          <div className={`cu-select-wrap ${errors.department ? "cu-field--error" : ""}`}>
            <label className="cu-select-label">Department <span>*</span></label>
            <div className="cu-select-box">
              <FaBuilding className="cu-field__icon" />
              <select name="department" value={form.department} onChange={handleChange} required>
                <option value="">Select Department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>
            {errors.department && <span className="cu-field__msg">{errors.department}</span>}
          </div>

        </div>

        {/* SUBMIT */}
        <button type="submit" className="cu-submit" disabled={loading}>
          {loading ? <span className="cu-spinner" /> : null}
          {loading ? "Creating Employee..." : "Create Employee"}
        </button>

      </form>
    </div>
  );
};

export default CreateUser;