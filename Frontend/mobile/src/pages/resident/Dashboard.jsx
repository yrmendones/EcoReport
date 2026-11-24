import { useCallback, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../api";

import Header from "../../components/resident/Header";
import StatsCard from "../../components/resident/StatsCard";
import QuickAction from "../../components/resident/QuickAction";
import AnnouncementCard from "../../components/resident/AnnouncementCard";
import BottomNav from "../../components/resident/BottomNav";
import { LoadingIndicator } from "../../components/LoadingIndicator";
import { usePullToRefresh } from "../../components/usePullToRefresh";
import { sessionRequestCache } from "../../utils/sessionRequestCache";
import { usePublicResource } from "../../utils/usePublicResource";

import {
  FaClipboardList,
  FaCalendarAlt,
  FaFileAlt,
  FaHospital,
  FaPhoneAlt,
  FaMapMarkedAlt,
} from "react-icons/fa";

const DASHBOARD_STATS_RESOURCE = "GET /api/users/me/stats";
const DASHBOARD_CACHE_TTL_MS = 30_000;

const toStats = (data = {}) => ({
  total: data.total || 0,
  pending: data.pending || 0,
  resolved: data.resolved || 0,
});

const toDashboardAnnouncements = (data) =>
  (Array.isArray(data) ? data : []).slice(0, 2).map((item) => ({
    title: item.title,
    subtitle: item.date + " • " + item.category,
    announcementId: item.announcement_id,
  }));

export default function Dashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const cachedStats = sessionRequestCache.get(DASHBOARD_STATS_RESOURCE, token);

  // State for stats
  const [stats, setStats] = useState(() => toStats(cachedStats?.value));
  const [loading, setLoading] = useState(!cachedStats);
  const [error, setError] = useState("");
  const [statsRetry, setStatsRetry] = useState(0);

  const {
    data: announcementData,
    loading: announcementsLoading,
    error: announcementsError,
    retry: retryAnnouncements,
  } = usePublicResource("GET /api/announcements", () =>
    apiFetch("/api/announcements")
  );
  const announcements = toDashboardAnnouncements(announcementData);

  const refreshStats = useCallback(async () => {
    if (!token) return;
    const data = await sessionRequestCache.fetch(
      DASHBOARD_STATS_RESOURCE,
      token,
      () => apiFetch("/api/users/me/stats")
    );
    if (localStorage.getItem("token") !== token) return;
    setStats(toStats(data));
    setError("");
    setLoading(false);
  }, [token]);
  usePullToRefresh(refreshStats, Boolean(token) && !loading);

  // Fetch stats from backend
  useEffect(() => {
    if (!token) return undefined;
    const cached = sessionRequestCache.get(DASHBOARD_STATS_RESOURCE, token);
    if (
      statsRetry === 0 &&
      sessionRequestCache.isFresh(
        DASHBOARD_STATS_RESOURCE,
        token,
        DASHBOARD_CACHE_TTL_MS
      )
    ) return undefined;

    let active = true;
    const request = sessionRequestCache.fetch(
      DASHBOARD_STATS_RESOURCE,
      token,
      () => apiFetch("/api/users/me/stats")
    );
    request.then(
      (data) => {
        if (!active || localStorage.getItem("token") !== token) return;
        setStats(toStats(data));
        setError("");
        setLoading(false);
      },
      (err) => {
        if (!active || localStorage.getItem("token") !== token) return;
        console.error("Error fetching stats:", err);
        if (!cached) setError("Failed to load statistics.");
        setLoading(false);
      }
    );
    return () => { active = false; };
  }, [statsRetry, token]);

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
  const displayAnnouncements = announcements.length > 0
    ? announcements
    : [];

  return (
    <div className="min-h-[100dvh] bg-[#E5E7EB] flex justify-center items-center sm:py-6 sm:px-3">

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
          className="mobile-scroll flex-1 overflow-y-auto flex flex-col"
          style={{
            padding:
              "36px 24px max(140px, calc(env(safe-area-inset-bottom) + 120px))",
            gap: "44px",
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
                  onClick={() => {
                    setError("");
                    setLoading(true);
                    setStatsRetry((retry) => retry + 1);
                  }}
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
              {announcementsLoading && !announcementData ? (
                <LoadingIndicator label="Loading announcements" size={20} />
              ) : announcementsError && announcements.length === 0 ? (
                <div className="rounded-xl border border-red-300 bg-red-100 p-4 text-center">
                  <p className="text-sm text-red-700">{announcementsError}</p>
                  <button
                    type="button"
                    onClick={retryAnnouncements}
                    className="mt-2 text-sm font-bold text-[#0B5D2A] underline"
                  >
                    Try Again
                  </button>
                </div>
              ) : displayAnnouncements.length > 0 ? displayAnnouncements.map((item, index) => (
                <AnnouncementCard
                  key={index}
                  title={item.title}
                  subtitle={item.subtitle}
                  announcementId={item.announcementId}
                />
              )) : (
                <p className="text-sm text-gray-500">No announcements available.</p>
              )}
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
