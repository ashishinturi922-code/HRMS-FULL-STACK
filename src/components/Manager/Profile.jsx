import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import "./ManagerProfile.css";
import { FaEdit, FaSave } from "react-icons/fa";

const ManagerProfile = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [edit, setEdit] = useState(false);
  const [image, setImage] = useState(null);
  const [documents, setDocuments] = useState({
    aadhar: null,
    pan: null,
    certificate: null
  });

  const [data, setData] = useState({});
  const [user, setUser] = useState(null);

  // ✅ FETCH PROFILE FROM DATABASE
  const fetchProfile = useCallback(async (userId) => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/manager/profile/${userId}`);
      const userData = res.data;
      
      // We map the backend names to the state
      setUser(userData);
      setData({
        ...userData,
        // Ensure CamelCase matches the Controller's req.body expectations
        officialEmail: userData.official_email || "",
        personalEmail: userData.personal_email || "",
        bloodGroup: userData.blood_group || "",
      });
      
      setImage(userData.photo || null);
      
      setDocuments({
        aadhar: userData.aadhar_file ? { name: userData.aadhar_file } : null,
        pan: userData.pan_file ? { name: userData.pan_file } : null,
        certificate: userData.certificate_file ? { name: userData.certificate_file } : null
      });
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  }, []);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser && (storedUser.id || storedUser.empId)) {
      fetchProfile(storedUser.id || storedUser.empId);
    }
  }, [fetchProfile]);

  const handleChange = (e) => {
    setData({ ...data, [e.target.name]: e.target.value });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setImage(reader.result);
    reader.readAsDataURL(file);
  };

  const handleDocUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    setDocuments(prev => ({
      ...prev,
      [type]: { name: file.name }
    }));

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);
    formData.append("userId", user.id || user.empId);

    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/manager/upload-doc`, formData);
    } catch (err) {
      console.error(`Error uploading ${type}:`, err);
    }
  };

  // ✅ SAVE PROFILE (Synchronized with ManagerController)
  const handleSaveProfile = async () => {
    try {
      const payload = {
        userId: user.id || user.empId,
        name: data.name,
        phone: data.phone,
        personalEmail: data.personalEmail,
        officialEmail: data.officialEmail,
        gender: data.gender,
        bloodGroup: data.bloodGroup,
        address: data.address,
        photo: image
      };

      const res = await axios.put(`${process.env.REACT_APP_API_URL}/api/manager/update-profile`, payload);

      if (res.data.success) {
        // Update Local Storage
        const updatedUser = { ...user, ...payload };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        
        // Refresh local state
        setUser(updatedUser);
        setEdit(false);
        
        // RE-FETCH from DB to ensure UI shows exactly what is in the table
        fetchProfile(payload.userId);
        
        alert("Profile Updated Successfully ✅");
      }
    } catch (err) {
      alert("Failed to update profile. Please check if backend columns exist.");
      console.error(err);
    }
  };

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-left">
          <div className="profile-img-wrapper">
            <img src={image || "https://i.pravatar.cc/150"} alt="Profile" />
            {edit && (
              <label className="upload-label">
                <input type="file" onChange={handleImageUpload} hidden />
                <span>Change Photo</span>
              </label>
            )}
          </div>

          <div>
            <h2>{data.name || "Manager Name"}</h2>
            <p>{data.role || "Manager"}</p>
          </div>
        </div>

        <button
          className="edit-btn"
          onClick={() => {
            if (edit) handleSaveProfile();
            else setEdit(true);
          }}
        >
          {edit ? <FaSave /> : <FaEdit />}
          {edit ? " Save" : " Edit"}
        </button>
      </div>

      <div className="tabs">
        <button onClick={() => setActiveTab("overview")} className={activeTab === "overview" ? "active" : ""}>
          Overview
        </button>
        <button onClick={() => setActiveTab("documents")} className={activeTab === "documents" ? "active" : ""}>
          Documents
        </button>
      </div>

      <div className="tab-content">
        {activeTab === "overview" && (
          <div className="form-grid">
            <div className="form-group">
              <label>Full Name</label>
              <input name="name" value={data.name || ""} onChange={handleChange} disabled={!edit} />
            </div>

            <div className="form-group">
              <label>Gender</label>
              <select name="gender" value={data.gender || ""} onChange={handleChange} disabled={!edit}>
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input name="phone" value={data.phone || ""} onChange={handleChange} disabled={!edit} />
            </div>

            <div className="form-group">
              <label>Official Email</label>
              <input name="officialEmail" value={data.officialEmail || ""} onChange={handleChange} disabled={!edit} />
            </div>

            <div className="form-group">
              <label>Personal Email</label>
              <input name="personalEmail" value={data.personalEmail || ""} onChange={handleChange} disabled={!edit} />
            </div>

            <div className="form-group">
              <label>Blood Group</label>
              <input name="bloodGroup" value={data.bloodGroup || ""} onChange={handleChange} placeholder="e.g. O+" disabled={!edit} />
            </div>

            <div className="form-group full-width">
              <label>Address</label>
              <textarea name="address" value={data.address || ""} onChange={handleChange} disabled={!edit} />
            </div>
          </div>
        )}

        {activeTab === "documents" && (
          <div className="form-grid">
            {["aadhar", "pan", "certificate"].map(type => (
              <div className="form-group" key={type}>
                <label>{type.toUpperCase()}</label>
                <div className="doc-upload-container">
                  <input type="file" onChange={(e) => handleDocUpload(e, type)} disabled={!edit} />
                  {documents[type] && (
                    <div className="doc-info">
                      <p className="doc-name">📄 {documents[type].name}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ManagerProfile;