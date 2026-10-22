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

    // Poll every 30 seconds so the badge stays fresh while the user
    // is on the Dashboard and a new notification arrives.
    const interval = setInterval(fetchUnreadCount, 30000);

    const onFocus = () => fetchUnreadCount();
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchUnreadCount();
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    // Cleanup - removes the interval and listeners when BottomNav unmounts
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const navItems = [
    {
      icon: <FaHome />,
      label: "Home",
      path: "/resident-dashboard",
    },
    {
      icon: <FaClipboardList />,
      label: "Reports",
      path: "/my-reports",
    },
    {
      icon: <FaPlus />,
      label: "Report",
      path: "/create-report",
      center: true,
    },
    {
      icon: <FaBell />,
      label: "Notification",
      path: "/notifications",
    },
    {
      icon: <FaUser />,
      label: "Profile",
      path: "/profile",
    },
  ];

  return (
    <nav className="relative h-[76px] bg-[#0B5D2A] rounded-t-[28px] shadow-lg px-4">
      <div className="h-full grid grid-cols-5 items-center">

        {navItems.map((item) => {
          const isActive = location.pathname === item.path;

          if (item.center) {
            return (
              <div key={item.path} className="flex justify-center">
                <button
                  type="button"
                  onClick={() => navigate(item.path)}
                  className="absolute -top-[28px] w-[62px] h-[62px] rounded-full bg-[#0B5D2A] border-[5px] border-[#F8FAF8] text-white flex items-center justify-center text-[25px] shadow-lg hover:bg-[#084A21] active:scale-95 transition"
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
              className="h-full flex flex-col items-center justify-center gap-1 transition active:scale-95 relative"
            >
              <span className={`relative text-[19px] ${isActive ? "text-white" : "text-white/60"}`}>
                {item.icon}
                {item.label === "Notification" && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[8px] font-bold rounded-full w-[18px] h-[18px] flex items-center justify-center border border-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </span>

              <span className={`text-[9px] font-semibold ${isActive ? "text-white" : "text-white/60"}`}>
                {item.label}
              </span>
            </button>
          );
        })}

      </div>
    </nav>
  );
}