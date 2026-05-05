import React, { useState, useEffect } from "react";
import "./Profile.css";
import { FaEdit, FaSave } from "react-icons/fa";

const Profile = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [edit, setEdit] = useState(false);
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(true);

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
        // Robust check for ID in localStorage
        const userId = user.id || user.ID;

        if (!userId) {
          console.error("User ID missing from localStorage object");
          setLoading(false);
          return;
        }

        const res = await fetch(`${process.env.REACT_APP_API_URL}/api/profile/${userId}`);
        if (!res.ok) throw new Error("Server error");
        
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
          setImage(`${process.env.REACT_APP_API_URL}${dbData.profile_photo}`);
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false); 
      }
    };

    fetchProfile();
  }, []);

  const handleChange = (e) => {
    setData({ ...data, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    setPasswords({ ...passwords, [e.target.name]: e.target.value });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !data.id) return;

    const formData = new FormData();
    formData.append("photo", file);

    fetch(`${process.env.REACT_APP_API_URL}/api/profile/upload-photo/${data.id}`, {
      method: "POST",
      body: formData
    })
    .then(res => res.json())
    .then(r => {
      const newUrl = `${process.env.REACT_APP_API_URL}${r.photoUrl}`;
      setImage(newUrl);
      const user = JSON.parse(localStorage.getItem("user"));
      localStorage.setItem("user", JSON.stringify({...user, profile_photo: r.photoUrl}));
      window.dispatchEvent(new Event("storage"));
      alert("Photo Updated ✅");
    })
    .catch(err => alert("Photo upload failed"));
  };

  const handleDocUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file || !data.id) return;

    setDocuments(prev => ({ ...prev, [type]: { name: file.name } }));

    const formData = new FormData();
    formData.append("document", file);
    // Maps to column names expected by AdminController
    const dbColumnName = type === "aadhar" ? "aadhar_path" : type === "pan" ? "pan_path" : "certificate_path";
    formData.append("type", dbColumnName);

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/profile/upload-doc/${data.id}`, {
        method: "POST",
        body: formData
      });
      if (res.ok) alert(`${type.toUpperCase()} Uploaded ✅`);
      else alert("Upload failed");
    } catch (err) { alert("Doc upload failed"); }
  };

  const validate = () => {
    const phoneRegex = /^[0-9]{10}$/;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (data.phone && !phoneRegex.test(data.phone)) {
      alert("Phone must be 10 digits");
      return false;
    }

    if (data.personalEmail && !emailRegex.test(data.personalEmail)) {
      alert("Invalid personal email format");
      return false;
    }
    return true;
  };

  const handleSaveProfile = async () => {
    if (!validate()) return;
    
    // Ensure ID is available from state or localStorage fallback
    const userId = data.id || JSON.parse(localStorage.getItem("user"))?.id;
    
    if (!userId) {
      alert("User ID missing. Please log in again.");
      return;
    }

    const payload = {
      name: data.name,
      gender: data.gender,
      phone: data.phone,
      altPhone: data.altPhone,
      dob: data.dob,
      doj: data.doj,
      personalEmail: data.personalEmail,
      officialEmail: data.officialEmail,
      bloodGroup: data.bloodGroup,
      address: data.address
    };

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/profile/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = await res.json();

      if (res.ok) {
        // Update LocalStorage to keep session in sync
        const currentUser = JSON.parse(localStorage.getItem("user"));
        localStorage.setItem("user", JSON.stringify({ 
          ...currentUser, 
          name: data.name, 
          username: data.officialEmail 
        }));
        
        alert("Profile Updated Successfully ✅");
        setEdit(false);
        window.dispatchEvent(new Event("storage")); 
      } else {
        alert("Error: " + (result.error || "Update failed"));
      }
    } catch (err) { 
      console.error("Save error:", err);
      alert("Connection failed. Check if backend is running."); 
    }
  };

  const handlePasswordUpdate = async () => {
    if (!passwords.newPassword) return alert("Please enter a new password");
    if (passwords.newPassword !== passwords.confirmPassword) return alert("Passwords do not match");
    
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/profile/update-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: data.id, ...passwords })
      });
      const result = await res.json();
      if (res.ok) alert("Password Updated ✅");
      else alert("Update failed: " + (result.error || "Check current password"));
    } catch (err) { alert("Error updating password"); }
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
            <div className="form-group">
              <label>Current Password</label>
              <input type="password" name="currentPassword" placeholder="Enter Current Password" onChange={handlePasswordChange}/>
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input type="password" name="newPassword" placeholder="Enter New Password" onChange={handlePasswordChange}/>
            </div>
            <div className="form-group">
              <label>Confirm Password</label>
              <input type="password" name="confirmPassword" placeholder="Confirm New Password" onChange={handlePasswordChange}/>
            </div>
            <button className="update-btn" onClick={handlePasswordUpdate}>Update Password</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;