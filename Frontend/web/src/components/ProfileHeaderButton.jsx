import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api";

export default function ProfileHeaderButton() {
  const navigate = useNavigate();
  const [pictureUrl, setPictureUrl] = useState("/profile.png");

  // Read cached picture first, then refresh from API
  useEffect(() => {
    let cancelled = false;

    try {
      const admin = JSON.parse(localStorage.getItem("admin") || "{}");
      if (admin.profile_picture) setPictureUrl(admin.profile_picture);
    } catch { /* ignore */ }

    const fetchFresh = async () => {
      try {
        const data = await apiFetch("/api/users/me");
        if (cancelled) return;
        if (data.profile_picture) {
          setPictureUrl(data.profile_picture);
          const admin = JSON.parse(localStorage.getItem("admin") || "{}");
          admin.profile_picture = data.profile_picture;
          localStorage.setItem("admin", JSON.stringify(admin));
        }
      } catch { /* silent */ }
    };
    fetchFresh();

    return () => { cancelled = true; };
  }, []);

  return (
    <div
      onMouseDown={(e) => {
        e.preventDefault();
        navigate("/profile");
      }}
      onClick={(e) => {
        if (e.detail === 0) navigate("/profile");
      }}
      title="My Profile"
      aria-label="Open My Profile"
      style={{
        width: "48px",
        height: "48px",
        minWidth: "48px",
        minHeight: "48px",
        borderRadius: "50%",
        backgroundColor: "#0B5D2A",
        backgroundImage: `url('${pictureUrl}')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        cursor: "pointer",
        userSelect: "none",
        WebkitUserSelect: "none",
        WebkitTapHighlightColor: "transparent",
        outline: "none",
        border: "none",
        boxShadow: "0 1px 4px rgba(0, 0, 0, 0.20)",
        transition: "transform 0.15s ease",
        flexShrink: 0,
        WebkitAppearance: "none",
        appearance: "none",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
    />
  );
}