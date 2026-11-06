export default function StatsCard({
  number,
  label,
  onClick,
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick && onClick();
        }
      }}
      className="
        bg-white
        rounded-xl
        p-4
        text-center
        shadow-sm
        cursor-pointer
        hover:shadow-md
        active:scale-[0.97]
        transition
        flex
        flex-col
        items-center
        justify-center
      "
    >
      <h3 className="text-2xl font-bold text-[#0B5D2A]">
        {number}
      </h3>

      <p className="text-[14px] font-semibold text-gray-600">
        {label}
      </p>
    </div>
  );
}