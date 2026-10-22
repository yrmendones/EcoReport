import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft, FaMapMarkerAlt } from "react-icons/fa";
import { apiFetch } from "../../api";

// Severity based on report category
const SEVERITY_BY_CATEGORY = {
  "Flooding": "High",
  "Fallen Trees": "High",
  "Clogged Drainage": "High",
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
      <div className="min-h-screen bg-[#E5E7EB] flex items-center justify-center">
        <p className="text-[#0B5D2A] font-bold">Loading report details...</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-[#E5E7EB] flex items-center justify-center px-6">
        <div className="bg-white rounded-3xl border border-red-300 p-8 text-center">
          <p className="text-[15px] font-bold text-red-600">
            {error || "Report not found."}
          </p>
          <button
            onClick={() => navigate("/my-reports")}
            className="mt-4 text-[#0B5D2A] font-bold underline"
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
    ref: `ER-2026-${String(report.report_id).padStart(4, "0")}`,
    category: report.category || "Environmental Concern",
    description: report.description || "No description provided.",
    date: new Date(report.submitted_at).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }) +
      ` • ${new Date(report.submitted_at).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })}`,
    location: report.address ||
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
    <div className="min-h-screen bg-[#E5E7EB] flex justify-center items-center py-6 px-3">
      <div className="relative w-[390px] h-[844px] bg-[#F8FAF8] rounded-[40px] border-[5px] border-white shadow-2xl overflow-hidden flex flex-col">

        {/* HEADER */}
        <header className="relative h-[82px] bg-[#0B5D2A] flex items-center justify-center shrink-0">
          <button
            type="button"
            onClick={() => navigate("/my-reports")}
            className="absolute left-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center text-white text-[20px] bg-white/10 hover:bg-white/20 active:scale-95 transition"
          >
            <FaArrowLeft />
          </button>
          <h1 className="text-white text-[21px] font-extrabold">Report Details</h1>
        </header>

        <main className="flex-1 overflow-y-auto px-5 pt-9 pb-14">

          {/* REPORT NUMBER + STATUS */}
          <section className="bg-white rounded-3xl border border-[#D5E4D1] shadow-sm px-8 py-8">
            <div className="flex items-center justify-between gap-5">
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-[11px] font-semibold text-gray-500 mb-3">
                  Report Number
                </p>
                <h2 className="text-[18px] font-extrabold text-[#0B5D2A] leading-7 break-words whitespace-normal">
                  {formattedReport.ref}
                </h2>
              </div>

              <span
                className={`
                  inline-flex items-center justify-center
                  min-w-[78px] h-[34px] px-4 rounded-full
                  border
                  ${statusStyle.bg}
                  ${statusStyle.border}
                  ${statusStyle.text}
                  text-[10px] font-extrabold shrink-0
                `}
              >
                {formattedReport.status}
              </span>
            </div>
          </section>

          <div className="h-9" />

          {/* REPORT INFORMATION */}
          <section className="bg-white rounded-3xl border border-[#D5E4D1] shadow-sm px-10 py-10">
            <h2 className="text-[18px] font-extrabold text-[#0B5D2A] mb-10">
              Report Information
            </h2>

            <div className="space-y-10">
              <InfoRow title="Category" value={formattedReport.category} />
              <InfoRow title="Description" value={formattedReport.description} />
              <InfoRow title="Date Submitted" value={formattedReport.date} />
              <InfoRow title="Location" value={formattedReport.location} />
              <InfoRow
                title="Reported By"
                value={formattedReport.reported_by}
                color={formattedReport.reported_by === "Anonymous" ? "text-gray-400" : "text-gray-700"}
              />
              {/* Severity based on category */}
              <InfoRow
                title="Severity"
                value={formattedReport.severity}
                color={SEVERITY_STYLES[formattedReport.severity] || "text-gray-700"}
                last
              />
            </div>
          </section>

          <div className="h-12" />

          {/* ATTACHED MEDIA */}
          {hasMedia && (
            <section>
              <h2 className="text-[18px] font-extrabold text-gray-900">
                Attached Media
              </h2>
              <p className="text-[11px] text-gray-500 mt-3 leading-6 pr-3">
                Photos submitted as evidence for this report.
              </p>

              {images.length > 0 && (
                <div className="mt-6 grid grid-cols-3 gap-4">
                  {images.map((img, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-2xl p-1.5 border border-[#D5E4D1] shadow-sm"
                    >
                      <img
                        src={img.file_url}
                        alt={`Evidence ${index + 1}`}
                        className="w-full h-[90px] rounded-xl object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}

              {videos.length > 0 && (
                <div className="mt-6 space-y-4">
                  {videos.map((video, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-2xl p-1.5 border border-[#D5E4D1] shadow-sm"
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

          <div className="h-12" />

          {/* View Status Timeline */}
          <button
            type="button"
            onClick={() => navigate(`/report-status/${id}`)}
            className="
              w-full h-[58px]
              bg-[#347145] text-white
              rounded-2xl font-bold text-[14px]
              flex items-center justify-center gap-3
              shadow-md hover:bg-[#2b5c3a]
              active:scale-[0.98] transition
            "
          >
            View Status Timeline
          </button>

          <div className="h-4" />

          {/* MAP BUTTON */}
          {formattedReport.latitude && formattedReport.longitude && (
            <button
              type="button"
              onClick={viewMap}
              className="
                w-full h-[58px]
                bg-[#0B5D2A] text-white
                rounded-2xl font-bold text-[14px]
                flex items-center justify-center gap-3
                shadow-md hover:bg-[#084A21]
                active:scale-[0.98] transition
              "
            >
              <FaMapMarkerAlt size={18} />
              View on Map
            </button>
          )}

          <div className="h-12" />
        </main>

        <div className="absolute bottom-2 left-0 right-0 flex justify-center pointer-events-none">
          <div className="w-[70px] h-[5px] rounded-full bg-gray-800 opacity-70" />
        </div>
      </div>
    </div>
  );
}

function InfoRow({ title, value, color = "text-gray-700", last = false }) {
  return (
    <div className={`w-full min-w-0 ${!last ? "border-b border-gray-200 pb-8" : ""}`}>
      <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-4 pl-2">
        {title}
      </p>
      <p
        className={`
          ${color}
          text-[13px]
          leading-6
          pl-2
          pr-3
          max-w-full
          break-words
          whitespace-normal
        `}
        style={{
          overflowWrap: "break-word",
          wordBreak: "normal",
        }}
      >
        {value}
      </p>
    </div>
  );
}