import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaClipboardList,
  FaCalendarAlt,
  FaPhoneAlt,
  FaBullhorn,
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
    <div className="min-h-screen bg-[#E5E7EB] flex justify-center items-center py-6 px-3">
      <div className="relative w-[390px] h-[844px] bg-[#F8FAF8] rounded-[40px] border-[5px] border-white shadow-2xl overflow-hidden flex flex-col">
        {/* HEADER */}
        <header className="h-[76px] bg-[#0B5D2A] rounded-t-[35px] flex items-center justify-center relative shrink-0">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="absolute left-5 w-[43px] h-[43px] rounded-full bg-white/10 flex items-center justify-center text-white text-[21px] hover:bg-white/20 transition"
            aria-label="Back to Welcome"
          >
            <FaArrowLeft />
          </button>
          <h1 className="text-white text-[21px] font-bold">Guest Mode</h1>
        </header>

        {/* CONTENT */}
        <main className="flex-1 overflow-y-auto pb-[180px] no-scrollbar">
          <section className="px-5 pt-7">
            <h1 className="text-[22px] font-extrabold text-[#0B5D2A]">Welcome Guest</h1>
            <p className="text-[12px] text-gray-500 mt-1.5 leading-5">
              You can submit <strong>1 report per day</strong> without an account.
            </p>
          </section>

          <section className="px-5 mt-7">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[20px] font-extrabold text-gray-900">Quick Actions</h2>
            </div>
            <div className="grid grid-cols-3 gap-5">
              {quickActions.map((item, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={item.action}
                  className="w-full aspect-square bg-white border border-[#0B5D2A]/30 rounded-[26px] p-2.5 shadow-sm flex flex-col items-center justify-center gap-2 hover:shadow-md hover:-translate-y-0.5 transition-all group focus:outline-none cursor-pointer"
                >
                  <div className="text-[#0B5D2A] group-hover:scale-105 transition-transform flex items-center justify-center">
                    {item.icon}
                  </div>
                  <span className="text-[13px] font-bold text-gray-800 text-center leading-tight">
                    {item.title}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="px-5 mt-11 mb-8">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-[20px] font-extrabold text-gray-900">Announcements</h2>
              <button
                type="button"
                onClick={() => navigate("/guest-announcements")}
                className="text-[#D89A00] text-[12px] font-bold hover:underline"
              >
                View All
              </button>
            </div>

            <div className="space-y-5">
              {displayAnnouncements.map((item, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleAnnouncementClick(item.announcementId)}
                  className="w-full min-h-[82px] bg-white border border-[#C8DCC3] rounded-[22px] px-5 py-4 flex items-center justify-between gap-4 shadow-sm hover:shadow-md hover:border-[#0B5D2A] transition-all text-left focus:outline-none active:scale-[0.99]"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="w-12 h-12 rounded-2xl bg-[#E8F5E3] flex items-center justify-center shrink-0">
                      <FaBullhorn className="text-[#0B5D2A] -scale-x-100" size={21} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[15px] font-extrabold text-gray-900 leading-5 truncate">
                        {item.title}
                      </h3>
                      <p className="text-[12px] text-gray-500 font-medium leading-5 truncate mt-1">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-[#F0F8ED] flex items-center justify-center shrink-0">
                    <FaChevronRight className="text-[#0B5D2A]" size={13} />
                  </div>
                </button>
              ))}
            </div>
          </section>
        </main>

        {/* BOTTOM - UNLOCK FULL ACCESS */}
        <div className="absolute bottom-7 left-0 right-0 z-30 px-3">
          <div className="bg-[#EFFAF2] border border-[#BFE3C8] rounded-[24px] shadow-lg px-4 py-3">
            <div className="flex items-center gap-3 mb-2.5">
              <div className="w-[34px] h-[34px] rounded-full bg-[#D8F1DE] flex items-center justify-center shrink-0">
                <FaUserPlus className="text-[#0B5D2A]" size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-[12px] font-extrabold text-[#0B5D2A] leading-tight">
                  Unlock Full Access
                </h4>
                <p className="text-[9px] text-gray-600 leading-4 mt-0.5">
                  Register to submit unlimited reports & more.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate("/register")}
              className="w-full h-[42px] rounded-xl bg-[#0B5D2A] text-white font-extrabold text-[13px] shadow-sm hover:bg-[#084A21] active:scale-[0.98] transition"
            >
              Register Now
            </button>
          </div>
        </div>

        <div className="absolute bottom-2 left-0 right-0 z-40 flex justify-center pointer-events-none">
          <div className="w-[70px] h-[5px] rounded-full bg-gray-800 opacity-70" />
        </div>
      </div>
    </div>
  );
}