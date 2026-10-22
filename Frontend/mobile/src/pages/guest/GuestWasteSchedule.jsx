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

export default function GuestWasteSchedule() {
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
      FaTrash: <FaTrash />,
      FaLeaf: <FaLeaf />,
      FaRecycle: <FaRecycle />,
      FaExclamationTriangle: <FaExclamationTriangle />,
    };
    return icons[iconName] || <FaTrash />;
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
            Waste Collection
          </h1>
        </header>

        {/* CONTENT */}
        <main
          className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-6"
          style={{ padding: "24px 20px 40px" }}
        >
          {/* PAGE INTRO */}
          <div className="flex items-center gap-4">
            <div className="w-[52px] h-[52px] rounded-full bg-[#E5F5E9] text-[#0B5D2A] flex items-center justify-center shrink-0">
              <FaCalendarAlt size={25} />
            </div>

            <div className="min-w-0 flex flex-col gap-1">
              <h2 className="text-[20px] font-bold text-gray-800 leading-tight">
                Collection Schedule
              </h2>
              <p className="text-[12px] text-gray-500 leading-5">
                Select a date to see the schedule for that day.
              </p>
            </div>
          </div>

          {/* MONTH CARD */}
          <div
            className="bg-white rounded-[22px] border border-gray-200 shadow-sm flex flex-col gap-5"
            style={{ padding: "20px", boxSizing: "border-box" }}
          >
            {/* MONTH */}
            <div className="flex items-center gap-3">
              <FaCalendarAlt size={20} className="text-[#0B5D2A]" />
              <h3 className="text-[18px] font-bold text-[#0B5D2A]">
                {getCurrentMonthYear()}
              </h3>
            </div>

            {/* DATE PICKER */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="select-date"
                className="block text-[13px] font-semibold text-gray-600"
              >
                Select Date
              </label>

              <input
                id="select-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="block w-full min-w-0 h-[52px] border border-gray-300 rounded-[14px] text-[16px] text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#0B5D2A]/20 focus:border-[#0B5D2A]"
                style={{ padding: "0 16px", boxSizing: "border-box" }}
              />

              {/* SHOW SELECTED DAY */}
              {selectedDate && selectedDay && (
                <div className="text-center pt-1">
                  <span className="inline-block px-4 py-1.5 bg-[#E8F5E3] text-[#0B5D2A] rounded-full text-[12px] font-bold">
                    {selectedDay}
                  </span>
                </div>
              )}
            </div>

            {/* SCHEDULE */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-[17px] font-bold text-gray-800">
                  {selectedDate ? `${selectedDay}'s Schedule` : "Weekly Schedule"}
                </h3>
                {selectedDate && (
                  <button
                    type="button"
                    onClick={() => setSelectedDate("")}
                    className="px-2 py-2 text-[12px] text-[#0B5D2A] font-bold hover:underline"
                  >
                    View All
                  </button>
                )}
              </div>

              {filteredSchedule.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {filteredSchedule.map((item, index) => (
                    <div
                      key={index}
                      className="min-h-[70px] border border-[#CDE8D3] rounded-[16px] flex items-center justify-between gap-3 bg-[#F1FAF3]"
                      style={{ padding: "12px 16px", boxSizing: "border-box" }}
                    >
                      {/* LEFT */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-[42px] h-[42px] rounded-full bg-[#DDF2E2] text-[#0B5D2A] flex items-center justify-center shrink-0">
                          {getIcon(item.icon)}
                        </div>

                        <div className="min-w-0 flex flex-col gap-1">
                          <p className="text-[14px] font-bold text-gray-800">
                            {item.day}
                          </p>
                          <p className="text-[12px] text-gray-500">
                            Waste collection
                          </p>
                        </div>
                      </div>

                      {/* RIGHT */}
                      <span className="shrink-0 text-[#0B5D2A] text-[12px] font-bold bg-white border border-[#CDE8D3] rounded-full px-4 py-2 text-center min-w-[90px] whitespace-nowrap">
                        {item.type}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500 flex flex-col gap-1">
                  <p className="text-[14px] font-semibold">
                    No collection on {selectedDay}
                  </p>
                  <p className="text-[12px]">
                    No waste collection is scheduled for this day.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* INFORMATION */}
          <div
            className="bg-[#EFFAF2] border border-[#BFE3C8] rounded-[18px]"
            style={{ padding: "16px", boxSizing: "border-box" }}
          >
            <p className="text-[12px] text-gray-600 leading-5">
              Please place your waste outside before the scheduled collection
              time and separate it according to its type.
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