import React, { useEffect, useState } from "react";
import "./Employees.css";

const Employees = ({ managerId }) => {
  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("all");

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/manager/all-team`);
        const data = await response.json();

        if (Array.isArray(data)) {
          console.log("Fetched employees:", data);
          setEmployees(data);
        }
      } catch (error) {
        console.error("Error fetching team members:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeam();
  }, []);

  const filteredEmployees = employees.filter((emp) => {
    const search = searchTerm.toLowerCase();
    const empRole = emp.role?.toLowerCase().replace(/\s+/g, '') || '';
    
    const roleMatches = roleFilter === "all" || 
                       empRole.includes(roleFilter.toLowerCase().replace(/\s+/g, ''));
    
    const searchMatches = !search || (
      (emp.name?.toLowerCase().includes(search)) ||
      (emp.employee_id?.toLowerCase().includes(search)) ||
      (emp.role?.toLowerCase().includes(search)) ||
      (emp.department?.toLowerCase().includes(search))
    );

    return roleMatches && searchMatches;
  });

  return (
    <div className="employees-container">
      <h2>All Team Members</h2>

      <div className="search-box">
        <div className="search-input">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by Name / ID / Role / Department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="role-filter">
          <button 
            className={roleFilter === "all" ? "btn-active" : "btn-inactive"}
            onClick={() => setRoleFilter("all")}
          >
            All
          </button>
          <button 
            className={roleFilter === "employee" ? "btn-active" : "btn-inactive"}
            onClick={() => setRoleFilter("employee")}
          >
            Employees
          </button>
          <button 
            className={roleFilter === "teamleader" ? "btn-active" : "btn-inactive"}
            onClick={() => setRoleFilter("teamleader")}
          >
            Team Leaders
          </button>
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
          {loading ? (
            <tr><td colSpan="6" className="no-data">Loading team...</td></tr>
          ) : filteredEmployees.length > 0 ? (
            filteredEmployees.map((emp) => (
              <tr key={emp.id} className={emp.role?.toLowerCase().includes('teamleader') || emp.role?.toLowerCase().includes('team leader') ? "team-leader-row" : "employee-row"}>
                <td>{emp.name}</td>
                <td>{emp.employee_id}</td>
                <td>{emp.username}</td>
                <td>
                  <span className={emp.role?.toLowerCase().includes('teamleader') || emp.role?.toLowerCase().includes('team leader') ? "role-badge-tl" : "role-badge-emp"}>
                    {emp.role}
                  </span>
                </td>
                <td>{emp.department}</td>
                <td>{emp.phone}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="6" className="no-data">
                No Matching Team Members Found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Employees;