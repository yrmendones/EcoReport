import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaSpinner } from "react-icons/fa";
import { apiFetch } from "../../api";

// Strip HTML tags so the list preview shows readable text,
// not "<h2>...</h2>" markers from announcements written in the admin panel.
const stripHtml = (html) => {
  if (!html) return "";
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
};

const truncate = (text, maxLength = 60) => {
  const plain = stripHtml(text).replace(/\s+/g, " ").trim();
  if (!plain) return "";
  return plain.length > maxLength
    ? plain.substring(0, maxLength) + "..."
    : plain;
};

// Tabs that always appear (more are added automatically from the data)
const BASE_CATEGORIES = ["Environmental", "Health", "Disaster", "Community"];

// Ignore letter case and extra spaces when matching categories
const normalize = (value) => String(value ?? "").trim().toLowerCase();

const toLabel = (value) => {
  const text = String(value ?? "").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "Others";
};

// Announcements without a category go under "others"
const getCategoryKey = (item) => normalize(item.category) || "others";

// Hides the scrollbar in every browser, scrolling still works
const hideScrollbarStyle = {
  scrollbarWidth: "none",
  msOverflowStyle: "none",
};

export default function Announcement() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("all");
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        setLoading(true);
        const data = await apiFetch("/api/announcements");
        setAnnouncements(data);
      } catch (err) {
        console.error("Error fetching announcements:", err);
        setError("Failed to load announcements.");
      } finally {
        setLoading(false);
      }
    };
    fetchAnnouncements();
  }, []);

  // Build the tabs: fixed categories first, then any other category found in the data
  const tabMap = new Map();
  BASE_CATEGORIES.forEach((category) => tabMap.set(normalize(category), category));
  announcements.forEach((item) => {
    const key = getCategoryKey(item);
    if (!tabMap.has(key)) tabMap.set(key, toLabel(item.category));
  });

  const tabs = [
    { key: "all", label: "All" },
    ...Array.from(tabMap, ([key, label]) => ({ key, label })),
  ];

  const filtered =
    activeTab === "all"
      ? announcements
      : announcements.filter((item) => getCategoryKey(item) === activeTab);

  const activeLabel = tabs.find((tab) => tab.key === activeTab)?.label || "All";

  return (
    <div className="min-h-[100dvh] bg-[#E5E7EB] flex justify-center items-center sm:py-6 sm:px-3">
      {/* Hides the scrollbar (Chrome, Safari, Edge) */}
      <style>{`
        .no-bar::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }
      `}</style>

      {/* Full screen on phones, phone frame only on sm and up */}
      <div className="relative w-full h-[100dvh] sm:w-[390px] sm:h-[844px] bg-[#F8FAF8] sm:rounded-[40px] sm:border-[5px] sm:border-white sm:shadow-2xl overflow-hidden flex flex-col">
        {/* HEADER */}
        <header
          className="relative h-[82px] bg-[#0B5D2A] flex items-center justify-center shrink-0"
          style={{ padding: "0 64px" }}
        >
          <button
            type="button"
            onClick={() => navigate("/resident-dashboard")}
            aria-label="Back"
            className="absolute left-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center text-white text-[20px] bg-white/10 hover:bg-white/20 active:scale-95 transition"
          >
            <FaArrowLeft />
          </button>
          <h1 className="text-white text-[22px] font-extrabold text-center">
            Announcements
          </h1>
        </header>

        {/* CONTENT */}
        <main
          className="no-bar flex-1 overflow-y-auto flex flex-col"
          style={{
            ...hideScrollbarStyle,
            padding: "32px 24px max(48px, calc(env(safe-area-inset-bottom) + 32px))",
            gap: "28px",
          }}
        >
          {/* Intro */}
          <div className="shrink-0 flex flex-col" style={{ gap: "12px" }}>
            <h2 className="text-[24px] font-extrabold text-gray-900 leading-tight">
              Latest Announcements
            </h2>
            <p className="text-[14px] text-gray-600 leading-7">
              Stay updated with the latest barangay announcements and community
              activities.
            </p>
          </div>

          {/* Category tabs: wrap to next line so every category is visible */}
          <div className="shrink-0 w-full flex flex-wrap" style={{ gap: "10px" }}>
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`shrink-0 min-h-[46px] rounded-xl whitespace-nowrap text-[14px] font-extrabold flex items-center justify-center border transition ${
                  activeTab === tab.key
                    ? "bg-[#0B5D2A] text-white border-[#0B5D2A] shadow-sm"
                    : "bg-white text-[#0B5D2A] border-[#C8DCC3] hover:bg-[#F4F8F2]"
                }`}
                style={{ padding: "0 18px" }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* LIST */}
          {loading ? (
            <div
              className="shrink-0 flex items-center justify-center"
              style={{ padding: "48px 0" }}
            >
              <FaSpinner className="animate-spin text-[#0B5D2A]" size={30} />
            </div>
          ) : error ? (
            <div
              className="shrink-0 bg-white rounded-2xl border border-red-300 text-center flex flex-col items-center"
              style={{ padding: "32px", gap: "16px" }}
            >
              <p className="text-[15px] font-bold text-red-600">{error}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="text-[#0B5D2A] font-bold underline"
                style={{ padding: "8px 16px" }}
              >
                Try Again
              </button>
            </div>
          ) : (
            <div className="shrink-0 flex flex-col" style={{ gap: "20px" }}>
              {filtered.length > 0 ? (
                filtered.map((item) => (
                  <button
                    key={item.announcement_id}
                    type="button"
                    onClick={() =>
                      navigate(`/announcement-detail/${item.announcement_id}`)
                    }
                    className="block w-full bg-white rounded-2xl border border-[#D5E4D1] shadow-sm hover:shadow-md transition text-left active:scale-[0.99]"
                    style={{ padding: "24px", boxSizing: "border-box" }}
                  >
                    <div
                      className="flex flex-col items-start"
                      style={{ gap: "14px" }}
                    >
                      <div className="flex flex-col" style={{ gap: "6px" }}>
                        <h3 className="text-[17px] font-extrabold text-gray-900 leading-7 break-words">
                          {item.title}
                        </h3>
                        <p className="text-[13px] text-gray-500">{item.date}</p>
                      </div>

                      {/* Description preview — plain text, HTML stripped */}
                      <p className="text-[14px] text-gray-700 leading-7 break-words">
                        {truncate(item.content, 80)}
                      </p>

                      <span
                        className="inline-flex rounded-lg bg-[#E8F5E3] text-[#0B5D2A] text-[12px] font-extrabold"
                        style={{ padding: "8px 16px" }}
                      >
                        {toLabel(item.category)}
                      </span>
                    </div>
                  </button>
                ))
              ) : (
                <div
                  className="bg-white rounded-2xl border border-[#D5E4D1] text-center"
                  style={{ padding: "40px 24px" }}
                >
                  <p className="text-[14px] font-semibold text-gray-500 leading-6">
                    {activeTab === "all"
                      ? "No announcements available."
                      : `No ${activeLabel} announcements yet.`}
                  </p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}