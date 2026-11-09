import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft, FaMapMarkerAlt, FaSpinner } from "react-icons/fa";
import { apiFetch } from "../../api";

// Severity based on report category
const SEVERITY_BY_CATEGORY = {
  "Flooding": "High",
  "Fallen Trees": "High",
  "Clogged Drainage": "High",
  "Crime": "High",
  "Blotter & Incident": "High",
  "Blotter & Incidents": "High",
  "Illegal Dumping": "Medium",
  "Improper Garbage Disposal": "Medium",
  "Damaged Roads": "Medium",
  "Animal Waste": "Medium",
  "Air Pollution": "Low",
  "Overgrown Grass": "Low",
  "Others Environmental Concerns": "Low",
};

const SEVERITY_STYLES = {
  High: "text-[#B42323] font-bold",
  Medium: "text-[#B8791F] font-bold",
  Low: "text-[#286C2D] font-bold",
};

const getSeverity = (category) => {
  if (!category) return "Medium";
  return SEVERITY_BY_CATEGORY[category] || "Medium";
};

// Map backend status what the resident sees
const getDisplayStatus = (rawStatus) => {
  if (!rawStatus) return "Pending";
  const normalized = String(rawStatus).toLowerCase();
  if (normalized === "assigned" || normalized === "ongoing") return "Ongoing";
  if (normalized === "pending") return "Pending";
  if (normalized === "resolved") return "Resolved";
  if (normalized === "rejected") return "Rejected";
  return rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1);
};

const STATUS_STYLES = {
  Pending:  { bg: "bg-[#FFF7D6]", border: "border-[#E6C84A]", text: "text-[#9A7000]" },
  Ongoing:  { bg: "bg-[#EAF3FF]", border: "border-[#B9D5F2]", text: "text-[#2870B8]" },
  Resolved: { bg: "bg-[#EAF7EA]", border: "border-[#B8DCBA]", text: "text-[#2E7D32]" },
  Rejected: { bg: "bg-[#FDECEC]", border: "border-[#E5B5B5]", text: "text-[#B83232]" },
};

export default function ReportDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        const data = await apiFetch(`/api/reports/${id}`);
        setReport(data);

        try {
          const mediaData = await apiFetch(`/api/reports/${id}/media`);
          setMedia(mediaData || []);
        } catch (err) {
          setMedia([]);
        }
      } catch (err) {
        setError(err.message || "Failed to fetch report details.");
        console.error("Error fetching report:", err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchReport();
    }
  }, [id]);

  const viewMap = () => {
    if (!report?.latitude || !report?.longitude) {
      alert("Location data not available.");
      return;
    }
    window.open(
      `https://www.google.com/maps?q=${report.latitude},${report.longitude}`,
      "_blank"
    );
  };

  const getReporterName = () => {
    if (!report) return "Loading...";
    if (report.first_name && report.last_name) {
      return `${report.first_name} ${report.last_name}`;
    }
    return "Anonymous";
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#E5E7EB] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <FaSpinner className="animate-spin text-[#0B5D2A]" size={40} />
          <p className="text-[#0B5D2A] font-bold">Loading report details...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div
        className="min-h-[100dvh] bg-[#E5E7EB] flex items-center justify-center"
        style={{ padding: "0 24px" }}
      >
        <div
          className="bg-white rounded-3xl border border-red-300 text-center max-w-sm w-full flex flex-col items-center"
          style={{ padding: "32px 24px", gap: "16px" }}
        >
          <p className="text-[15px] font-bold text-red-600 leading-6">
            {error || "Report not found."}
          </p>
          <button
            type="button"
            onClick={() => navigate("/my-reports")}
            className="min-h-[44px] text-[#0B5D2A] font-bold underline"
            style={{ padding: "0 16px" }}
          >
            Back to My Reports
          </button>
        </div>
      </div>
    );
  }

  const displayStatus = getDisplayStatus(report.status);
  const statusStyle = STATUS_STYLES[displayStatus] || STATUS_STYLES.Pending;
  const severity = getSeverity(report.category);

  const formattedReport = {
    ref: report.reference || `ER-2026-${String(report.report_id).padStart(4, "0")}`,
    category: report.category || "Environmental Concern",
    description: report.description || "No description provided.",
    date:
      new Date(report.submitted_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }) +
      ` • ${new Date(report.submitted_at).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })}`,
    location:
      report.address ||
      `${report.latitude || "N/A"}, ${report.longitude || "N/A"}`,
    severity,
    status: displayStatus,
    latitude: report.latitude,
    longitude: report.longitude,
    reported_by: getReporterName(),
  };

  const images = media.filter((item) => item.file_type === "image");
  const videos = media.filter((item) => item.file_type === "video");
  const hasMedia = images.length > 0 || videos.length > 0;

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
            onClick={() => navigate("/my-reports")}
            aria-label="Back"
            className="absolute left-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center text-white text-[20px] bg-white/10 hover:bg-white/20 active:scale-95 transition"
          >
            <FaArrowLeft />
          </button>
          <h1 className="text-white text-[22px] font-extrabold text-center">
            Report Details
          </h1>
        </header>

        {/* CONTENT */}
        <main
          className="flex-1 overflow-y-auto no-scrollbar flex flex-col"
          style={{
            padding: "28px 24px max(48px, calc(env(safe-area-inset-bottom) + 32px))",
            gap: "24px",
          }}
        >
          {/* REPORT NUMBER + STATUS */}
          <section
            className="bg-white rounded-2xl border border-[#D5E4D1] shadow-sm shrink-0"
            style={{ padding: "20px" }}
          >
            <div className="flex items-center justify-between" style={{ gap: "16px" }}>
              <div className="flex-1 min-w-0 flex flex-col" style={{ gap: "8px" }}>
                <p className="text-[13px] font-semibold text-gray-500 leading-5">
                  Report Number
                </p>
                <h2 className="text-[20px] font-extrabold text-[#0B5D2A] leading-7 break-words">
                  {formattedReport.ref}
                </h2>
              </div>

              <span
                className={`inline-flex items-center justify-center shrink-0 rounded-full border text-[12px] font-extrabold ${statusStyle.bg} ${statusStyle.border} ${statusStyle.text}`}
                style={{ padding: "6px 14px" }}
              >
                {formattedReport.status}
              </span>
            </div>
          </section>

          {/* REPORT INFORMATION */}
          <section
            className="bg-white rounded-2xl border border-[#D5E4D1] shadow-sm shrink-0"
            style={{ padding: "20px" }}
          >
            <h2 className="text-[20px] font-extrabold text-[#0B5D2A] leading-7">
              Report Information
            </h2>

            <div className="flex flex-col" style={{ marginTop: "20px", gap: "20px" }}>
              <InfoRow title="Category" value={formattedReport.category} />
              <InfoRow title="Description" value={formattedReport.description} />
              <InfoRow title="Date Submitted" value={formattedReport.date} />
              <InfoRow title="Location" value={formattedReport.location} />
              <InfoRow
                title="Reported By"
                value={formattedReport.reported_by}
                color={
                  formattedReport.reported_by === "Anonymous"
                    ? "text-gray-400"
                    : "text-gray-800"
                }
              />
              {/* Severity based on category */}
              <InfoRow
                title="Severity"
                value={formattedReport.severity}
                color={SEVERITY_STYLES[formattedReport.severity] || "text-gray-800"}
                last
              />
            </div>
          </section>

          {/* ATTACHED MEDIA */}
          {hasMedia && (
            <section className="flex flex-col shrink-0" style={{ gap: "16px" }}>
              <div className="flex flex-col" style={{ gap: "8px" }}>
                <h2 className="text-[22px] font-extrabold text-gray-900 leading-tight">
                  Attached Media
                </h2>
                <p className="text-[14px] text-gray-600 leading-6">
                  Photos submitted as evidence for this report.
                </p>
              </div>

              {images.length > 0 && (
                <div className="grid grid-cols-3" style={{ gap: "12px" }}>
                  {images.map((img, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-2xl border border-[#D5E4D1] shadow-sm"
                      style={{ padding: "6px" }}
                    >
                      <img
                        src={img.file_url}
                        alt={`Evidence ${index + 1}`}
                        className="w-full h-[96px] rounded-xl object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}

              {videos.length > 0 && (
                <div className="flex flex-col" style={{ gap: "16px" }}>
                  {videos.map((video, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-2xl border border-[#D5E4D1] shadow-sm"
                      style={{ padding: "6px" }}
                    >
                      <video
                        src={video.file_url}
                        controls
                        className="w-full rounded-xl"
                      />
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* VIEW STATUS TIMELINE */}
          <button
            type="button"
            onClick={() => navigate(`/report-status/${id}`)}
            className="w-full min-h-[54px] bg-[#347145] text-white rounded-2xl font-extrabold text-[16px] flex items-center justify-center shadow-md hover:bg-[#2b5c3a] active:scale-[0.98] transition shrink-0"
            style={{ gap: "12px" }}
          >
            View Status Timeline
          </button>

          {/* MAP BUTTON */}
          {formattedReport.latitude && formattedReport.longitude && (
            <button
              type="button"
              onClick={viewMap}
              className="w-full min-h-[54px] bg-[#0B5D2A] text-white rounded-2xl font-extrabold text-[16px] flex items-center justify-center shadow-md hover:bg-[#084A21] active:scale-[0.98] transition shrink-0"
              style={{ gap: "12px" }}
            >
              <FaMapMarkerAlt size={18} />
              View on Map
            </button>
          )}
        </main>
      </div>
    </div>
  );
}

function InfoRow({ title, value, color = "text-gray-800", last = false }) {
  return (
    <div
      className={`w-full min-w-0 flex flex-col ${
        !last ? "border-b border-gray-200" : ""
      }`}
      style={{ gap: "8px", paddingBottom: !last ? "20px" : 0 }}
    >
      <p className="text-[13px] font-extrabold text-gray-500 uppercase tracking-wide leading-5">
        {title}
      </p>
      <p
        className={`${color} text-[15px] leading-6 max-w-full break-words whitespace-normal`}
        style={{ overflowWrap: "break-word", wordBreak: "normal" }}
      >
        {value}
      </p>
    </div>
  );
}