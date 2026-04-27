import React, { useState, useEffect } from "react";
import "./EmployeeProfile.css";
import { FaEdit, FaSave } from "react-icons/fa";

const EmployeeProfile = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [edit, setEdit] = useState(false);
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const [documents, setDocuments] = useState({
    aadhar: null,
    pan: null,
    certificate: null
  });

  const [data, setData] = useState({});
  const [user, setUser] = useState(null);

  // Helper to format date for the input field (YYYY-MM-DD)
  const formatDate = (dateString) => {
    if (!dateString) return "";
    return dateString.split("T")[0];
  };

  // ✅ 1. FETCH PROFILE FROM DATABASE ON LOAD
  useEffect(() => {
    const fetchProfile = async () => {
      const loggedUser = JSON.parse(localStorage.getItem("user")) || {};
      if (!loggedUser.id) return;

      try {
        const response = await fetch(`http://192.168.0.165:5000/api/employee/profile/${loggedUser.id}`);
        const dbData = await response.json();

        if (response.ok) {
          setUser(dbData);
          setData({
            ...dbData,
            dob: formatDate(dbData.dob),
            doj: formatDate(dbData.doj),
            // Ensure fields match frontend naming conventions
            altPhone: dbData.altPhone || dbData.alt_phone || ""
          });
          setImage(dbData.photo || dbData.profile_photo || null);
          
          const docs = JSON.parse(localStorage.getItem(`documents_${loggedUser.id}`)) || {};
          setDocuments(docs);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };

    fetchProfile();
  }, []);

  // INPUT CHANGE
  const handleChange = (e) => {
    setData({ ...data, [e.target.name]: e.target.value });
  };

  // IMAGE UPLOAD (Base64 for profile photo)
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onloadend = () => setImage(reader.result);
    if (file) reader.readAsDataURL(file);
  };

  // DOCUMENT UPLOAD
  const handleDocUpload = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const preview = URL.createObjectURL(file);
    const updatedDocs = {
      ...documents,
      [type]: { name: file.name, preview }
    };

    setDocuments(updatedDocs);
    localStorage.setItem(`documents_${user.id}`, JSON.stringify(updatedDocs));
  };

  // ✅ 2. SAVE PROFILE TO DATABASE
  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const payload = {
        userId: user.id,
        name: data.name,
        phone: data.phone,
        personalEmail: data.personalEmail,
        officialEmail: data.officialEmail,
        address: data.address,
        gender: data.gender,
        dob: data.dob,
        altPhone: data.altPhone, // Maps to alt_phone in DB
        bloodGroup: data.bloodGroup,
        photo: image 
      };

      const response = await fetch("http://192.168.0.165:5000/api/employee/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        const updatedUser = { ...user, ...data, photo: image };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        
        // Notify Sidebar/Topbar to update
        window.dispatchEvent(new Event("userUpdated"));

        setUser(updatedUser);
        setEdit(false);
        alert("Profile Updated Successfully ✅");
      } else {
        alert("Failed to update: " + result.error);
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-page">
      {/* HEADER */}
      <div className="profile-header">
        <div className="profile-left">
          <div className="profile-img-wrapper">
            <img src={image || "https://i.pravatar.cc/150"} alt="Profile" />
            {edit && <input type="file" onChange={handleImageUpload} />}
          </div>
          <div>
            <h2>{data.name || "Your Name"}</h2>
            <p>{data.role || "Employee"}</p>
          </div>
        </div>

        <button
          className="edit-btn"
          disabled={loading}
          onClick={() => {
            if (edit) handleSaveProfile();
            else setEdit(true);
          }}
        >
          {loading ? "Saving..." : (edit ? <><FaSave /> Save</> : <><FaEdit /> Edit</>)}
        </button>
      </div>

      {/* TABS */}
      <div className="tabs">
        <button onClick={() => setActiveTab("overview")} className={activeTab === "overview" ? "active" : ""}>Overview</button>
        <button onClick={() => setActiveTab("documents")} className={activeTab === "documents" ? "active" : ""}>Documents</button>
      </div>

      <div className="tab-content">
        {activeTab === "overview" && (
          <div className="form-grid">
            <div className="form-group">
              <label>Full Name</label>
              <input name="name" value={data.name || ""} onChange={handleChange} disabled={!edit}/>
            </div>
            <div className="form-group">
              <label>Gender</label>
              <select name="gender" value={data.gender || ""} onChange={handleChange} disabled={!edit}>
                <option value="">Select</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input name="phone" value={data.phone || ""} onChange={handleChange} disabled={!edit}/>
            </div>
            <div className="form-group">
              <label>Alternate Phone (Emergency)</label>
              <input name="altPhone" value={data.altPhone || ""} onChange={handleChange} disabled={!edit}/>
            </div>
            <div className="form-group">
              <label>Date of Birth</label>
              <input type="date" name="dob" value={data.dob || ""} onChange={handleChange} disabled={!edit}/>
            </div>
            <div className="form-group">
              <label>Personal Email</label>
              <input name="personalEmail" value={data.personalEmail || ""} onChange={handleChange} disabled={!edit}/>
            </div>
            <div className="form-group">
              <label>Official Email</label>
              <input name="officialEmail" value={data.officialEmail || ""} onChange={handleChange} disabled={!edit}/>
            </div>
            <div className="form-group">
              <label>Blood Group</label>
              <input name="bloodGroup" value={data.bloodGroup || ""} onChange={handleChange} disabled={!edit}/>
            </div>
            <div className="form-group full-width">
              <label>Address</label>
              <textarea name="address" value={data.address || ""} onChange={handleChange} disabled={!edit}/>
            </div>
          </div>
        )}

        {/* DOCUMENTS */}
        {activeTab === "documents" && (
          <div className="form-grid">
            {["aadhar", "pan", "certificate"].map(type => (
              <div key={type} className="form-group">
                <label>{type.toUpperCase()}</label>
                <input type="file" onChange={(e)=>handleDocUpload(e,type)} disabled={!edit}/>
                {documents[type] && <p>{documents[type].name}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeProfile;