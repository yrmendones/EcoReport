import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaCamera,
  FaVideo,
  FaMapMarkerAlt,
  FaChevronDown,
  FaSpinner,
  FaCheckCircle,
  FaHome,
} from "react-icons/fa";

// ✅ Use Vite proxy in dev to avoid hardcoded IPs
const API_BASE = import.meta.env.DEV ? "" : (import.meta.env.VITE_API_URL || "http://localhost:5000");

export default function GuestReport() {
  const navigate = useNavigate();

  const [category, setCategory] = useState("");
  const [photos, setPhotos] = useState([]);
  const [videos, setVideos] = useState([]);
  const [guestName, setGuestName] = useState("");
  const [guestMobile, setGuestMobile] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState({ lat: null, lng: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [gettingLocation, setGettingLocation] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);

  const [validationErrors, setValidationErrors] = useState({});

  // ✅ Added new categories and sorted A-Z
  const categories = [
    "Air Pollution",
    "Animal Waste",
    "Blotter & Incidents",
    "Clogged Drainage",
    "Crime",
    "Damaged Roads",
    "Fallen Trees",
    "Flooding",
    "Illegal Dumping",
    "Improper Garbage Disposal",
    "Others Environmental Concerns",
    "Overgrown Grass",
  ];

  // ============ CONTACT NUMBER INPUT HANDLER ============
  const handleContactChange = (value) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length >= 1 && digits[0] !== "0") return;
    if (digits.length >= 2 && digits[1] !== "9") return;
    setGuestMobile(digits.slice(0, 11));
    if (validationErrors.guestMobile) {
      setValidationErrors({ ...validationErrors, guestMobile: "" });
    }
  };

  // ============ FILE HANDLERS ============
  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/"));
    const previews = files.map((f) => ({ file: f, url: URL.createObjectURL(f) }));
    setPhotos((prev) => [...prev, ...previews].slice(0, 5));
    e.target.value = "";
  };

  const handleVideoUpload = (e) => {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith("video/"));
    const previews = files.map((f) => ({ file: f, url: URL.createObjectURL(f) }));
    setVideos((prev) => [...prev, ...previews].slice(0, 2));
    e.target.value = "";
  };

  const removePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const removeVideo = (index) => {
    setVideos((prev) => prev.filter((_, i) => i !== index));
  };

  // ============ GEOLOCATION ============
  const getLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setGettingLocation(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude.toFixed(6),
          lng: position.coords.longitude.toFixed(6),
        });
        setGettingLocation(false);
        alert("Location captured successfully!");
      },
      (err) => {
        console.error("Geolocation error:", err);
        let message = "Unable to get your location. ";
        switch (err.code) {
          case err.PERMISSION_DENIED:
            message += "Please allow location access in your browser.";
            break;
          case err.POSITION_UNAVAILABLE:
          case err.TIMEOUT:
            message += "Please check your GPS and try again.";
            break;
          default:
            message += "Please try again.";
        }
        setError(message);
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // ============ VALIDATION ============
  const validateForm = () => {
    const errors = {};
    let isValid = true;

    if (!guestName.trim()) { errors.guestName = "Guest name is required."; isValid = false; }

    const mobileRegex = /^(09)\d{9}$/;
    if (!guestMobile.trim()) {
      errors.guestMobile = "Contact number is required.";
      isValid = false;
    } else if (!mobileRegex.test(guestMobile.trim())) {
      errors.guestMobile = "Contact number must be 11 digits starting with 09.";
      isValid = false;
    }

    if (!category) { errors.category = "Please select an environmental concern."; isValid = false; }
    if (!description.trim()) { errors.description = "Description is required."; isValid = false; }
    if (!location.lat || !location.lng) { errors.location = "Please capture your GPS location."; isValid = false; }
    
    if (photos.length === 0 && videos.length === 0) { 
      errors.evidence = "Please upload at least one photo or video."; 
      isValid = false; 
    }

    setValidationErrors(errors);
    return isValid;
  };

  // ============ SUBMIT ============
  const handleSubmit = async () => {
    if (!validateForm()) {
      const firstError = document.querySelector(".error-text");
      if (firstError) firstError.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setLoading(true);
    setError("");

    try {
      let uploadedMedia = [];
      const allFiles = [...photos, ...videos];

      if (allFiles.length > 0) {
        const formData = new FormData();
        allFiles.forEach((item) => formData.append("files", item.file));

        const uploadResponse = await fetch(`${API_BASE}/api/guest/upload`, {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadResponse.json();
        if (!uploadResponse.ok) throw new Error(uploadData.error || "File upload failed.");

        uploadedMedia = (uploadData.files || []).map((f) => ({
          url: f.url,
          type: f.mimetype?.startsWith("video/") ? "video" : "image",
        }));
      }

      const guestData = {
        guest_name: guestName.trim(),
        guest_mobile: guestMobile.trim(),
        category,
        description: description.trim(),
        latitude: location.lat,
        longitude: location.lng,
        media: uploadedMedia,
      };

      const response = await fetch(`${API_BASE}/api/reports/guest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(guestData),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Submission failed.");

      setSubmittedData({
        reference: data.reference || `ER-${new Date().getFullYear()}-${String(data.report_id).padStart(4, "0")}`,
        guest_name: guestName.trim(),
        guest_mobile: guestMobile.trim(),
        category,
        description: description.trim(),
        latitude: location.lat,
        longitude: location.lng,
        photos: photos.map((p) => p.url),
        videos: videos.map((v) => v.url),
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // REVIEW / SUCCESS SCREEN
  // ============================================================
  if (submittedData) {
    return (
      <div className="min-h-[100dvh] bg-[#E5E7EB] flex items-center justify-center sm:p-4">
        <div className="relative w-full h-[100dvh] sm:w-[390px] sm:h-[844px] bg-[#F8FAF8] sm:rounded-[40px] sm:border-[5px] sm:border-white sm:shadow-2xl overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-6 px-5 pt-10 pb-24">
            <div className="flex flex-col items-center">
              <div className="w-[88px] h-[88px] rounded-full bg-[#E8F5E3] flex items-center justify-center shrink-0">
                <FaCheckCircle size={68} className="text-[#0B5D2A]" />
              </div>
              <h1 className="text-[22px] font-extrabold text-[#0B5D2A] text-center mt-6 leading-tight">
                Report Submitted
              </h1>
              <h2 className="text-[22px] font-extrabold text-[#0B5D2A] text-center leading-tight">
                Successfully!
              </h2>
              <p className="text-[12px] text-gray-500 text-center mt-4 leading-6 max-w-[300px]">
                Thank you for helping keep Barangay Sto. Rosario Kanluran clean and safe.
                The barangay will review your report soon.
              </p>
            </div>

            <div className="w-full bg-[#F0F8ED] border border-[#A9C9A1] rounded-2xl px-6 py-6 flex flex-col gap-2">
              <p className="text-center text-gray-500 text-[11px] font-medium">
                Reference Number
              </p>
              <h3 className="text-center text-[20px] font-extrabold text-[#0B5D2A] break-all">
                {submittedData.reference}
              </h3>
            </div>

            <div className="flex flex-col gap-4">
              <h3 className="text-[16px] font-extrabold text-gray-900">
                Submitted Details
              </h3>

              <div className="bg-white rounded-2xl border border-[#D5E4D1] shadow-sm overflow-hidden">
                <ReviewRow label="Reporter Name" value={submittedData.guest_name} />
                <ReviewRow label="Contact Number" value={submittedData.guest_mobile} />
                <ReviewRow label="Category" value={submittedData.category} />
                <ReviewRow label="Description" value={submittedData.description} />
                <ReviewRow
                  label="Location"
                  value={
                    submittedData.latitude && submittedData.longitude
                      ? `${submittedData.latitude}, ${submittedData.longitude}`
                      : "Not provided"
                  }
                  last={submittedData.photos.length === 0 && submittedData.videos.length === 0}
                />

                {(submittedData.photos.length > 0 || submittedData.videos.length > 0) && (
                  <div className="px-6 py-5 flex flex-col gap-4">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                      Attached Evidence
                    </p>

                    {submittedData.photos.length > 0 && (
                      <div className="grid grid-cols-3 gap-3">
                        {submittedData.photos.map((url, i) => (
                          <img
                            key={i}
                            src={url}
                            alt={`Evidence ${i + 1}`}
                            className="w-full h-[80px] rounded-xl object-cover border border-[#D5E4D1]"
                          />
                        ))}
                      </div>
                    )}

                    {submittedData.videos.length > 0 && (
                      <div className="flex flex-col gap-3">
                        {submittedData.videos.map((url, i) => (
                          <video
                            key={i}
                            src={url}
                            controls
                            className="w-full rounded-xl border border-[#D5E4D1]"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="px-5 py-4 bg-yellow-50 border border-yellow-200 rounded-2xl">
              <p className="text-[11px] text-yellow-800 leading-5 text-center">
                <strong>Note:</strong> Guest users can submit <strong>1 report per day</strong>.
                You can submit another report tomorrow.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/guest-home")}
              className="w-full h-[52px] rounded-2xl bg-[#0B5D2A] text-white font-extrabold text-[14px] flex items-center justify-center gap-2 shadow-md hover:bg-[#084A21] active:scale-[0.98] transition"
            >
              <FaHome size={16} />
              Back to Guest Home
            </button>
          </div>

          <div className="hidden sm:flex absolute bottom-3 left-0 right-0 justify-center pointer-events-none z-30">
            <div className="w-[70px] h-[5px] rounded-full bg-gray-800 opacity-70" />
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // FORM
  // ============================================================
  return (
    <div className="min-h-[100dvh] bg-[#E5E7EB] flex items-center justify-center sm:p-4">
      <div className="relative w-full h-[100dvh] sm:w-[390px] sm:h-[844px] bg-[#F8FAF8] sm:rounded-[40px] sm:border-[5px] sm:border-white sm:shadow-2xl overflow-hidden flex flex-col">
        <header className="relative h-[82px] bg-white flex items-center justify-center shrink-0 px-5">
          <button
            type="button"
            onClick={() => navigate("/guest-home")}
            aria-label="Back"
            className="absolute left-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-[#F2F8EF] text-[#0B5D2A] flex items-center justify-center text-[20px] shadow-sm hover:bg-[#E6F1E2] active:scale-95 transition"
          >
            <FaArrowLeft />
          </button>
          <h1 className="text-[#0B5D2A] text-[22px] font-extrabold">Guest Reporting</h1>
        </header>

        <main className="flex-1 overflow-y-auto no-scrollbar px-5 pt-5 pb-24">
          <div className="w-full bg-white rounded-[28px] border border-[#8FB58A] shadow-[0_4px_12px_rgba(11,93,42,0.10)] px-6 py-6 flex flex-col gap-3">
            {/* GUEST INFORMATION */}
            <div className="flex flex-col gap-4">
              <h2 className="text-[16px] font-extrabold text-[#0B5D2A]">
                Guest Information
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2 min-w-0">
                  <label className="block text-[12px] font-bold text-gray-700">
                    Guest Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => {
                      setGuestName(e.target.value);
                      if (validationErrors.guestName) setValidationErrors({ ...validationErrors, guestName: "" });
                    }}
                    placeholder="Enter your name"
                    className={`w-full h-[50px] px-4 rounded-xl border ${validationErrors.guestName ? "border-red-500" : "border-[#9FBA9F]"} bg-white text-[12px] outline-none focus:border-[#0B5D2A] focus:ring-2 focus:ring-[#0B5D2A]/10`}
                  />
                  {validationErrors.guestName && (
                    <p className="error-text text-red-500 text-[10px] leading-4">
                      {validationErrors.guestName}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2 min-w-0">
                  <label className="block text-[12px] font-bold text-gray-700">
                    Contact Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={guestMobile}
                    onChange={(e) => handleContactChange(e.target.value)}
                    placeholder="Enter Phone Number"
                    maxLength={11}
                    inputMode="numeric"
                    className={`w-full h-[50px] px-4 rounded-xl border ${validationErrors.guestMobile ? "border-red-500" : "border-[#9FBA9F]"} bg-white text-[12px] outline-none focus:border-[#0B5D2A] focus:ring-2 focus:ring-[#0B5D2A]/10`}
                  />
                  {validationErrors.guestMobile && (
                    <p className="error-text text-red-500 text-[10px] leading-4">
                      {validationErrors.guestMobile}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* CATEGORY */}
            <div className="flex flex-col gap-2">
              <label className="block text-[12px] font-bold text-gray-700">
                Environmental Concern <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    if (validationErrors.category) setValidationErrors({ ...validationErrors, category: "" });
                  }}
                  className={`appearance-none w-full h-[50px] px-4 pr-12 rounded-xl border ${validationErrors.category ? "border-red-500" : "border-[#9FBA9F]"} bg-white text-[12px] text-gray-600 outline-none focus:border-[#0B5D2A] focus:ring-2 focus:ring-[#0B5D2A]/10`}
                >
                  <option value="">Select category</option>
                  {categories.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
                <FaChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#0B5D2A] pointer-events-none" />
              </div>
              {validationErrors.category && (
                <p className="error-text text-red-500 text-[10px] leading-4">
                  {validationErrors.category}
                </p>
              )}
            </div>

            {/* DESCRIPTION */}
            <div className="flex flex-col gap-2">
              <label className="block text-[12px] font-bold text-gray-700">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (validationErrors.description) setValidationErrors({ ...validationErrors, description: "" });
                }}
                placeholder="Describe the environmental issue..."
                className={`w-full h-[130px] px-4 py-3 rounded-xl border ${validationErrors.description ? "border-red-500" : "border-[#9FBA9F]"} bg-white text-[12px] leading-5 resize-none outline-none focus:border-[#0B5D2A] focus:ring-2 focus:ring-[#0B5D2A]/10`}
              />
              {validationErrors.description && (
                <p className="error-text text-red-500 text-[10px] leading-4">
                  {validationErrors.description}
                </p>
              )}
            </div>

            {/* EVIDENCE */}
            <div className="flex flex-col gap-3">
              <label className="block text-[12px] font-bold text-gray-700">
                Evidence <span className="text-red-500">*</span> <span className="text-gray-400 font-normal">(photos or videos)</span>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label
                  htmlFor="photo-input"
                  className="h-[100px] px-2 rounded-xl border border-[#9FBA9F] bg-[#FCFEFC] flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[#F3F9F1] transition"
                >
                  <FaCamera size={24} className="text-[#0B5D2A] mb-2" />
                  <p className="text-[10px] font-bold text-[#16472C]">ADD PHOTOS</p>
                  <p className="text-[9px] text-gray-500 mt-1">JPG, PNG (max 5)</p>
                  <input
                    id="photo-input"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>

                <label
                  htmlFor="video-input"
                  className="h-[100px] px-2 rounded-xl border border-[#9FBA9F] bg-[#FCFEFC] flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[#F3F9F1] transition"
                >
                  <FaVideo size={24} className="text-[#0B5D2A] mb-2" />
                  <p className="text-[10px] font-bold text-[#16472C]">ADD VIDEOS</p>
                  <p className="text-[9px] text-gray-500 mt-1">MP4, MOV (max 2)</p>
                  <input
                    id="video-input"
                    type="file"
                    accept="video/mp4,video/quicktime,video/*"
                    multiple
                    onChange={handleVideoUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {photos.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] font-bold text-gray-500">
                    Photos ({photos.length}/5)
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {photos.map((p, i) => (
                      <div key={i} className="relative">
                        <img src={p.url} alt={`Photo ${i + 1}`} className="w-full h-[80px] rounded-lg object-cover border border-[#D5E4D1]" />
                        <button
                          type="button"
                          onClick={() => removePhoto(i)}
                          aria-label={`Remove photo ${i + 1}`}
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center hover:bg-red-600 transition"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {videos.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] font-bold text-gray-500">
                    Videos ({videos.length}/2)
                  </p>
                  <div className="flex flex-col gap-3">
                    {videos.map((v, i) => (
                      <div key={i} className="relative">
                        <video src={v.url} controls className="w-full rounded-lg border border-[#D5E4D1]" />
                        <button
                          type="button"
                          onClick={() => removeVideo(i)}
                          aria-label={`Remove video ${i + 1}`}
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center hover:bg-red-600 transition"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {validationErrors.evidence && (
                <p className="error-text text-red-500 text-[10px] mt-1">
                  {validationErrors.evidence}
                </p>
              )}
            </div>

            {/* LOCATION */}
            <div className="flex flex-col gap-3">
              <label className="block text-[12px] font-bold text-gray-700">
                Location <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={getLocation}
                disabled={gettingLocation}
                className={`w-full min-h-[80px] px-4 py-3 rounded-xl border ${validationErrors.location ? "border-red-500" : "border-[#9FBA9F]"} bg-[#FCFEFC] flex flex-col items-center justify-center text-center hover:bg-[#F3F9F1] transition disabled:opacity-50`}
              >
                {gettingLocation ? (
                  <FaSpinner className="animate-spin text-[#0B5D2A]" size={22} />
                ) : (
                  <FaMapMarkerAlt size={22} className="text-[#0B5D2A]" />
                )}
                <p className="text-[10px] font-bold text-[#16472C] mt-1">
                  {gettingLocation ? "GETTING..." : "GET GPS LOCATION"}
                </p>
                <p className="text-[9px] text-gray-500 mt-1 break-words">
                  {location.lat && location.lng
                    ? `📍 ${location.lat}, ${location.lng}`
                    : "Tap to capture your current location"}
                </p>
              </button>
              {validationErrors.location && (
                <p className="error-text text-red-500 text-[10px] leading-4">
                  {validationErrors.location}
                </p>
              )}
            </div>

            {error && (
              <div className="px-4 py-3 bg-red-100 border border-red-400 rounded-xl text-red-700 text-[12px] leading-5">
                {error}
              </div>
            )}

            {/* SUBMIT */}
            <div className="flex flex-col items-center gap-4 mt-2">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className={`w-full max-w-[240px] h-[52px] rounded-xl font-bold text-[15px] shadow-md transition ${
                  loading
                    ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                    : "bg-[#7EAD55] hover:bg-[#6D9948] text-white hover:scale-[1.02] active:scale-95"
                }`}
              >
                {loading ? (
                  <>
                    <FaSpinner className="animate-spin inline mr-2" />
                    Submitting...
                  </>
                ) : (
                  "Submit"
                )}
              </button>

              <p className="text-[10px] text-gray-500 leading-relaxed text-center">
                Guest Users can submit 1 report per day.<br />Thank You!
              </p>
            </div>
          </div>
        </main>

        <div className="hidden sm:flex absolute bottom-3 left-0 right-0 justify-center pointer-events-none z-30">
          <div className="w-[70px] h-[5px] rounded-full bg-gray-700 opacity-70" />
        </div>
      </div>
    </div>
  );
}

function ReviewRow({ label, value, last = false }) {
  return (
    <div
      className={`px-6 py-4 flex flex-col gap-1.5 ${
        !last ? "border-b border-gray-200" : ""
      }`}
    >
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide leading-4">
        {label}
      </p>
      <p className="text-[12px] text-gray-800 leading-5 break-words [overflow-wrap:anywhere] whitespace-pre-wrap">
        {value || "—"}
      </p>
    </div>
  );
}