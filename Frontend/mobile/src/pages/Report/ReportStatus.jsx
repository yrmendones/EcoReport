import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft, FaCheckCircle, FaSpinner, FaExclamationCircle, FaClipboardCheck } from "react-icons/fa";
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
    return STATUS_CONFIG[status?.toLowerCase()] || {
      label: status || "Unknown",
      color: "text-gray-500",
      icon: FaCheckCircle,
    };
  };

  const formattedRef = `ER-2026-${String(id || "").padStart(4, "0")}`;

  return (
    <div className="min-h-screen bg-[#E5E7EB] flex justify-center items-center py-6">
      <div className="w-[390px] h-[840px] bg-[#F8FAF8] rounded-[38px] shadow-2xl overflow-hidden flex flex-col">

        {/* HEADER */}
        <header className="bg-[#0B5D2A] h-16 flex items-center justify-center relative shrink-0">
          <button
            onClick={() => navigate(`/report-details/${id}`)}
            className="absolute left-5 text-white text-xl"
          >
            <FaArrowLeft />
          </button>
          <div className="text-center">
            <h1 className="text-white text-xl font-bold">Report Status</h1>
            <p className="text-white text-[10px]">{formattedRef}</p>
          </div>
        </header>

        {/* TIMELINE */}
        <main className="flex-1 overflow-y-auto p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <FaSpinner className="animate-spin text-[#0B5D2A]" size={30} />
              <p className="text-gray-500 text-sm">Loading timeline...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-500 font-semibold">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 text-[#0B5D2A] font-bold underline"
              >
                Try Again
              </button>
            </div>
          ) : timeline.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 font-semibold">No status updates yet.</p>
              <p className="text-xs text-gray-400 mt-2">
                The barangay hasn't reviewed your report.
              </p>
            </div>
          ) : (
            timeline.map((step, index) => {
              const info = getStatusInfo(step.status);
              const Icon = info.icon;
              const isLast = index === timeline.length - 1;

              return (
                <div key={step.timeline_id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <Icon size={30} className={info.color} />
                    {!isLast && <div className="w-1 h-14 bg-gray-300"></div>}
                  </div>
                  <div className="pb-8 min-w-0 flex-1">
                    <h3 className="font-bold text-lg text-gray-800">{info.label}</h3>
                    <p className="text-gray-600 text-[12px] mt-0.5">
                      {formatDateTime(step.created_at)}
                    </p>
                    {step.note && (
                      <p className="text-gray-500 text-[11px] mt-1 italic leading-5">
                        {step.note}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </main>

        {/* ANDROID HOME BAR */}
        <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none">
          <div className="w-[70px] h-[5px] rounded-full bg-gray-800 opacity-70" />
        </div>

      </div>
    </div>
  );
}