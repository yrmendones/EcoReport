import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../api";

import Header from "../../components/resident/Header";
import StatsCard from "../../components/resident/StatsCard";
import QuickAction from "../../components/resident/QuickAction";
import AnnouncementCard from "../../components/resident/AnnouncementCard";
import BottomNav from "../../components/resident/BottomNav";

import {
  FaClipboardList,
  FaCalendarAlt,
  FaFileAlt,
  FaHospital,
  FaPhoneAlt,
  FaMapMarkedAlt,
} from "react-icons/fa";

export default function Dashboard() {
  const navigate = useNavigate();

  // State for stats
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    resolved: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // State for announcements
  const [announcements, setAnnouncements] = useState([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);

  // Fetch stats from backend
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await apiFetch("/api/users/me/stats");
        setStats({
          total: data.total || 0,
          pending: data.pending || 0,
          resolved: data.resolved || 0,
        });
      } catch (err) {
        console.error("Error fetching stats:", err);
        setError("Failed to load statistics.");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Fetch announcements from backend
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        setAnnouncementsLoading(true);
        const data = await apiFetch("/api/announcements");
        // Only show latest 2 announcements on dashboard
        const latest = data.slice(0, 2).map((item) => ({
          title: item.title,
          subtitle: item.date + " • " + item.category,
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

  // Quick actions
  const quickActions = [
    {
      icon: <FaClipboardList size={27} />,
      title: "Report",
      action: () => navigate("/create-report"),
    },
    {
      icon: <FaCalendarAlt size={27} />,
      title: "Schedule",
      action: () => navigate("/waste-schedule"),
    },
    {
      icon: <FaFileAlt size={27} />,
      title: "Certificate",
      action: () => navigate("/certificate-request"),
    },
    {
      icon: <FaHospital size={27} />,
      title: "Health",
      action: () => navigate("/health-center"),
    },
    {
      icon: <FaPhoneAlt size={27} />,
      title: "Hotline",
      action: () => navigate("/hotline"),
    },
    {
      icon: <FaMapMarkedAlt size={27} />,
      title: "Map",
      action: () => navigate("/environment-map"),
    },
  ];

  // Build stats array for StatsCard component
  const statsData = [
    {
      number: loading ? "..." : stats.total.toString(),
      label: "My Reports",
      action: () => navigate("/my-reports"),
    },
    {
      number: loading ? "..." : stats.pending.toString(),
      label: "Pending",
      action: () => navigate("/my-reports"),
    },
    {
      number: loading ? "..." : stats.resolved.toString(),
      label: "Resolved",
      action: () => navigate("/my-reports"),
    },
  ];

  // Loading state for announcements
  const displayAnnouncements = announcementsLoading
    ? [{ title: "Loading...", subtitle: "Please wait", announcementId: null }]
    : announcements.length > 0
    ? announcements
    : [{ title: "No Announcements", subtitle: "Check back later", announcementId: null }];

  return (
    <div className="min-h-[100dvh] bg-[#E5E7EB] flex justify-center items-center sm:py-6 sm:px-3">
      {/* Hides the scrollbar but the page can still be scrolled */}
      <style>{`
        .hide-scrollbar {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }
      `}</style>

      {/* Full screen on phones, phone frame only on sm and up */}
      <div className="relative w-full h-[100dvh] sm:w-[390px] sm:h-[844px] bg-[#F8FAF8] sm:rounded-[40px] sm:border-[5px] sm:border-white sm:shadow-2xl overflow-hidden flex flex-col">
        {/* HEADER WRAPPER */}
        <div
          className="
            shrink-0
            bg-[#0B5D2A]
            [&>*]:!px-7
            [&_img]:!w-9 [&_img]:!h-9
            [&_img]:!rounded-full
            [&_img]:object-cover
            [&_img]:shrink-0
          "
          style={{ padding: "24px 0 16px" }}
        >
          <Header />
        </div>

        {/* CONTENT */}
        <main
          className="hide-scrollbar flex-1 overflow-y-auto flex flex-col"
          style={{
            padding:
              "36px 24px max(140px, calc(env(safe-area-inset-bottom) + 120px))",
            gap: "44px",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {/* Greeting */}
          <section className="shrink-0 flex flex-col" style={{ gap: "8px" }}>
            <p className="text-[20px] font-bold text-gray-700 leading-snug">
              Welcome back!
            </p>
            <h1 className="text-[26px] font-extrabold text-[#0B5D2A] leading-tight">
              Environmental Dashboard
            </h1>
          </section>

          {/* Stats: same size and gap as the Quick Actions */}
          <section className="shrink-0">
            {error ? (
              <div
                className="bg-red-100 border border-red-400 rounded-xl text-center flex flex-col items-center"
                style={{ padding: "24px", gap: "12px" }}
              >
                <p className="text-red-700 text-[15px] leading-6">{error}</p>
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
              <div className="grid grid-cols-3 gap-5">
                {statsData.map((item, index) => (
                  <StatsCard
                    key={index}
                    number={item.number}
                    label={item.label}
                    onClick={item.action}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Quick actions */}
          <section className="shrink-0 flex flex-col" style={{ gap: "24px" }}>
            <h2 className="text-[22px] font-extrabold text-gray-900">
              Quick Actions
            </h2>
            <div className="grid grid-cols-3 gap-5">
              {quickActions.map((item, index) => (
                <QuickAction
                  key={index}
                  icon={item.icon}
                  title={item.title}
                  onClick={item.action}
                />
              ))}
            </div>
          </section>

          {/* Announcements */}
          <section className="shrink-0 flex flex-col" style={{ gap: "24px" }}>
            <div className="flex justify-between items-center" style={{ gap: "12px" }}>
              <h2 className="text-[22px] font-extrabold text-gray-900">
                Announcements
              </h2>
              <button
                type="button"
                onClick={() => navigate("/announcements")}
                className="shrink-0 text-[#D89A00] text-[15px] font-bold hover:underline"
                style={{ padding: "10px 4px" }}
              >
                View All
              </button>
            </div>

            <div className="flex flex-col" style={{ gap: "24px" }}>
              {displayAnnouncements.map((item, index) => (
                <AnnouncementCard
                  key={index}
                  title={item.title}
                  subtitle={item.subtitle}
                  announcementId={item.announcementId}
                />
              ))}
            </div>
          </section>
        </main>

        {/* BOTTOM NAV: nakadikit sa pinakababa, walang puwang at walang guhit */}
        <div className="absolute bottom-0 left-0 right-0 z-30">
          <BottomNav />
        </div>
      </div>
    </div>
  );
}