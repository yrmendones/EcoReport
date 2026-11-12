import { useNavigate, useLocation } from "react-router-dom";
import { FaCheckCircle } from "react-icons/fa";
import { useEffect, useState } from "react";
import { apiFetch } from "../../api";

// Same format as the Report Details page: ER-2026-0012
export default function ReportSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const reportId = location.state?.reportId || null;
  const [reportRef, setReportRef] = useState("");

  useEffect(() => {
    if (reportId) {
      // Fetch the report details to get the backend-computed reference.
      // The backend uses the report's submitted_at year
      const fetchReport = async () => {
        try {
          const data = await apiFetch(`/api/reports/${reportId}`);
          setReportRef(
            data.reference ||
              `ER-${new Date().getFullYear()}-${String(reportId).padStart(4, "0")}`
          );
        } catch (error) {
          console.error("Failed to fetch report:", error);
          setReportRef(
            `ER-${new Date().getFullYear()}-${String(reportId).padStart(4, "0")}`
          );
        }
      };
      fetchReport();
    }
  }, [reportId]);

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

      {/* ================= PHONE FRAME (full screen on phones) ================= */}
      <div className="relative w-full h-[100dvh] sm:w-[390px] sm:h-[844px] bg-[#F8FAF8] sm:rounded-[40px] sm:border-[5px] sm:border-white sm:shadow-2xl overflow-hidden flex flex-col">
        {/* ================= MAIN CONTENT ================= */}
        <main
          className="hide-scrollbar flex-1 overflow-y-auto flex flex-col items-center"
          style={{
            padding:
              "40px 24px max(48px, calc(env(safe-area-inset-bottom) + 32px))",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {/* Keeps the content centered when there is room, scrollable when not */}
          <div
            className="w-full flex flex-col items-center"
            style={{ margin: "auto 0", gap: "28px" }}
          >
            {/* ================= SUCCESS ICON ================= */}
            <div className="w-[100px] h-[100px] rounded-full bg-[#E8F5E3] flex items-center justify-center shrink-0">
              <FaCheckCircle size={76} className="text-[#0B5D2A]" />
            </div>

            {/* ================= TITLE + MESSAGE ================= */}
            <div className="flex flex-col items-center text-center" style={{ gap: "16px" }}>
              <div className="flex flex-col items-center">
                <h1 className="text-[28px] font-extrabold text-[#0B5D2A] text-center leading-tight">
                  Report Submitted
                </h1>
                <h2 className="text-[28px] font-extrabold text-[#0B5D2A] text-center leading-tight">
                  Successfully!
                </h2>
              </div>

              <p className="text-[15px] text-gray-600 text-center leading-7 max-w-[310px]">
                Thank you for your report.
                <br />
                The barangay will review your submission as soon as possible.
              </p>
            </div>

            {/* ================= REFERENCE NUMBER ================= */}
            <div
              className="w-full bg-[#F0F8ED] border border-[#A9C9A1] rounded-2xl flex flex-col items-center"
              style={{ padding: "24px 20px", gap: "8px", boxSizing: "border-box" }}
            >
              <p className="text-center text-gray-600 text-[14px] font-medium">
                Reference Number
              </p>
              <h3 className="text-center text-[24px] font-extrabold text-[#0B5D2A] break-words">
                {reportRef || "Loading..."}
              </h3>
            </div>

            {/* ================= BUTTONS ================= */}
            <div className="w-full flex flex-col" style={{ gap: "16px", marginTop: "8px" }}>
              {/* VIEW MY REPORTS */}
              <button
                type="button"
                onClick={() => navigate("/my-reports")}
                className="btn-primary w-full h-[56px] rounded-2xl font-extrabold text-[16px] flex items-center justify-center shadow-md transition"
              >
                View My Reports
              </button>

              <button
                type="button"
                onClick={() => navigate("/resident-dashboard")}
                className="btn-secondary w-full h-[56px] rounded-2xl font-extrabold text-[16px] flex items-center justify-center shadow-sm transition"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}