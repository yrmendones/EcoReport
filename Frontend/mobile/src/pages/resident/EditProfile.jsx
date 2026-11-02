import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaCamera,
  FaUserCircle,
  FaSpinner,
  FaCheckCircle,
} from "react-icons/fa";
import { apiFetch } from "../../api";

const API_BASE = import.meta.env.DEV ? "" : (import.meta.env.VITE_API_URL || "http://localhost:5000");

export default function EditProfile() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    house_no: "",
    street: "",
    contact_number: "",
    profile_picture: "",
    email: "",
  });

  const [showNameModal, setShowNameModal] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);

  const [nameSnapshot, setNameSnapshot] = useState(null);
  const [addressSnapshot, setAddressSnapshot] = useState(null);

  const [profilePicturePreview, setProfilePicturePreview] = useState("");
  const [uploadingPicture, setUploadingPicture] = useState(false);

  const BARANGAY_ADDRESS = "P. Sto. Rosario Kanluran, Pateros";

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const data = await apiFetch("/api/users/me");
        setFormData({
          first_name: data.first_name || "",
          middle_name: data.middle_name || "",
          last_name: data.last_name || "",
          house_no: data.house_no || "",
          street: data.street || "",
          contact_number: data.contact_number || "",
          profile_picture: data.profile_picture || "",
          email: data.email || "",
        });
        if (data.profile_picture) {
          setProfilePicturePreview(data.profile_picture);
        }
      } catch (err) {
        console.error("Error fetching user:", err);
        setError("Failed to load profile data.");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
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

  const updateNameField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateAddressField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // ─── Name modal ───
  const openNameModal = () => {
    setNameSnapshot({
      first_name: formData.first_name,
      middle_name: formData.middle_name,
      last_name: formData.last_name,
    });
    setShowNameModal(true);
  };

  const cancelNameModal = () => {
    if (nameSnapshot) {
      setFormData((prev) => ({
        ...prev,
        first_name: nameSnapshot.first_name,
        middle_name: nameSnapshot.middle_name,
        last_name: nameSnapshot.last_name,
      }));
    }
    setShowNameModal(false);
  };

  const saveNameModal = () => {
    setShowNameModal(false);
  };

  // ─── Address modal ───
  const openAddressModal = () => {
    setAddressSnapshot({
      house_no: formData.house_no,
      street: formData.street,
    });
    setShowAddressModal(true);
  };

  const cancelAddressModal = () => {
    if (addressSnapshot) {
      setFormData((prev) => ({
        ...prev,
        house_no: addressSnapshot.house_no,
        street: addressSnapshot.street,
      }));
    }
    setShowAddressModal(false);
  };

  const saveAddressModal = () => {
    setShowAddressModal(false);
  };

  const handleProfilePictureUpload = async (e) => {
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

    const reader = new FileReader();
    reader.onload = () => {
      setProfilePicturePreview(reader.result);
    };
    reader.readAsDataURL(file);

    setUploadingPicture(true);

    try {
      const fd = new FormData();
      fd.append("files", file);

      const response = await fetch(`${API_BASE}/api/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: fd,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Upload failed.");

      if (data.files && data.files.length > 0) {
        const imageUrl = data.files[0].url;
        setFormData((prev) => ({ ...prev, profile_picture: imageUrl }));
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        user.profile_picture = imageUrl;
        localStorage.setItem("user", JSON.stringify(user));
      }
    } catch (err) {
      console.error("Error uploading profile picture:", err);
      alert("Failed to upload profile picture.");
      setProfilePicturePreview(formData.profile_picture || "");
    } finally {
      setUploadingPicture(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess(false);

    if (formData.contact_number) {
      const mobileRegex = /^(09)\d{9}$/;
      if (!mobileRegex.test(formData.contact_number)) {
        setError("Contact number must be 11 digits starting with 09.");
        setSubmitting(false);
        return;
      }
    }

    try {
      const baseAddress = `${formData.house_no || ""} ${formData.street || ""}`.trim();
      const fullAddress = baseAddress
        ? `${baseAddress}, ${BARANGAY_ADDRESS}`
        : BARANGAY_ADDRESS;

      const updateData = {
        first_name: formData.first_name,
        middle_name: formData.middle_name,
        last_name: formData.last_name,
        house_no: formData.house_no,
        street: formData.street,
        contact_number: formData.contact_number,
        address: fullAddress,
        profile_picture: formData.profile_picture || null,
      };

      await apiFetch("/api/users/me", {
        method: "PUT",
        body: JSON.stringify(updateData),
      });

      setSuccess(true);

      const user = JSON.parse(localStorage.getItem("user") || "{}");
      user.full_name = `${formData.first_name} ${formData.last_name}`;
      user.profile_picture = formData.profile_picture;
      localStorage.setItem("user", JSON.stringify(user));

      setTimeout(() => {
        navigate("/profile");
      }, 1500);
    } catch (err) {
      setError(err.message || "Failed to update profile.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#E5E7EB] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <FaSpinner className="animate-spin text-[#0B5D2A]" size={40} />
          <p className="text-[#0B5D2A] font-bold">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E5E7EB] flex justify-center items-center py-6 px-3">
      <div className="relative w-[390px] h-[844px] bg-[#F8FAF8] rounded-[40px] border-[5px] border-white shadow-2xl overflow-hidden flex flex-col">
        <header className="relative h-[82px] bg-[#0B5D2A] flex items-center justify-center shrink-0">
          <button
            type="button"
            onClick={() => navigate("/profile")}
            className="absolute left-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center text-white text-[20px] bg-white/10 hover:bg-white/20 active:scale-95 transition"
          >
            <FaArrowLeft />
          </button>
          <h1 className="text-white text-[21px] font-extrabold">Edit Profile</h1>
        </header>

        <main className="flex-1 overflow-y-auto px-6 pt-8 pb-8 no-scrollbar">
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col items-center justify-center mb-9">
              <div className="relative">
                <div className="w-[105px] h-[105px] rounded-full bg-[#E8F5E3] flex items-center justify-center shadow-sm overflow-hidden">
                  {profilePicturePreview ? (
                    <img src={profilePicturePreview} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <FaUserCircle size={96} className="text-[#0B5D2A]" />
                  )}
                </div>
                <label className="absolute bottom-1 right-0 w-10 h-10 rounded-full bg-[#0B5D2A] border-4 border-[#F8FAF8] flex items-center justify-center cursor-pointer shadow-md hover:bg-[#084A21] active:scale-95 transition">
                  {uploadingPicture ? (
                    <FaSpinner className="animate-spin text-white" size={16} />
                  ) : (
                    <FaCamera size={16} className="text-white" />
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleProfilePictureUpload} />
                </label>
              </div>
              <p className="text-[11px] text-gray-500 text-center mt-4">
                Tap the camera icon to change photo
              </p>
              {uploadingPicture && (
                <p className="text-[10px] text-[#0B5D2A] mt-1">Uploading...</p>
              )}
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-green-100 border border-green-400 rounded-lg flex items-center gap-3 text-green-700 text-sm">
                <FaCheckCircle size={18} />
                <span>Profile updated successfully!</span>
              </div>
            )}

            <div className="space-y-7">
              <div>
                <label className="block text-[13px] font-bold text-gray-800 mb-2">Full Name</label>
                <button
                  type="button"
                  onClick={openNameModal}
                  className="w-full min-h-[52px] bg-white border border-[#C8DCC3] rounded-2xl px-4 py-3 text-left hover:border-[#0B5D2A] transition"
                >
                  <span className="text-[13px] text-gray-800 truncate block">
                    {[formData.first_name, formData.middle_name, formData.last_name]
                      .filter((n) => n && n.trim())
                      .join(" ") || "Tap to set name"}
                  </span>
                </button>
              </div>

              <div>
                <label className="block text-[13px] font-bold text-gray-800 mb-2">Address</label>
                <button
                  type="button"
                  onClick={openAddressModal}
                  className="w-full min-h-[52px] bg-white border border-[#C8DCC3] rounded-2xl px-4 py-3 text-left hover:border-[#0B5D2A] transition"
                >
                  <span className="text-[13px] text-gray-800 truncate block">
                    {[formData.house_no, formData.street]
                      .filter((n) => n && n.trim())
                      .join(" ") || "Tap to set address"}
                  </span>
                </button>
              </div>

              <div>
                <label className="block text-[13px] font-bold text-gray-800 mb-2">Contact Number</label>
                <input
                  type="tel"
                  name="contact_number"
                  value={formData.contact_number}
                  onChange={handleChange}
                  placeholder="Enter Phone Number"
                  maxLength={11}
                  inputMode="numeric"
                  className="w-full h-[52px] bg-white border border-[#C8DCC3] rounded-2xl px-4 text-[13px] outline-none focus:border-[#0B5D2A] focus:ring-2 focus:ring-[#0B5D2A]/10 transition"
                />
              </div>

              <div>
                <label className="block text-[13px] font-bold text-gray-800 mb-2">Email Address</label>
                <input
                  type="email"
                  value={formData.email || "Not set"}
                  className="w-full h-[52px] bg-gray-100 border border-gray-300 rounded-2xl px-4 text-[13px] text-gray-500 outline-none cursor-not-allowed"
                  disabled
                  readOnly
                />
                <p className="text-[10px] text-gray-400 mt-1">Email cannot be changed for security reasons</p>
              </div>
            </div>

            <div className="h-10" />

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-[54px] rounded-2xl bg-[#0B5D2A] text-white font-extrabold text-[14px] flex items-center justify-center gap-2 shadow-md hover:bg-[#084A21] active:scale-[0.98] transition disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <FaSpinner className="animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>

            <div className="h-6" />
          </form>
        </main>

        <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none z-30">
          <div className="w-[70px] h-[5px] rounded-full bg-gray-800 opacity-70" />
        </div>

        {/* ─── NAME MODAL ─── */}
        {showNameModal && (
          <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center"
            style={{ zIndex: 9999, padding: "20px" }}
            onClick={cancelNameModal}
          >
            <div
              className="bg-white rounded-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl"
              style={{ maxWidth: "340px", padding: "28px" }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-[16px] font-extrabold text-[#0B5D2A]" style={{ marginBottom: "20px" }}>
                Edit Full Name
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label className="block text-[12px] font-bold text-gray-800" style={{ marginBottom: "6px" }}>
                    First Name
                  </label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => updateNameField("first_name", e.target.value)}
                    className="w-full bg-white border border-[#C8DCC3] rounded-xl text-[13px] outline-none focus:border-[#0B5D2A]"
                    style={{ height: "46px", padding: "0 12px" }}
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-gray-800" style={{ marginBottom: "6px" }}>
                    Middle Name
                  </label>
                  <input
                    type="text"
                    value={formData.middle_name}
                    onChange={(e) => updateNameField("middle_name", e.target.value)}
                    placeholder="N/A if none"
                    className="w-full bg-white border border-[#C8DCC3] rounded-xl text-[13px] outline-none focus:border-[#0B5D2A]"
                    style={{ height: "46px", padding: "0 12px" }}
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-gray-800" style={{ marginBottom: "6px" }}>
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => updateNameField("last_name", e.target.value)}
                    className="w-full bg-white border border-[#C8DCC3] rounded-xl text-[13px] outline-none focus:border-[#0B5D2A]"
                    style={{ height: "46px", padding: "0 12px" }}
                  />
                </div>
              </div>

              <div className="flex justify-end" style={{ gap: "8px", marginTop: "24px" }}>
                <button
                  type="button"
                  onClick={cancelNameModal}
                  className="rounded-xl border border-gray-300 bg-white text-gray-700 font-bold text-[13px] hover:bg-gray-50 active:scale-95 transition"
                  style={{ height: "42px", padding: "0 20px" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveNameModal}
                  className="rounded-xl bg-[#0B5D2A] text-white font-bold text-[13px] hover:bg-[#084A21] active:scale-95 transition"
                  style={{ height: "42px", padding: "0 20px" }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── ADDRESS MODAL ─── */}
        {showAddressModal && (
          <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center"
            style={{ zIndex: 9999, padding: "20px" }}
            onClick={cancelAddressModal}
          >
            <div
              className="bg-white rounded-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl"
              style={{ maxWidth: "340px", padding: "28px" }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-[16px] font-extrabold text-[#0B5D2A]" style={{ marginBottom: "20px" }}>
                Edit Address
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label className="block text-[12px] font-bold text-gray-800" style={{ marginBottom: "6px" }}>
                    House Number
                  </label>
                  <input
                    type="text"
                    value={formData.house_no}
                    onChange={(e) => updateAddressField("house_no", e.target.value)}
                    placeholder="e.g., 123"
                    className="w-full bg-white border border-[#C8DCC3] rounded-xl text-[13px] outline-none focus:border-[#0B5D2A]"
                    style={{ height: "46px", padding: "0 12px" }}
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-gray-800" style={{ marginBottom: "6px" }}>
                    Street
                  </label>
                  <input
                    type="text"
                    value={formData.street}
                    onChange={(e) => updateAddressField("street", e.target.value)}
                    placeholder="e.g., P. Gomez St."
                    className="w-full bg-white border border-[#C8DCC3] rounded-xl text-[13px] outline-none focus:border-[#0B5D2A]"
                    style={{ height: "46px", padding: "0 12px" }}
                  />
                </div>
                <p className="text-[10px] text-gray-500 text-center" style={{ margin: 0 }}>
                  Barangay is added automatically
                </p>
              </div>

              <div className="flex justify-end" style={{ gap: "8px", marginTop: "24px" }}>
                <button
                  type="button"
                  onClick={cancelAddressModal}
                  className="rounded-xl border border-gray-300 bg-white text-gray-700 font-bold text-[13px] hover:bg-gray-50 active:scale-95 transition"
                  style={{ height: "42px", padding: "0 20px" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveAddressModal}
                  className="rounded-xl bg-[#0B5D2A] text-white font-bold text-[13px] hover:bg-[#084A21] active:scale-95 transition"
                  style={{ height: "42px", padding: "0 20px" }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}