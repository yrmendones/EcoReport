export default function StatsCard({
  number,
  label,
  onClick,
}) {
  return (
    <div
      onClick={onClick}
      className="
        bg-white 
        rounded-xl 
        p-4 
        text-center 
        shadow-sm 
        cursor-pointer 
        hover:shadow-md 
        transition
      "
    >

      <h3 className="text-2xl font-bold text-[#0B5D2A]">
        {number}
      </h3>


      <p className="text-sm text-gray-600">
        {label}
      </p>


    </div>
  );
}