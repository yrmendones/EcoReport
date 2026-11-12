import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaClipboardList,
  FaCalendarAlt,
  FaPhoneAlt,
  FaChevronRight,
  FaUserPlus,
  FaArrowLeft,
} from "react-icons/fa";
import { apiFetch } from "../../api";

export default function GuestHome() {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        setAnnouncementsLoading(true);
        const data = await apiFetch("/api/announcements");
        const latest = (data || []).slice(0, 2).map((item) => ({
          title: item.title,
          subtitle: `${item.date} • ${item.category}`,
          announcementId: item.announcement_id,
        }));
        setAnnouncements(latest);
      } catch (err) {
        console.error("Error fetching announcements:", err);
        setAnnouncements([]);
      } finally {
        setAnnouncementsLoading(false);
      }
    };
    fetchAnnouncements();
  }, []);

  const quickActions = [
    {
      icon: <FaClipboardList size={27} />,
      title: "Report",
      action: () => navigate("/guest-report"),
    },
    {
      icon: <FaCalendarAlt size={27} />,
      title: "Waste Schedule",
      action: () => navigate("/guest-waste-schedule"),
    },
    {
      icon: <FaPhoneAlt size={27} />,
      title: "Hotline",
      action: () => navigate("/guest-hotlines"),
    },
  ];

  const displayAnnouncements = announcementsLoading
    ? [{ title: "Loading...", subtitle: "Please wait", announcementId: null }]
    : announcements.length > 0
    ? announcements
    : [{ title: "No Announcements", subtitle: "Check back later", announcementId: null }];

  const handleAnnouncementClick = (announcementId) => {
    if (announcementId) {
      navigate(`/guest-announcement-detail/${announcementId}`);
    } else {
      navigate("/guest-announcements");
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#E5E7EB] flex justify-center items-center sm:py-6 sm:px-3">

      {/* Full screen on phones, phone frame only on sm and up */}
      <div className="relative w-full h-[100dvh] sm:w-[390px] sm:h-[844px] bg-[#F8FAF8] sm:rounded-[40px] sm:border-[5px] sm:border-white sm:shadow-2xl overflow-hidden flex flex-col">
        {/* HEADER */}
        <header
          className="h-[82px] bg-[#0B5D2A] flex items-center justify-center relative shrink-0"
          style={{ padding: "0 64px" }}
        >
          <button
            type="button"
            onClick={() => navigate("/")}
            className="absolute left-5 w-11 h-11 rounded-full bg-white/10 flex items-center justify-center text-white text-[20px] hover:bg-white/20 active:scale-95 transition"
            aria-label="Back to Welcome"
          >
            <FaArrowLeft />
          </button>
          <h1 className="text-white text-[22px] font-bold text-center">
            Guest Mode
          </h1>
        </header>

        {/* CONTENT */}
        <main
          className="mobile-scroll flex-1 overflow-y-auto flex flex-col"
          style={{
            padding: "36px 24px 40px",
            gap: "44px",
          }}
        >
          {/* Greeting */}
          <section className="shrink-0 flex flex-col" style={{ gap: "10px" }}>
            <h1 className="text-[26px] font-extrabold text-[#0B5D2A] leading-tight">
              Welcome Guest
            </h1>
            <p className="text-[14px] text-gray-600 leading-7">
              You can submit <strong>1 report per day</strong> without an
              account.
            </p>
          </section>

          {/* Quick actions */}
          <section className="shrink-0 flex flex-col" style={{ gap: "24px" }}>
            <h2 className="text-[22px] font-extrabold text-gray-900">
              Quick Actions
            </h2>
            <div className="grid grid-cols-3 gap-5">
              {quickActions.map((item, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={item.action}
                  className="w-full aspect-square bg-white border border-[#0B5D2A]/30 rounded-[26px] shadow-sm flex flex-col items-center justify-center hover:shadow-md hover:-translate-y-0.5 transition-all group focus:outline-none cursor-pointer"
                  style={{
                    padding: "10px",
                    gap: "10px",
                    boxSizing: "border-box",
                  }}
                >
                  <div className="text-[#0B5D2A] group-hover:scale-105 transition-transform flex items-center justify-center">
                    {item.icon}
                  </div>
                  <span className="text-[14px] font-bold text-gray-800 text-center leading-tight">
                    {item.title}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* Announcements */}
          <section className="shrink-0 flex flex-col" style={{ gap: "24px" }}>
            <div
              className="flex justify-between items-center"
              style={{ gap: "12px" }}
            >
              <h2 className="text-[22px] font-extrabold text-gray-900">
                Announcements
              </h2>
              <button
                type="button"
                onClick={() => navigate("/guest-announcements")}
                className="shrink-0 text-[#D89A00] text-[15px] font-bold hover:underline"
                style={{ padding: "10px 4px" }}
              >
                View All
              </button>
            </div>

            <div className="flex flex-col" style={{ gap: "20px" }}>
              {displayAnnouncements.map((item, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleAnnouncementClick(item.announcementId)}
                  className="w-full bg-white border border-[#C8DCC3] rounded-[22px] flex items-center justify-between shadow-sm hover:shadow-md hover:border-[#0B5D2A] transition-all text-left focus:outline-none active:scale-[0.99]"
                  style={{
                    minHeight: "92px",
                    padding: "20px",
                    gap: "16px",
                    boxSizing: "border-box",
                  }}
                >
                  <div
                    className="min-w-0 flex-1 flex flex-col"
                    style={{ gap: "4px" }}
                  >
                    <h3 className="text-[16px] font-extrabold text-gray-900 leading-6 break-words">
                      {item.title}
                    </h3>
                    <p className="text-[13px] text-gray-500 font-medium leading-5 break-words">
                      {item.subtitle}
                    </p>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-[#F0F8ED] flex items-center justify-center shrink-0">
                    <FaChevronRight className="text-[#0B5D2A]" size={13} />
                  </div>
                </button>
              ))}
            </div>
          </section>
        </main>

        {/* BOTTOM - UNLOCK FULL ACCESS (a footer, so it never covers the content) */}
        <div
          className="shrink-0 bg-[#F8FAF8] border-t border-[#E2ECDF]"
          style={{
            padding:
              "16px 16px max(24px, calc(env(safe-area-inset-bottom) + 16px))",
          }}
        >
          <div
            className="bg-[#EFFAF2] border border-[#BFE3C8] rounded-[24px] shadow-lg flex flex-col"
            style={{ padding: "16px 18px", gap: "14px" }}
          >
            <div className="flex items-center" style={{ gap: "12px" }}>
              <div className="w-10 h-10 rounded-full bg-[#D8F1DE] flex items-center justify-center shrink-0">
                <FaUserPlus className="text-[#0B5D2A]" size={17} />
              </div>
              <div
                className="flex-1 min-w-0 flex flex-col"
                style={{ gap: "2px" }}
              >
                <h4 className="text-[15px] font-extrabold text-[#0B5D2A] leading-tight">
                  Unlock Full Access
                </h4>
                <p className="text-[13px] text-gray-600 leading-5">
                  Register to submit unlimited reports & more.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate("/register")}
              className="btn-primary w-full h-[50px] rounded-xl font-extrabold text-[15px] shadow-sm transition"
            >
              Register Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}