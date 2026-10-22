import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FaCamera, FaSignOutAlt, FaSpinner, FaEye, FaEyeSlash } from "react-icons/fa";
import { apiFetch } from "../api";
import { getMenuItems } from "../menu";
import ProfileHeaderButton from "../components/ProfileHeaderButton";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Profile() {
  const navigate = useNavigate();
  const menuItems = getMenuItems("/profile");
  const fileInputRef = useRef(null);

  const cachedAdmin = (() => {
    try {
      return JSON.parse(localStorage.getItem("admin") || "null");
    } catch {
      return null;
    }
  })();

  const [admin, setAdmin] = useState(cachedAdmin);
  const [error, setError] = useState("");
  const [uploadingPicture, setUploadingPicture] = useState(false);

  const [formData, setFormData] = useState({
    first_name: cachedAdmin?.first_name || "",
    middle_name: cachedAdmin?.middle_name || "",
    last_name: cachedAdmin?.last_name || "",
    contact_number: cachedAdmin?.contact_number || "",
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pwdForm, setPwdForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);

    const fetchProfile = async () => {
    try {
      const data = await apiFetch("/api/users/me");
      setAdmin(data);
      setFormData({
        first_name: data.first_name || "",
        middle_name: data.middle_name || "",
        last_name: data.last_name || "",
        contact_number: data.contact_number || "",
      });
      try {
        const cached = JSON.parse(localStorage.getItem("admin") || "{}");
        localStorage.setItem(
          "admin",
          JSON.stringify({ ...cached, ...data, profile_picture: data.profile_picture || cached.profile_picture })
        );
      } catch { /* ignore */ }
    } catch (err) {
      console.error("Error fetching profile:", err);
      if (!cachedAdmin) setError("Failed to load profile.");
      if (err.message === "Access denied." || err.message === "Invalid token.") {
        navigate("/admin-login");
      }
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "contact_number") {
      const digitsOnly = value.replace(/\D/g, "").slice(0, 11);
      setFormData((prev) => ({ ...prev, contact_number: digitsOnly }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePictureSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be less than 5MB.");
      return;
    }

    setUploadingPicture(true);
    try {
      const fd = new FormData();
      fd.append("files", file);

      const uploadRes = await fetch(`${API_BASE}/api/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: fd,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || "Upload failed.");

      const imageUrl = uploadData.files?.[0]?.url;
      if (!imageUrl) throw new Error("No URL returned from upload.");

      await apiFetch("/api/users/me", {
        method: "PUT",
        body: JSON.stringify({ profile_picture: imageUrl }),
      });

      setAdmin((prev) => ({ ...prev, profile_picture: imageUrl }));
      const stored = JSON.parse(localStorage.getItem("admin") || "{}");
      stored.profile_picture = imageUrl;
      localStorage.setItem("admin", JSON.stringify(stored));

      alert("✅ Profile picture updated!");
    } catch (err) {
      console.error("Picture upload error:", err);
      alert("Failed to update profile picture: " + err.message);
    } finally {
      setUploadingPicture(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    if (formData.contact_number) {
      const mobileRegex = /^(09)\d{9}$/;
      if (!mobileRegex.test(formData.contact_number)) {
        setError("Contact number must be 11 digits starting with 09.");
        setSaving(false);
        return;
      }
    }

    try {
      await apiFetch("/api/users/me", {
        method: "PUT",
        body: JSON.stringify({
          first_name: formData.first_name,
          middle_name: formData.middle_name,
          last_name: formData.last_name,
          contact_number: formData.contact_number,
        }),
      });

      const stored = JSON.parse(localStorage.getItem("admin") || "{}");
      stored.full_name = `${formData.first_name} ${formData.last_name}`.trim();
      localStorage.setItem("admin", JSON.stringify(stored));

      setSuccess("Profile updated successfully!");
      fetchProfile();
    } catch (err) {
      setError(err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdError("");

    if (!pwdForm.current_password || !pwdForm.new_password || !pwdForm.confirm_password) {
      setPwdError("All fields are required.");
      return;
    }
    if (pwdForm.new_password.length < 8 || pwdForm.new_password.length > 16) {
      setPwdError("New password must be between 8 and 16 characters.");
      return;
    }
    if (pwdForm.new_password !== pwdForm.confirm_password) {
      setPwdError("New passwords do not match.");
      return;
    }
    if (pwdForm.current_password === pwdForm.new_password) {
      setPwdError("New password must be different from current password.");
      return;
    }

    setPwdLoading(true);
    try {
      await apiFetch("/api/users/me/password", {
        method: "PUT",
        body: JSON.stringify({
          current_password: pwdForm.current_password,
          new_password: pwdForm.new_password,
          confirm_password: pwdForm.confirm_password,
        }),
      });
      alert("✅ Password changed successfully!");
      setShowPasswordModal(false);
      setPwdForm({ current_password: "", new_password: "", confirm_password: "" });
    } catch (err) {
      setPwdError(err.message || "Failed to change password.");
    } finally {
      setPwdLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!window.confirm("Log out from the staff panel?")) return;
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout error:", err);
    }
    localStorage.removeItem("token");
    localStorage.removeItem("admin");
    navigate("/admin-login");
  };

  const getRoleLabel = (role) => {
    if (role === "admin") return "System Administrator";
    if (role === "barangay_official") return "Barangay Official";
    return role || "Staff";
  };

    const getFullName = () => {
    if (!admin) return "";
    if (admin.first_name || admin.last_name) {
      return `${admin.first_name || ""} ${admin.last_name || ""}`.trim() || "Staff";
    }
    return admin.full_name || "Staff";
  };

  const getInitials = () => {
    if (!admin) return "?";
    if (admin.first_name || admin.last_name) {
      const f = (admin.first_name?.[0] || "").toUpperCase();
      const l = (admin.last_name?.[0] || "").toUpperCase();
      return `${f}${l}` || "?";
    }
    const parts = (admin.full_name || "").split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <>
      <div className="profile-page">

        <main className="main-content">
          <header className="top-header">
            <h2>My Profile</h2>
            <ProfileHeaderButton />
          </header>

          <section className="profile-content">
            <div className="profile-wrapper">
              {/* LEFT: avatar + role card */}
              <aside className="profile-card">
                <div className="avatar-wrapper">
                  <div className="avatar">
                    {admin?.profile_picture ? (
                      <img src={admin.profile_picture} alt="Profile" />
                    ) : (
                      <div className="avatar-initials">{getInitials()}</div>
                    )}
                  </div>

                  <button
                    type="button"
                    className="camera-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPicture}
                    title="Change profile picture"
                  >
                    {uploadingPicture ? (
                      <FaSpinner className="animate-spin" size={14} />
                    ) : (
                      <FaCamera size={14} />
                    )}
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePictureSelect}
                    style={{ display: "none" }}
                  />
                </div>

                <h2 className="profile-name">{getFullName()}</h2>
                <p className="profile-role">{getRoleLabel(admin?.role)}</p>
                <p className="profile-email">{admin?.email}</p>

                <button
                  className="change-password-btn"
                  onClick={() => setShowPasswordModal(true)}
                >
                  🔒 Change Password
                </button>

                <button className="logout-btn" onClick={handleLogout}>
                  <FaSignOutAlt size={14} style={{ marginRight: 8 }} />
                  Logout
                </button>
              </aside>

              {/* edit form */}
              <div className="profile-form-card">
                <h3>Edit Profile</h3>
                <p className="form-sub">Update your name and contact details.</p>

                {error && <div className="msg error">{error}</div>}
                {success && <div className="msg success">{success}</div>}

                <form onSubmit={handleSaveProfile}>
                  <div className="form-group">
                    <label>First Name</label>
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Middle Name</label>
                    <input
                      type="text"
                      name="middle_name"
                      value={formData.middle_name}
                      onChange={handleChange}
                      placeholder="N/A if none"
                    />
                  </div>

                  <div className="form-group">
                    <label>Last Name</label>
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      value={admin?.email || ""}
                      disabled
                      className="disabled-input"
                    />
                    <small>Email cannot be changed</small>
                  </div>

                  <div className="form-group">
                    <label>Contact Number</label>
                    <input
                      type="tel"
                      name="contact_number"
                      value={formData.contact_number}
                      onChange={handleChange}
                      placeholder="Enter Phone Number"
                      maxLength={11}
                      inputMode="numeric"
                    />
                  </div>

                  <button type="submit" className="save-btn" disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </form>
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* CHANGE PASSWORD MODAL */}
      {showPasswordModal && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Change Password</h3>
            <form onSubmit={handleChangePassword}>
              {pwdError && (
                <div className="msg error" style={{ marginBottom: 12 }}>
                  {pwdError}
                </div>
              )}

              <div className="form-group">
                <label>Current Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showCurrent ? "text" : "password"}
                    value={pwdForm.current_password}
                    onChange={(e) => setPwdForm({ ...pwdForm, current_password: e.target.value })}
                    required
                    style={{ width: '100%', paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#0B5D2A', display: 'flex', alignItems: 'center' }}
                  >
                    {showCurrent ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNew ? "text" : "password"}
                    value={pwdForm.new_password}
                    onChange={(e) => setPwdForm({ ...pwdForm, new_password: e.target.value })}
                    placeholder="Enter new password (8-16 characters)"
                    maxLength={16}
                    required
                    style={{ width: '100%', paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#0B5D2A', display: 'flex', alignItems: 'center' }}
                  >
                    {showNew ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Confirm New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={pwdForm.confirm_password}
                    onChange={(e) => setPwdForm({ ...pwdForm, confirm_password: e.target.value })}
                    maxLength={16}
                    required
                    style={{ width: '100%', paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#0B5D2A', display: 'flex', alignItems: 'center' }}
                  >
                    {showConfirm ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowPasswordModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-save" disabled={pwdLoading}>
                  {pwdLoading ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        * { box-sizing: border-box; }
        html, body, #root { margin: 0; padding: 0; width: 100%; height: 100%; }
        body { font-family: Arial, Helvetica, sans-serif; background: #ffffff; overflow: hidden; }

        .profile-page { width: 100vw; height: 100vh; display: flex; background: #ffffff; overflow: hidden; }

        .sidebar { position: relative; width: 320px; min-width: 320px; height: 100vh; flex-shrink: 0; background: #13471e; overflow: hidden; }
        .sidebar-background { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center; z-index: 0; pointer-events: none; }
        .sidebar-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(3,77,30,0.91) 0%, rgba(3,76,29,0.87) 100%); z-index: 1; pointer-events: none; }
        .sidebar-content { position: relative; z-index: 2; width: 100%; height: 100%; }
        .sidebar-brand { height: 86px; display: flex; align-items: center; padding-left: 36px; gap: 10px; }
        .sidebar-brand-image { width: 51.7px; height: 54px; object-fit: contain; display: block; flex-shrink: 0; }
        .sidebar-brand-name { color: #fff9df; font-size: 20px; font-weight: 800; line-height: 1; white-space: nowrap; }
        .sidebar-barangay { height: 5px; display: flex; align-items: center; padding-left: 70px; color: #fff9df; font-size: 11px; font-weight: 500; border-bottom: 1px solid rgba(255,255,255,0.14); }
        .sidebar-menu { width: 100%; padding-top: 5px; }
        .menu-item { width: 100%; height: 30px; border: none; margin: 0; padding: 0 14px 0 42px; display: flex; align-items: center; gap: 14px; background: transparent; color: #ffffff; font-size: 15px; font-weight: 500; text-align: left; cursor: pointer; transition: background 0.15s ease; }
        .menu-item:hover { background: rgba(255,255,255,0.09); }
        .menu-item.active { background: rgba(0,0,0,0.28); padding-left: 38px; font-weight: 700; }
        .menu-icon { width: 30px; height: 28px; object-fit: contain; display: block; flex-shrink: 0; }
        .menu-text { white-space: nowrap; line-height: 1; }

        .main-content { width: calc(100vw - 320px); height: 100vh; min-width: 0; padding: 0 12px 10px 12px; overflow: hidden; background: #ffffff; }
        .top-header { width: calc(100% + 24px); height: 76px; margin-left: -12px; padding: 0 24px 0 18px; display: flex; align-items: center; justify-content: space-between; background: #13471e; }
        .top-header h2 { margin: 0; color: #ffffff; font-size: 12px; font-weight: 800; line-height: 1; }

        .profile-content { width: 100%; height: calc(100vh - 76px); padding: 24px 8px 0 8px; overflow-y: auto; }
        .profile-wrapper { display: flex; gap: 24px; max-width: 1100px; margin: 0 auto; }

        .profile-card {
          width: 320px; flex-shrink: 0;
          background: #ffffff; border: 1px solid #a7b8aa; border-radius: 8px;
          padding: 32px 24px;
          display: flex; flex-direction: column; align-items: center;
          box-shadow: 0 2px 6px rgba(0,0,0,0.08);
        }
        .avatar-wrapper { position: relative; margin-bottom: 20px; }
        .avatar {
          width: 120px; height: 120px; border-radius: 50%;
          background: #E8F5E3; display: flex; align-items: center; justify-content: center;
          overflow: hidden;
        }
        .avatar img { width: 100%; height: 100%; object-fit: cover; }
        .avatar-initials { font-size: 42px; font-weight: 800; color: #0B5D2A; line-height: 1; }

        .camera-btn {
          position: absolute; bottom: 2px; right: 2px;
          width: 38px; height: 38px;
          border-radius: 50%;
          background: #0B5D2A; color: #ffffff;
          border: 4px solid #F8FAF8;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.20);
          transition: background 0.15s ease, transform 0.15s ease;
        }
        .camera-btn:hover:not(:disabled) { background: #084A21; transform: scale(1.05); }
        .camera-btn:disabled { opacity: 0.7; cursor: not-allowed; }

        .profile-name { margin: 0; font-size: 20px; font-weight: 800; color: #0B5D2A; text-align: center; }
        .profile-role {
          margin: 6px 0 0 0; font-size: 11px; font-weight: 700; color: #ffffff;
          background: #347145; padding: 4px 12px; border-radius: 999px;
          text-transform: uppercase; letter-spacing: 0.4px;
        }
        .profile-email { margin: 12px 0 0 0; font-size: 12px; color: #666; text-align: center; word-break: break-all; }

        .change-password-btn, .logout-btn {
          width: 100%; height: 40px; margin-top: 16px;
          border-radius: 6px; font-size: 12px; font-weight: 700;
          cursor: pointer; transition: all 0.15s ease;
          display: flex; align-items: center; justify-content: center;
        }
        .change-password-btn {
          background: #ffffff; border: 1px solid #0B5D2A; color: #0B5D2A;
        }
        .change-password-btn:hover { background: #F0F8ED; }
        .logout-btn {
          background: #ffffff; border: 1px solid #d9534f; color: #d9534f;
          margin-top: 10px;
        }
        .logout-btn:hover { background: #fdecec; }

        .profile-form-card {
          flex: 1;
          background: #ffffff; border: 1px solid #a7b8aa; border-radius: 8px;
          padding: 28px 32px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.08);
          min-width: 0;
        }
        .profile-form-card h3 { margin: 0; font-size: 16px; font-weight: 800; color: #0B5D2A; }
        .form-sub { margin: 6px 0 20px 0; font-size: 12px; color: #777; }

        .form-group { margin-bottom: 14px; }
        .form-group label { display: block; font-size: 12px; font-weight: 700; color: #333; margin-bottom: 4px; }
        .form-group input {
          width: 100%; height: 40px; padding: 0 12px;
          border: 1px solid #ccc; border-radius: 4px; font-size: 13px;
          outline: none;
        }
        .form-group input:focus { border-color: #0B5D2A; box-shadow: 0 0 0 2px rgba(11,93,42,0.10); }
        .form-group input.disabled-input { background: #f5f5f5; color: #777; cursor: not-allowed; }
        .form-group small { display: block; font-size: 10px; color: #999; margin-top: 3px; }

        .msg { padding: 10px 14px; border-radius: 6px; font-size: 12px; margin-bottom: 14px; }
        .msg.error { background: #fdecec; border: 1px solid #f5a5a5; color: #a71d1d; }
        .msg.success { background: #EFFAF2; border: 1px solid #A9C9A1; color: #1c5e30; }

        .save-btn {
          width: 100%; height: 44px; margin-top: 8px;
          border: none; border-radius: 6px;
          background: #0B5D2A; color: #ffffff;
          font-size: 13px; font-weight: 800; letter-spacing: 0.3px;
          cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.15);
          transition: background 0.15s ease;
        }
        .save-btn:hover:not(:disabled) { background: #084A21; }
        .save-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.5);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          background: #ffffff; padding: 28px 30px;
          border-radius: 8px; width: 420px; max-width: 90%;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }
        .modal-content h3 { margin: 0 0 16px 0; font-size: 16px; color: #0B5D2A; }
        .modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
        .btn-cancel { background: #ccc; border: none; padding: 8px 20px; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 12px; }
        .btn-save { background: #0B5D2A; color: white; border: none; padding: 8px 20px; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 12px; }
        .btn-save:hover:not(:disabled) { background: #084A21; }
        .btn-save:disabled { opacity: 0.6; cursor: not-allowed; }

        @media (max-width: 1100px) {
          .sidebar { width: 300px; min-width: 300px; }
          .main-content { width: calc(100vw - 300px); }
          .profile-wrapper { flex-direction: column; }
          .profile-card { width: 100%; }
        }
        @media (max-width: 850px) {
          body { overflow: auto; }
          .profile-page { width: 1100px; min-width: 1100px; height: 100vh; }
        }
      `}</style>
    </>
  );
}