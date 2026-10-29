import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaSpinner, FaBullhorn } from "react-icons/fa";
import { apiFetch } from "../../api";
import DOMPurify from "dompurify";

const stripHtml = (html) => {
  if (!html) return "";
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
};

const truncate = (text, maxLength = 80) => {
  const plain = stripHtml(text);
  if (!plain) return "";
  return plain.length > maxLength ? plain.substring(0, maxLength) + "..." : plain;
};

export default function GuestAnnouncements() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("All");
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const tabs = ["All", "Environmental", "Health", "Disaster"];

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        setLoading(true);
        const data = await apiFetch("/api/announcements");
        setAnnouncements(data || []);
      } catch (err) {
        console.error("Error fetching announcements:", err);
        setError("Failed to load announcements.");
      } finally {
        setLoading(false);
      }
    };
    fetchAnnouncements();
  }, []);

  const filtered =
    activeTab === "All"
      ? announcements
      : announcements.filter((a) => a.category === activeTab);

  return (
    <div className="min-h-screen bg-[#E5E7EB] flex items-center justify-center p-4">
      <div className="relative w-[390px] h-[844px] bg-[#F8FAF8] rounded-[40px] border-[5px] border-white shadow-2xl overflow-hidden flex flex-col">
        <header className="relative h-[82px] bg-[#0B5D2A] flex items-center justify-center shrink-0">
          <button
            type="button"
            onClick={() => navigate("/guest-home")}
            className="absolute left-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center text-white text-[20px] bg-white/10 hover:bg-white/20 active:scale-95 transition"
          >
            <FaArrowLeft />
          </button>
          <h1 className="text-white text-[20px] font-extrabold">Announcements</h1>
        </header>

        <main className="flex-1 overflow-y-auto px-6 pt-6 pb-8 no-scrollbar">
          <div className="mb-5">
            <h2 className="text-[19px] font-extrabold text-gray-900">Latest Announcements</h2>
            <p className="text-[11px] text-gray-500 mt-1.5 leading-5">
              Stay updated with barangay news and activities.
            </p>
          </div>

          {/* TABS */}
          <div className="w-full overflow-x-auto no-scrollbar pb-1 mb-5">
            <div className="flex gap-2 min-w-max">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`shrink-0 h-[38px] px-5 rounded-xl text-[11px] font-extrabold border transition ${
                    activeTab === tab
                      ? "bg-[#0B5D2A] text-white border-[#0B5D2A]"
                      : "bg-white text-[#0B5D2A] border-[#C8DCC3] hover:bg-[#F4F8F2]"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <FaSpinner className="animate-spin text-[#0B5D2A]" size={30} />
            </div>
          ) : error ? (
            <div className="bg-white rounded-2xl border border-red-300 p-8 text-center">
              <p className="text-[13px] font-bold text-red-600">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 text-[#0B5D2A] font-bold underline"
              >
                Try Again
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#D5E4D1] p-8 text-center">
              <FaBullhorn className="mx-auto text-gray-300 mb-3" size={32} />
              <p className="text-[13px] font-semibold text-gray-500">
                No announcements available.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((item) => (
                <button
                  key={item.announcement_id}
                  type="button"
                  // Navigate to the detail page instead of expanding inline
                  onClick={() => navigate(`/guest-announcement-detail/${item.announcement_id}`)}
                  className="w-full bg-white rounded-2xl border border-[#D5E4D1] p-5 shadow-sm hover:shadow-md transition text-left active:scale-[0.99]"
                >
                  <h3 className="text-[15px] font-extrabold text-gray-900 leading-5">
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-gray-500 mt-1.5">{item.date}</p>
                  
                  {/* Just show a truncated preview */}
                  <p className="text-[12px] text-gray-600 mt-2 leading-5">
                    {truncate(item.content, 80)}
                  </p>
                  
                  <div className="mt-3">
                    <span className="inline-flex px-4 py-2 rounded-lg bg-[#E8F5E3] text-[#0B5D2A] text-[10px] font-extrabold">
                      {item.category}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="h-8" />
        </main>

        <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none">
          <div className="w-[70px] h-[5px] rounded-full bg-gray-800 opacity-70" />
        </div>
      </div>
    </div>
  );
}