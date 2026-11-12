import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaPhoneAlt,
  FaShieldAlt,
  FaFireExtinguisher,
  FaAmbulance,
  FaHospital,
  FaBuilding,
  FaExclamationTriangle,
  FaSpinner,
} from "react-icons/fa";
import { apiFetch } from "../../api";

export default function EmergencyHotline() {
  const navigate = useNavigate();

  const [hotlines, setHotlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Map hotline titles to icons (hindi sensitibo sa laki ng letra)
  const getIcon = (title = "") => {
    const t = title.toLowerCase();
    const size = 22;

    if (t.includes("police") || t.includes("pnp")) return <FaShieldAlt size={size} />;
    if (t.includes("fire") || t.includes("bfp")) return <FaFireExtinguisher size={size} />;
    if (
      t.includes("ambulance") ||
      t.includes("rescue") ||
      t.includes("medical") ||
      t.includes("911")
    )
      return <FaAmbulance size={size} />;
    if (t.includes("health") || t.includes("hospital") || t.includes("clinic"))
      return <FaHospital size={size} />;
    if (t.includes("barangay hall") || t.includes("tanod"))
      return <FaBuilding size={size} />;
    if (t.includes("mdrrmo") || t.includes("drrmo") || t.includes("disaster"))
      return <FaExclamationTriangle size={size} />;
    return <FaPhoneAlt size={size - 3} />;
  };

  useEffect(() => {
    const fetchHotlines = async () => {
      try {
        setLoading(true);
        const data = await apiFetch("/api/hotlines");
        setHotlines(data);
      } catch (err) {
        console.error("Error fetching hotlines:", err);
        setError("Failed to load hotlines.");
      } finally {
        setLoading(false);
      }
    };

    fetchHotlines();
  }, []);

  const handleCall = (cleanNumber) => {
    window.location.href = `tel:${cleanNumber}`;
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#E5E7EB] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <FaSpinner className="animate-spin text-[#0B5D2A]" size={40} />
          <p className="text-[#0B5D2A] font-bold">Loading hotlines...</p>
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
          className="bg-white rounded-3xl border border-red-300 text-center flex flex-col items-center"
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
            Emergency Hotline
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
          {/* TITLE */}
          <div className="flex flex-col" style={{ gap: "8px" }}>
            <h2 className="text-[22px] font-extrabold text-gray-900 leading-tight">
              Barangay Sto. Rosario Kanluran
            </h2>
            <p className="text-[14px] text-gray-600 leading-6">
              Emergency hotlines for Pateros, Metro Manila
            </p>
          </div>

          {/* HOTLINE CARDS: clear gap between each card */}
          <div className="flex flex-col" style={{ gap: "16px" }}>
            {hotlines.map((item, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between"
                style={{ padding: "20px", gap: "16px", boxSizing: "border-box" }}
              >
                {/* CONTACT INFO */}
                <div className="flex items-center min-w-0 flex-1" style={{ gap: "16px" }}>
                  {/* ICON */}
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                      item.color_class || "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {getIcon(item.title)}
                  </div>

                  {/* DETAILS */}
                  <div className="min-w-0 flex flex-col items-start" style={{ gap: "8px" }}>
                    <h3 className="font-extrabold text-[16px] text-gray-900 leading-6 break-words">
                      {item.title}
                    </h3>
                    <p className="text-[14px] text-gray-700">{item.number}</p>
                    {item.description && (
                      <p className="text-[13px] text-gray-500 leading-6 break-words">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* CALL BUTTON */}
                <button
                  type="button"
                  onClick={() =>
                    handleCall(item.clean_number || item.number.replace(/[^0-9]/g, ""))
                  }
                  className="btn-success min-w-[68px] min-h-[44px] shrink-0 rounded-xl font-extrabold text-[14px] flex items-center justify-center shadow-sm transition"
                  style={{ padding: "0 14px" }}
                >
                  Call
                </button>
              </div>
            ))}
          </div>

          {/* 911 EMERGENCY */}
          <div
            className="bg-red-50 border border-red-200 rounded-2xl flex flex-col shrink-0"
            style={{ padding: "20px", gap: "16px", boxSizing: "border-box" }}
          >
            <p className="text-[14px] text-red-700 font-semibold text-center leading-6">
              For immediate life-threatening emergencies
            </p>

            <button
              type="button"
              onClick={() => handleCall("911")}
              className="btn-danger w-full min-h-[54px] rounded-xl font-extrabold text-[16px] flex items-center justify-center shadow-sm transition"
              style={{ gap: "12px" }}
            >
              <FaPhoneAlt size={18} />
              Call 911
            </button>

            <p className="text-[12px] text-red-500 text-center">
              National Emergency Hotline - 24/7
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}