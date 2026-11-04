import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FaHome,
  FaClipboardList,
  FaPlus,
  FaBell,
  FaUser,
} from "react-icons/fa";
import { apiFetch } from "../../api";

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const data = await apiFetch("/api/notifications/unread-count");
        setUnreadCount(data.count || 0);
      } catch (err) {
        console.error("Error fetching unread count:", err);
      }
    };

    // Initial fetch on mount
    fetchUnreadCount();

    // Poll every 30 seconds so the badge stays fresh
    const interval = setInterval(fetchUnreadCount, 30000);

    const onFocus = () => fetchUnreadCount();
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchUnreadCount();
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // "matches" = every route that should keep this tab highlighted
  const navItems = [
    {
      icon: <FaHome />,
      label: "Home",
      path: "/resident-dashboard",
      matches: ["/resident-dashboard"],
      color: "#bbf18f", // green
    },
    {
      icon: <FaClipboardList />,
      label: "Reports",
      path: "/my-reports",
      matches: ["/my-reports", "/report-details", "/report-status"],
      color: "#7dd3fc", // sky blue
    },
    {
      icon: <FaPlus />,
      label: "Report",
      path: "/create-report",
      matches: ["/create-report"],
      color: "#bbf18f",
      center: true,
    },
    {
      icon: <FaBell />,
      label: "Notification",
      path: "/notifications",
      matches: ["/notifications", "/notification-detail"],
      color: "#fde68a", // amber
    },
    {
      icon: <FaUser />,
      label: "Profile",
      path: "/profile",
      matches: [
        "/profile",
        "/edit-profile",
        "/change-password",
        "/qr-code",
        "/privacy-settings",
      ],
      color: "#f9a8d4", // pink
    },
  ];

  const isItemActive = (item) =>
    item.matches.some(
      (p) =>
        location.pathname === p || location.pathname.startsWith(`${p}/`)
    );

  return (
    <nav className="relative h-[76px] bg-[#0B5D2A] rounded-t-[28px] shadow-lg px-4">
      <div className="h-full grid grid-cols-5 items-center">
        {navItems.map((item) => {
          const isActive = isItemActive(item);

          if (item.center) {
            return (
              <div key={item.path} className="flex justify-center">
                <button
                  type="button"
                  onClick={() => navigate(item.path)}
                  aria-label="Create report"
                  aria-current={isActive ? "page" : undefined}
                  className="absolute -top-[28px] w-[62px] h-[62px] rounded-full border-[5px] border-[#F8FAF8] flex items-center justify-center text-[25px] shadow-lg active:scale-95 transition"
                  style={
                    isActive
                      ? { backgroundColor: item.color, color: "#0B5D2A" }
                      : { backgroundColor: "#0B5D2A", color: "#ffffff" }
                  }
                >
                  <FaPlus />
                </button>
              </div>
            );
          }

          return (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              aria-current={isActive ? "page" : undefined}
              className="h-full flex items-center justify-center active:scale-95 transition"
            >
              <span
                className="flex flex-col items-center justify-center rounded-2xl transition-colors"
                style={{
                  padding: "8px 10px",
                  gap: "4px",
                  minWidth: "58px",
                  backgroundColor: isActive ? `${item.color}26` : "transparent",
                }}
              >
                <span
                  className="relative text-[20px] transition-colors"
                  style={{ color: isActive ? item.color : "rgba(255,255,255,0.6)" }}
                >
                  {item.icon}
                  {item.label === "Notification" && unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[9px] font-bold rounded-full w-[18px] h-[18px] flex items-center justify-center border border-white">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </span>

                <span
                  className="text-[10px] leading-3 font-bold transition-colors"
                  style={{ color: isActive ? item.color : "rgba(255,255,255,0.6)" }}
                >
                  {item.label}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}