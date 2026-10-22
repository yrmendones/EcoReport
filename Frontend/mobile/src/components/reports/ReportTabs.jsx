export default function ReportTabs({
  tabs,
  activeTab,
  setActiveTab,
}) {
  return (
    <div className="w-full px-1">
      <div
        className="
          grid
          grid-cols-5
          gap-1.5
          w-full
        "
      >
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => {
              setActiveTab(tab);
              console.log("Clicked:", tab);
            }}
            className={`
              w-full
              h-[38px]
              rounded-xl
              text-[10px]
              font-bold
              whitespace-nowrap
              cursor-pointer
              pointer-events-auto
              flex
              items-center
              justify-center
              transition-all
              duration-200

              ${
                activeTab === tab
                  ? `
                    bg-[#0B5D2A]
                    text-white
                    shadow-sm
                  `
                  : `
                    bg-[#F4F8F2]
                    border
                    border-[#C8DCC3]
                    text-[#0B5D2A]
                    hover:bg-[#E8F2E5]
                  `
              }
            `}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
}