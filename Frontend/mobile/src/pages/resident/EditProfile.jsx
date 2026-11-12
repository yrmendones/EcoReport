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

const INPUT_CLASS =
  "w-full min-h-[52px] bg-white border border-[#C8DCC3] rounded-2xl text-[14px] outline-none focus:border-[#0B5D2A] focus:ring-2 focus:ring-[#0B5D2A]/10 transition";
const LABEL_CLASS = "block text-[14px] font-extrabold text-gray-900";
const SUMMARY_BTN_CLASS =
  "w-full min-h-[52px] bg-white border border-[#C8DCC3] rounded-2xl text-left hover:border-[#0B5D2A] transition";

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
      <div className="min-h-[100dvh] bg-[#E5E7EB] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <FaSpinner className="animate-spin text-[#0B5D2A]" size={40} />
          <p className="text-[#0B5D2A] font-bold">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#E5E7EB] flex justify-center items-center sm:py-6 sm:px-3">
      {/* Full screen on phones, phone frame only on sm and up */}
      <div className="relative w-full h-[100dvh] sm:w-[390px] sm:h-[844px] bg-[#F8FAF8] sm:rounded-[40px] sm:border-[5px] sm:border-white sm:shadow-2xl overflow-hidden flex flex-col">
        {/* HEADER */}
        <header
          className="relative h-[82px] bg-[#0B5D2A] flex items-center justify-center shrink-0"
          style={{ padding: "0 64px" }}
        >
          <button
            type="button"
            onClick={() => navigate("/profile")}
            aria-label="Back"
            className="absolute left-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center text-white text-[20px] bg-white/10 hover:bg-white/20 active:scale-95 transition"
          >
            <FaArrowLeft />
          </button>
          <h1 className="text-white text-[22px] font-extrabold text-center">
            Edit Profile
          </h1>
        </header>

        {/* CONTENT */}
        <main
          className="flex-1 overflow-y-auto no-scrollbar"
          style={{
            padding: "28px 24px max(48px, calc(env(safe-area-inset-bottom) + 32px))",
          }}
        >
          <form
            onSubmit={handleSubmit}
            className="flex flex-col"
            style={{ gap: "24px" }}
          >
            {/* PROFILE PICTURE */}
            <div
              className="flex flex-col items-center justify-center"
              style={{ gap: "12px" }}
            >
              <div className="relative">
                <div className="w-[105px] h-[105px] rounded-full bg-[#E8F5E3] flex items-center justify-center shadow-sm overflow-hidden">
                  {profilePicturePreview ? (
                    <img
                      src={profilePicturePreview}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FaUserCircle size={96} className="text-[#0B5D2A]" />
                  )}
                </div>
                <label className="absolute bottom-1 right-0 w-11 h-11 rounded-full bg-[#0B5D2A] border-4 border-[#F8FAF8] flex items-center justify-center cursor-pointer shadow-md hover:bg-[#084A21] active:scale-95 transition">
                  {uploadingPicture ? (
                    <FaSpinner className="animate-spin text-white" size={16} />
                  ) : (
                    <FaCamera size={16} className="text-white" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleProfilePictureUpload}
                  />
                </label>
              </div>
              <p className="text-[13px] text-gray-500 text-center leading-6">
                Tap the camera icon to change photo
              </p>
              {uploadingPicture && (
                <p className="text-[12px] text-[#0B5D2A] font-bold">Uploading...</p>
              )}
            </div>

            {error && (
              <div
                className="bg-red-100 border border-red-400 rounded-xl text-red-700 text-sm leading-6 break-words"
                style={{ padding: "14px 16px" }}
              >
                {error}
              </div>
            )}

            {success && (
              <div
                className="bg-green-100 border border-green-400 rounded-xl flex items-center text-green-700 text-sm leading-6"
                style={{ padding: "14px 16px", gap: "12px" }}
              >
                <FaCheckCircle size={18} />
                <span>Profile updated successfully!</span>
              </div>
            )}

            {/* FIELDS: Full Name → Address → Contact → Email */}
            <div className="flex flex-col" style={{ gap: "24px" }}>
              {/* FULL NAME (opens modal) */}
              <div className="flex flex-col" style={{ gap: "8px" }}>
                <label className={LABEL_CLASS}>Full Name</label>
                <button
                  type="button"
                  onClick={openNameModal}
                  className={SUMMARY_BTN_CLASS}
                  style={{ padding: "0 16px" }}
                >
                  <span className="text-[14px] text-gray-800 truncate block">
                    {[formData.first_name, formData.middle_name, formData.last_name]
                      .filter((n) => n && n.trim())
                      .join(" ") || "Tap to set name"}
                  </span>
                </button>
              </div>

              {/* ADDRESS (opens modal) */}
              <div className="flex flex-col" style={{ gap: "8px" }}>
                <label className={LABEL_CLASS}>Address</label>
                <button
                  type="button"
                  onClick={openAddressModal}
                  className={SUMMARY_BTN_CLASS}
                  style={{ padding: "0 16px" }}
                >
                  <span className="text-[14px] text-gray-800 truncate block">
                    {[formData.house_no, formData.street]
                      .filter((n) => n && n.trim())
                      .join(" ") || "Tap to set address"}
                  </span>
                </button>
              </div>

              {/* CONTACT NUMBER */}
              <div className="flex flex-col" style={{ gap: "8px" }}>
                <label className={LABEL_CLASS}>Contact Number</label>
                <input
                  type="tel"
                  name="contact_number"
                  value={formData.contact_number}
                  onChange={handleChange}
                  placeholder="Enter Phone Number"
                  maxLength={11}
                  inputMode="numeric"
                  className={INPUT_CLASS}
                  style={{ padding: "0 16px" }}
                />
              </div>

              {/* EMAIL (read only) */}
              <div className="flex flex-col" style={{ gap: "8px" }}>
                <label className={LABEL_CLASS}>Email Address</label>
                <input
                  type="email"
                  value={formData.email || "Not set"}
                  className="w-full min-h-[52px] bg-gray-100 border border-gray-300 rounded-2xl text-[14px] text-gray-500 outline-none cursor-not-allowed"
                  style={{ padding: "0 16px" }}
                  disabled
                  readOnly
                />
                <p className="text-[12px] text-gray-500 leading-5">
                  Email cannot be changed for security reasons
                </p>
              </div>
            </div>

            {/* SUBMIT */}
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full min-h-[54px] rounded-2xl font-extrabold text-[16px] flex items-center justify-center shadow-md transition disabled:opacity-50"
              style={{ gap: "12px", marginTop: "8px" }}
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
          </form>
        </main>

        {/* ─── NAME MODAL ─── */}
        {showNameModal && (
          <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999]"
            style={{ padding: "20px" }}
            onClick={cancelNameModal}
          >
            <div
              className="bg-white rounded-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl"
              style={{ maxWidth: "340px", padding: "28px" }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3
                className="text-[18px] font-extrabold text-[#0B5D2A]"
                style={{ marginBottom: "20px" }}
              >
                Edit Full Name
              </h3>

              <div
                style={{ display: "flex", flexDirection: "column", gap: "16px" }}
              >
                <div>
                  <label
                    className="block text-[14px] font-extrabold text-gray-900"
                    style={{ marginBottom: "8px" }}
                  >
                    First Name
                  </label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => updateNameField("first_name", e.target.value)}
                    className={INPUT_CLASS}
                    style={{ padding: "0 16px" }}
                  />
                </div>

                <div>
                  <label
                    className="block text-[14px] font-extrabold text-gray-900"
                    style={{ marginBottom: "8px" }}
                  >
                    Middle Name
                  </label>
                  <input
                    type="text"
                    value={formData.middle_name}
                    onChange={(e) => updateNameField("middle_name", e.target.value)}
                    placeholder="N/A if none"
                    className={INPUT_CLASS}
                    style={{ padding: "0 16px" }}
                  />
                </div>

                <div>
                  <label
                    className="block text-[14px] font-extrabold text-gray-900"
                    style={{ marginBottom: "8px" }}
                  >
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => updateNameField("last_name", e.target.value)}
                    className={INPUT_CLASS}
                    style={{ padding: "0 16px" }}
                  />
                </div>
              </div>

              <div
                className="flex justify-end"
                style={{ gap: "10px", marginTop: "24px" }}
              >
                <button
                  type="button"
                  onClick={cancelNameModal}
                  className="min-h-[46px] rounded-xl border border-gray-300 bg-white text-gray-700 font-extrabold text-[14px] hover:bg-gray-50 active:scale-95 transition"
                  style={{ padding: "0 20px" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveNameModal}
                  className="min-h-[46px] rounded-xl bg-[#0B5D2A] text-white font-extrabold text-[14px] hover:bg-[#084A21] active:scale-95 transition"
                  style={{ padding: "0 20px" }}
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
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999]"
            style={{ padding: "20px" }}
            onClick={cancelAddressModal}
          >
            <div
              className="bg-white rounded-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl"
              style={{ maxWidth: "340px", padding: "28px" }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3
                className="text-[18px] font-extrabold text-[#0B5D2A]"
                style={{ marginBottom: "20px" }}
              >
                Edit Address
              </h3>

              <div
                style={{ display: "flex", flexDirection: "column", gap: "16px" }}
              >
                <div>
                  <label
                    className="block text-[14px] font-extrabold text-gray-900"
                    style={{ marginBottom: "8px" }}
                  >
                    House Number
                  </label>
                  <input
                    type="text"
                    value={formData.house_no}
                    onChange={(e) => updateAddressField("house_no", e.target.value)}
                    placeholder="e.g., 123"
                    className={INPUT_CLASS}
                    style={{ padding: "0 16px" }}
                  />
                </div>

                <div>
                  <label
                    className="block text-[14px] font-extrabold text-gray-900"
                    style={{ marginBottom: "8px" }}
                  >
                    Street
                  </label>
                  <input
                    type="text"
                    value={formData.street}
                    onChange={(e) => updateAddressField("street", e.target.value)}
                    placeholder="e.g., P. Gomez St."
                    className={INPUT_CLASS}
                    style={{ padding: "0 16px" }}
                  />
                </div>

                <p
                  className="text-[12px] text-gray-500 text-center leading-5"
                  style={{ margin: 0 }}
                >
                  Barangay is added automatically
                </p>
              </div>

              <div
                className="flex justify-end"
                style={{ gap: "10px", marginTop: "24px" }}
              >
                <button
                  type="button"
                  onClick={cancelAddressModal}
                  className="min-h-[46px] rounded-xl border border-gray-300 bg-white text-gray-700 font-extrabold text-[14px] hover:bg-gray-50 active:scale-95 transition"
                  style={{ padding: "0 20px" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveAddressModal}
                  className="min-h-[46px] rounded-xl bg-[#0B5D2A] text-white font-extrabold text-[14px] hover:bg-[#084A21] active:scale-95 transition"
                  style={{ padding: "0 20px" }}
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