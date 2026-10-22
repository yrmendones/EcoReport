import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FaArrowLeft, FaSpinner } from "react-icons/fa";

export default function NotificationDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const notification = location.state?.notification;

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (notification) {
      setLoading(false);
    } else {
      navigate("/notifications");
    }
  }, [notification, navigate]);

  const handleGoToReport = () => {
    if (notification.reference_id) {
      navigate(`/report-details/${notification.reference_id}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#E5E7EB] flex items-center justify-center">
        <FaSpinner className="animate-spin text-[#0B5D2A]" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E5E7EB] flex justify-center items-center py-6 px-3">
      <div className="relative w-[390px] h-[844px] bg-[#F8FAF8] rounded-[40px] border-[5px] border-white shadow-2xl overflow-hidden flex flex-col">
        <header className="relative h-[82px] bg-[#0B5D2A] flex items-center justify-center shrink-0">
          <button
            type="button"
            onClick={() => navigate("/notifications")}
            className="absolute left-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center text-white text-[20px] bg-white/10 hover:bg-white/20 active:scale-95 transition"
          >
            <FaArrowLeft />
          </button>
          <h1 className="text-white text-[21px] font-extrabold">Notification</h1>
        </header>

        <main className="flex-1 overflow-y-auto px-6 pt-8 pb-8">
          <div className="bg-white rounded-2xl border border-[#D5E4D1] p-6 shadow-sm">
            <div className="mb-2">
              <span className="inline-flex px-3 py-1 rounded-full bg-[#E8F5E3] text-[#0B5D2A] text-[10px] font-extrabold">
                {notification.type || "Notification"}
              </span>
            </div>
            <h2 className="text-[20px] font-extrabold text-gray-900 leading-tight">
              {notification.title}
            </h2>
            <p className="text-[12px] text-gray-500 mt-3">
              {new Date(notification.created_at).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })} |{" "}
              {new Date(notification.created_at).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <div className="h-px bg-[#E5E7EB] my-5" />
            <p className="text-[14px] text-gray-700 leading-7 whitespace-pre-wrap">
              {notification.message}
            </p>

            {/* Show button only if it's a Report Update with reference_id */}
            {notification.type === "Report Update" && notification.reference_id && (
              <button
                onClick={handleGoToReport}
                className="mt-6 w-full h-[48px] bg-[#0B5D2A] text-white rounded-xl font-bold text-[14px] shadow-md hover:bg-[#084A21] active:scale-[0.98] transition"
              >
                View Report Details
              </button>
            )}
          </div>
        </main>

        <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none">
          <div className="w-[70px] h-[5px] rounded-full bg-gray-800 opacity-70" />
        </div>
      </div>
    </div>
  );
}