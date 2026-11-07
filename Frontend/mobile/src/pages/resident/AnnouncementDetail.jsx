import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft, FaSpinner } from "react-icons/fa";
import { apiFetch } from "../../api";
import DOMPurify from "dompurify";

// label style as the announcements list ("community" -> "Community")
const toLabel = (value) => {
  const text = String(value ?? "").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "Others";
};

export default function AnnouncementDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [announcement, setAnnouncement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        setLoading(true);
        const data = await apiFetch("/api/announcements");
        const found = data.find((item) => item.announcement_id === parseInt(id));
        if (found) {
          setAnnouncement(found);
        } else {
          setError("Announcement not found.");
        }
      } catch (err) {
        console.error("Error fetching announcement:", err);
        setError("Failed to load announcement.");
      } finally {
        setLoading(false);
      }
    };
    fetchAnnouncement();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#E5E7EB] flex items-center justify-center">
        <FaSpinner className="animate-spin text-[#0B5D2A]" size={40} />
      </div>
    );
  }

  if (error || !announcement) {
    return (
      <div
        className="min-h-[100dvh] bg-[#E5E7EB] flex items-center justify-center"
        style={{ padding: "0 24px" }}
      >
        <div
          className="bg-white rounded-2xl border border-red-300 text-center max-w-sm w-full flex flex-col items-center"
          style={{ padding: "32px", gap: "16px" }}
        >
          <p className="text-[16px] font-bold text-red-600">
            {error || "Announcement not found."}
          </p>
          <button
            type="button"
            onClick={() => navigate("/resident-dashboard")}
            className="text-[#0B5D2A] font-bold underline"
            style={{ padding: "8px 16px" }}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#E5E7EB] flex justify-center items-center sm:py-6 sm:px-3">
      {/* Full screen on phones, phone frame only on sm and up */}
      <div className="relative w-full h-[100dvh] sm:w-[390px] sm:h-[844px] bg-[#F8FAF8] sm:rounded-[40px] sm:border-[5px] sm:border-white sm:shadow-2xl overflow-hidden flex flex-col">
        {/* HEADER – back arrow goes back to previous page */}
        <header
          className="relative h-[82px] bg-[#0B5D2A] flex items-center justify-center shrink-0"
          style={{ padding: "0 64px" }}
        >
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="absolute left-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center text-white text-[20px] bg-white/10 hover:bg-white/20 active:scale-95 transition"
          >
            <FaArrowLeft />
          </button>
          <h1 className="text-white text-[22px] font-extrabold text-center">
            Announcement
          </h1>
        </header>

        {/* CONTENT */}
        <main
          className="flex-1 overflow-y-auto no-scrollbar"
          style={{
            padding: "32px 24px max(48px, calc(env(safe-area-inset-bottom) + 32px))",
          }}
        >
          <div
            className="bg-white rounded-2xl border border-[#D5E4D1] shadow-sm flex flex-col items-start"
            style={{ padding: "15px 10px", gap: "15px", boxSizing: "border-box" }}
          >
            <span
              className="inline-flex rounded-full bg-[#E8F5E3] text-[#0B5D2A] text-[12px] font-extrabold"
              style={{ padding: "6px 16px" }}
            >
              {toLabel(announcement.category)}
            </span>

            <div className="flex flex-col w-full min-w-0" style={{ gap: "14px" }}>
              <h2 className="text-[24px] font-extrabold text-gray-900 leading-snug break-words">
                {announcement.title}
              </h2>
              <p className="text-[14px] text-gray-500">{announcement.date}</p>
            </div>

            <div className="w-full h-px bg-[#E5E7EB]" />

            {/* Rich-text content - sanitized + rendered as HTML so headings */}
            <div
              className="ql-content w-full min-w-0 text-[16px] text-gray-700 leading-8 break-words"
              onClick={(e) => {
                const anchor = e.target.closest("a");
                if (!anchor) return;

                let href = (anchor.getAttribute("href") || "").trim();
                if (!href) return;
                if (href === "#" || href.startsWith("#")) return;

                if (!/^(https?:|mailto:|tel:)/i.test(href)) {
                  if (href.startsWith("//")) {
                    href = "https:" + href;
                  } else {
                    href = "https://" + href.replace(/^\/+/, "");
                  }
                }

                e.preventDefault();
                e.stopPropagation();

                const link = document.createElement("a");
                link.href = href;
                link.target = "_blank";
                link.rel = "noopener noreferrer";
                link.style.display = "none";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(announcement.content || ""),
              }}
            />
          </div>
        </main>
      </div>
    </div>
  );
}