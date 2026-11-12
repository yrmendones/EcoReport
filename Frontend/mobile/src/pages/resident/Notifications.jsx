import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaBell,
  FaCheckCircle,
  FaExclamationCircle,
  FaSpinner,
} from "react-icons/fa";
import { apiFetch } from "../../api";
import BottomNav from "../../components/resident/BottomNav";

// Safe HTML → plain-text conversion for the list preview.
const stripHtml = (html) => {
  if (!html) return "";
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
};

const truncate = (text, maxLength = 50) => {
  const plain = stripHtml(text).replace(/\s+/g, " ").trim();
  if (!plain) return "";
  return plain.length > maxLength ? plain.substring(0, maxLength) + "..." : plain;
};

// "1 minute ago", "2 minutes ago", "1 hour ago", ...
const ago = (value, unit) => `${value} ${unit}${value === 1 ? "" : "s"} ago`;

export default function Notifications() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("All");
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoading(true);
        const data = await apiFetch("/api/notifications");
        setNotifications(data);
        const unread = data.filter((n) => n.is_read === 0).length;
        setUnreadCount(unread);
      } catch (err) {
        console.error("Error fetching notifications:", err);
        setError("Failed to load notifications.");
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return ago(diffMins, "minute");
    if (diffHours < 24) return ago(diffHours, "hour");
    if (diffDays < 7) return ago(diffDays, "day");
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getIcon = (type, isRead) => {
    if (type === "Report Update") return <FaCheckCircle size={19} />;
    if (type === "Notification Center") return <FaExclamationCircle size={19} />;
    return <FaBell size={19} />;
  };

  const markAsRead = async (id) => {
    try {
      await apiFetch(`/api/notifications/${id}/read`, {
        method: "PUT",
      });
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.notification_id === id
            ? { ...notif, is_read: 1 }
            : notif
        )
      );
      setUnreadCount((prev) => Math.max(prev - 1, 0));
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiFetch("/api/notifications/read-all", {
        method: "PUT",
      });
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, is_read: 1 }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  const handleNotificationClick = async (notification) => {
    if (notification.is_read === 0) {
      await markAsRead(notification.notification_id);
    }
    navigate(`/notification-detail/${notification.notification_id}`, {
      state: { notification: notification },
    });
  };

  const filtered =
    activeTab === "All"
      ? notifications
      : notifications.filter(
          (item) =>
            (activeTab === "Unread" && item.is_read === 0) ||
            (activeTab === "Read" && item.is_read === 1)
        );

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#E5E7EB] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <FaSpinner className="animate-spin text-[#0B5D2A]" size={40} />
          <p className="text-[#0B5D2A] font-bold">Loading notifications...</p>
        </div>
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
            onClick={() => navigate("/resident-dashboard")}
            aria-label="Back"
            className="absolute left-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center text-white text-[20px] bg-white/10 hover:bg-white/20 active:scale-95 transition"
          >
            <FaArrowLeft />
          </button>
          <h1 className="text-white text-[22px] font-extrabold text-center">
            Notifications
          </h1>
        </header>

        {/* TABS */}
        <div
          className="shrink-0 bg-white border-b border-gray-200"
          style={{ padding: "20px 24px 16px" }}
        >
          <div
            className="flex bg-[#F1F5F2] rounded-2xl"
            style={{ padding: "6px", gap: "6px" }}
          >
            {["All", "Unread", "Read"].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex-1 h-[48px] rounded-xl text-[15px] font-extrabold transition-all ${
                  activeTab === tab
                    ? "bg-[#0B5D2A] text-white shadow-sm"
                    : "text-gray-600 hover:text-[#0B5D2A]"
                }`}
              >
                {tab}
                {tab === "Unread" && unreadCount > 0 && (
                  <span
                    className="text-[12px] bg-red-500 text-white rounded-full"
                    style={{ marginLeft: "8px", padding: "2px 8px" }}
                  >
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* CONTENT */}
        <main
          className="flex-1 overflow-y-auto no-scrollbar flex flex-col"
          style={{
            padding: "28px 24px max(140px, calc(env(safe-area-inset-bottom) + 120px))",
            gap: "24px",
          }}
        >
          {/* Intro + Mark all read */}
          <div className="flex items-start justify-between" style={{ gap: "16px" }}>
            <div className="min-w-0 flex flex-col" style={{ gap: "8px" }}>
              <h2 className="text-[22px] font-extrabold text-gray-900 leading-tight">
                Your Notifications
              </h2>
              <p className="text-[14px] text-gray-600 leading-6">
                Stay updated with your latest activities.
              </p>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="btn-primary shrink-0 min-h-[44px] rounded-xl text-[13px] font-extrabold shadow-sm transition active:scale-95"
                style={{ padding: "0 14px" }}
              >
                Mark all read
              </button>
            )}
          </div>

          {error && (
            <div
              className="bg-red-100 border border-red-400 rounded-xl text-red-700 text-sm leading-6 break-words"
              style={{ padding: "14px 16px" }}
            >
              {error}
            </div>
          )}

          {/* NOTIFICATION CARDS */}
          <div className="flex flex-col" style={{ gap: "16px" }}>
            {filtered.length > 0 ? (
              filtered.map((item) => (
                <div
                  key={item.notification_id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleNotificationClick(item)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleNotificationClick(item);
                    }
                  }}
                  className={`rounded-2xl shadow-sm border flex cursor-pointer transition-all hover:shadow-md active:scale-[0.99] ${
                    item.is_read === 0
                      ? "bg-[#F0F8ED] border-[#BFD8B8]"
                      : "bg-white border-gray-200 hover:bg-gray-50"
                  }`}
                  style={{ padding: "20px", gap: "16px", boxSizing: "border-box" }}
                >
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-[19px] ${
                      item.is_read === 0
                        ? "bg-[#DDF2E4] text-[#0B5D2A]"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {getIcon(item.type, item.is_read === 1)}
                  </div>

                  <div
                    className="flex-1 min-w-0 flex flex-col items-start"
                    style={{ gap: "8px" }}
                  >
                    <h3 className="font-extrabold text-[16px] text-gray-900 leading-6 break-words">
                      {item.title}
                    </h3>
                    <p className="text-[13px] text-gray-500">
                      {formatTime(item.created_at)}
                    </p>
                    {/* Message preview */}
                    <p className="text-[14px] text-gray-700 leading-6 break-words">
                      {truncate(item.message, 60)}
                    </p>
                    {item.is_read === 0 && (
                      <span
                        className="inline-flex bg-[#0B5D2A] text-white rounded-full text-[12px] font-extrabold"
                        style={{ padding: "6px 14px" }}
                      >
                        New
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div
                className="bg-white rounded-2xl border border-gray-200 text-center shadow-sm"
                style={{ padding: "48px 24px" }}
              >
                <FaBell
                  className="text-gray-300"
                  size={35}
                  style={{ margin: "0 auto 12px" }}
                />
                <p className="text-[14px] font-semibold text-gray-500 leading-6">
                  {activeTab === "All" && "No notifications available."}
                  {activeTab === "Unread" && "No unread notifications."}
                  {activeTab === "Read" && "No read notifications."}
                </p>
              </div>
            )}
          </div>
        </main>

        <div className="absolute bottom-0 left-0 right-0 z-30">
          <BottomNav />
        </div>
      </div>
    </div>
  );
}