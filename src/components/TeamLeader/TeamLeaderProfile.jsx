import React, { useState, useEffect } from "react";
import "./TeamLeaderProfile.css";
import { FaEdit, FaSave, FaCamera } from "react-icons/fa";

const TeamLeaderProfile = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [edit, setEdit] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [data, setData] = useState({});
  const [user, setUser] = useState(null);

  const API_BASE = `${process.env.REACT_APP_API_URL}`;

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const loggedUser = JSON.parse(localStorage.getItem("user"));
    if (!loggedUser || !loggedUser.id) return;

    try {
      const response = await fetch(`${API_BASE}/api/teamleader/profile/${loggedUser.id}`);
      const result = await response.json();

      if (response.ok) {
        // ✅ Format dates for HTML inputs
        setData({
          ...result,
          dob: result.dob ? result.dob.split('T')[0] : "",
          doj: result.doj ? result.doj.split('T')[0] : ""
        });
        setUser(result);
        // ✅ Construct full URL for the image or use default icon
        setImagePreview(result.profile_photo ? `${API_BASE}${result.profile_photo}` : "https://cdn-icons-png.flaticon.com/512/3135/3135715.png");
      }
    } catch (err) {
      console.error("Fetch Error:", err);
    }
  };

  const handleSaveAll = async () => {
    try {
      // 1. Save Text Data (includes all fields in the 'data' state)
      const textResponse = await fetch(`${API_BASE}/api/teamleader/profile/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      // 2. Upload Photo if a new file was selected
      if (selectedFile) {
        const formData = new FormData();
        formData.append("photo", selectedFile);
        await fetch(`${API_BASE}/api/teamleader/upload-photo/${user.id}`, {
          method: "POST",
          body: formData,
        });
      }

      if (textResponse.ok) {
        alert("Profile Updated Successfully! ✅");
        setEdit(false);
        fetchProfile(); // Refresh to get fresh DB state
      }
    } catch (err) {
      alert("Error saving profile.");
    }
  };

  const handleChange = (e) => {
    setData({ ...data, [e.target.name]: e.target.value });
  };

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-left">
          <div className="profile-img-wrapper">
            <img 
              src={imagePreview} 
              alt="Avatar" 
              className={edit ? "editing-img" : ""}
              onError={(e) => { e.target.src = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png" }}
            />
            {edit && (
              <label className="photo-edit-overlay">
                <FaCamera />
                <input type="file" accept="image/*" hidden onChange={(e) => {
                  const file = e.target.files[0];
                  if(file) {
                    setSelectedFile(file);
                    setImagePreview(URL.createObjectURL(file));
                  }
                }} />
              </label>
            )}
          </div>
          <div>
            <h2>{data.name || "User Name"}</h2>
            <p>{data.role || "Team Leader"} | {data.department || "Sales"}</p>
          </div>
        </div>

        <button className="edit-btn" onClick={() => edit ? handleSaveAll() : setEdit(true)}>
          {edit ? <><FaSave /> Save</> : <><FaEdit /> Edit</>}
        </button>
      </div>

      <div className="tabs">
        <button className={activeTab === "overview" ? "active" : ""} onClick={() => setActiveTab("overview")}>Overview</button>
        <button className={activeTab === "documents" ? "active" : ""} onClick={() => setActiveTab("documents")}>Documents</button>
      </div>

      <div className="tab-content">
        {activeTab === "overview" && (
          <div className="form-grid">
            <div className="form-group">
              <label>Full Name</label>
              <input name="name" value={data.name || ""} onChange={handleChange} disabled={!edit} />
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input name="phone" value={data.phone || ""} onChange={handleChange} disabled={!edit} />
            </div>

            <div className="form-group">
              <label>Alternate Phone</label>
              <input name="alt_phone" value={data.alt_phone || ""} onChange={handleChange} disabled={!edit} />
            </div>

            <div className="form-group">
              <label>Personal Email</label>
              <input name="personal_email" value={data.personal_email || ""} onChange={handleChange} disabled={!edit} />
            </div>

            <div className="form-group">
              <label>Date of Birth</label>
              <input type="date" name="dob" value={data.dob || ""} onChange={handleChange} disabled={!edit} />
            </div>

            <div className="form-group">
              <label>Date of Joining</label>
              <input type="date" name="doj" value={data.doj || ""} onChange={handleChange} disabled={!edit} />
            </div>

            <div className="form-group">
              <label>Blood Group</label>
              <input name="blood_group" value={data.blood_group || ""} onChange={handleChange} disabled={!edit} />
            </div>

            <div className="form-group">
              <label>Gender</label>
              <select name="gender" value={data.gender || ""} onChange={handleChange} disabled={!edit}>
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group full-width">
              <label>Address</label>
              <textarea name="address" value={data.address || ""} onChange={handleChange} disabled={!edit} />
            </div>
          </div>
        )}

        {activeTab === "documents" && (
          <div className="form-grid">
            <div className="form-group">
              <label>AADHAR CARD</label>
              <input type="file" disabled={!edit} />
            </div>
            <div className="form-group">
              <label>PAN CARD</label>
              <input type="file" disabled={!edit} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamLeaderProfile;