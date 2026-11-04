import { useNavigate } from "react-router-dom";
import { FaChevronRight } from "react-icons/fa";

export default function AnnouncementCard({ title, subtitle, announcementId }) {
  const navigate = useNavigate();
  const canOpen = announcementId !== null && announcementId !== undefined;

  return (
    <button
      type="button"
      disabled={!canOpen}
      onClick={() => canOpen && navigate(`/announcement-detail/${announcementId}`)}
      className={`block w-full bg-white text-left transition ${
        canOpen ? "hover:shadow-md active:scale-[0.99]" : "cursor-default"
      }`}
      style={{
        padding: "24px",
        border: "1px solid #D5E4D1",
        borderRadius: "22px",
        boxShadow: "0 1px 4px rgba(0, 0, 0, 0.06)",
        boxSizing: "border-box",
      }}
    >
      <div className="flex items-center justify-between" style={{ gap: "16px" }}>
        <div className="min-w-0 flex flex-col" style={{ gap: "8px" }}>
          <h3 className="text-[17px] font-extrabold text-gray-900 leading-7 break-words">
            {title}
          </h3>
          <p className="text-[14px] text-gray-500 leading-5 break-words">
            {subtitle}
          </p>
        </div>

        {canOpen && (
          <FaChevronRight className="shrink-0 text-[#0B5D2A]" size={16} />
        )}
      </div>
    </button>
  );
}