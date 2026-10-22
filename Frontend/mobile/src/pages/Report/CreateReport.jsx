import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaCheck } from "react-icons/fa";

export default function CreateReport() {
  const navigate = useNavigate();

  const [selected, setSelected] = useState("");

  const reportTypes = [
    "Air Pollution",
    "Animal Waste",
    "Blotter & Incidents",
    "Clogged Drainage",
    "Crime",
    "Damaged Roads",
    "Fallen Trees",
    "Flooding",
    "Illegal Dumping",
    "Improper Garbage Disposal",
    "Others Environmental Concerns",
    "Overgrown Grass",
  ];

  const handleNext = () => {
    if (!selected) {
      alert("Please select a report type.");
      return;
    }
    navigate("/upload-evidence", {
      state: { reportType: selected },
    });
  };

  return (
    <div className="min-h-[100dvh] bg-[#E5E7EB] flex justify-center items-center sm:py-6 sm:px-3">
      {/* Full screen on phones, phone frame only on sm and up */}
      <div className="relative w-full h-[100dvh] sm:w-[390px] sm:h-[844px] bg-[#F8FAF8] sm:rounded-[40px] sm:border-[5px] sm:border-white sm:shadow-2xl overflow-hidden flex flex-col">
        {/* HEADER */}
        <header className="relative h-[82px] bg-[#0B5D2A] flex items-center justify-center shrink-0 px-6">
          <button
            type="button"
            onClick={() => navigate("/resident-dashboard")}
            aria-label="Back"
            className="absolute left-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center text-white text-[20px] bg-white/10 hover:bg-white/20 active:scale-95 transition"
          >
            <FaArrowLeft />
          </button>

          <h1 className="text-white text-[21px] font-extrabold">
            Submit Report
          </h1>
        </header>

        {/* SCROLLABLE CONTENT */}
        <main className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-6 px-5 pt-6 pb-6">
          {/* STEP */}
          <div className="flex flex-col gap-1.5">
            <p className="text-[13px] font-bold text-[#0B5D2A]">Step 1 of 4</p>

            <h2 className="text-[21px] font-extrabold text-gray-900 leading-tight">
              Select Report Type
            </h2>

            <p className="text-[12px] text-gray-500 leading-5">
              Choose the environmental concern you want to report.
            </p>
          </div>

          {/* REPORT TYPE LIST */}
          <div className="flex flex-col gap-3">
            {reportTypes.map((type) => {
              const isSelected = selected === type;

              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelected(type)}
                  className={`w-full min-h-[60px] px-5 py-4 rounded-2xl border flex items-center justify-between gap-3 text-left transition-all duration-200 ${
                    isSelected
                      ? "bg-[#0B5D2A] border-[#0B5D2A] text-white shadow-md"
                      : "bg-white border-[#C8DCC3] text-gray-800 shadow-sm hover:border-[#0B5D2A] hover:bg-[#F4F8F2]"
                  }`}
                >
                  {/* REPORT TYPE TEXT */}
                  <span
                    className={`flex-1 min-w-0 text-[14px] font-semibold leading-5 break-words ${
                      isSelected ? "text-white" : "text-gray-800"
                    }`}
                  >
                    {type}
                  </span>

                  {/* CHECK ICON */}
                  {isSelected && (
                    <span className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0">
                      <FaCheck className="text-[#0B5D2A]" size={14} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </main>

        {/* NEXT BUTTON */}
        <div
          className="shrink-0 bg-[#F8FAF8] border-t border-[#E2ECDF]"
          style={{
            paddingTop: "16px",
            paddingLeft: "20px",
            paddingRight: "20px",
            paddingBottom: "max(40px, calc(env(safe-area-inset-bottom) + 24px))",
          }}
        >
          <button
            type="button"
            onClick={handleNext}
            className="w-full h-[56px] bg-[#0B5D2A] text-white rounded-2xl font-extrabold text-[15px] flex items-center justify-center shadow-lg hover:bg-[#084A21] active:scale-[0.98] transition"
          >
            Next
          </button>
        </div>

        {/* Fake home bar, desktop frame only */}
        <div className="hidden sm:flex absolute bottom-3 left-0 right-0 justify-center pointer-events-none z-30">
          <div className="w-[70px] h-[5px] rounded-full bg-gray-800 opacity-70" />
        </div>
      </div>
    </div>
  );
}