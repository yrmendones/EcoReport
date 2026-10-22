export default function StatusBadge({ status }) {
  const styles = {
    Pending: {
      bg: "bg-[#FFF8E1]",
      text: "text-[#A87900]",
      dot: "bg-[#E0A800]",
      border: "border-[#F1D98A]",
    },

    Ongoing: {
      bg: "bg-[#EAF3FF]",
      text: "text-[#2870B8]",
      dot: "bg-[#3B82D0]",
      border: "border-[#B9D5F2]",
    },

    Resolved: {
      bg: "bg-[#EAF7EA]",
      text: "text-[#2E7D32]",
      dot: "bg-[#43A047]",
      border: "border-[#B8DCBA]",
    },

    Rejected: {
      bg: "bg-[#FDECEC]",
      text: "text-[#B83232]",
      dot: "bg-[#D64545]",
      border: "border-[#E5B5B5]",
    },
  };

  const current = styles[status] || {
    bg: "bg-gray-100",
    text: "text-gray-600",
    dot: "bg-gray-400",
    border: "border-gray-300",
  };

  return (
    <span
      className={`
        inline-flex
        items-center
        gap-2
        min-w-[82px]
        h-[30px]
        px-3
        rounded-full
        border
        ${current.bg}
        ${current.text}
        ${current.border}
        text-[10px]
        font-bold
        whitespace-nowrap
        justify-center
      `}
    >
      {/* STATUS DOT */}
      <span
        className={`
          w-[7px]
          h-[7px]
          rounded-full
          ${current.dot}
          shrink-0
        `}
      />

      {status}
    </span>
  );
}