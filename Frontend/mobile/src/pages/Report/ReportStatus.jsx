import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FaArrowLeft,
  FaCheckCircle,
  FaSpinner,
  FaExclamationCircle,
  FaClipboardCheck,
} from "react-icons/fa";
import { apiFetch } from "../../api";

const STATUS_CONFIG = {
  pending: { label: "Submitted", color: "text-amber-500", icon: FaClipboardCheck },
  ongoing: { label: "Ongoing", color: "text-blue-500", icon: FaSpinner },
  assigned: { label: "Ongoing", color: "text-blue-500", icon: FaCheckCircle },
  resolved: { label: "Resolved", color: "text-green-600", icon: FaCheckCircle },
  rejected: { label: "Rejected", color: "text-red-500", icon: FaExclamationCircle },
};

const formatDateTime = (dateString) => {
  if (!dateString) return "";
  const safe = String(dateString).replace("T", " ").split(".")[0];
  const [datePart, timePart] = safe.split(" ");
  const [y, m, d] = (datePart || "").split("-");
  if (!y || !m || !d) return dateString;

  const [hh = "00", mm = "00"] = (timePart || "").split(":");
  const hour24 = parseInt(hh, 10);
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const ampm = hour24 >= 12 ? "PM" : "AM";

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const monthName = months[parseInt(m, 10) - 1] || m;

  return `${monthName} ${parseInt(d, 10)}, ${y} | ${String(hour12).padStart(2, "0")}:${mm} ${ampm}`;
};

export default function ReportStatus() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await apiFetch(`/api/reports/${id}/timeline`);
        setTimeline(data || []);
      } catch (err) {
        console.error("Error fetching timeline:", err);
        setError("Failed to load report status.");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchTimeline();
  }, [id]);

  const getStatusInfo = (status) => {
    return (
      STATUS_CONFIG[status?.toLowerCase()] || {
        label: status || "Unknown",
        color: "text-gray-500",
        icon: FaCheckCircle,
      }
    );
  };

  const formattedRef = `ER-2026-${String(id || "").padStart(4, "0")}`;

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
            onClick={() => navigate(`/report-details/${id}`)}
            aria-label="Back"
            className="absolute left-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center text-white text-[20px] bg-white/10 hover:bg-white/20 active:scale-95 transition"
          >
            <FaArrowLeft />
          </button>
          <div className="text-center flex flex-col" style={{ gap: "2px" }}>
            <h1 className="text-white text-[22px] font-extrabold leading-tight">
              Report Status
            </h1>
            <p className="text-white/90 text-[12px] font-semibold leading-4">
              {formattedRef}
            </p>
          </div>
        </header>

        {/* CONTENT */}
        <main
          className="flex-1 overflow-y-auto no-scrollbar flex flex-col"
          style={{
            padding: "28px 24px max(48px, calc(env(safe-area-inset-bottom) + 32px))",
            gap: "24px",
          }}
        >
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center" style={{ gap: "16px" }}>
              <FaSpinner className="animate-spin text-[#0B5D2A]" size={36} />
              <p className="text-gray-600 text-[14px] leading-6">Loading timeline...</p>
            </div>
          ) : error ? (
            <div
              className="bg-white rounded-2xl border border-red-300 shadow-sm flex flex-col items-center text-center shrink-0"
              style={{ padding: "40px 24px", gap: "16px" }}
            >
              <p className="text-[15px] font-bold text-red-600 leading-6">{error}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="min-h-[44px] text-[#0B5D2A] font-bold underline"
                style={{ padding: "0 16px" }}
              >
                Try Again
              </button>
            </div>
          ) : timeline.length === 0 ? (
            <div
              className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center text-center shrink-0"
              style={{ padding: "48px 24px", gap: "8px" }}
            >
              <p className="text-[15px] font-bold text-gray-700 leading-6">
                No status updates yet.
              </p>
              <p className="text-[13px] text-gray-500 leading-5">
                The barangay hasn't reviewed your report.
              </p>
            </div>
          ) : (
            <div
              className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col shrink-0"
              style={{ padding: "24px 20px 4px" }}
            >
              {timeline.map((step, index) => {
                const info = getStatusInfo(step.status);
                const Icon = info.icon;
                const isLast = index === timeline.length - 1;

                return (
                  <div key={step.timeline_id} className="flex" style={{ gap: "16px" }}>
                    {/* ICON + LINE */}
                    <div className="flex flex-col items-center shrink-0">
                      <Icon size={30} className={info.color} />
                      {!isLast && (
                        <div className="w-1 flex-1 bg-gray-300 rounded-full" style={{ minHeight: "32px", marginTop: "8px" }} />
                      )}
                    </div>

                    {/* TEXT */}
                    <div
                      className="min-w-0 flex-1 flex flex-col"
                      style={{ gap: "6px", paddingBottom: isLast ? "20px" : "28px" }}
                    >
                      <h3 className="font-extrabold text-[17px] text-gray-900 leading-6">
                        {info.label}
                      </h3>
                      <p className="text-gray-600 text-[14px] leading-5">
                        {formatDateTime(step.created_at)}
                      </p>
                      {step.note && (
                        <p className="text-gray-500 text-[13px] italic leading-6 break-words">
                          {step.note}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}