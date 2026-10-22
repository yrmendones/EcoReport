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
    <div
      className="
        min-h-screen
        bg-[#E5E7EB]
        flex
        justify-center
        items-center
        py-6
        px-3
      "
    >
      <div
        className="
          relative
          w-[390px]
          h-[844px]
          bg-[#F8FAF8]
          rounded-[40px]
          border-[5px]
          border-white
          shadow-2xl
          overflow-hidden
          flex
          flex-col
        "
      >
        <div className="shrink-0">
          <Header />
        </div>

        <main
          className="
            flex-1
            overflow-y-auto
            pb-[130px]
            no-scrollbar
          "
        >
          <section className="px-5 pt-7">
            <p className="text-[12px] text-gray-500">Welcome back!</p>
            <h1 className="text-[22px] font-extrabold text-[#0B5D2A] mt-1">
              Environmental Dashboard
            </h1>
          </section>

          <section className="px-5 mt-7">
            {error ? (
              <div className="bg-red-100 border border-red-400 rounded-xl p-4 text-center">
                <p className="text-red-700 text-sm">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-2 text-[#0B5D2A] font-bold underline"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
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

          <section className="px-5 mt-11">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[20px] font-extrabold text-gray-900">
                Quick Actions
              </h2>
            </div>
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

          <section className="px-5 mt-11 mb-8">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-[20px] font-extrabold text-gray-900">
                Announcements
              </h2>
              <button
                type="button"
                onClick={() => navigate("/announcements")}
                className="text-[#D89A00] text-[12px] font-bold hover:underline"
              >
                View All
              </button>
            </div>

            <div className="space-y-5">
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

        <div className="absolute bottom-7 left-0 right-0 z-30">
          <BottomNav />
        </div>

        <div className="absolute bottom-2 left-0 right-0 z-40 flex justify-center pointer-events-none">
          <div className="w-[70px] h-[5px] rounded-full bg-gray-800 opacity-70" />
        </div>
      </div>
    </div>
  );
}