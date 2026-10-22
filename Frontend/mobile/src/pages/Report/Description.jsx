import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FaArrowLeft, FaEdit } from "react-icons/fa";

export default function DescriptionStep() {
  const navigate = useNavigate();
  const location = useLocation();

  const reportType = location.state?.reportType || "";
  const images = location.state?.images || [];
  const videos = location.state?.videos || [];

  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleNext = () => {
    if (!description.trim()) {
      alert("Please describe the environmental concern.");
      return;
    }

    navigate("/report-location", {
      state: {
        reportType: reportType,
        images: images,
        videos: videos,
        description: description,
      },
    });
  };

  return (
    <div className="min-h-[100dvh] bg-[#E5E7EB] flex justify-center items-center sm:py-6 sm:px-3">
      {/* Full screen on phones, phone frame only on sm and up */}
      <div className="relative w-full h-[100dvh] sm:w-[390px] sm:h-[844px] bg-[#F8FAF8] sm:rounded-[40px] sm:border-[5px] sm:border-white sm:shadow-2xl overflow-hidden flex flex-col">
        {/* HEADER */}
        <header className="relative h-[82px] bg-[#0B5D2A] flex items-center justify-center shrink-0 px-6">
          <button
            type="button"
            onClick={() => navigate("/upload-evidence")}
            aria-label="Back"
            className="absolute left-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center text-white text-[20px] bg-white/10 hover:bg-white/20 active:scale-95 transition"
          >
            <FaArrowLeft />
          </button>
          <h1 className="text-white text-[21px] font-extrabold">Description</h1>
        </header>

        {/* MAIN CONTENT */}
        <main
          className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-6"
          style={{ padding: "24px 20px" }}
        >
          {/* STEP */}
          <div className="flex flex-col gap-1.5">
            <p className="text-[13px] font-bold text-[#0B5D2A]">Step 3 of 4</p>
            <h2 className="text-[21px] font-extrabold text-gray-900 leading-tight">
              Describe the Issue
            </h2>
            <p className="text-[12px] text-gray-500 leading-5">
              Provide details about the environmental concern you&apos;re
              reporting.
            </p>
          </div>

          {/* DESCRIPTION CARD */}
          <section
            className="bg-white rounded-3xl border border-[#D5E4D1] shadow-sm flex flex-col gap-3"
            style={{ padding: "20px", boxSizing: "border-box" }}
          >
            <div className="flex items-center gap-2">
              <FaEdit className="text-[#0B5D2A]" size={20} />
              <h3 className="text-[16px] font-extrabold text-gray-800">
                Description
              </h3>
            </div>

            <p className="text-[12px] text-gray-500 leading-5">
              Be specific about what you observed, where, and when it happened.
            </p>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the environmental concern in detail..."
              className="block w-full min-h-[200px] rounded-xl border border-[#C8DCC3] bg-white text-left text-[16px] leading-6 text-gray-800 placeholder:text-[14px] placeholder:text-gray-400 resize-none outline-none focus:border-[#0B5D2A] focus:ring-2 focus:ring-[#0B5D2A]/10"
              style={{ padding: "14px 16px", boxSizing: "border-box" }}
              required
            />

            <p className="text-[11px] text-gray-400 text-right">
              {description.length} characters
            </p>
          </section>
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
            disabled={loading}
            className="w-full h-[56px] bg-[#0B5D2A] text-white rounded-2xl font-extrabold text-[15px] shadow-lg flex items-center justify-center hover:bg-[#084A21] active:scale-[0.98] transition disabled:opacity-50"
          >
            Next
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