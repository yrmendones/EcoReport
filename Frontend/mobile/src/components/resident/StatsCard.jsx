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
      style={{
        minHeight: "100px",
        padding: "16px 8px",
        gap: "6px",
        border: "1px solid #D5E4D1",
        borderRadius: "22px",
        boxSizing: "border-box",
      }}
    >
      <h3 className="text-[28px] font-bold text-[#0B5D2A] leading-none">
        {number}
      </h3>

      <p className="text-[14px] font-semibold text-gray-600 leading-5">
        {label}
      </p>
    </div>
  );
}