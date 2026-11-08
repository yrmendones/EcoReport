import { useState, useEffect } from "react";
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
import { apiFetch } from "../../api";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const LABEL_CLASS = "block text-[14px] font-extrabold text-gray-900";
const ERROR_CLASS = "error-text text-red-500 text-[12px] leading-5";
const fieldClass = (hasError) =>
  `w-full min-h-[52px] bg-white rounded-2xl border ${
    hasError ? "border-red-500" : "border-[#C8DCC3]"
  } text-[14px] outline-none focus:border-[#0B5D2A] focus:ring-2 focus:ring-[#0B5D2A]/10 transition`;

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

    const FALLBACK_CATEGORIES = [
    "Air Pollution",
    "Animal Waste",
    "Clogged Drainage",
    "Damaged Roads",
    "Flooding",
    "Fallen Trees",
    "Illegal Dumping",
    "Improper Garbage Disposal",
    "Overgrown Grass",
    "Others Environmental Concerns",
    "Crime",
    "Blotter & Incident",
  ];

  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);

  useEffect(() => {
    let cancelled = false;
    const loadCategories = async () => {
      try {
        const data = await apiFetch("/api/public/categories");
        if (cancelled) return;
        if (Array.isArray(data) && data.length > 0) {
          setCategories(data);
        }
      } catch (err) {
        console.error("Failed to load categories:", err);
      }
    };
    loadCategories();
    return () => { cancelled = true; };
  }, []);

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
    const files = Array.from(e.target.files || []).filter((f) =>
      f.type.startsWith("image/")
    );
    const previews = files.map((f) => ({ file: f, url: URL.createObjectURL(f) }));
    setPhotos((prev) => [...prev, ...previews].slice(0, 5));
    if (validationErrors.evidence) {
      setValidationErrors((prev) => ({ ...prev, evidence: "" }));
    }
    e.target.value = "";
  };

  const handleVideoUpload = (e) => {
    const files = Array.from(e.target.files || []).filter((f) =>
      f.type.startsWith("video/")
    );
    const previews = files.map((f) => ({ file: f, url: URL.createObjectURL(f) }));
    setVideos((prev) => [...prev, ...previews].slice(0, 2));
    if (validationErrors.evidence) {
      setValidationErrors((prev) => ({ ...prev, evidence: "" }));
    }
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

    if (!guestName.trim()) {
      errors.guestName = "Guest name is required.";
      isValid = false;
    }

    const mobileRegex = /^(09)\d{9}$/;
    if (!guestMobile.trim()) {
      errors.guestMobile = "Contact number is required.";
      isValid = false;
    } else if (!mobileRegex.test(guestMobile.trim())) {
      errors.guestMobile = "Contact number must be 11 digits starting with 09.";
      isValid = false;
    }

    if (!category) {
      errors.category = "Please select an environmental concern.";
      isValid = false;
    }
    if (!description.trim()) {
      errors.description = "Description is required.";
      isValid = false;
    }
    if (!location.lat || !location.lng) {
      errors.location = "Please capture your GPS location.";
      isValid = false;
    }

    // Evidence is required - at least one photo or video
    if (photos.length === 0 && videos.length === 0) {
      errors.evidence = "Please upload at least one photo or video as evidence.";
      isValid = false;
    }

    setValidationErrors(errors);
    return isValid;
  };

  // ============ SUBMIT ============
  const handleSubmit = async () => {
    if (!validateForm()) {
      const firstError = document.querySelector(".error-text");
      if (firstError)
        firstError.scrollIntoView({ behavior: "smooth", block: "center" });
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
        if (!uploadResponse.ok)
          throw new Error(uploadData.error || "File upload failed.");

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
        reference:
          data.reference ||
          `ER-${new Date().getFullYear()}-${String(data.report_id).padStart(
            4,
            "0"
          )}`,
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
      <div className="min-h-[100dvh] bg-[#E5E7EB] flex items-center justify-center sm:py-6 sm:px-3">
        <div className="relative w-full h-[100dvh] sm:w-[390px] sm:h-[844px] bg-[#F8FAF8] sm:rounded-[40px] sm:border-[5px] sm:border-white sm:shadow-2xl overflow-hidden flex flex-col">
          <div
            className="flex-1 overflow-y-auto no-scrollbar flex flex-col"
            style={{
              padding:
                "40px 24px max(48px, calc(env(safe-area-inset-bottom) + 32px))",
              gap: "24px",
            }}
          >
            <div
              className="flex flex-col items-center shrink-0"
              style={{ gap: "8px" }}
            >
              <div className="w-[88px] h-[88px] rounded-full bg-[#E8F5E3] flex items-center justify-center shrink-0">
                <FaCheckCircle size={68} className="text-[#0B5D2A]" />
              </div>
              <div
                className="flex flex-col items-center"
                style={{ marginTop: "8px" }}
              >
                <h1 className="text-[22px] font-extrabold text-[#0B5D2A] text-center leading-tight">
                  Report Submitted
                </h1>
                <h2 className="text-[22px] font-extrabold text-[#0B5D2A] text-center leading-tight">
                  Successfully!
                </h2>
              </div>
              <p className="text-[14px] text-gray-600 text-center leading-6 max-w-[320px]">
                Thank you for helping keep Barangay Sto. Rosario Kanluran clean
                and safe. The barangay will review your report soon.
              </p>
            </div>

            <div
              className="w-full bg-[#F0F8ED] border border-[#A9C9A1] rounded-2xl flex flex-col shrink-0"
              style={{ padding: "20px", gap: "8px" }}
            >
              <p className="text-center text-gray-500 text-[13px] font-semibold leading-5">
                Reference Number
              </p>
              <h3 className="text-center text-[20px] font-extrabold text-[#0B5D2A] break-all leading-7">
                {submittedData.reference}
              </h3>
            </div>

            <div className="flex flex-col shrink-0" style={{ gap: "16px" }}>
              <h3 className="text-[22px] font-extrabold text-gray-900 leading-tight">
                Submitted Details
              </h3>

              <div className="bg-white rounded-2xl border border-[#D5E4D1] shadow-sm overflow-hidden">
                <ReviewRow label="Reporter Name" value={submittedData.guest_name} />
                <ReviewRow
                  label="Contact Number"
                  value={submittedData.guest_mobile}
                />
                <ReviewRow label="Category" value={submittedData.category} />
                <ReviewRow label="Description" value={submittedData.description} />
                <ReviewRow
                  label="Location"
                  value={
                    submittedData.latitude && submittedData.longitude
                      ? `${submittedData.latitude}, ${submittedData.longitude}`
                      : "Not provided"
                  }
                  last={
                    submittedData.photos.length === 0 &&
                    submittedData.videos.length === 0
                  }
                />

                {(submittedData.photos.length > 0 ||
                  submittedData.videos.length > 0) && (
                  <div
                    className="flex flex-col"
                    style={{ padding: "20px", gap: "16px" }}
                  >
                    <p className="text-[13px] font-extrabold text-gray-500 uppercase tracking-wide leading-5">
                      Attached Evidence
                    </p>

                    {submittedData.photos.length > 0 && (
                      <div className="grid grid-cols-3" style={{ gap: "12px" }}>
                        {submittedData.photos.map((url, i) => (
                          <img
                            key={i}
                            src={url}
                            alt={`Evidence ${i + 1}`}
                            className="w-full h-[88px] rounded-xl object-cover border border-[#D5E4D1]"
                          />
                        ))}
                      </div>
                    )}

                    {submittedData.videos.length > 0 && (
                      <div className="flex flex-col" style={{ gap: "12px" }}>
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

            <div
              className="bg-yellow-50 border border-yellow-200 rounded-2xl shrink-0"
              style={{ padding: "20px" }}
            >
              <p className="text-[14px] text-yellow-800 leading-6 text-center">
                <strong>Note:</strong> Guest users can submit{" "}
                <strong>1 report per day</strong>. You can submit another report
                tomorrow.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/guest-home")}
              className="w-full min-h-[54px] rounded-2xl bg-[#0B5D2A] text-white font-extrabold text-[16px] flex items-center justify-center shadow-md hover:bg-[#084A21] active:scale-[0.98] transition shrink-0"
              style={{ gap: "12px" }}
            >
              <FaHome size={18} />
              Back to Guest Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // FORM
  // ============================================================
  return (
    <div className="min-h-[100dvh] bg-[#E5E7EB] flex items-center justify-center sm:py-6 sm:px-3">
      <div className="relative w-full h-[100dvh] sm:w-[390px] sm:h-[844px] bg-[#F8FAF8] sm:rounded-[40px] sm:border-[5px] sm:border-white sm:shadow-2xl overflow-hidden flex flex-col">
        {/* HEADER */}
        <header
          className="relative h-[82px] bg-[#0B5D2A] flex items-center justify-center shrink-0"
          style={{ padding: "0 64px" }}
        >
          <button
            type="button"
            onClick={() => navigate("/guest-home")}
            aria-label="Back"
            className="absolute left-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center text-white text-[20px] bg-white/10 hover:bg-white/20 active:scale-95 transition"
          >
            <FaArrowLeft />
          </button>
          <h1 className="text-white text-[22px] font-extrabold text-center">
            Guest Reporting
          </h1>
        </header>

        {/* MAIN CONTENT */}
        <main
          className="flex-1 overflow-y-auto no-scrollbar flex flex-col"
          style={{
            padding: "28px 24px max(48px, calc(env(safe-area-inset-bottom) + 32px))",
            gap: "24px",
          }}
        >
          <div
            className="w-full bg-white rounded-2xl border border-[#8FB58A] shadow-[0_4px_12px_rgba(11,93,42,0.10)] flex flex-col shrink-0"
            style={{ padding: "20px", gap: "24px" }}
          >
            {/* GUEST INFORMATION */}
            <div className="flex flex-col" style={{ gap: "16px" }}>
              <h2 className="text-[22px] font-extrabold text-[#0B5D2A] leading-tight">
                Guest Information
              </h2>

              <div className="flex flex-col" style={{ gap: "8px" }}>
                <label className={LABEL_CLASS}>
                  Guest Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => {
                    setGuestName(e.target.value);
                    if (validationErrors.guestName)
                      setValidationErrors({
                        ...validationErrors,
                        guestName: "",
                      });
                  }}
                  placeholder="Enter your name"
                  className={fieldClass(validationErrors.guestName)}
                  style={{ padding: "0 16px" }}
                />
                {validationErrors.guestName && (
                  <p className={ERROR_CLASS}>{validationErrors.guestName}</p>
                )}
              </div>

              <div className="flex flex-col" style={{ gap: "8px" }}>
                <label className={LABEL_CLASS}>
                  Contact Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={guestMobile}
                  onChange={(e) => handleContactChange(e.target.value)}
                  placeholder="Enter Phone Number"
                  maxLength={11}
                  inputMode="numeric"
                  className={fieldClass(validationErrors.guestMobile)}
                  style={{ padding: "0 16px" }}
                />
                {validationErrors.guestMobile && (
                  <p className={ERROR_CLASS}>{validationErrors.guestMobile}</p>
                )}
              </div>
            </div>

            {/* CATEGORY */}
            <div className="flex flex-col" style={{ gap: "8px" }}>
              <label className={LABEL_CLASS}>
                Environmental Concern <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    if (validationErrors.category)
                      setValidationErrors({
                        ...validationErrors,
                        category: "",
                      });
                  }}
                  className={`appearance-none text-gray-700 ${fieldClass(
                    validationErrors.category
                  )}`}
                  style={{ padding: "0 48px 0 16px" }}
                >
                  <option value="">Select category</option>
                  {categories.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                <FaChevronDown
                  size={14}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#0B5D2A] pointer-events-none"
                />
              </div>
              {validationErrors.category && (
                <p className={ERROR_CLASS}>{validationErrors.category}</p>
              )}
            </div>

            {/* DESCRIPTION */}
            <div className="flex flex-col" style={{ gap: "8px" }}>
              <label className={LABEL_CLASS}>
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (validationErrors.description)
                    setValidationErrors({
                      ...validationErrors,
                      description: "",
                    });
                }}
                placeholder="Describe the environmental issue..."
                className={`h-[150px] leading-6 resize-none ${fieldClass(
                  validationErrors.description
                )}`}
                style={{ padding: "14px 16px" }}
              />
              {validationErrors.description && (
                <p className={ERROR_CLASS}>{validationErrors.description}</p>
              )}
            </div>

            {/* EVIDENCE — REQUIRED */}
            <div className="flex flex-col" style={{ gap: "16px" }}>
              <label className={LABEL_CLASS}>
                Evidence <span className="text-red-500">*</span>{" "}
                <span className="text-gray-500 font-normal">
                  (photos or videos)
                </span>
              </label>

              <div className="grid grid-cols-2" style={{ gap: "16px" }}>
                <label
                  htmlFor="photo-input"
                  className={`min-h-[120px] rounded-2xl border ${
                    validationErrors.evidence
                      ? "border-red-500"
                      : "border-[#9FBA9F]"
                  } bg-[#FCFEFC] flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[#F3F9F1] transition`}
                  style={{ padding: "12px 8px", gap: "6px" }}
                >
                  <FaCamera size={28} className="text-[#0B5D2A]" />
                  <p className="text-[13px] font-extrabold text-[#16472C] leading-5">
                    ADD PHOTOS
                  </p>
                  <p className="text-[12px] text-gray-500 leading-4">
                    JPG, PNG (max 5)
                  </p>
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
                  className={`min-h-[120px] rounded-2xl border ${
                    validationErrors.evidence
                      ? "border-red-500"
                      : "border-[#9FBA9F]"
                  } bg-[#FCFEFC] flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[#F3F9F1] transition`}
                  style={{ padding: "12px 8px", gap: "6px" }}
                >
                  <FaVideo size={28} className="text-[#0B5D2A]" />
                  <p className="text-[13px] font-extrabold text-[#16472C] leading-5">
                    ADD VIDEOS
                  </p>
                  <p className="text-[12px] text-gray-500 leading-4">
                    MP4, MOV (max 2)
                  </p>
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
                <div className="flex flex-col" style={{ gap: "12px" }}>
                  <p className="text-[13px] font-extrabold text-gray-500 leading-5">
                    Photos ({photos.length}/5)
                  </p>
                  <div className="grid grid-cols-3" style={{ gap: "12px" }}>
                    {photos.map((p, i) => (
                      <div key={i} className="relative">
                        <img
                          src={p.url}
                          alt={`Photo ${i + 1}`}
                          className="w-full h-[88px] rounded-xl object-cover border border-[#D5E4D1]"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(i)}
                          aria-label={`Remove photo ${i + 1}`}
                          className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center hover:bg-red-600 transition"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {videos.length > 0 && (
                <div className="flex flex-col" style={{ gap: "12px" }}>
                  <p className="text-[13px] font-extrabold text-gray-500 leading-5">
                    Videos ({videos.length}/2)
                  </p>
                  <div className="flex flex-col" style={{ gap: "16px" }}>
                    {videos.map((v, i) => (
                      <div key={i} className="relative">
                        <video
                          src={v.url}
                          controls
                          className="w-full rounded-xl border border-[#D5E4D1]"
                        />
                        <button
                          type="button"
                          onClick={() => removeVideo(i)}
                          aria-label={`Remove video ${i + 1}`}
                          className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center hover:bg-red-600 transition"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Evidence error message */}
              {validationErrors.evidence && (
                <p className={ERROR_CLASS}>{validationErrors.evidence}</p>
              )}
            </div>

            {/* LOCATION */}
            <div className="flex flex-col" style={{ gap: "8px" }}>
              <label className={LABEL_CLASS}>
                Location <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={getLocation}
                disabled={gettingLocation}
                className={`w-full min-h-[100px] rounded-2xl border ${
                  validationErrors.location
                    ? "border-red-500"
                    : "border-[#9FBA9F]"
                } bg-[#FCFEFC] flex flex-col items-center justify-center text-center hover:bg-[#F3F9F1] transition disabled:opacity-50`}
                style={{ padding: "16px", gap: "6px" }}
              >
                {gettingLocation ? (
                  <FaSpinner className="animate-spin text-[#0B5D2A]" size={26} />
                ) : (
                  <FaMapMarkerAlt size={26} className="text-[#0B5D2A]" />
                )}
                <p className="text-[13px] font-extrabold text-[#16472C] leading-5">
                  {gettingLocation ? "GETTING..." : "GET GPS LOCATION"}
                </p>
                <p className="text-[12px] text-gray-500 leading-5 break-words">
                  {location.lat && location.lng
                    ? `📍 ${location.lat}, ${location.lng}`
                    : "Tap to capture your current location"}
                </p>
              </button>
              {validationErrors.location && (
                <p className={ERROR_CLASS}>{validationErrors.location}</p>
              )}
            </div>

            {error && (
              <div
                className="bg-red-100 border border-red-400 rounded-xl text-red-700 text-[14px] leading-6 break-words"
                style={{ padding: "14px 16px" }}
              >
                {error}
              </div>
            )}

            {/* SUBMIT */}
            <div className="flex flex-col items-center" style={{ gap: "16px" }}>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className={`w-full min-h-[54px] rounded-2xl font-extrabold text-[16px] shadow-md transition flex items-center justify-center ${
                  loading
                    ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                    : "bg-[#7EAD55] hover:bg-[#6D9948] text-white active:scale-[0.98]"
                }`}
                style={{ gap: "12px" }}
              >
                {loading ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit"
                )}
              </button>

              <p className="text-[13px] text-gray-500 leading-6 text-center">
                Guest Users can submit 1 report per day.
                <br />
                Thank You!
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

/* =========================================================
   REVIEW ROW
========================================================= */
function ReviewRow({ label, value, last = false }) {
  return (
    <div
      className={`flex flex-col ${!last ? "border-b border-gray-200" : ""}`}
      style={{ padding: "20px", gap: "8px" }}
    >
      <p className="text-[13px] font-extrabold text-gray-500 uppercase tracking-wide leading-5">
        {label}
      </p>
      <p className="text-[15px] text-gray-800 leading-6 break-words [overflow-wrap:anywhere] whitespace-pre-wrap">
        {value || "—"}
      </p>
    </div>
  );
}