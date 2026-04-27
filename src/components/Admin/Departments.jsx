import React, { useState, useEffect } from "react";
import "./Departments.css";

const Departments = () => {
  const [deptName, setDeptName] = useState("");
  const [departments, setDepartments] = useState([]);

  // 1. Fetch departments from database on load
  const fetchDepartments = async () => {
    try {
      const response = await fetch("http://192.168.0.165:5000/api/departments");
      const data = await response.json();
      setDepartments(data);
    } catch (err) {
      console.error("Failed to load departments:", err);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  // 2. Add department to database
  const handleAdd = async () => {
    if (!deptName.trim()) return;

    try {
      const response = await fetch("http://192.168.0.165:5000/api/departments/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: deptName }),
      });

      if (response.ok) {
        setDeptName("");
        fetchDepartments(); // Refresh list
      }
    } catch (err) {
      console.error("Failed to add department:", err);
    }
  };

  // 3. Delete department from database by ID
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this department?")) return;

    try {
      const response = await fetch(`http://192.168.0.165:5000/api/departments/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchDepartments(); // Refresh list
      }
    } catch (err) {
      console.error("Failed to delete department:", err);
    }
  };

  return (
    <div className="dept-container">
      <h2>Departments</h2>

      <div className="dept-add">
        <input
          type="text"
          placeholder="Enter Department Name"
          value={deptName}
          onChange={(e) => setDeptName(e.target.value)}
        />
        <button onClick={handleAdd}>Add</button>
      </div>

      <div className="dept-list">
        {departments.map((dept) => (
          <div key={dept.id} className="dept-item">
            <span>{dept.name}</span>
            <button onClick={() => handleDelete(dept.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Departments;