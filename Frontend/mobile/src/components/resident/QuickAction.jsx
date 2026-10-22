export default function QuickAction({
  icon,
  title,
  onClick,
}) {
  return (
    <button
      onClick={onClick}
      className="
        w-full
        aspect-square
        bg-white
        border
        border-[#0B5D2A]/30
        rounded-[26px]
        p-2.5
        shadow-sm
        flex
        flex-col
        items-center
        justify-center
        gap-2
        hover:shadow-md
        hover:-translate-y-0.5
        transition-all
        group
        focus:outline-none
        cursor-pointer
      "
    >
      {/* Icon */}
      <div className="text-[#0B5D2A] group-hover:scale-105 transition-transform flex items-center justify-center">
        {icon}
      </div>

      {/* Title */}
      <span className="text-[13px] font-bold text-gray-800 text-center leading-tight">
        {title}
      </span>
    </button>
  );
}