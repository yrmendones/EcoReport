import { FaTools } from "react-icons/fa";

const ADMIN_APP_URL =
  import.meta.env.VITE_ADMIN_APP_URL || "http://localhost:5174";

export default function MaintenanceScreen({ message }) {
  return (
    <div className="min-h-[100dvh] bg-[#E5E7EB] flex justify-center items-center sm:py-6 sm:px-3">
      <div className="relative w-full h-[100dvh] sm:w-[390px] sm:h-[844px] bg-[#F8FAF8] sm:rounded-[40px] sm:border-[5px] sm:border-white sm:shadow-2xl overflow-hidden flex flex-col">
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="bg-white rounded-2xl border border-yellow-300 shadow-md max-w-sm w-full flex flex-col items-center text-center p-8 gap-4">
            <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center">
              <FaTools size={28} className="text-yellow-600" />
            </div>
            <h1 className="text-[20px] font-extrabold text-gray-900">
              Under Maintenance
            </h1>
            <p className="text-[14px] text-gray-600 leading-6">
              {message || "The app is under maintenance. Please try again later."}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-2 w-full min-h-[48px] rounded-xl bg-[#0B5D2A] text-white font-extrabold text-[14px] active:scale-[0.98] transition"
            >
              Try Again
            </button>
            <a
              href={`${ADMIN_APP_URL}/admin-login`}
              className="w-full min-h-[44px] rounded-xl border border-[#0B5D2A] text-[#0B5D2A] font-bold text-[13px] flex items-center justify-center"
            >
              Staff Login
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}