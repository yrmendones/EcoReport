import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaLeaf,
  FaRecycle,
  FaTrash,
  FaExclamationTriangle,
  FaSpinner,
} from "react-icons/fa";
import { apiFetch } from "../../api";

export default function WasteSchedule() {
  const navigate = useNavigate();

  // State
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  // Fetch waste schedule from backend
  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        setLoading(true);
        const data = await apiFetch("/api/waste-schedule");
        setSchedules(data);
      } catch (err) {
        console.error("Error fetching schedule:", err);
        setError("Failed to load waste schedule.");
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, []);

  // Get day of week from date
  const getDayOfWeek = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    return days[date.getDay()];
  };

  // Filter schedule based on selected date
  const getFilteredSchedule = () => {
    if (!selectedDate) {
      return schedules;
    }

    const selectedDay = getDayOfWeek(selectedDate);
    if (!selectedDay) return schedules;

    return schedules.filter((item) => item.day === selectedDay);
  };

  const filteredSchedule = getFilteredSchedule();
  const selectedDay = selectedDate ? getDayOfWeek(selectedDate) : null;

  // Get current month and year
  const getCurrentMonthYear = () => {
    const now = new Date();
    return now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  // Map icon names to components
  const getIcon = (iconName) => {
    const icons = {
      FaTrash: <FaTrash size={20} />,
      FaLeaf: <FaLeaf size={20} />,
      FaRecycle: <FaRecycle size={20} />,
      FaExclamationTriangle: <FaExclamationTriangle size={20} />,
    };
    return icons[iconName] || <FaTrash size={20} />;
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#E5E7EB] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <FaSpinner className="animate-spin text-[#0B5D2A]" size={40} />
          <p className="text-[#0B5D2A] font-bold">Loading schedule...</p>
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
            Waste Collection
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
          {/* PAGE INTRO */}
          <div className="flex items-center shrink-0" style={{ gap: "16px" }}>
            <div className="w-12 h-12 rounded-full bg-[#E5F5E9] text-[#0B5D2A] flex items-center justify-center shrink-0">
              <FaCalendarAlt size={22} />
            </div>

            <div className="min-w-0 flex flex-col" style={{ gap: "8px" }}>
              <h2 className="text-[22px] font-extrabold text-gray-900 leading-tight">
                Collection Schedule
              </h2>
              <p className="text-[14px] text-gray-600 leading-6">
                Select a date to see the schedule for that day.
              </p>
            </div>
          </div>

          {/* MONTH CARD */}
          <div
            className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col shrink-0"
            style={{ padding: "20px", gap: "24px", boxSizing: "border-box" }}
          >
            {/* MONTH */}
            <div className="flex items-center" style={{ gap: "12px" }}>
              <FaCalendarAlt size={20} className="text-[#0B5D2A]" />
              <h3 className="text-[18px] font-extrabold text-[#0B5D2A]">
                {getCurrentMonthYear()}
              </h3>
            </div>

            {/* DATE PICKER */}
            <div className="flex flex-col" style={{ gap: "8px" }}>
              <label
                htmlFor="select-date"
                className="block text-[14px] font-extrabold text-gray-900"
              >
                Select Date
              </label>

              <input
                id="select-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="block w-full min-w-0 min-h-[52px] border border-[#C8DCC3] rounded-2xl text-[16px] text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#0B5D2A]/10 focus:border-[#0B5D2A]"
                style={{ padding: "0 16px", boxSizing: "border-box" }}
              />

              {/* SHOW SELECTED DAY */}
              {selectedDate && selectedDay && (
                <div className="text-center" style={{ paddingTop: "4px" }}>
                  <span
                    className="inline-block bg-[#E8F5E3] text-[#0B5D2A] rounded-full text-[13px] font-extrabold"
                    style={{ padding: "6px 16px" }}
                  >
                    {selectedDay}
                  </span>
                </div>
              )}
            </div>

            {/* SCHEDULE */}
            <div className="flex flex-col" style={{ gap: "16px" }}>
              <div className="flex items-center justify-between" style={{ gap: "12px" }}>
                <h3 className="text-[18px] font-extrabold text-gray-900 leading-6">
                  {selectedDate ? `${selectedDay}'s Schedule` : "Weekly Schedule"}
                </h3>
                {selectedDate && (
                  <button
                    type="button"
                    onClick={() => setSelectedDate("")}
                    className="shrink-0 min-h-[44px] text-[13px] text-[#0B5D2A] font-extrabold hover:underline"
                    style={{ padding: "0 8px" }}
                  >
                    View All
                  </button>
                )}
              </div>

              {filteredSchedule.length > 0 ? (
                <div className="flex flex-col" style={{ gap: "16px" }}>
                  {filteredSchedule.map((item, index) => (
                    <div
                      key={index}
                      className="border border-[#CDE8D3] rounded-2xl flex items-center bg-[#F1FAF3]"
                      style={{ padding: "16px", gap: "16px", boxSizing: "border-box" }}
                    >
                      {/* ICON */}
                      <div className="w-12 h-12 rounded-full bg-[#DDF2E2] text-[#0B5D2A] flex items-center justify-center shrink-0">
                        {getIcon(item.icon)}
                      </div>

                      {/* TEXT + TYPE BADGE */}
                      <div className="min-w-0 flex-1 flex flex-col items-start" style={{ gap: "6px" }}>
                        <p className="text-[16px] font-extrabold text-gray-900 leading-6 break-words">
                          {item.day}
                        </p>
                        <p className="text-[13px] text-gray-500 leading-5">
                          Waste collection
                        </p>
                        <span
                          className="max-w-full text-[#0B5D2A] text-[13px] font-extrabold leading-5 bg-white border border-[#CDE8D3] rounded-full break-words"
                          style={{ padding: "6px 14px", marginTop: "2px" }}
                        >
                          {item.type}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className="text-center text-gray-500 flex flex-col"
                  style={{ padding: "24px 0", gap: "8px" }}
                >
                  <p className="text-[14px] font-semibold leading-6">
                    No collection on {selectedDay}
                  </p>
                  <p className="text-[13px] leading-5">
                    No waste collection is scheduled for this day.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* INFORMATION */}
          <div
            className="bg-[#EFFAF2] border border-[#BFE3C8] rounded-2xl shrink-0"
            style={{ padding: "20px", boxSizing: "border-box" }}
          >
            <p className="text-[14px] text-gray-600 leading-6">
              Please place your waste outside before the scheduled collection
              time and separate it according to its type.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}