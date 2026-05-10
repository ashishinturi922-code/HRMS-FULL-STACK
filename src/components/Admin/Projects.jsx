import React, { useState, useEffect } from "react";
import "./Projects.css";
import API_URL from "../../apiConfig"; // ✅ FIX: Imported the working API config
import {
  FaPlus,
  FaEye,
  FaTrash,
  FaSearch,
  FaFolder,
  FaClock,
  FaCheckCircle,
} from "react-icons/fa";

const Projects = () => {
  // Used for permission logic and display
  const currentUser = JSON.parse(localStorage.getItem("user")) || { role: "Admin" };

  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  const [showModal, setShowModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
    managerId: "",
  });

  // 1. FETCH DATA FROM BACKEND
  const fetchData = async () => {
    try {
      const [projRes, empRes] = await Promise.all([
        fetch(`${API_URL}/api/projects`), // ✅ FIX: Using API_URL
        fetch(`${API_URL}/api/employees`) // ✅ FIX: Using API_URL
      ]);
      const projData = await projRes.json();
      const empData = await empRes.json();
      
      setProjects(Array.isArray(projData) ? projData : []);
      setEmployees(Array.isArray(empData) ? empData : []);
    } catch (err) {
      console.error("Connection error:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter managers for the dropdown
  const managers = employees.filter(
    (emp) => emp.role?.toLowerCase() === "manager"
  );

  /* COUNTS FOR STAT CARDS */
  const totalProjects = projects.length;
  const ongoingProjects = projects.filter(p => p.status === "Ongoing").length;
  const completedProjects = projects.filter(p => p.status === "Completed").length;

  /* CREATE NEW PROJECT */
  const handleAdd = async (e) => {
    e.preventDefault();
    const manager = managers.find(m => String(m.employee_id) === String(newProject.managerId));
    
    if (!manager) {
      alert("Please select a valid Manager");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/projects/create`, { // ✅ FIX: Using API_URL
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newProject,
          managerName: manager.name
        }),
      });

      if (response.ok) {
        setShowModal(false);
        setNewProject({ name: "", description: "", managerId: "" });
        fetchData(); // Refresh list from DB
      }
    } catch (err) {
      alert("Failed to create project");
    }
  };

  /* UPDATE STATUS (Complete Project) */
  const handleStatusChange = async (id, newStatus) => {
    try {
      const response = await fetch(`${API_URL}/api/projects/${id}/status`, { // ✅ FIX: Using API_URL
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (response.ok) fetchData();
    } catch (err) {
      console.error("Failed to update status");
    }
  };

  /* DELETE PROJECT */
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this project?")) return;
    try {
      const response = await fetch(`${API_URL}/api/projects/${id}`, { // ✅ FIX: Using API_URL
        method: "DELETE"
      });
      if (response.ok) fetchData();
    } catch (err) {
      console.error("Failed to delete project");
    }
  };

  /* FILTERING LOGIC */
  const filteredProjects = projects.filter((p) => {
    const matchSearch = 
      p.name?.toLowerCase().includes(search.toLowerCase()) || 
      p.managerName?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "All" || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="projects-container">
      {/* HEADER */}
      <div className="projects-header">
        <h2>Project Management ({currentUser.role})</h2>
        <button className="create-btn" onClick={() => setShowModal(true)}>
          <FaPlus /> Create Project
        </button>
      </div>

      {/* STATS CARDS */}
      <div className="stats-grid">
        <div className="stat-card">
          <FaFolder className="stat-icon" />
          <div>
            <h4>Total Projects</h4>
            <p>{totalProjects}</p>
          </div>
        </div>
        <div className="stat-card">
          <FaClock className="stat-icon ongoing" />
          <div>
            <h4>Ongoing</h4>
            <p>{ongoingProjects}</p>
          </div>
        </div>
        <div className="stat-card">
          <FaCheckCircle className="stat-icon completed" />
          <div>
            <h4>Completed</h4>
            <p>{completedProjects}</p>
          </div>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="toolbar">
        <div className="search-bar">
          <FaSearch />
          <input 
            type="text" 
            placeholder="Search project or manager..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select 
          value={filterStatus} 
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="All">All Status</option>
          <option value="Ongoing">Ongoing</option>
          <option value="Completed">Completed</option>
        </select>
      </div>

      {/* PROJECTS TABLE */}
      <table className="projects-table">
        <thead>
          <tr>
            <th>Project Name</th>
            <th>Manager</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredProjects.length > 0 ? (
            filteredProjects.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.managerName}</td>
                <td>
                  <span className={`status-badge ${p.status.toLowerCase()}`}>
                    {p.status}
                  </span>
                </td>
                <td className="actions">
                  <button 
                    title="View Details"
                    onClick={() => { setSelectedProject(p); setViewModal(true); }}
                  >
                    <FaEye />
                  </button>

                  {/* Permission: Only non-admins can complete projects */}
                  {currentUser.role !== "Admin" && p.status !== "Completed" && (
                    <button 
                      className="complete-btn"
                      title="Mark as Completed"
                      onClick={() => handleStatusChange(p.id, "Completed")}
                    >
                      <FaCheckCircle />
                    </button>
                  )}

                  <button 
                    className="delete-btn"
                    title="Delete Project"
                    onClick={() => handleDelete(p.id)}
                  >
                    <FaTrash />
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4" className="no-data">No projects found.</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* CREATE MODAL */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3>Create New Project</h3>
            <form onSubmit={handleAdd}>
              <input
                type="text"
                placeholder="Project Name"
                required
                value={newProject.name}
                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
              />
              <textarea
                placeholder="Project Description"
                required
                value={newProject.description}
                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
              />
              <select
                required
                value={newProject.managerId}
                onChange={(e) => setNewProject({ ...newProject, managerId: e.target.value })}
              >
                <option value="">Select Manager</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.employee_id}>
                    {m.employee_id} - {m.name}
                  </option>
                ))}
              </select>

              <div className="modal-actions">
                <button type="submit" className="primary-btn">Create</button>
                <button type="button" className="secondary-btn" onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {viewModal && selectedProject && (
        <div className="modal-overlay" onClick={() => setViewModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>Project Details</h3>
            <div className="details-content">
              <p><b>Name:</b> {selectedProject.name}</p>
              <p><b>Description:</b> {selectedProject.description}</p>
              <p><b>Manager:</b> {selectedProject.managerName}</p>
              <p><b>Status:</b> {selectedProject.status}</p>
            </div>
            <button className="primary-btn" onClick={() => setViewModal(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;