import React, { useEffect, useState } from "react";
import "./TeamLeaderProjects.css";

const TeamLeaderProjects = () => {
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");

  const currentUser = JSON.parse(localStorage.getItem("user"));

  // ✅ FETCH PROJECTS AND EMPLOYEES
  const fetchData = async () => {
    try {
      const projRes = await fetch(
        `${process.env.REACT_APP_API_URL}/api/teamleader/projects/${currentUser?.id}`
      );
      const projData = await projRes.json();

      const empRes = await fetch(
        `${process.env.REACT_APP_API_URL}/api/teamleader/my-team/${currentUser?.id}`
      );
      const empData = await empRes.json();

      setProjects(Array.isArray(projData) ? projData : []);
      setEmployees(Array.isArray(empData) ? empData : []);
    } catch (err) {
      console.error("Fetch Error:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser?.id]);

  // 🔍 SEARCH
  const filteredProjects = projects.filter((p) =>
    (p.projectName || p.name || "")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  // 🔄 STATUS UPDATE
  const handleStatusChange = async (projectId, status) => {
    try {
      await fetch(
        `${process.env.REACT_APP_API_URL}/api/manager/projects/status/${projectId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }
      );

      fetchData();
    } catch (err) {
      console.error("Status Update Error:", err);
    }
  };

  // 🔄 GET ASSIGNED EMPLOYEE NAMES
  const getAssignedEmployeeNames = (employeeIds) => {
    if (!employeeIds || employeeIds.length === 0) return "No employees assigned";
    
    const names = employeeIds
      .map(id => {
        const emp = employees.find(e => String(e.employee_id) === String(id));
        return emp ? `${emp.name} (${emp.employee_id})` : id;
      })
      .filter(Boolean);
    
    if (names.length === 0) return "No employees found";
    return names.join(", ");
  };

  return (
    <div className="projects-container">
      <h2>📋 Team Leader Projects</h2>

      {/* SEARCH */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="🔍 Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* TABLE - WITH EMPLOYEE NAMES AND IDS (READ-ONLY) */}
      <div className="projects-card">
        <h3>📊 Projects Assigned to You</h3>

        <div className="table-wrapper">
          <table className="projects-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Project Name</th>
                <th>Description</th>
                <th>Status</th>
                <th>Assigned Employees</th>
              </tr>
            </thead>

            <tbody>
              {filteredProjects.length > 0 ? (
                filteredProjects.map((p, index) => {
                  return (
                    <tr key={p.id}>
                      <td>{index + 1}</td>
                      <td><strong>{p.projectName || p.name || "N/A"}</strong></td>
                      <td>{p.projectDescription || p.description || "N/A"}</td>

                      <td>
                        <span className={`status ${(p.status || "ongoing").toLowerCase()}`}>
                          {p.status || "Ongoing"}
                        </span>
                      </td>

                      <td style={{ fontSize: "0.9em", color: "#555" }}>
                        {getAssignedEmployeeNames(p.employeeIds)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", color: "#999" }}>
                    No projects assigned yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TeamLeaderProjects;