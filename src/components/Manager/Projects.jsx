import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import "./ManagerProjects.css";

const ManagerProjects = () => {
  const [projects, setProjects] = useState([]);
  const [teamLeaders, setTeamLeaders] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState({});
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [searchInput, setSearchInput] = useState("");

  const BACKEND_URL = `${process.env.REACT_APP_API_URL}`;

  // ✅ FETCH DATA FROM DATABASE
  const fetchProjectData = useCallback(async () => {
    try {
      setLoading(true);
      const storedUser = JSON.parse(localStorage.getItem("user"));
      const managerId = storedUser?.id || 1;

      console.log("Fetching projects for manager ID:", managerId);

      // 1. Fetch projects assigned to this manager
      const projectsRes = await axios.get(
        `${BACKEND_URL}/api/manager/projects/${managerId}`
      );
      
      console.log("Projects response:", projectsRes.data);

      // 2. Fetch list of Team Leaders
      const leadersRes = await axios.get(
        `${BACKEND_URL}/api/manager/team-leaders`
      );

      console.log("Team Leaders response:", leadersRes.data);

      // 3. Fetch all employees
      const employeesRes = await axios.get(
        `${BACKEND_URL}/api/manager/all-employees`
      );

      console.log("Employees response:", employeesRes.data);

      setProjects(Array.isArray(projectsRes.data) ? projectsRes.data : []);
      setTeamLeaders(Array.isArray(leadersRes.data) ? leadersRes.data : []);
      setEmployees(Array.isArray(employeesRes.data) ? employeesRes.data : []);
    } catch (err) {
      console.error("Error fetching project data:", err);
      alert(`Error: ${err.response?.data?.error || err.message}`);
      setProjects([]); 
      setTeamLeaders([]);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  // 🔍 SEARCH FILTER
  const filteredProjects = projects.filter((p) => {
    const nameToSearch = p.projectName || p.name || ""; 
    return nameToSearch.toLowerCase().includes(search.toLowerCase());
  });

  // 🔄 STATUS UPDATE
  const handleStatusChange = async (projectId, status) => {
    try {
      setLoading(true);
      await axios.put(
        `${BACKEND_URL}/api/manager/projects/status/${projectId}`,
        { status: status }
      );
      fetchProjectData();
      alert("Project status updated ✅");
    } catch (err) {
      console.error("Status Update Error:", err);
      alert(`Failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 🔄 ASSIGN TL
  const handleAssign = async (projectId, tlId) => {
    if (!tlId) {
      alert("Please select a Team Leader");
      return;
    }

    try {
      setLoading(true);
      await axios.put(
        `${BACKEND_URL}/api/manager/projects/assign-tl/${projectId}`,
        { teamLeaderId: tlId }
      );
      fetchProjectData();
      alert("Team Leader assigned successfully ✅");
    } catch (err) {
      console.error("Assign TL Error:", err);
      alert(`Failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 🔄 OPEN EMPLOYEE MODAL
  const handleOpenEmployeeModal = (projectId) => {
    setCurrentProjectId(projectId);
    const project = projects.find(p => p.id === projectId);
    const currentEmployees = project?.employeeIds || [];
    setSelectedEmployees({ [projectId]: currentEmployees });
    setSearchInput("");
    setShowEmployeeModal(true);
  };

  // 🔄 TOGGLE EMPLOYEE SELECTION
  const handleEmployeeToggle = (employeeId) => {
    setSelectedEmployees(prev => {
      const current = prev[currentProjectId] || [];
      const updated = current.includes(employeeId)
        ? current.filter(id => id !== employeeId)
        : [...current, employeeId];
      return { ...prev, [currentProjectId]: updated };
    });
  };

  // 🔄 SELECT ALL EMPLOYEES
  const handleSelectAll = () => {
    const allEmployeeIds = employees.map(emp => emp.id);
    setSelectedEmployees(prev => ({
      ...prev,
      [currentProjectId]: allEmployeeIds
    }));
  };

  // 🔄 DESELECT ALL EMPLOYEES
  const handleDeselectAll = () => {
    setSelectedEmployees(prev => ({
      ...prev,
      [currentProjectId]: []
    }));
  };

  // 🔄 ASSIGN EMPLOYEES - SUBMIT
  const handleAssignEmployees = async () => {
    if (!currentProjectId) return;

    const selectedIds = (selectedEmployees[currentProjectId] || []).map(id => String(id));
    
    try {
      setLoading(true);
      console.log("Assigning employees:", selectedIds);
      
      await axios.put(
        `${BACKEND_URL}/api/manager/projects/assign-employees/${currentProjectId}`,
        { employeeIds: selectedIds }
      );
      
      fetchProjectData();
      alert(`Successfully assigned ${selectedIds.length} employee(s) ✅`);
      setShowEmployeeModal(false);
    } catch (err) {
      console.error("Assign Employees Error:", err);
      alert(`Failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 🔄 REMOVE SINGLE EMPLOYEE
  const handleRemoveEmployee = async (projectId, employeeId) => {
    if (!window.confirm("Are you sure you want to remove this employee?")) return;

    try {
      setLoading(true);
      const project = projects.find(p => p.id === projectId);
      const currentIds = (project?.employeeIds || []).filter(id => String(id) !== String(employeeId));
      
      await axios.put(
        `${BACKEND_URL}/api/manager/projects/assign-employees/${projectId}`,
        { employeeIds: currentIds }
      );
      
      fetchProjectData();
      alert("Employee removed successfully ❌");
    } catch (err) {
      console.error("Remove Employee Error:", err);
      alert(`Failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 🔄 GET ASSIGNED EMPLOYEE DETAILS
  const getAssignedEmployeeDetails = (employeeIds) => {
    if (!employeeIds || employeeIds.length === 0) return [];
    
    return employeeIds
      .map(id => {
        const emp = employees.find(e => String(e.id) === String(id));
        return emp ? { id: emp.id, name: emp.name, employee_id: emp.employee_id } : null;
      })
      .filter(Boolean);
  };

  // 🔄 GET ASSIGNED EMPLOYEE NAMES (FOR SUMMARY)
  const getAssignedEmployeeNames = (employeeIds) => {
    if (!employeeIds || employeeIds.length === 0) return "No employees assigned";
    
    const names = employeeIds
      .map(id => {
        const emp = employees.find(e => String(e.id) === String(id));
        return emp ? emp.name : null;
      })
      .filter(Boolean);
    
    if (names.length === 0) return "No employees found";
    if (names.length <= 2) return names.join(", ");
    return `${names.slice(0, 2).join(", ")} +${names.length - 2} more`;
  };

  // 🔄 FILTERED EMPLOYEES FOR MODAL SEARCH
  const filteredEmployees = employees.filter(emp => {
    const searchLower = searchInput.toLowerCase();
    return (
      emp.name.toLowerCase().includes(searchLower) ||
      (emp.employee_id && emp.employee_id.toLowerCase().includes(searchLower)) ||
      (emp.role && emp.role.toLowerCase().includes(searchLower))
    );
  });

  const currentSelection = selectedEmployees[currentProjectId] || [];

  return (
    <div className="projects-container">
      <h2>📋 Manager Projects Dashboard</h2>

      {/* 🔍 SEARCH */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="🔍 Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          disabled={loading}
        />
      </div>

      {loading && <p style={{ textAlign: "center", color: "#666", fontSize: "14px" }}>⏳ Loading...</p>}

      {/* 🔹 TABLE 1 - STATUS */}
      <div className="projects-card">
        <h3>📊 Update Project Status</h3>
        <div className="table-wrapper">
          <table className="projects-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Project Name</th>
                <th>Description</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.length > 0 ? (
                filteredProjects.map((p, index) => (
                  <tr key={p.id} className={p.status === "Completed" ? "completed-row" : ""}>
                    <td>{index + 1}</td>
                    <td>{p.projectName || p.name || "Unnamed Project"}</td>
                    <td>{p.description || "No description"}</td>
                    <td>
                      <select
                        value={p.status || "Ongoing"}
                        onChange={(e) => handleStatusChange(p.id, e.target.value)}
                        disabled={loading}
                        className="status-select"
                      >
                        <option value="Ongoing">Ongoing</option>
                        <option value="Completed">Completed</option>
                        <option value="On Hold">On Hold</option>
                      </select>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="4" style={{textAlign: 'center', color: '#999'}}>No projects found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🔹 TABLE 2 - ASSIGN TL */}
      <div className="projects-card">
        <h3>👥 Assign Team Leader</h3>
        <div className="table-wrapper">
          <table className="projects-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Project</th>
                <th>Description</th>
                <th>Status</th>
                <th>Assign TL</th>
                <th>Assigned TL</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.length > 0 ? (
                filteredProjects.map((p, index) => {
                  const assignedTL = teamLeaders.find(
                    (tl) => String(tl.id) === String(p.teamLeaderId)
                  );

                  return (
                    <tr key={p.id} className={p.status === "Completed" ? "completed-row" : ""}>
                      <td>{index + 1}</td>
                      <td>{p.projectName || p.name}</td>
                      <td>
                        {(p.description || "").length > 40
                          ? p.description.slice(0, 40) + "..."
                          : (p.description || "N/A")}
                      </td>
                      <td>
                        <span className={`status ${(p.status || "ongoing").toLowerCase().replace(/\s+/g, "-")}`}>
                          {p.status || "Ongoing"}
                        </span>
                      </td>
                      <td>
                        <select
                          value={p.teamLeaderId || ""}
                          onChange={(e) => handleAssign(p.id, e.target.value)}
                          disabled={loading}
                          className="assign-select"
                        >
                          <option value="">Select TL</option>
                          {teamLeaders.length > 0 ? (
                            teamLeaders.map((tl) => (
                              <option key={tl.id} value={tl.id}>
                                {tl.name} ({tl.employee_id || tl.id})
                              </option>
                            ))
                          ) : (
                            <option disabled>No Team Leaders Available</option>
                          )}
                        </select>
                      </td>
                      <td>
                        {assignedTL
                          ? `${assignedTL.name} (${assignedTL.employee_id || assignedTL.id})`
                          : "❌ Not Assigned"}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan="6" style={{textAlign: 'center', color: '#999'}}>No projects available</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🔹 TABLE 3 - ASSIGN EMPLOYEES */}
      <div className="projects-card">
        <h3>👨‍💼 Assign Employees to Projects</h3>
        <div className="table-wrapper">
          <table className="projects-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Project Name</th>
                <th>Assigned Employees</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.length > 0 ? (
                filteredProjects.map((p, index) => (
                  <tr key={p.id}>
                    <td>{index + 1}</td>
                    <td><strong>{p.projectName || p.name}</strong></td>
                    <td style={{ fontSize: "0.9em", color: "#555" }}>
                      <div>
                        {getAssignedEmployeeDetails(p.employeeIds).length > 0 ? (
                          getAssignedEmployeeDetails(p.employeeIds).map((emp, idx) => (
                            <div key={idx} style={{ padding: "4px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span>{emp.name} ({emp.employee_id})</span>
                              <button
                                onClick={() => handleRemoveEmployee(p.id, emp.id)}
                                disabled={loading}
                                style={{
                                  background: "#ff4757",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "4px",
                                  padding: "4px 8px",
                                  cursor: "pointer",
                                  fontSize: "12px",
                                  marginLeft: "8px"
                                }}
                                title="Remove employee"
                              >
                                ✕ Remove
                              </button>
                            </div>
                          ))
                        ) : (
                          <span style={{ color: "#999" }}>No employees assigned</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <button
                        onClick={() => handleOpenEmployeeModal(p.id)}
                        disabled={loading}
                        className="btn-edit-employees"
                        title="Edit employee assignments"
                      >
                        ✏️ Edit
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="4" style={{textAlign: 'center', color: '#999'}}>No projects available</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🔹 EMPLOYEE ASSIGNMENT MODAL */}
      {showEmployeeModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>👥 Assign Employees to Project</h3>
              <button
                className="btn-close"
                onClick={() => setShowEmployeeModal(false)}
                title="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Modal Search */}
            <div className="modal-search">
              <input
                type="text"
                placeholder="🔍 Search employees by name, ID, or role..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="modal-search-input"
              />
              <div className="modal-search-info">
                Selected: <strong>{currentSelection.length}</strong> / {employees.length}
              </div>
            </div>

            {/* Select All / Deselect All Buttons */}
            <div className="modal-buttons-top">
              <button
                onClick={handleSelectAll}
                className="btn-select-all"
                disabled={loading}
              >
                ✓ Select All
              </button>
              <button
                onClick={handleDeselectAll}
                className="btn-deselect-all"
                disabled={loading}
              >
                ✗ Deselect All
              </button>
            </div>

            {/* Employee List */}
            <div className="modal-employees-list">
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map((emp) => {
                  const isSelected = currentSelection.includes(emp.id);
                  return (
                    <div key={emp.id} className={`employee-item ${isSelected ? 'selected' : ''}`}>
                      <label className="employee-checkbox">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleEmployeeToggle(emp.id)}
                          disabled={loading}
                        />
                        <span className="checkbox-custom"></span>
                        <span className="employee-info">
                          <strong>{emp.name}</strong>
                          <br />
                          <small>{emp.employee_id || emp.id} • {emp.role}</small>
                        </span>
                      </label>
                    </div>
                  );
                })
              ) : (
                <div className="no-employees-found">
                  ℹ️ No employees found matching "{searchInput}"
                </div>
              )}
            </div>

            {/* Modal Action Buttons */}
            <div className="modal-buttons-bottom">
              <button
                onClick={() => setShowEmployeeModal(false)}
                disabled={loading}
                className="btn-cancel"
              >
                ✕ Cancel
              </button>
              <button
                onClick={handleAssignEmployees}
                disabled={loading || currentSelection.length === 0}
                className="btn-assign"
              >
                {loading ? "⏳ Assigning..." : `✓ Assign (${currentSelection.length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerProjects;