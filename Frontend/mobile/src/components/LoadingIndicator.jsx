import { FaSpinner } from "react-icons/fa";

export function LoadingIndicator({
  label = "Loading",
  size = 40,
  showLabel = true,
  className = "",
}) {
  return (
    <div
      className={`flex flex-col items-center gap-4 ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <FaSpinner
        className="animate-spin text-[#0B5D2A]"
        size={size}
        aria-hidden="true"
        focusable="false"
      />
      {showLabel ? (
        <p className="text-[#0B5D2A] font-bold">{label}</p>
      ) : (
        <span className="sr-only">{label}</span>
      )}
    </div>
  );
}

export function FullScreenLoading({
  label = "Loading",
  backgroundClass = "bg-[#E5E7EB]",
  showLabel = true,
}) {
  return (
    <div className={`min-h-[100dvh] ${backgroundClass} flex items-center justify-center`}>
      <LoadingIndicator label={label} showLabel={showLabel} />
    </div>
  );
}
