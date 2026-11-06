import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaUserCircle,
  FaUserEdit,
  FaLock,
  FaQrcode,
  FaShieldAlt,
  FaChevronRight,
  FaSignOutAlt,
  FaSpinner,
} from "react-icons/fa";
import { apiFetch } from "../../api";

export default function Profile() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const menus = [
    {
      icon: <FaUserEdit size={20} />,
      title: "Edit Profile",
      action: () => navigate("/edit-profile"),
    },
    {
      icon: <FaLock size={20} />,
      title: "Change Password",
      action: () => navigate("/change-password"),
    },
    {
      icon: <FaQrcode size={20} />,
      title: "QR Code",
      action: () => navigate("/qr-code"),
    },
    {
      icon: <FaShieldAlt size={20} />,
      title: "Privacy Settings",
      action: () => navigate("/privacy-settings"),
    },
  ];

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const data = await apiFetch("/api/users/me");
        setUser(data);
      } catch (err) {
        console.error("Error fetching user:", err);
        setError("Failed to load profile.");
        if (err.message === "Access denied." || err.message === "Invalid token.") {
          navigate("/resident-login");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout API error:", err);
    }

    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/resident-login");
  };

  const getFullName = () => {
    if (!user) return "Loading...";
    return `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Resident";
  };

  const getResidentId = () => {
    if (!user) return "--";
    return user.resident_id || "Not assigned";
  };

  const getProfilePicture = () => {
    if (!user) return null;
    return user.profile_picture || null;
  };

  const getAddress = () => {
    if (!user) return "--";
    return user.address || "P. Sto. Rosario Kanluran, Pateros";
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#E5E7EB] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <FaSpinner className="animate-spin text-[#0B5D2A]" size={40} />
          <p className="text-[#0B5D2A] font-bold">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="min-h-[100dvh] bg-[#E5E7EB] flex items-center justify-center"
        style={{ padding: "0 24px" }}
      >
        <div
          className="bg-white rounded-3xl border border-red-300 text-center max-w-sm w-full flex flex-col items-center"
          style={{ padding: "32px 24px", gap: "16px" }}
        >
          <p className="text-[15px] font-bold text-red-600 leading-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="min-h-[44px] text-[#0B5D2A] font-bold underline"
            style={{ padding: "0 16px" }}
          >
            Try Again
          </button>
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
            My Profile
          </h1>
        </header>

        {/* CONTENT */}
        <main
          className="flex-1 overflow-y-auto no-scrollbar flex flex-col"
          style={{
            padding: "28px 24px max(48px, calc(env(safe-area-inset-bottom) + 32px))",
            gap: "24px",
          }}
        >
          {/* PROFILE */}
          <div className="flex flex-col items-center shrink-0" style={{ gap: "8px" }}>
            {/* PROFILE ICON */}
            <div className="w-[110px] h-[110px] rounded-full bg-[#E5F5E9] flex items-center justify-center overflow-hidden shrink-0">
              {getProfilePicture() ? (
                <img
                  src={getProfilePicture()}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <FaUserCircle size={96} className="text-[#0B5D2A]" />
              )}
            </div>

            {/* NAME */}
            <h2
              className="text-[24px] font-extrabold text-[#0B5D2A] text-center leading-tight break-words max-w-full"
              style={{ marginTop: "8px", padding: "0 8px" }}
            >
              {getFullName()}
            </h2>

            {/* RESIDENT ID */}
            <p className="text-[14px] text-gray-600 leading-6">
              Resident ID: {getResidentId()}
            </p>

            {/* ADDRESS */}
            <p
              className="text-[13px] text-gray-500 text-center leading-6"
              style={{ padding: "0 16px" }}
            >
              {getAddress()}
            </p>
          </div>

          {/* ACCOUNT SETTINGS */}
          <div className="flex flex-col shrink-0" style={{ gap: "16px" }}>
            {/* TITLE */}
            <div className="flex flex-col" style={{ gap: "8px" }}>
              <h2 className="text-[22px] font-extrabold text-gray-900 leading-tight">
                Account Settings
              </h2>
              <p className="text-[14px] text-gray-600 leading-6">
                Manage your account and privacy preferences.
              </p>
            </div>

            {/* MENU */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              {menus.map((item, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={item.action}
                  className="w-full min-h-[76px] flex items-center justify-between border-b border-gray-200 last:border-b-0 hover:bg-gray-50 active:bg-gray-100 transition"
                  style={{ padding: "20px", gap: "16px" }}
                >
                  <div className="flex items-center min-w-0" style={{ gap: "16px" }}>
                    <div className="w-12 h-12 rounded-full bg-[#E5F5E9] text-[#0B5D2A] flex items-center justify-center shrink-0">
                      {item.icon}
                    </div>
                    <span className="font-extrabold text-[16px] text-gray-900 text-left leading-6">
                      {item.title}
                    </span>
                  </div>
                  <div className="w-[30px] h-[30px] rounded-full bg-gray-50 flex items-center justify-center shrink-0">
                    <FaChevronRight size={12} className="text-gray-400" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* LOGOUT */}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full min-h-[54px] bg-white border border-red-200 rounded-2xl text-red-600 font-extrabold text-[16px] flex items-center justify-center hover:bg-red-50 active:bg-red-100 active:scale-[0.98] transition shrink-0"
            style={{ gap: "12px" }}
          >
            <FaSignOutAlt />
            Logout
          </button>
        </main>
      </div>
    </div>
  );
}