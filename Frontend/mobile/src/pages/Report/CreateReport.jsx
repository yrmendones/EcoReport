import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaCheck, FaChevronDown } from "react-icons/fa";

// Main report types (shown directly in the list)
const mainTypes = [
  "Air Pollution",
  "Animal Waste",
  "Clogged Drainage",
  "Damaged Roads",
  "Flooding",
  "Fallen Trees",
  "Illegal Dumping",
  "Improper Garbage Disposal",
  "Overgrown Grass",
];

// Types hidden inside the "Other Concerns" dropdown
const otherTypes = [
  "Others Environmental Concerns",
  "Blotter & Incident",
  "Crime",
];

export default function CreateReport() {
  const navigate = useNavigate();

  const [selected, setSelected] = useState("");
  const [othersOpen, setOthersOpen] = useState(false);

  const isOtherSelected = otherTypes.includes(selected);
  // Stay open while one of the other options is selected
  const showOthers = othersOpen || isOtherSelected;

  const handleNext = () => {
    if (!selected) {
      alert("Please select a report type.");
      return;
    }
    navigate("/upload-evidence", {
      state: { reportType: selected },
    });
  };

  const toggleOthers = () => {
    // Do not collapse while an option inside is selected
    if (isOtherSelected) return;
    setOthersOpen((prev) => !prev);
  };

  const optionStyle = {
    minHeight: "64px",
    padding: "18px 20px",
    gap: "12px",
    boxSizing: "border-box",
  };

  return (
    <div className="min-h-[100dvh] bg-[#E5E7EB] flex justify-center items-center sm:py-6 sm:px-3">
      {/* Hides the scrollbar but the page can still be scrolled */}
      <style>{`
        .hide-scrollbar {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }
      `}</style>

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
            Submit Report
          </h1>
        </header>

        {/* SCROLLABLE CONTENT */}
        <main
          className="hide-scrollbar flex-1 overflow-y-auto flex flex-col"
          style={{
            padding: "28px 24px 32px",
            gap: "28px",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {/* STEP */}
          <div className="shrink-0 flex flex-col" style={{ gap: "8px" }}>
            <p className="text-[15px] font-bold text-[#0B5D2A]">Step 1 of 4</p>

            <h2 className="text-[24px] font-extrabold text-gray-900 leading-tight">
              Select Report Type
            </h2>

            <p className="text-[14px] text-gray-600 leading-6">
              Choose the environmental concern you want to report.
            </p>
          </div>

          {/* REPORT TYPE LIST */}
          <div className="shrink-0 flex flex-col" style={{ gap: "14px" }}>
            {mainTypes.map((type) => {
              const isSelected = selected === type;

              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelected(type)}
                  className={`w-full rounded-2xl border flex items-center justify-between text-left transition-all duration-200 ${
                    isSelected
                      ? "bg-[#0B5D2A] border-[#0B5D2A] text-white shadow-md"
                      : "bg-white border-[#C8DCC3] text-gray-800 shadow-sm hover:border-[#0B5D2A] hover:bg-[#F4F8F2]"
                  }`}
                  style={optionStyle}
                >
                  {/* REPORT TYPE TEXT */}
                  <span
                    className={`flex-1 min-w-0 text-[16px] font-semibold leading-6 break-words ${
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

            {/* OTHER CONCERNS: dropdown group (up/down arrow) */}
            <div className="flex flex-col" style={{ gap: "10px" }}>
              <button
                type="button"
                onClick={toggleOthers}
                aria-expanded={showOthers}
                className={`w-full rounded-2xl border flex items-center justify-between text-left transition-all duration-200 ${
                  isOtherSelected
                    ? "bg-[#E8F5E3] border-[#0B5D2A] shadow-md"
                    : "bg-white border-[#C8DCC3] shadow-sm hover:border-[#0B5D2A] hover:bg-[#F4F8F2]"
                }`}
                style={optionStyle}
              >
                <span className="flex-1 min-w-0 flex flex-col" style={{ gap: "4px" }}>
                  <span className="text-[16px] font-semibold leading-6 text-gray-800">
                    Other Concerns
                  </span>
                  <span className="text-[13px] leading-5 text-gray-500 break-words">
                    {isOtherSelected
                      ? `Selected: ${selected}`
                      : "Crime, Blotter & Incidents, and more"}
                  </span>
                </span>

                <span
                  className="w-9 h-9 rounded-full bg-[#E8F5E3] flex items-center justify-center shrink-0"
                  style={{
                    transform: showOthers ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 200ms ease",
                  }}
                >
                  <FaChevronDown className="text-[#0B5D2A]" size={14} />
                </span>
              </button>

              {showOthers && (
                <div
                  className="flex flex-col border border-[#D5E4D1] rounded-2xl bg-[#FBFDFB]"
                  style={{ padding: "12px", gap: "10px", boxSizing: "border-box" }}
                >
                  {otherTypes.map((type) => {
                    const isSelected = selected === type;

                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setSelected(type)}
                        className={`w-full rounded-xl border flex items-center justify-between text-left transition-all duration-200 ${
                          isSelected
                            ? "bg-[#0B5D2A] border-[#0B5D2A] text-white shadow-md"
                            : "bg-white border-[#C8DCC3] text-gray-800 shadow-sm hover:border-[#0B5D2A] hover:bg-[#F4F8F2]"
                        }`}
                        style={{
                          minHeight: "56px",
                          padding: "14px 16px",
                          gap: "12px",
                          boxSizing: "border-box",
                        }}
                      >
                        <span
                          className={`flex-1 min-w-0 text-[16px] font-semibold leading-6 break-words ${
                            isSelected ? "text-white" : "text-gray-800"
                          }`}
                        >
                          {type}
                        </span>

                        {isSelected && (
                          <span className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0">
                            <FaCheck className="text-[#0B5D2A]" size={14} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </main>

        {/* NEXT BUTTON: hindi sagad sa ilalim sa kahit anong device */}
        <div
          className="shrink-0 bg-[#F8FAF8] border-t border-[#E2ECDF]"
          style={{
            paddingTop: "18px",
            paddingLeft: "24px",
            paddingRight: "24px",
            paddingBottom: "max(40px, calc(env(safe-area-inset-bottom) + 24px))",
          }}
        >
          <button
            type="button"
            onClick={handleNext}
            className="w-full h-[58px] bg-[#0B5D2A] text-white rounded-2xl font-extrabold text-[16px] flex items-center justify-center shadow-lg hover:bg-[#084A21] active:scale-[0.98] transition"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}