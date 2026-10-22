import { FaChevronRight, FaFileImage } from "react-icons/fa";
import StatusBadge from "./StatusBadge";

export default function ReportCard({ report, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="
        w-full
        bg-white
        border
        border-[#0B5D2A]/30
        rounded-2xl
        overflow-hidden
        shadow-sm
        hover:shadow-md
        active:scale-[0.99]
        transition
        text-left
      "
    >
      <div className="flex items-center px-5 py-5 gap-4">
        {/* ================= IMAGE (only if exists) ================= */}
        {report.image ? (
          <div className="shrink-0">
            <img
              src={report.image}
              alt={report.title}
              className="
                w-[72px]
                h-[72px]
                rounded-xl
                object-cover
                border
                border-[#D5E4D1]
              "
            />
          </div>
        ) : (
          <div
            className="
              shrink-0
              w-[72px]
              h-[72px]
              rounded-xl
              bg-[#F0F8ED]
              border
              border-[#D5E4D1]
              flex
              items-center
              justify-center
            "
          >
            <FaFileImage className="text-gray-400" size={28} />
          </div>
        )}

        {/* ================= DETAILS ================= */}
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-extrabold text-gray-900 leading-tight truncate">
            {report.title}
          </h3>

          <p className="text-[11px] text-gray-500 mt-2">Reference No.</p>
          <p className="text-[11px] font-semibold text-[#0B5D2A] mt-0.5">
            {report.ref}
          </p>

          <p className="text-[11px] text-gray-500 mt-1">{report.date}</p>
        </div>

        {/* ================= RIGHT SIDE ================= */}
        <div className="shrink-0 flex flex-col items-end justify-center gap-3">
          <StatusBadge status={report.status} />

          <div
            className="
              w-8
              h-8
              rounded-full
              bg-[#F1F7EE]
              flex
              items-center
              justify-center
            "
          >
            <FaChevronRight className="text-[#0B5D2A]" size={13} />
          </div>
        </div>
      </div>
    </button>
  );
}