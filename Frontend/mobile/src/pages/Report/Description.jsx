import { useState, useEffect } from "react";
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
      {/* Hides the scrollbar but the page can still be scrolled */}
      <style>{`
        .hide-scrollbar {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }
      `}</style>

      {/* Full screen on phones, phone frame only on sm and up */}
      <div className="relative w-full h-[100dvh] sm:w-[390px] sm:h-[844px] bg-[#F8FAF8] sm:rounded-[40px] sm:border-[5px] sm:border-white sm:shadow-2xl overflow-hidden flex flex-col">
        {/* HEADER */}
        <header
          className="relative h-[82px] bg-[#0B5D2A] flex items-center justify-center shrink-0"
          style={{ padding: "0 64px" }}
        >
          <button
            type="button"
            onClick={() => navigate("/upload-evidence")}
            aria-label="Back"
            className="absolute left-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center text-white text-[20px] bg-white/10 hover:bg-white/20 active:scale-95 transition"
          >
            <FaArrowLeft />
          </button>
          <h1 className="text-white text-[22px] font-extrabold text-center">
            Description
          </h1>
        </header>

        {/* MAIN CONTENT */}
        <main
          className="hide-scrollbar flex-1 overflow-y-auto flex flex-col"
          style={{
            padding: "28px 24px 32px",
            gap: "28px",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {/* STEP */}
          <div className="shrink-0 flex flex-col" style={{ gap: "8px" }}>
            <p className="text-[15px] font-bold text-[#0B5D2A]">Step 3 of 4</p>
            <h2 className="text-[24px] font-extrabold text-gray-900 leading-tight">
              Describe the Issue
            </h2>
            <p className="text-[14px] text-gray-600 leading-6">
              Provide details about the environmental concern you&apos;re
              reporting.
            </p>
          </div>

          {/* DESCRIPTION CARD */}
          <section
            className="shrink-0 bg-white rounded-3xl border border-[#D5E4D1] shadow-sm flex flex-col"
            style={{ padding: "24px", gap: "16px", boxSizing: "border-box" }}
          >
            <div className="flex items-center" style={{ gap: "10px" }}>
              <FaEdit className="text-[#0B5D2A]" size={22} />
              <h3 className="text-[18px] font-extrabold text-gray-800">
                Description
              </h3>
            </div>

            <p className="text-[14px] text-gray-600 leading-6">
              Be specific about what you observed, where, and when it happened.
            </p>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the environmental concern in detail..."
              className="block w-full min-h-[220px] rounded-xl border border-[#C8DCC3] bg-white text-left text-[16px] leading-7 text-gray-800 placeholder:text-[15px] placeholder:text-gray-400 resize-none outline-none focus:border-[#0B5D2A] focus:ring-2 focus:ring-[#0B5D2A]/10"
              style={{ padding: "16px 18px", boxSizing: "border-box" }}
              required
            />

            <p className="text-[13px] text-gray-500 text-right">
              {description.length} characters
            </p>
          </section>
        </main>

        {/* NEXT BUTTON: hindi sagad sa ilalim sa kahit anong device */}
        <div
          className="shrink-0 bg-[#F8FAF8] border-t border-[#E2ECDF]"
          style={{
            paddingTop: "18px",
            paddingLeft: "24px",
            paddingRight: "24px",
            paddingBottom: "max(40px, calc(env(safe-area-inset-bottom) + 24px))",
          }}
        >
          <button
            type="button"
            onClick={handleNext}
            disabled={loading}
            className="btn-primary w-full h-[58px] rounded-2xl font-extrabold text-[16px] shadow-lg flex items-center justify-center transition disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}