import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft, FaSpinner } from "react-icons/fa";
import { apiFetch } from "../../api";
import DOMPurify from "dompurify";

export default function GuestAnnouncementDetail() {
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
      <div className="min-h-screen bg-[#E5E7EB] flex items-center justify-center">
        <FaSpinner className="animate-spin text-[#0B5D2A]" size={40} />
      </div>
    );
  }

  if (error || !announcement) {
    return (
      <div className="min-h-screen bg-[#E5E7EB] flex items-center justify-center px-6">
        <div className="bg-white rounded-2xl border border-red-300 p-8 text-center max-w-sm w-full">
          <p className="text-[15px] font-bold text-red-600">
            {error || "Announcement not found."}
          </p>
          <button
            onClick={() => navigate("/guest-home")}
            className="mt-4 text-[#0B5D2A] font-bold underline"
          >
            Back to Guest Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E5E7EB] flex justify-center items-center py-6 px-3">
      <div className="relative w-[390px] h-[844px] bg-[#F8FAF8] rounded-[40px] border-[5px] border-white shadow-2xl overflow-hidden flex flex-col">
        <header className="relative h-[82px] bg-[#0B5D2A] flex items-center justify-center shrink-0">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="absolute left-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center text-white text-[20px] bg-white/10 hover:bg-white/20 active:scale-95 transition"
          >
            <FaArrowLeft />
          </button>
          <h1 className="text-white text-[21px] font-extrabold">Announcement</h1>
        </header>

        <main className="flex-1 overflow-y-auto px-6 pt-8 pb-8">
          <div className="bg-white rounded-2xl border border-[#D5E4D1] p-6 shadow-sm">
            <div className="mb-4">
              <span className="inline-flex px-3 py-1 rounded-full bg-[#E8F5E3] text-[#0B5D2A] text-[10px] font-extrabold">
                {announcement.category}
              </span>
            </div>
            <h2 className="text-[20px] font-extrabold text-gray-900 leading-tight">
              {announcement.title}
            </h2>
            <p className="text-[12px] text-gray-500 mt-3">{announcement.date}</p>
            <div className="h-px bg-[#E5E7EB] my-5" />
            <div
              className="ql-content text-[14px] text-gray-700 leading-7"
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

        <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none">
          <div className="w-[70px] h-[5px] rounded-full bg-gray-800 opacity-70" />
        </div>
      </div>
    </div>
  );
}