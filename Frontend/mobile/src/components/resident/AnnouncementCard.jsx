import { useNavigate } from "react-router-dom";
import { FaBullhorn, FaChevronRight } from "react-icons/fa";

export default function AnnouncementCard({ title, subtitle, announcementId }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (announcementId) {
      navigate(`/announcement-detail/${announcementId}`);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="
        w-full
        min-h-[82px]
        bg-white
        border
        border-[#C8DCC3]
        rounded-[22px]
        px-5
        py-4
  ؠ     flex
 Ġ   Р  items-center
        justify-between
        gap-4
        shadow-sm
        hover:shadow-md
        hover:border-[#0B5D2A]
        transition-all
        text-left
        focus:outline-none
        active:scale-[0.99]
      "
    >
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <div className="w-12 h-12 rounded-2xl bg-[#E8F5E3] flex items-center justify-center shrink-0">
          <FaBullhorn className="text-[#0B5D2A] -scale-x-100" size={21} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-extrabold text-gray-900 leading-5 truncate">
            {title}
          </h3>
          <p className="text-[12px] text-gray-500 font-medium leading-5 truncate mt-1">
            {subtitle}
          </p>
        </div>
      </div>
      <div className="w-8 h-8 rounded-full bg-[#F0F8ED] flex items-center justify-center shrink-0">
        <FaChevronRight className="text-[#0B5D2A]" size={13} />
      </div>
    </button>
  );
}