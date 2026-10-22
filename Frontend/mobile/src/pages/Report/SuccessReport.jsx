import { useNavigate, useLocation } from "react-router-dom";
import { FaCheckCircle } from "react-icons/fa";
import { useEffect, useState } from "react";
import { apiFetch } from "../../api";

export default function ReportSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const reportId = location.state?.reportId || null;
  const [reportRef, setReportRef] = useState("");

  useEffect(() => {
    if (reportId) {
      // Fetch the report details to get the reference number
      const fetchReport = async () => {
        try {
          const data = await apiFetch(`/api/reports/${reportId}`);
          setReportRef(data.report_id || `ER-2026-${String(reportId).padStart(4, '0')}`);
        } catch (error) {
          console.error("Failed to fetch report:", error);
          setReportRef(`ER-2026-${String(reportId).padStart(4, '0')}`);
        }
      };
      fetchReport();
    }
  }, [reportId]);

  return (
    <div
      className="
        min-h-screen
        bg-[#E5E7EB]
        flex
        justify-center
        items-center
        py-6
        px-3
      "
    >
      {/* ================= PHONE FRAME ================= */}
      <div
        className="
          relative
          w-[390px]
          h-[844px]
          bg-[#F8FAF8]
          rounded-[40px]
          border-[5px]
          border-white
          shadow-2xl
          overflow-hidden
          flex
          flex-col
        "
      >
        {/* ================= MAIN CONTENT ================= */}
        <main
          className="
            flex-1
            flex
            flex-col
            items-center
            justify-center
            px-6
            pb-8
            overflow-y-auto
            no-scrollbar
          "
        >
          {/* ================= SUCCESS ICON ================= */}
          <div
            className="
              w-[92px]
              h-[92px]
              rounded-full
              bg-[#E8F5E3]
              flex
              items-center
              justify-center
              shrink-0
            "
          >
            <FaCheckCircle
              size={72}
              className="text-[#0B5D2A]"
            />
          </div>

          {/* ================= TITLE ================= */}
          <h1
            className="
              text-[27px]
              font-extrabold
              text-[#0B5D2A]
              text-center
              mt-6
              leading-tight
            "
          >
            Report Submitted
          </h1>
          <h2
            className="
              text-[27px]
              font-extrabold
              text-[#0B5D2A]
              text-center
              leading-tight
            "
          >
            Successfully!
          </h2>

          {/* ================= MESSAGE ================= */}
          <p
            className="
              text-[13px]
              text-gray-500
              text-center
              mt-5
              leading-6
              max-w-[300px]
            "
          >
            Thank you for your report.
            <br />
            The barangay will review your submission
            as soon as possible.
          </p>

          {/* ================= REFERENCE NUMBER ================= */}
          <div
            className="
              mt-6
              w-full
              bg-[#F0F8ED]
              border
              border-[#A9C9A1]
              rounded-2xl
              px-5
              py-5
            "
          >
            <p className="text-center text-gray-500 text-[12px] font-medium">
              Reference Number
            </p>
            <h3 className="text-center text-[23px] font-extrabold text-[#0B5D2A] mt-2">
              {reportRef || "Loading..."}
            </h3>
          </div>

          {/* ================= 48PX SPACE ================= */}
          <div className="h-12 shrink-0" />

          {/* ================= BUTTONS ================= */}
          <div className="w-full flex flex-col gap-6">
            {/* ================= VIEW MY REPORTS ================= */}
            <button
              type="button"
              onClick={() => navigate("/my-reports")}
              className="
                w-full
                h-[54px]
                rounded-2xl
                bg-[#0B5D2A]
                text-white
                font-extrabold
                text-[14px]
                flex
                items-center
                justify-center
                shadow-md
                hover:bg-[#084A21]
                active:scale-[0.98]
                transition
              "
            >
              View My Reports
            </button>

            {/* ================= BACK TO DASHBOARD ================= */}
            <button
              type="button"
              onClick={() => navigate("/resident-dashboard")}
              className="
                w-full
                h-[54px]
                rounded-2xl
                border-2
                border-[#0B5D2A]
                bg-white
                text-[#0B5D2A]
                font-extrabold
                text-[14px]
                flex
                items-center
                justify-center
                hover:bg-[#F0F8ED]
                active:scale-[0.98]
                transition
              "
            >
              Back to Dashboard
            </button>
          </div>
        </main>

        {/* ================= ANDROID HOME BAR ================= */}
        <div
          className="
            absolute
            bottom-3
            left-0
            right-0
            flex
            justify-center
            pointer-events-none
            z-30
          "
        >
          <div className="w-[70px] h-[5px] rounded-full bg-gray-800 opacity-70" />
        </div>
      </div>
    </div>
  );
}