import React, { useEffect, useState } from "react";
import "./EmployeeProjects.css";

const EmployeeProjects = () => {
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    // ✅ USER (KEEP THIS)
    let storedUser = JSON.parse(localStorage.getItem("user"));

    if (!storedUser) {
      storedUser = {
        id: null,
        name: "Employee",
      };
    }

    // ✅ FETCH FROM BACKEND (REPLACED LOCAL STORAGE LOGIC)
    const fetchProjects = async () => {
      try {
        const res = await fetch(
          `${process.env.REACT_APP_API_URL}/api/employee/projects/${storedUser.id}`
        );
        const data = await res.json();

        setProjects(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Fetch Error:", err);
      }
    };

    fetchProjects();
  }, []);

  // 🔍 SEARCH (SAFE FIX)
  const filteredProjects = projects.filter((p) =>
    (p.projectName || p.name || "")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  // 🔄 CHANGE STATUS (ONLY FRONTEND UPDATE)
  const handleStatusChange = (projectId, status) => {
    const updated = projects.map((p) =>
      p.id === projectId ? { ...p, status } : p
    );

    setProjects(updated);
  };

  return (
    <div className="projects-container">
      <h2>My Projects</h2>

      {/* SEARCH */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* TABLE */}
      <div className="projects-card">
        <h3>Assigned Projects</h3>

        <div className="table-wrapper">
          <table className="projects-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Project</th>
                <th>Description</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredProjects.length > 0 ? (
                filteredProjects.map((p, index) => (
                  <tr key={p.id}>
                    <td>{index + 1}</td>

                    {/* ✅ FIXED FOR DB */}
                    <td>{p.projectName || p.name}</td>
                    <td>{p.projectDescription || p.description}</td>

                    <td>
                      <span className={`status ${p.status.toLowerCase()}`}>
                        {p.status}
                      </span>
                    </td>

                    <td>
                      <select
                        value={p.status}
                        onChange={(e) =>
                          handleStatusChange(p.id, e.target.value)
                        }
                      >
                        <option value="Ongoing">Ongoing</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center" }}>
                    No Projects Assigned
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

export default EmployeeProjects;