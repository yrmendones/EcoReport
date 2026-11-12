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
import { DEFAULT_BARANGAY, fetchBarangayInfo } from "../../utils/barangay";

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

  const [barangay, setBarangay] = useState(DEFAULT_BARANGAY);
  useEffect(() => {
    let cancelled = false;
    fetchBarangayInfo(apiFetch).then((info) => {
      if (!cancelled) setBarangay(info);
    });
    return () => { cancelled = true; };
  }, []);

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
      <div className="min-h-[100dvh] bg-[#E5E7EB] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <FaSpinner className="animate-spin text-[#0B5D2A]" size={40} />
          <p className="text-[#0B5D2A] font-bold">Loading settings...</p>
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
            onClick={() => navigate("/profile")}
            aria-label="Back"
            className="absolute left-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center text-white text-[20px] bg-white/10 hover:bg-white/20 active:scale-95 transition"
          >
            <FaArrowLeft />
          </button>
          <h1 className="text-white text-[22px] font-extrabold text-center">
            Privacy Settings
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
          {/* INTRO */}
          <div className="flex items-start shrink-0" style={{ gap: "16px" }}>
            <div className="w-12 h-12 rounded-full bg-[#E5F5E9] text-[#0B5D2A] flex items-center justify-center shrink-0">
              <FaShieldAlt size={20} />
            </div>
            <div className="min-w-0 flex flex-col" style={{ gap: "8px" }}>
              <h2 className="text-[22px] font-extrabold text-gray-900 leading-tight">
                Privacy Preferences
              </h2>
              <p className="text-[14px] text-gray-600 leading-6">
                Choose what information and notifications you want to share.
              </p>
            </div>
          </div>

          {error && (
            <div
              className="bg-red-100 border border-red-400 rounded-xl text-red-700 text-sm leading-6 break-words shrink-0"
              style={{ padding: "14px 16px" }}
            >
              {error}
            </div>
          )}

          {success && (
            <div
              className="bg-green-100 border border-green-400 rounded-xl flex items-center text-green-700 text-sm leading-6 shrink-0"
              style={{ padding: "14px 16px", gap: "12px" }}
            >
              <FaCheckCircle size={18} />
              <span>Settings saved successfully!</span>
            </div>
          )}

          {/* SETTINGS CARD */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm shrink-0">
            <SettingItem
              icon={<FaUser size={20} />}
              title="Public Name"
              description="Show your name on reports you submit on the environmental map (otherwise shown as Anonymous)."
              enabled={settings.publicProfile}
              onToggle={() => handleToggle("publicProfile")}
            />

            <SettingItem
              icon={<FaMapMarkerAlt size={20} />}
              title="Share Location"
              description="Allow your location to be included in the environmental map."
              enabled={settings.shareLocation}
              onToggle={() => handleToggle("shareLocation")}
            />

            <SettingItem
              icon={<FaBell size={20} />}
              title="Push Notifications"
              description="Receive notifications about your reports."
              enabled={settings.pushNotifications}
              onToggle={() => handleToggle("pushNotifications")}
            />

            <SettingItem
              icon={<FaEnvelope size={20} />}
              title="Email Notifications"
              description="Receive updates through your email."
              enabled={settings.emailNotifications}
              onToggle={() => handleToggle("emailNotifications")}
              last
            />
          </div>

          {/* PRIVACY INFORMATION */}
          <div
            className="bg-[#EFFAF2] border border-[#BFE3C8] rounded-2xl shrink-0"
            style={{ padding: "20px" }}
          >
            <div className="flex items-start" style={{ gap: "16px" }}>
              <div className="w-12 h-12 rounded-full bg-[#D8F1DE] flex items-center justify-center shrink-0">
                <FaInfoCircle className="text-[#0B5D2A]" size={20} />
              </div>
              <div className="flex-1 min-w-0 flex flex-col" style={{ gap: "8px" }}>
                <h3 className="text-[#0B5D2A] text-[16px] font-extrabold leading-6">
                  Your Privacy Matters
                </h3>
                <p className="text-[14px] text-gray-600 leading-6">
                  Your personal information is used only to provide EcoReport
                  services and improve your reporting experience.
                </p>
                {(barangay.contactEmail || barangay.contactNumber || barangay.address) && (
                  <div className="flex flex-col" style={{ gap: "4px", marginTop: "4px" }}>
                    <p className="text-[13px] text-gray-700 leading-5 font-semibold">
                      Need to reach us?
                    </p>
                    {barangay.address && (
                      <p className="text-[13px] text-gray-600 leading-5">
                        📍 {barangay.address}
                      </p>
                    )}
                    {barangay.contactEmail && (
                      <p className="text-[13px] text-gray-600 leading-5 break-all">
                        ✉️ {barangay.contactEmail}
                      </p>
                    )}
                    {barangay.contactNumber && (
                      <p className="text-[13px] text-gray-600 leading-5">
                        📞 {barangay.contactNumber}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SAVE BUTTON */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={`w-full min-h-[54px] rounded-2xl font-extrabold text-[16px] shadow-sm transition-all flex items-center justify-center shrink-0 ${
              saving
                ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                : "btn-primary"
            }`}
            style={{ gap: "12px" }}
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
        </main>
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
    <div
      className={!last ? "border-b border-gray-200" : ""}
      style={{ padding: "20px" }}
    >
      <div className="flex items-center" style={{ gap: "16px" }}>
        {/* ICON */}
        <div className="w-12 h-12 rounded-full bg-[#E5F5E9] text-[#0B5D2A] flex items-center justify-center shrink-0">
          {icon}
        </div>

        {/* TEXT */}
        <div className="flex-1 min-w-0 flex flex-col" style={{ gap: "8px" }}>
          <h3 className="text-[16px] font-extrabold text-gray-900 leading-6">
            {title}
          </h3>
          <p className="text-[13px] text-gray-500 leading-5 break-words">
            {description}
          </p>
        </div>

        {/* TOGGLE */}
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={onToggle}
          aria-label={`Toggle ${title}`}
          className={`relative w-[50px] h-[28px] rounded-full shrink-0 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[#0B5D2A]/30 ${
            enabled ? "bg-[#0B5D2A]" : "bg-gray-300"
          }`}
        >
          <div
            className={`absolute top-[3px] w-[22px] h-[22px] bg-white rounded-full shadow-md transition-all duration-300 ease-in-out ${
              enabled ? "left-[25px]" : "left-[3px]"
            }`}
          />
        </button>
      </div>
    </div>
  );
}