import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaUserCircle } from "react-icons/fa";
import { apiFetch } from "../../api";

export default function Header() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setLoading(false);
          return;
        }

        const data = await apiFetch("/api/users/me");
        setUser(data);
      } catch (err) {
        console.error("Error fetching user:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const getFullName = () => {
    if (!user) return "Loading...";
    return `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Resident";
  };

  const getProfilePicture = () => {
    if (!user) return null;
    return user.profile_picture || null;
  };

  return (
    <header 
      style={{ paddingRight: '20px' }}
      className="bg-[#0B5D2A] pl-6 pt-6 pb-24 flex items-center justify-end rounded-t-[38px] shrink-0"
    >
      <div className="flex items-center gap-3">
        <h1 className="text-white text-[20px] font-bold tracking-tight">
          {loading ? "Loading..." : getFullName()}
        </h1>

        {/* Profile Picture */}
        <button className="focus:outline-none" onClick={() => navigate("/profile")}>
          {getProfilePicture() ? (
            <img
              src={getProfilePicture()}
              alt="Profile"
              className="w-9 h-9 rounded-full object-cover border-2 border-white"
              onError={(e) => {
                e.target.style.display = "none";
                const parent = e.target.parentElement;
                const icon = document.createElement("div");
                icon.innerHTML = `<svg class="w-9 h-9 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`;
                parent.appendChild(icon);
              }}
            />
          ) : (
            <FaUserCircle size={36} className="text-white" />
          )}
        </button>
      </div>
    </header>
  );
}