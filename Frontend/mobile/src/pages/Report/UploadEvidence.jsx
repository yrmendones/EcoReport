import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FaArrowLeft,
  FaCamera,
  FaVideo,
  FaImages,
  FaSpinner,
} from "react-icons/fa";

const API_BASE = import.meta.env.DEV ? "" : (import.meta.env.VITE_API_URL || "http://localhost:5000");

export default function UploadEvidence() {
  const navigate = useNavigate();
  const location = useLocation();

  const reportType = location.state?.reportType || "";

  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // =========================
  // UPLOAD IMAGES
  // =========================
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);

    const preview = files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));

    setImages((prev) => [...prev, ...preview]);
    e.target.value = "";
  };

  // =========================
  // UPLOAD VIDEOS
  // =========================
  const handleVideoUpload = (e) => {
    const files = Array.from(e.target.files);

    const preview = files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));

    setVideos((prev) => [...prev, ...preview]);
    e.target.value = "";
  };

  // =========================
  // UPLOAD FILES TO SERVER & NEXT
  // =========================
  const handleNext = async () => {
    // Collect all files to upload
    const allFiles = [...images, ...videos];

    // Require at least one photo or video before proceeding
    if (allFiles.length === 0) {
      alert("Please upload at least one photo or video as evidence.");
      return;
    }

    setUploading(true);
    setUploadError("");

    try {
      // Create FormData
      const formData = new FormData();
      allFiles.forEach((item) => {
        formData.append("files", item.file);
      });

      // Upload to backend
      const response = await fetch(`${API_BASE}/api/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed.");
      }

      // Extract URLs from response
      const uploadedFiles = data.files || [];
      const imageUrls = uploadedFiles
        .filter((f) => f.mimetype.startsWith("image/"))
        .map((f) => f.url);
      const videoUrls = uploadedFiles
        .filter((f) => f.mimetype.startsWith("video/"))
        .map((f) => f.url);

      // Navigate to description step with URLs
      navigate("/description-step", {
        state: {
          reportType: reportType,
          images: imageUrls,
          videos: videoUrls,
        },
      });
    } catch (err) {
      setUploadError(err.message || "Failed to upload files.");
      setUploading(false);
    }
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeVideo = (index) => {
    setVideos((prev) => prev.filter((_, i) => i !== index));
  };

  const optionClass =
    "w-full min-h-[76px] bg-white border border-[#C8DCC3] rounded-2xl px-5 py-4 flex items-center gap-4 cursor-pointer shadow-sm hover:border-[#0B5D2A] hover:bg-[#F4F8F2] transition";

  const iconBoxClass =
    "w-11 h-11 rounded-xl bg-[#E8F5E3] flex items-center justify-center shrink-0";

  const removeBtnClass =
    "absolute -top-2 -right-2 w-7 h-7 rounded-full bg-red-500 text-white text-sm font-bold flex items-center justify-center hover:bg-red-600 transition";

  return (
    <div className="min-h-[100dvh] bg-[#E5E7EB] flex justify-center items-center sm:py-6 sm:px-3">
      <div className="relative w-full h-[100dvh] sm:w-[390px] sm:h-[844px] bg-[#F8FAF8] sm:rounded-[40px] sm:border-[5px] sm:border-white sm:shadow-2xl overflow-hidden flex flex-col">
        {/* HEADER */}
        <header className="relative h-[82px] bg-[#0B5D2A] flex items-center justify-center shrink-0 px-6">
          <button
            type="button"
            onClick={() => navigate("/create-report")}
            aria-label="Back"
            className="absolute left-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center text-white text-[20px] bg-white/10 hover:bg-white/20 active:scale-95 transition"
          >
            <FaArrowLeft />
          </button>

          <h1 className="text-white text-[21px] font-extrabold">
            Upload Evidence
          </h1>
        </header>

        {/* MAIN CONTENT */}
        <main className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-6 px-5 pt-6 pb-6">
          {/* STEP */}
          <div className="flex flex-col gap-1.5">
            <p className="text-[13px] font-bold text-[#0B5D2A]">Step 2 of 4</p>
            <h2 className="text-[21px] font-extrabold text-gray-900 leading-tight">
              Upload Evidence <span className="text-red-500">*</span>
            </h2>
            <p className="text-[12px] text-gray-500 leading-5">
              You must upload at least one photo or video
              <br />
              as evidence of the environmental concern.
            </p>
          </div>

          {/* UPLOAD OPTIONS */}
          <div className="flex flex-col gap-4">
            {/* TAKE PHOTO */}
            <label className={optionClass}>
              <div className={iconBoxClass}>
                <FaCamera size={21} className="text-[#0B5D2A]" />
              </div>
              <div className="min-w-0 flex flex-col gap-1">
                <h3 className="text-[14px] font-bold text-gray-800">
                  Take Photo
                </h3>
                <p className="text-[12px] text-gray-500">
                  Capture using your camera
                </p>
              </div>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>

            {/* UPLOAD PHOTOS */}
            <label className={optionClass}>
              <div className={iconBoxClass}>
                <FaImages size={21} className="text-[#0B5D2A]" />
              </div>
              <div className="min-w-0 flex flex-col gap-1">
                <h3 className="text-[14px] font-bold text-gray-800">
                  Upload Photos
                </h3>
                <p className="text-[12px] text-gray-500">
                  JPG, PNG (Max 30MB each)
                </p>
              </div>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>

            {/* UPLOAD VIDEO */}
            <label className={optionClass}>
              <div className={iconBoxClass}>
                <FaVideo size={21} className="text-[#0B5D2A]" />
              </div>
              <div className="min-w-0 flex flex-col gap-1">
                <h3 className="text-[14px] font-bold text-gray-800">
                  Upload Video
                </h3>
                <p className="text-[12px] text-gray-500">MP4, MOV (Max 30MB)</p>
              </div>
              <input
                type="file"
                accept="video/*"
                onChange={handleVideoUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* UPLOADED PHOTOS */}
          {images.length > 0 && (
            <section className="flex flex-col gap-3">
              <h3 className="text-[14px] font-extrabold text-[#0B5D2A]">
                Uploaded Photos
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {images.map((img, index) => (
                  <div key={index} className="relative">
                    <img
                      src={img.url}
                      alt="Uploaded evidence"
                      className="w-full h-[82px] rounded-xl object-cover border border-[#D5E4D1]"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      aria-label="Remove photo"
                      className={removeBtnClass}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* UPLOADED VIDEOS */}
          {videos.length > 0 && (
            <section className="flex flex-col gap-3">
              <h3 className="text-[14px] font-extrabold text-[#0B5D2A]">
                Uploaded Videos
              </h3>
              <div className="flex flex-col gap-4">
                {videos.map((video, index) => (
                  <div key={index} className="relative">
                    <video
                      controls
                      className="w-full rounded-2xl border border-[#D5E4D1]"
                    >
                      <source src={video.url} />
                    </video>
                    <button
                      type="button"
                      onClick={() => removeVideo(index)}
                      aria-label="Remove video"
                      className={removeBtnClass}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ERROR MESSAGE */}
          {uploadError && (
            <div className="p-3 bg-red-100 border border-red-400 rounded-2xl text-red-700 text-sm">
              {uploadError}
            </div>
          )}
        </main>

        {/* NEXT BUTTON */}
        <div
          className="shrink-0 bg-[#F8FAF8] border-t border-[#E2ECDF]"
          style={{
            paddingTop: "16px",
            paddingLeft: "20px",
            paddingRight: "20px",
            paddingBottom: "max(40px, calc(env(safe-area-inset-bottom) + 24px))",
          }}
        >
          <button
            type="button"
            onClick={handleNext}
            disabled={uploading || (images.length === 0 && videos.length === 0)}
            className="w-full h-[56px] rounded-2xl bg-[#0B5D2A] text-white font-extrabold text-[15px] flex items-center justify-center gap-2 shadow-lg hover:bg-[#084A21] active:scale-[0.98] transition disabled:opacity-50"
          >
            {uploading ? (
              <>
                <FaSpinner className="animate-spin" />
                Uploading...
              </>
            ) : (
              "Next"
            )}
          </button>
        </div>

        {/* Fake home bar, desktop frame only */}
        <div className="hidden sm:flex absolute bottom-3 left-0 right-0 justify-center pointer-events-none z-30">
          <div className="w-[70px] h-[5px] rounded-full bg-gray-800 opacity-70" />
        </div>
      </div>
    </div>
  );
}