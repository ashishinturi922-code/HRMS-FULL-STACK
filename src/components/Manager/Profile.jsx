import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import "./ManagerProfile.css";
import { FaEdit, FaSave, FaCamera } from "react-icons/fa";

const ManagerProfile = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [edit, setEdit] = useState(false);
  const [image, setImage] = useState(null);
  const [pendingPhotoFile, setPendingPhotoFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const [documents, setDocuments] = useState({ aadhar: null, pan: null, certificate: null });
  const [data, setData] = useState({});
  const [user, setUser] = useState(null);

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  const showMsg = (text, type = "success") => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(""), 3500);
  };

  const fetchProfile = useCallback(async (userId) => {
    try {
      const res = await axios.get(`${API_URL}/api/manager/profile/${userId}`);
      const d = res.data;
      setUser(d);
      setData({
        ...d,
        officialEmail: d.official_email || d.username || "",
        personalEmail: d.personal_email || "",
        bloodGroup: d.blood_group || "",
        altPhone: d.alt_phone || "",
        dob: d.dob ? d.dob.split("T")[0] : "",
      });
      if (d.profile_photo) {
        setImage(d.profile_photo.startsWith("http") ? d.profile_photo : `${API_URL}${d.profile_photo}`);
      } else {
        setImage(null);
      }
      setDocuments({
        aadhar: d.aadhar_path ? { name: d.aadhar_path } : null,
        pan: d.pan_path ? { name: d.pan_path } : null,
        certificate: d.certificate_path ? { name: d.certificate_path } : null,
      });
    } catch (err) {
      console.error("Error fetching profile:", err);
      showMsg("Failed to load profile", "error");
    }
  }, [API_URL]);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser && (storedUser.id || storedUser.empId)) {
      fetchProfile(storedUser.id || storedUser.empId);
    }
  }, [fetchProfile]);

  const handleChange = (e) => setData({ ...data, [e.target.name]: e.target.value });

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPendingPhotoFile(file);
    setImage(URL.createObjectURL(file));
  };

  const uploadPhoto = async (userId) => {
    if (!pendingPhotoFile) return;
    const formData = new FormData();
    formData.append("photo", pendingPhotoFile);
    try {
      await axios.post(`${API_URL}/api/manager/upload-photo/${userId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    } catch (err) {
      console.error("Photo upload error:", err);
      showMsg("Profile saved but photo upload failed", "error");
    }
  };

  const handleSaveProfile = async () => {
    const targetUserId = user?.id || user?.empId;
    if (!targetUserId) { showMsg("User session missing. Please log in again.", "error"); return; }

    setSaving(true);
    try {
      if (pendingPhotoFile) {
        await uploadPhoto(targetUserId);
        setPendingPhotoFile(null);
      }

      // ✅ KEY FIX: NO photo/base64 in this payload — that caused the 500
      const payload = {
        userId: targetUserId,
        name: data.name || null,
        phone: data.phone || null,
        personalEmail: data.personalEmail || null,
        officialEmail: data.officialEmail || null,
        gender: data.gender || null,
        bloodGroup: data.bloodGroup || null,
        altPhone: data.altPhone || null,
        dob: data.dob || null,
        address: data.address || null,
      };

      const res = await axios.put(`${API_URL}/api/manager/update-profile`, payload, {
        headers: { "Content-Type": "application/json" },
      });

      if (res.data.success || res.status === 200) {
        const current = JSON.parse(localStorage.getItem("user") || "{}");
        localStorage.setItem("user", JSON.stringify({ ...current, name: data.name }));
        setEdit(false);
        showMsg("Profile Updated Successfully ✅", "success");
        fetchProfile(targetUserId);
      }
    } catch (err) {
      console.error("Save Profile Error:", err);
      const errMsg = err.response?.data?.error || err.message || "Unknown error";
      showMsg("Failed to update profile: " + errMsg, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDocUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file || !user) return;
    setDocuments((prev) => ({ ...prev, [type]: { name: file.name } }));
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);
    formData.append("userId", user.id || user.empId);
    try {
      await axios.post(`${API_URL}/api/manager/upload-doc`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      showMsg(`${type.toUpperCase()} uploaded successfully ✅`, "success");
    } catch (err) {
      console.error(`Error uploading ${type}:`, err);
      showMsg(`Failed to upload ${type}`, "error");
    }
  };

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-left">
          <div className="profile-img-wrapper">
            <img
              src={image || "https://i.pravatar.cc/150"}
              alt="Profile"
              onError={(e) => { e.target.src = "https://i.pravatar.cc/150"; }}
            />
            {edit && (
              <label className="upload-label" title="Change Photo">
                <input type="file" accept="image/*" onChange={handleImageSelect} hidden />
                <span><FaCamera /> Change Photo</span>
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
          disabled={saving}
          onClick={() => { if (edit) handleSaveProfile(); else setEdit(true); }}
        >
          {edit ? <><FaSave /> {saving ? " Saving…" : " Save"}</> : <><FaEdit /> Edit</>}
        </button>
      </div>

      {message && (
        <div className={`profile-message ${messageType}`} style={{
          padding: "10px 16px", margin: "10px 0", borderRadius: "6px",
          background: messageType === "success" ? "#d4edda" : "#f8d7da",
          color: messageType === "success" ? "#155724" : "#721c24",
          border: `1px solid ${messageType === "success" ? "#c3e6cb" : "#f5c6cb"}`
        }}>
          {message}
        </div>
      )}

      <div className="tabs">
        <button onClick={() => setActiveTab("overview")} className={activeTab === "overview" ? "active" : ""}>Overview</button>
        <button onClick={() => setActiveTab("documents")} className={activeTab === "documents" ? "active" : ""}>Documents</button>
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
              <label>Alternate Phone</label>
              <input name="altPhone" value={data.altPhone || ""} onChange={handleChange} disabled={!edit} />
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
            <div className="form-group">
              <label>Date of Birth</label>
              <input type="date" name="dob" value={data.dob || ""} onChange={handleChange} disabled={!edit} />
            </div>
            <div className="form-group full-width">
              <label>Address</label>
              <textarea name="address" value={data.address || ""} onChange={handleChange} disabled={!edit} rows={3} />
            </div>
          </div>
        )}

        {activeTab === "documents" && (
          <div className="form-grid">
            {["aadhar", "pan", "certificate"].map((type) => (
              <div className="form-group" key={type}>
                <label>{type.toUpperCase()}</label>
                <div className="doc-upload-container">
                  <input type="file" onChange={(e) => handleDocUpload(e, type)} disabled={!edit} />
                  {documents[type] && <p className="doc-name">📄 {documents[type].name}</p>}
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