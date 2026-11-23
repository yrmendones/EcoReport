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
import {
  NOTIFICATION_CACHE_TTL_MS,
  NOTIFICATION_COUNT_UPDATED_EVENT,
  sessionRequestCache,
} from "../../utils/sessionRequestCache";

const UNREAD_COUNT_RESOURCE = "GET /api/notifications/unread-count";

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem("token");
  const cachedUnreadCount = token
    ? sessionRequestCache.get(UNREAD_COUNT_RESOURCE, token)
    : null;
  const [unreadCountState, setUnreadCountState] = useState(() => ({
    token,
    count: cachedUnreadCount?.value || 0,
  }));
  const unreadCount = unreadCountState.token === token
    ? unreadCountState.count
    : cachedUnreadCount?.value || 0;

  useEffect(() => {
    if (!token) return undefined;

    let active = true;

    const fetchUnreadCount = async () => {
      if (
        sessionRequestCache.isFresh(
          UNREAD_COUNT_RESOURCE,
          token,
          NOTIFICATION_CACHE_TTL_MS
        )
      ) {
        return;
      }

      try {
        const count = await sessionRequestCache.fetch(
          UNREAD_COUNT_RESOURCE,
          token,
          async () => {
            const data = await apiFetch("/api/notifications/unread-count");
            return data.count || 0;
          }
        );
        if (active && localStorage.getItem("token") === token) {
          setUnreadCountState({ token, count });
        }
      } catch (err) {
        if (active && localStorage.getItem("token") === token) {
          console.error("Error fetching unread count:", err);
        }
      }
    };

    const onCountUpdated = (event) => {
      if (event.detail?.token === token) {
        setUnreadCountState({ token, count: event.detail.count || 0 });
      }
    };
    window.addEventListener(NOTIFICATION_COUNT_UPDATED_EVENT, onCountUpdated);

    void fetchUnreadCount();

    // Poll every 30 seconds so the badge stays fresh
    const interval = setInterval(fetchUnreadCount, NOTIFICATION_CACHE_TTL_MS);

    const onFocus = () => void fetchUnreadCount();
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void fetchUnreadCount();
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener(NOTIFICATION_COUNT_UPDATED_EVENT, onCountUpdated);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [token]);

  // "matches" = every route that should keep this tab highlighted
  const navItems = [
    {
      icon: <FaHome />,
      label: "Home",
      path: "/resident-dashboard",
      matches: ["/resident-dashboard"],
      color: "#bbf18f", // unified green
    },
    {
      icon: <FaClipboardList />,
      label: "Reports",
      path: "/my-reports",
      matches: ["/my-reports", "/report-details", "/report-status"],
      color: "#bbf18f", // unified green
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
      color: "#bbf18f", // unified green
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
      color: "#bbf18f", // unified green
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
