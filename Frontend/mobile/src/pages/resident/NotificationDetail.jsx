import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FaArrowLeft, FaSpinner } from "react-icons/fa";

// "1 minute ago", "2 minutes ago", "1 hour ago", ...
const timeAgo = (dateString) => {
  const then = new Date(dateString);
  if (isNaN(then.getTime())) return "";

  const seconds = Math.max(0, Math.floor((Date.now() - then.getTime()) / 1000));
  if (seconds < 60) return "Just now";

  const units = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];

  for (const [name, size] of units) {
    const value = Math.floor(seconds / size);
    if (value >= 1) return `${value} ${name}${value === 1 ? "" : "s"} ago`;
  }

  return "Just now";
};

// stripHtmlToPlainText helper
const stripHtmlToPlainText = (html) => {
  if (!html) return "";
  return String(html)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/blockquote>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

export default function NotificationDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const notification = location.state?.notification;

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (notification) {
      setLoading(false);
    } else {
      navigate("/notifications");
    }
  }, [notification, navigate]);

  const handleGoToReport = () => {
    if (notification.reference_id) {
      navigate(`/report-details/${notification.reference_id}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#E5E7EB] flex items-center justify-center">
        <FaSpinner className="animate-spin text-[#0B5D2A]" size={40} />
      </div>
    );
  }

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
            onClick={() => navigate("/notifications")}
            aria-label="Back"
            className="absolute left-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center text-white text-[20px] bg-white/10 hover:bg-white/20 active:scale-95 transition"
          >
            <FaArrowLeft />
          </button>
          <h1 className="text-white text-[22px] font-extrabold text-center">
            Notification
          </h1>
        </header>

        {/* MAIN CONTENT */}
        <main
          className="flex-1 overflow-y-auto no-scrollbar"
          style={{
            padding: "32px 24px max(48px, calc(env(safe-area-inset-bottom) + 32px))",
          }}
        >
          <div
            className="w-full min-w-0 bg-white rounded-2xl border border-[#D5E4D1] shadow-sm flex flex-col items-start"
            style={{ padding: "28px 24px", gap: "20px", boxSizing: "border-box" }}
          >
            {/* Type badge */}
            <span
              className="inline-flex rounded-full bg-[#E8F5E3] text-[#0B5D2A] text-[12px] font-extrabold"
              style={{ padding: "6px 16px" }}
            >
              {notification.type || "Notification"}
            </span>

            {/* Title + date */}
            <div className="flex flex-col w-full min-w-0" style={{ gap: "10px" }}>
              <h2 className="text-[22px] font-extrabold text-gray-900 leading-snug break-words">
                {notification.title}
              </h2>
              <p className="text-[14px] text-gray-600 leading-6">
                {new Date(notification.created_at).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}{" "}
                |{" "}
                {new Date(notification.created_at).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              {timeAgo(notification.created_at) && (
                <p className="text-[13px] text-gray-500">
                  {timeAgo(notification.created_at)}
                </p>
              )}
            </div>

            <div className="w-full h-px bg-[#E5E7EB]" />

            {/* Message */}
            <p className="w-full text-[16px] text-gray-700 leading-8 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
              {stripHtmlToPlainText(notification.message)}
            </p>

            {/* Show button only if it's a Report Update with reference_id */}
            {notification.type === "Report Update" &&
              notification.reference_id && (
                <button
                  type="button"
                  onClick={handleGoToReport}
                  className="btn-primary w-full h-[52px] rounded-xl font-bold text-[15px] shadow-md transition"
                >
                  View Report Details
                </button>
              )}
          </div>
        </main>
      </div>
    </div>
  );
}