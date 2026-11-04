import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  FaArrowLeft,
  FaShieldAlt,
  FaMapMarkerAlt,
  FaBell,
  FaEnvelope,
  FaInfoCircle,
  FaSpinner,
  FaCheckCircle,
  FaUser,
} from "react-icons/fa";
import { apiFetch } from "../../api";

export default function PrivacySettings() {
  const navigate = useNavigate();

  const [settings, setSettings] = useState({
    publicProfile: false,
    shareLocation: true,
    pushNotifications: true,
    emailNotifications: false,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const data = await apiFetch("/api/users/me/settings");
        setSettings({
          publicProfile: data.publicProfile !== undefined ? data.publicProfile : false,
          shareLocation: data.shareLocation !== undefined ? data.shareLocation : true,
          pushNotifications: data.pushNotifications !== undefined ? data.pushNotifications : true,
          emailNotifications: data.emailNotifications !== undefined ? data.emailNotifications : false,
        });
        setError("");
      } catch (err) {
        console.error("Error fetching settings:", err);
        setError("Failed to load privacy settings.");
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleToggle = (setting) => {
    setSettings((prev) => ({
      ...prev,
      [setting]: !prev[setting],
    }));
    setSuccess(false);
    setError("");
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      await apiFetch("/api/users/me/settings", {
        method: "PUT",
        body: JSON.stringify(settings),
      });

      setSuccess(true);

      try {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        user.settings = settings;
        localStorage.setItem("user", JSON.stringify(user));
      } catch (e) {
        console.error("Error updating localStorage:", e);
      }

      setTimeout(() => {
        setSuccess(false);
        navigate("/profile");
      }, 1500);
    } catch (err) {
      console.error("Error saving settings:", err);
      setError("Failed to save privacy settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#E5E7EB] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <FaSpinner className="animate-spin text-[#0B5D2A]" size={40} />
          <p className="text-[#0B5D2A] font-bold">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E5E7EB] flex justify-center items-center py-6">
      {/* PHONE */}
      <div className="relative w-[390px] h-[840px] bg-[#F8FAF8] rounded-[38px] shadow-2xl overflow-hidden flex flex-col">
        {/* HEADER */}
        <header className="h-[76px] bg-[#0B5D2A] rounded-t-[35px] flex items-center justify-center relative shrink-0">
          <button
            onClick={() => navigate("/profile")}
            className="absolute left-5 w-[43px] h-[43px] rounded-full bg-white/10 flex items-center justify-center text-white text-[21px] hover:bg-white/20 transition"
          >
            <FaArrowLeft />
          </button>
          <h1 className="text-white text-[21px] font-bold">Privacy Settings</h1>
        </header>

        {/* CONTENT */}
        <main className="flex-1 overflow-y-auto px-5 pt-10 pb-10 no-scrollbar">
          <div className="px-1 mb-6">
            <h2 className="text-[20px] font-bold text-gray-800">Privacy Preferences</h2>
            <p className="text-[13px] text-gray-500 leading-[19px] mt-2">
              Choose what information and notifications you want to share.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-100 border border-green-400 rounded-lg flex items-center gap-3 text-green-700 text-sm">
              <FaCheckCircle size={18} />
              <span>Settings saved successfully!</span>
            </div>
          )}

          {/* SETTINGS CARD */}
          <div className="bg-white rounded-[22px] border border-gray-200 overflow-hidden shadow-sm">
            {/* Public Name */}
            <SettingItem
              icon={<FaUser />}
              title="Public Name"
              description="Show your name on reports you submit on the environmental map (otherwise shown as Anonymous)."
              enabled={settings.publicProfile}
              onToggle={() => handleToggle("publicProfile")}
            />

            {/* Share Location */}
            <SettingItem
              icon={<FaMapMarkerAlt />}
              title="Share Location"
              description="Allow your location to be included in the environmental map."
              enabled={settings.shareLocation}
              onToggle={() => handleToggle("shareLocation")}
            />

            {/* Push Notifications */}
            <SettingItem
              icon={<FaBell />}
              title="Push Notifications"
              description="Receive notifications about your reports."
              enabled={settings.pushNotifications}
              onToggle={() => handleToggle("pushNotifications")}
            />

            {/* Email Notifications */}
            <SettingItem
              icon={<FaEnvelope />}
              title="Email Notifications"
              description="Receive updates through your email."
              enabled={settings.emailNotifications}
              onToggle={() => handleToggle("emailNotifications")}
              last
            />
          </div>

          <div className="h-8" />

          {/* PRIVACY INFORMATION */}
          <div className="bg-[#EFFAF2] border border-[#BFE3C8] rounded-[18px] px-4 py-5">
            <div className="flex items-start gap-4">
              <div className="w-[36px] h-[36px] rounded-full bg-[#D8F1DE] flex items-center justify-center shrink-0">
                <FaInfoCircle className="text-[#0B5D2A]" size={18} />
              </div>
              <div className="flex-1">
                <h3 className="text-[#0B5D2A] text-[15px] font-bold mb-2">
                  Your Privacy Matters
                </h3>
                <p className="text-[12px] text-gray-600 leading-[18px]">
                  Your personal information is used only to provide
                  EcoReport services and improve your reporting experience.
                </p>
              </div>
            </div>
          </div>

          <div className="h-8" />

          {/* SAVE BUTTON */}
          <button
            onClick={handleSave}
            disabled={saving}
            className={`
              w-full h-[54px] rounded-[15px] font-bold text-[15px] shadow-sm transition-all
              flex items-center justify-center gap-2
              ${saving
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'bg-[#0B5D2A] text-white hover:bg-[#084A22] active:scale-[0.98]'
              }
            `}
          >
            {saving ? (
              <>
                <FaSpinner className="animate-spin" size={18} />
                Saving...
              </>
            ) : (
              "Save Settings"
            )}
          </button>

          <div className="h-[190px]" />
        </main>

        {/* ANDROID HOME BAR */}
        <div className="absolute bottom-[8px] left-0 right-0 flex justify-center pointer-events-none z-50">
          <div className="w-[60px] h-[5px] rounded-full bg-gray-700 opacity-80" />
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   SETTING ITEM
========================================================= */
function SettingItem({
  icon,
  title,
  description,
  enabled,
  onToggle,
  last = false,
}) {
  return (
    <div className={`px-4 py-[22px] ${!last ? "border-b border-gray-200" : ""}`}>
      <div className="flex items-center gap-5">
        {/* ICON */}
        <div className="w-[46px] h-[46px] rounded-full bg-[#E5F5E9] text-[#0B5D2A] flex items-center justify-center shrink-0 text-[19px]">
          {icon}
        </div>

        {/* TEXT */}
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-bold text-gray-800 leading-[20px]">
            {title}
          </h3>
          <p className="text-[11px] text-gray-500 leading-[17px] mt-2">
            {description}
          </p>
        </div>

        {/* TOGGLE */}
        <button
          type="button"
          onClick={onToggle}
          aria-label={`Toggle ${title}`}
          className={`
            relative w-[50px] h-[28px] rounded-full shrink-0
            transition-colors duration-300 focus:outline-none
            focus:ring-2 focus:ring-[#0B5D2A]/30
            ${enabled ? "bg-[#0B5D2A]" : "bg-gray-300"}
          `}
        >
          <div
            className={`
              absolute top-[3px] w-[22px] h-[22px] bg-white rounded-full shadow-md
              transition-all duration-300 ease-in-out
              ${enabled ? "left-[25px]" : "left-[3px]"}
            `}
          />
        </button>
      </div>
    </div>
  );
}