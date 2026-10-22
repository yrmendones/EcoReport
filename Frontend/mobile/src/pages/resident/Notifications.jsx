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

const truncate = (text, maxLength = 50) => {
  if (!text) return "";
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
};

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
    if (diffMins < 60) return `${diffMins} mins ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
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
      <div className="min-h-screen bg-[#E5E7EB] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <FaSpinner className="animate-spin text-[#0B5D2A]" size={40} />
          <p className="text-[#0B5D2A] font-bold">Loading notifications...</p>
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
            onClick={() => navigate("/resident-dashboard")}
            className="absolute left-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center text-white text-[20px] bg-white/10 hover:bg-white/20 active:scale-95 transition"
          >
            <FaArrowLeft />
          </button>
          <h1 className="text-white text-[21px] font-extrabold">Notifications</h1>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="absolute right-6 top-1/2 -translate-y-1/2 text-xs text-white/70 hover:text-white transition"
            >
              Mark all read
            </button>
          )}
        </header>

        <div className="shrink-0 bg-white px-5 pt-4 pb-3 border-b border-gray-200">
          <div className="flex bg-[#F1F5F2] rounded-2xl p-1 gap-1">
            {["All", "Unread", "Read"].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex-1 h-[42px] rounded-xl text-[13px] font-extrabold transition-all ${
                  activeTab === tab
                    ? "bg-[#0B5D2A] text-white shadow-sm"
                    : "text-gray-500 hover:text-[#0B5D2A]"
                }`}
              >
                {tab} {tab === "Unread" && unreadCount > 0 && (
                  <span className="ml-1 text-[10px] bg-red-500 text-white rounded-full px-1.5 py-0.5">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <main className="flex-1 overflow-y-auto px-5 pt-6 pb-8 no-scrollbar">
          <div className="mb-5">
            <h2 className="text-[19px] font-extrabold text-gray-900">Your Notifications</h2>
            <p className="text-[12px] text-gray-500 mt-1.5">Stay updated with your latest activities.</p>
          </div>

          <div className="space-y-5">
            {filtered.length > 0 ? (
              filtered.map((item) => (
                <div
                  key={item.notification_id}
                  onClick={() => handleNotificationClick(item)}
                  className={`rounded-2xl px-4 py-5 shadow-sm border flex gap-4 cursor-pointer transition-all hover:shadow-md ${
                    item.is_read === 0
                      ? "bg-[#F0F8ED] border-[#BFD8B8]"
                      : "bg-white border-gray-200 hover:bg-gray-50"
                  }`}
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

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-extrabold text-[14px] text-gray-900 leading-5">
                        {item.title}
                      </h3>
                      <span className="text-[10px] text-gray-500 whitespace-nowrap pt-0.5">
                        {formatTime(item.created_at)}
                      </span>
                    </div>
                    {/* ✅ Message Preview (truncated) */}
                    <p className="text-[12px] text-gray-600 leading-5 mt-2">
                      {truncate(item.message, 60)}
                    </p>
                    {item.is_read === 0 && (
                      <span className="inline-flex mt-3 px-3 py-1.5 bg-[#0B5D2A] text-white rounded-full text-[10px] font-extrabold">
                        New
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 px-5 py-10 text-center shadow-sm">
                <FaBell className="mx-auto text-gray-300 mb-3" size={35} />
                <p className="text-[13px] font-semibold text-gray-500">
                  {activeTab === "All" && "No notifications available."}
                  {activeTab === "Unread" && "No unread notifications."}
                  {activeTab === "Read" && "No read notifications."}
                </p>
              </div>
            )}
          </div>
          <div className="h-6" />
        </main>

        <div className="absolute bottom-2 left-0 right-0 flex justify-center pointer-events-none z-30">
          <div className="w-[70px] h-[5px] rounded-full bg-gray-800 opacity-70" />
        </div>
      </div>
    </div>
  );
}