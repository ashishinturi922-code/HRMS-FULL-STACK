import React, { useState, useEffect } from "react";
import "./Employees.css";

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    // Fetch employees from the backend API
    const fetchEmployees = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/employees`);
        if (response.ok) {
          const data = await response.json();
          setEmployees(data);
        }
      } catch (err) {
        console.error("Failed to fetch employees:", err);
      }
    };

    fetchEmployees();
  }, []);

  // Search logic remains the same, but check that property names match backend data
  const filteredEmployees = employees.filter((emp) => {
    const search = searchTerm.toLowerCase();
    return (
      emp.name?.toLowerCase().includes(search) ||
      emp.employee_id?.toLowerCase().includes(search) || // Matches backend column name
      emp.role?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="employees-container">
      <h2>Employees</h2>

      <div className="search-box">
        <div className="search-input">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by Name / ID / Role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <table className="employees-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Employee ID</th>
            <th>Email</th>
            <th>Role</th>
            <th>Department</th>
            <th>Contact No</th>
          </tr>
        </thead>
        <tbody>
          {filteredEmployees.length > 0 ? (
            filteredEmployees.map((emp) => (
              <tr key={emp.id}>
                <td>{emp.name}</td>
                <td>{emp.employee_id}</td>
                <td>{emp.username}</td> {/* Backend uses 'username' for email */}
                <td>{emp.role}</td>
                <td>{emp.department}</td>
                <td>{emp.phone}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="6" className="no-data">No Matching Employees Found</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Employees;