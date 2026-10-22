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
      icon: <FaUserEdit />,
      title: "Edit Profile",
      action: () => navigate("/edit-profile"),
    },
    {
      icon: <FaLock />,
      title: "Change Password",
      action: () => navigate("/change-password"),
    },
    {
      icon: <FaQrcode />,
      title: "QR Code",
      action: () => navigate("/qr-code"),
    },
    {
      icon: <FaShieldAlt />,
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
        await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
        console.error('Logout API error:', err);
    }
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/resident-login');
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
      <div className="min-h-screen bg-[#E5E7EB] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <FaSpinner className="animate-spin text-[#0B5D2A]" size={40} />
          <p className="text-[#0B5D2A] font-bold">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#E5E7EB] flex items-center justify-center px-6">
        <div className="bg-white rounded-3xl border border-red-300 p-8 text-center max-w-sm">
          <p className="text-[15px] font-bold text-red-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 text-[#0B5D2A] font-bold underline"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E5E7EB] flex justify-center items-center py-6">
      {/* ================= PHONE ================= */}
      <div
        className="
          relative
          w-[390px]
          h-[840px]
          bg-[#F8FAF8]
          rounded-[38px]
          shadow-2xl
          overflow-hidden
          flex
          flex-col
        "
      >
        {/* ================= HEADER ================= */}
        <header
          className="
            h-[76px]
            bg-[#0B5D2A]
            rounded-t-[35px]
            flex
            items-center
            justify-center
            relative
            shrink-0
          "
        >
          <button
            onClick={() => navigate("/resident-dashboard")}
            className="
              absolute
              left-5
              w-[43px]
              h-[43px]
              rounded-full
              bg-white/10
              flex
              items-center
              justify-center
              text-white
              text-[21px]
              hover:bg-white/20
              transition
            "
          >
            <FaArrowLeft />
          </button>
          <h1 className="text-white text-[21px] font-bold">
            My Profile
          </h1>
        </header>

        {/* ================= CONTENT ================= */}
        <main
          className="
            flex-1
            overflow-y-auto
            px-5
            pt-10
            pb-10
          "
        >
          {/* ================= PROFILE ================= */}
          <div className="flex flex-col items-center">
            {/* PROFILE ICON */}
            <div
              className="
                w-[110px]
                h-[110px]
                rounded-full
                bg-[#E5F5E9]
                flex
                items-center
                justify-center
                overflow-hidden
              "
            >
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
              className="
                mt-5
                text-[24px]
                font-bold
                text-[#0B5D2A]
              "
            >
              {getFullName()}
            </h2>

            {/* RESIDENT ID */}
            <p
              className="
                mt-1
                text-[13px]
                text-gray-500
              "
            >
              Resident ID: {getResidentId()}
            </p>

            {/* ADDRESS */}
            <p
              className="
                mt-2
                text-[12px]
                text-gray-500
                text-center
                px-4
              "
            >
              {getAddress()}
            </p>
          </div>

          {/* ================= GAP ================= */}
          <div className="h-9" />

          {/* ================= ACCOUNT MENU TITLE ================= */}
          <div className="px-1 mb-4">
            <h2
              className="
                text-[17px]
                font-bold
                text-gray-800
              "
            >
              Account Settings
            </h2>
            <p
              className="
                text-[12px]
                text-gray-500
                mt-1
              "
            >
              Manage your account and privacy preferences.
            </p>
          </div>

          {/* ================= MENU ================= */}
          <div
            className="
              bg-white
              rounded-[22px]
              border
              border-gray-200
              overflow-hidden
              shadow-sm
            "
          >
            {menus.map((item, index) => (
              <button
                key={index}
                onClick={item.action}
                className="
                  w-full
                  min-h-[76px]
                  flex
                  items-center
                  justify-between
                  px-5
                  py-4
                  border-b
                  border-gray-200
                  last:border-b-0
                  hover:bg-gray-50
                  active:bg-gray-100
                  transition
                "
              >
                <div className="flex items-center gap-4">
                  <div
                    className="
                      w-[46px]
                      h-[46px]
                      rounded-full
                      bg-[#E5F5E9]
                      text-[#0B5D2A]
                      flex
                      items-center
                      justify-center
                      text-[19px]
                      shrink-0
                    "
                  >
                    {item.icon}
                  </div>
                  <span
                    className="
                      font-semibold
                      text-[15px]
                      text-gray-800
                    "
                  >
                    {item.title}
                  </span>
                </div>
                <div
                  className="
                    w-[30px]
                    h-[30px]
                    rounded-full
                    bg-gray-50
                    flex
                    items-center
                    justify-center
                  "
                >
                  <FaChevronRight
                    size={12}
                    className="text-gray-400"
                  />
                </div>
              </button>
            ))}
          </div>

          {/* ================= GAP ================= */}
          <div className="h-8" />

          {/* ================= LOGOUT ================= */}
          <button
            onClick={handleLogout}
            className="
              w-full
              h-[54px]
              bg-white
              border
              border-red-200
              rounded-[15px]
              text-red-600
              font-bold
              flex
              items-center
              justify-center
              gap-3
              hover:bg-red-50
              active:bg-red-100
              transition
            "
          >
            <FaSignOutAlt />
            Logout
          </button>

          <div className="h-[150px]" />
        </main>

        {/* ================= ANDROID HOME BAR ================= */}
        <div
          className="
            absolute
            bottom-[8px]
            left-0
            right-0
            flex
            justify-center
            pointer-events-none
            z-50
          "
        >
          <div
            className="
              w-[60px]
              h-[5px]
              rounded-full
              bg-gray-700
              opacity-80
            "
          />
        </div>
      </div>
    </div>
  );
}