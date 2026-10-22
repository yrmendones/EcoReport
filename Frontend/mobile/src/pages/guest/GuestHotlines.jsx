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

export default function GuestHotlines() {
  const navigate = useNavigate();

  const [hotlines, setHotlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Map hotline titles to icons (case-insensitive matching)
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
          className="bg-white rounded-3xl border border-red-300 text-center flex flex-col items-center gap-3"
          style={{ padding: "32px 24px" }}
        >
          <p className="text-[15px] font-bold text-red-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-[#0B5D2A] font-bold underline"
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
        <header className="relative h-[82px] bg-[#0B5D2A] flex items-center justify-center shrink-0 px-6">
          <button
            type="button"
            onClick={() => navigate("/guest-home")}
            aria-label="Back"
            className="absolute left-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 flex items-center justify-center text-white text-[20px] hover:bg-white/20 active:scale-95 transition"
          >
            <FaArrowLeft />
          </button>
          <h1 className="text-white text-[21px] font-extrabold">
            Emergency Hotline
          </h1>
        </header>

        {/* CONTENT */}
        <main
          className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-6"
          style={{ padding: "24px 20px 40px" }}
        >
          {/* TITLE */}
          <div className="flex flex-col gap-1">
            <h2 className="text-[19px] font-bold text-gray-800 leading-tight">
              Barangay Sto. Rosario Kanluran
            </h2>
            <p className="text-[12px] text-gray-500 leading-5">
              Emergency hotlines for Pateros, Metro Manila
            </p>
          </div>

          {/* HOTLINE CARDS */}
          <div className="flex flex-col gap-3">
            {hotlines.map((item, index) => (
              <div
                key={index}
                className="bg-white rounded-[18px] border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                style={{ padding: "16px", boxSizing: "border-box" }}
              >
                <div className="flex items-center justify-between gap-3">
                  {/* CONTACT INFO */}
                  <div className="flex items-center gap-4 min-w-0">
                    {/* ICON */}
                    <div
                      className={`w-[48px] h-[48px] rounded-full flex items-center justify-center shrink-0 ${
                        item.color_class || "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {getIcon(item.title)}
                    </div>

                    {/* DETAILS */}
                    <div className="min-w-0 flex flex-col gap-1">
                      <h3 className="text-[14px] font-bold text-gray-800 leading-5">
                        {item.title}
                      </h3>
                      <p className="text-[13px] text-gray-500">{item.number}</p>
                      {item.description && (
                        <p className="text-[11px] text-gray-400 leading-4">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* CALL BUTTON */}
                  <button
                    type="button"
                    onClick={() =>
                      handleCall(
                        item.clean_number || item.number.replace(/[^0-9]/g, "")
                      )
                    }
                    className="w-[68px] h-[44px] shrink-0 bg-[#0B5D2A] text-white rounded-[12px] font-bold text-[13px] flex items-center justify-center shadow-sm hover:bg-[#084A21] active:scale-95 transition"
                  >
                    Call
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* 911 EMERGENCY */}
          <div
            className="bg-red-50 border border-red-200 rounded-[20px] flex flex-col gap-3 shrink-0"
            style={{ padding: "16px", boxSizing: "border-box" }}
          >
            <p className="text-[13px] text-red-700 font-semibold text-center leading-5">
              For immediate life-threatening emergencies
            </p>

            <button
              type="button"
              onClick={() => handleCall("911")}
              className="w-full h-[54px] bg-red-600 hover:bg-red-700 text-white rounded-[15px] font-bold text-[15px] flex items-center justify-center gap-3 shadow-sm active:scale-[0.98] transition"
            >
              <FaPhoneAlt size={18} />
              Call 911
            </button>

            <p className="text-[11px] text-red-500 text-center">
              National Emergency Hotline - 24/7
            </p>
          </div>
        </main>

        {/* Fake home bar, desktop frame only */}
        <div className="hidden sm:flex absolute bottom-2 left-0 right-0 justify-center pointer-events-none z-50">
          <div className="w-[60px] h-[5px] rounded-full bg-gray-700 opacity-80" />
        </div>
      </div>
    </div>
  );
}