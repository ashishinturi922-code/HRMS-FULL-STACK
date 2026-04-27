import React, { useState, useEffect } from "react";
import {
  FaUser,
  FaIdBadge,
  FaEnvelope,
  FaPhone,
  FaLock,
  FaBuilding
} from "react-icons/fa";
import "./CreateUser.css";

const CreateUser = () => {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    employeeId: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "",
    department: ""
  });

  const [departments, setDepartments] = useState([]);

  // FETCH DEPARTMENTS FROM BACKEND
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await fetch("http://192.168.0.165:5000/api/departments");
        if (response.ok) {
          const data = await response.json();
          // Data is now an array of objects: [{id: 1, name: "HR"}, ...]
          setDepartments(data);
        } else {
          // Fallback to empty array if API fails
          setDepartments([]);
        }
      } catch (err) {
        console.error("Failed to load departments from database:", err);
        setDepartments([]);
      }
    };

    fetchDepartments();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    try {
      // SEND DATA TO BACKEND
      const response = await fetch("http://192.168.0.165:5000/api/users/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const result = await response.json();

      if (response.ok) {
        alert("Employee Created Successfully in Database ✅");
        
        // RESET FORM
        setForm({
          firstName: "",
          lastName: "",
          employeeId: "",
          email: "",
          phone: "",
          password: "",
          confirmPassword: "",
          role: "",
          department: ""
        });
      } else {
        alert(result.error || "Failed to create user");
      }
    } catch (err) {
      console.error("Connection error:", err);
      alert("Could not connect to the server. Please ensure the backend is running.");
    }
  };

  return (
    <div className="create-user-container">
      <form className="create-user-form" onSubmit={handleSubmit}>
        <h2>Create Employee</h2>

        <div className="input-group">
          <FaUser className="icon" />
          <input
            type="text"
            name="firstName"
            value={form.firstName}
            onChange={handleChange}
            required
            placeholder=" "
          />
          <label>First Name</label>
        </div>

        <div className="input-group">
          <FaUser className="icon" />
          <input
            type="text"
            name="lastName"
            value={form.lastName}
            onChange={handleChange}
            required
            placeholder=" "
          />
          <label>Last Name</label>
        </div>

        <div className="input-group">
          <FaIdBadge className="icon" />
          <input
            type="text"
            name="employeeId"
            value={form.employeeId}
            onChange={handleChange}
            required
            placeholder=" "
          />
          <label>Employee ID</label>
        </div>

        <div className="input-group">
          <FaEnvelope className="icon" />
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
            placeholder=" "
          />
          <label>Email</label>
        </div>

        <div className="input-group">
          <FaPhone className="icon" />
          <input
            type="text"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            required
            placeholder=" "
          />
          <label>Phone Number</label>
        </div>

        <div className="input-group">
          <FaLock className="icon" />
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
            placeholder=" "
          />
          <label>Password</label>
        </div>

        <div className="input-group">
          <FaLock className="icon" />
          <input
            type="password"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
            required
            placeholder=" "
          />
          <label>Confirm Password</label>
        </div>

        <div className="form-row">
          <div className="select-group">
            <label>Role</label>
            <div className="select-box">
              <FaUser className="icon" />
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                required
              >
                <option value="">Select Role</option>
                <option value="Employee">Employee</option>
                <option value="Manager">Manager</option>
                <option value="Team Leader">Team Leader</option>
              </select>
            </div>
          </div>

          <div className="select-group">
            <label>Department</label>
            <div className="select-box">
              <FaBuilding className="icon" />
              <select
                name="department"
                value={form.department}
                onChange={handleChange}
                required
              >
                <option value="">Select Department</option>
                {/* Correctly mapping objects: using d.id for key and d.name for display */}
                {departments.map((d) => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <button type="submit">Create User</button>
      </form>
    </div>
  );
};

export default CreateUser;