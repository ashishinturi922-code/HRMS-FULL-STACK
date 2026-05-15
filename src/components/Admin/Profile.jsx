import React, { useState, useEffect } from "react";
import "./Profile.css";
import { FaEdit, FaSave, FaEye, FaEyeSlash } from "react-icons/fa";

const Profile = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [edit, setEdit] = useState(false);
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ FIX: Add visibility state for each password field
  const [showPasswords, setShowPasswords] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false
  });

  const [documents, setDocuments] = useState({
    aadhar: "",
    pan: "",
    certificate: ""
  });

  const [data, setData] = useState({
    id: "", 
    name: "",
    gender: "",
    phone: "",
    altPhone: "",
    dob: "",
    doj: "",
    personalEmail: "",
    officialEmail: "",
    bloodGroup: "",
    address: ""
  });

  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  // ✅ FIX 1: API URL Fallback
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  // ✅ FIX 2: Helper to get Authorization headers for fetch API
  const getAuthHeaders = (isFormData = false) => {
    const token = localStorage.getItem("token");
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    const finalToken = token || storedUser?.token || "";

    const headers = {
      Authorization: `Bearer ${finalToken}`
    };

    if (!isFormData) {
      headers["Content-Type"] = "application/json";
    }

    return headers;
  };

  // --- FETCH DATA FROM BACKEND ---
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const storedUser = localStorage.getItem("user");
        if (!storedUser) {
          console.warn("No user found in localStorage");
          setLoading(false);
          return;
        }

        const user = JSON.parse(storedUser);
        const userId = user.id || user.ID;

        if (!userId) {
          console.error("User ID missing from localStorage object");
          setLoading(false);
          return;
        }

        const res = await fetch(`${API_URL}/api/profile/${userId}`, {
          method: "GET",
          headers: getAuthHeaders()
        });

        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        
        const dbData = await res.json();
        
        setData({
          id: dbData.id || userId,
          name: dbData.name || "",
          gender: dbData.gender || "",
          phone: dbData.phone || "",
          altPhone: dbData.alt_phone || "",
          dob: dbData.dob ? dbData.dob.split('T')[0] : "",
          doj: dbData.doj ? dbData.doj.split('T')[0] : "",
          personalEmail: dbData.personal_email || "",
          officialEmail: dbData.username || "", 
          bloodGroup: dbData.blood_group || "",
          address: dbData.address || ""
        });
        
        if (dbData.profile_photo) {
          setImage(`${API_URL}${dbData.profile_photo}`);
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setMessage("Failed to load profile");
        setMessageType("error");
      } finally {
        setLoading(false); 
      }
    };

    fetchProfile();
  }, [API_URL]);

  const handleChange = (e) => {
    setData({ ...data, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    setPasswords({ ...passwords, [e.target.name]: e.target.value });
  };

  // ✅ FIX: Toggle password visibility
  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !data.id) return;

    const formData = new FormData();
    formData.append("photo", file);

    fetch(`${API_URL}/api/profile/upload-photo/${data.id}`, {
      method: "POST",
      headers: getAuthHeaders(true),
      body: formData
    })
    .then(async (res) => {
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    })
    .then(r => {
      const newUrl = `${API_URL}${r.photoUrl}`;
      setImage(newUrl);
      const user = JSON.parse(localStorage.getItem("user"));
      localStorage.setItem("user", JSON.stringify({...user, profile_photo: r.photoUrl}));
      window.dispatchEvent(new Event("storage"));
      setMessage("Photo Updated ✅");
      setMessageType("success");
    })
    .catch(err => {
      setMessage("Photo upload failed: " + err.message);
      setMessageType("error");
    });
  };

  const handleDocUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file || !data.id) return;

    setDocuments(prev => ({ ...prev, [type]: { name: file.name } }));

    const formData = new FormData();
    formData.append("document", file);
    const dbColumnName = type === "aadhar" ? "aadhar_path" : type === "pan" ? "pan_path" : "certificate_path";
    formData.append("type", dbColumnName);

    try {
      const res = await fetch(`${API_URL}/api/profile/upload-doc/${data.id}`, {
        method: "POST",
        headers: getAuthHeaders(true),
        body: formData
      });
      if (res.ok) {
        setMessage(`${type.toUpperCase()} Uploaded ✅`);
        setMessageType("success");
      } else {
        setMessage("Upload failed");
        setMessageType("error");
      }
    } catch (err) { 
      setMessage("Doc upload failed");
      setMessageType("error");
    }
  };

  const validate = () => {
    const phoneRegex = /^[0-9]{10}$/;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (data.phone && !phoneRegex.test(data.phone)) {
      setMessage("Phone must be 10 digits");
      setMessageType("error");
      return false;
    }

    if (data.personalEmail && !emailRegex.test(data.personalEmail)) {
      setMessage("Invalid personal email format");
      setMessageType("error");
      return false;
    }
    return true;
  };

  const handleSaveProfile = async () => {
    if (!validate()) return;
    
    const userId = data.id || JSON.parse(localStorage.getItem("user"))?.id;
    
    if (!userId) {
      setMessage("User ID missing. Please log in again.");
      setMessageType("error");
      return;
    }

    const payload = {
      name: data.name,
      gender: data.gender,
      phone: data.phone,
      alt_phone: data.altPhone,
      dob: data.dob,
      doj: data.doj,
      personal_email: data.personalEmail,
      username: data.officialEmail,
      blood_group: data.bloodGroup,
      address: data.address
    };

    try {
      const res = await fetch(`${API_URL}/api/profile/${userId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      const result = await res.json();

      if (res.ok) {
        const currentUser = JSON.parse(localStorage.getItem("user"));
        localStorage.setItem("user", JSON.stringify({ 
          ...currentUser, 
          name: data.name, 
          username: data.officialEmail 
        }));
        
        setMessage("Profile Updated Successfully ✅");
        setMessageType("success");
        setEdit(false);
        window.dispatchEvent(new Event("storage")); 
      } else {
        setMessage("Error: " + (result.error || "Update failed"));
        setMessageType("error");
      }
    } catch (err) { 
      console.error("Save error:", err);
      setMessage("Connection failed. Check if backend is running."); 
      setMessageType("error");
    }
  };

  const handlePasswordUpdate = async () => {
    if (!passwords.currentPassword) {
      setMessage("Please enter your current password");
      setMessageType("error");
      return;
    }
    if (!passwords.newPassword) {
      setMessage("Please enter a new password");
      setMessageType("error");
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      setMessage("Passwords do not match");
      setMessageType("error");
      return;
    }
    
    try {
      const res = await fetch(`${API_URL}/api/profile/update-password`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ 
          id: data.id, 
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword 
        })
      });
      const result = await res.json();
      if (res.ok) {
        setMessage("Password Updated ✅");
        setMessageType("success");
        setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        setMessage("Update failed: " + (result.error || "Check current password"));
        setMessageType("error");
      }
    } catch (err) { 
      setMessage("Error updating password");
      setMessageType("error");
    }
  };

  if (loading) return <div className="loading-container"><h2>Loading Profile...</h2></div>;

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-left">
          <div className="profile-img-wrapper">
            <img src={image || "https://i.pravatar.cc/150"} alt="Profile" />
            {edit && <input type="file" className="file-input-overlay" onChange={handleImageUpload} />}
          </div>
          <div>
            <h2>{data.name || "User"}</h2>
            <p>Admin</p>
          </div>
        </div>

        <div className="header-actions">
          <button className="edit-btn" onClick={() => edit ? handleSaveProfile() : setEdit(true)}>
            {edit ? <><FaSave /> Save</> : <><FaEdit /> Edit</>}
          </button>
        </div>
      </div>

      {message && (
        <div className={`message ${messageType}`}>
          {message}
        </div>
      )}

      <div className="tabs">
        <button onClick={() => setActiveTab("overview")} className={activeTab==="overview"?"active":""}>Overview</button>
        <button onClick={() => setActiveTab("documents")} className={activeTab==="documents"?"active":""}>Documents</button>
        <button onClick={() => setActiveTab("security")} className={activeTab==="security"?"active":""}>Security</button>
      </div>

      <div className="tab-content">
        {activeTab === "overview" && (
          <div className="form-grid">
            <div className="form-group"><label>Full Name</label><input name="name" value={data.name} onChange={handleChange} disabled={!edit}/></div>
            <div className="form-group">
              <label>Gender</label>
              <select name="gender" value={data.gender} onChange={handleChange} disabled={!edit}>
                <option value="">Select</option>
                <option>Male</option><option>Female</option>
              </select>
            </div>
            <div className="form-group"><label>Phone</label><input name="phone" value={data.phone} onChange={handleChange} disabled={!edit}/></div>
            <div className="form-group"><label>Official Email</label><input name="officialEmail" value={data.officialEmail} onChange={handleChange} disabled={!edit}/></div>
            <div className="form-group"><label>Personal Email</label><input name="personalEmail" value={data.personalEmail} onChange={handleChange} disabled={!edit}/></div>
            <div className="form-group">
              <label>Blood Group</label>
              <input name="bloodGroup" value={data.bloodGroup} onChange={handleChange} disabled={!edit} placeholder="e.g. O+"/>
            </div>
            <div className="form-group full-width"><label>Address</label><textarea name="address" value={data.address} onChange={handleChange} disabled={!edit}/></div>
          </div>
        )}

        {activeTab === "documents" && (
          <div className="form-grid">
            {["aadhar","pan","certificate"].map(type => (
              <div className="form-group" key={type}>
                <label>{type.toUpperCase()}</label>
                <input type="file" onChange={(e)=>handleDocUpload(e,type)} />
                {documents[type]?.name && <p className="file-hint">{documents[type].name}</p>}
              </div>
            ))}
          </div>
        )}

        {activeTab === "security" && (
          <div className="security-box">
            {/* ✅ Current Password with Eye Icon */}
            <div className="form-group password-group">
              <label>Current Password</label>
              <div className="password-input-wrapper">
                <input 
                  type={showPasswords.currentPassword ? "text" : "password"} 
                  name="currentPassword" 
                  placeholder="Enter Current Password" 
                  value={passwords.currentPassword}
                  onChange={handlePasswordChange}
                />
                <button 
                  type="button"
                  className="eye-btn"
                  onClick={() => togglePasswordVisibility("currentPassword")}
                >
                  {showPasswords.currentPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            {/* ✅ New Password with Eye Icon */}
            <div className="form-group password-group">
              <label>New Password</label>
              <div className="password-input-wrapper">
                <input 
                  type={showPasswords.newPassword ? "text" : "password"} 
                  name="newPassword" 
                  placeholder="Enter New Password" 
                  value={passwords.newPassword}
                  onChange={handlePasswordChange}
                />
                <button 
                  type="button"
                  className="eye-btn"
                  onClick={() => togglePasswordVisibility("newPassword")}
                >
                  {showPasswords.newPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            {/* ✅ Confirm Password with Eye Icon */}
            <div className="form-group password-group">
              <label>Confirm Password</label>
              <div className="password-input-wrapper">
                <input 
                  type={showPasswords.confirmPassword ? "text" : "password"} 
                  name="confirmPassword" 
                  placeholder="Confirm New Password" 
                  value={passwords.confirmPassword}
                  onChange={handlePasswordChange}
                />
                <button 
                  type="button"
                  className="eye-btn"
                  onClick={() => togglePasswordVisibility("confirmPassword")}
                >
                  {showPasswords.confirmPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <button className="update-btn" onClick={handlePasswordUpdate}>Update Password</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;