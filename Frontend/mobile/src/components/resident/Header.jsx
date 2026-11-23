import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaUserCircle } from "react-icons/fa";
import { useResidentProfile } from "../../utils/useResidentProfile";

export default function Header() {
  const navigate = useNavigate();
  const { profile: user } = useResidentProfile();
  const [imgError, setImgError] = useState(false);

  const getFullName = () => {
    if (!user) return "Resident";
    return `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Resident";
  };

  const getProfilePicture = () => {
    if (!user || imgError) return null;
    return user.profile_picture || null;
  };

  return (
    <header className="bg-[#0B5D2A] px-6 pt-6 pb-24 flex items-center justify-end gap-3 rounded-t-[38px] shrink-0">
      <h1 className="text-white text-[20px] font-bold tracking-tight">
        {getFullName()}
      </h1>

      <button className="focus:outline-none" onClick={() => navigate("/profile")}>
        {getProfilePicture() ? (
          <img
            src={getProfilePicture()}
            alt="Profile"
            className="w-9 h-9 rounded-full object-cover border-2 border-white"
            onError={() => setImgError(true)}
          />
        ) : (
          <FaUserCircle size={36} className="text-white" />
        )}
      </button>
    </header>
  );
}
