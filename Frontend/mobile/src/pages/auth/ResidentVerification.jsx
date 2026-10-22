import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaQrcode, FaCheckCircle, FaTimesCircle, FaClock } from "react-icons/fa";
import { apiFetch } from "../../api";

import background from "../../assets/images/background.png";
import ecoLogo from "../../assets/images/eco-logo.png";

export default function ResidentVerification() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const data = await apiFetch("/api/users/me");
        setMe(data);
      } catch (err) {
        console.error("Failed to load user:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMe();
  }, []);

  const getStatus = () => {
    if (!me) return "Pending Verification";
    if (me.verification_status) return me.verification_status;
    return me.is_verified ? "Verified Resident" : "Pending Verification";
  };

  const status = getStatus();
  const StatusIcon =
    status === "Verified Resident" ? FaCheckCircle
    : status === "Rejected" ? FaTimesCircle
    : FaClock;

  const statusClass =
    status === "Verified Resident" ? "verified"
    : status === "Rejected" ? "rejected"
    : "pending";

  return (
    <div className="min-h-screen bg-[#E5E7EB] flex items-center justify-center p-4">
      <div className="relative w-[390px] h-[780px] overflow-hidden rounded-[32px] shadow-2xl bg-white">
        <img src={background} alt="" className="absolute inset-0 w-full h-full object-cover object-center" />
        <div className="absolute inset-0 bg-white/20" />

        <button
          onClick={() => navigate("/resident-dashboard")}
          className="absolute top-6 left-5 z-20 w-10 h-10 rounded-full bg-white/80 flex items-center justify-center text-[#0B5D2A] text-xl shadow-sm"
        >
          <FaArrowLeft />
        </button>

        <main className="relative z-10 h-full overflow-y-auto px-6 pt-12 pb-8 no-scrollbar">
          <div className="flex justify-center items-center gap-2">
            <img src={ecoLogo} alt="EcoReport" className="w-9 h-9 object-contain" />
            <h1 className="text-[23px] font-extrabold text-[#0B5D2A]">EcoReport</h1>
          </div>

          <h2 className="text-center text-[22px] font-bold text-[#075B2A] mt-10">
            My Verification
          </h2>
          <p className="text-center text-sm text-gray-600 mt-3">
            Show your QR code to a barangay official for verification.
          </p>

          {loading ? (
            <p className="text-center text-gray-500 mt-10 text-sm">Loading...</p>
          ) : (
            <>
              {/* Status card */}
              <div className={`mt-8 rounded-2xl p-5 text-center border-2
                ${statusClass === "verified" ? "bg-[#EFFAF2] border-[#A9C9A1]" : ""}
                ${statusClass === "pending"  ? "bg-[#FFF8D8] border-[#D6C66A]" : ""}
                ${statusClass === "rejected" ? "bg-[#FDECEC] border-[#e5b5b5]" : ""}
              `}>
                <div className="flex justify-center mb-3">
                  <StatusIcon
                    size={44}
                    className={
                      statusClass === "verified" ? "text-[#1c5e30]"
                      : statusClass === "rejected" ? "text-red-600"
                      : "text-[#856400]"
                    }
                  />
                </div>
                <p className="text-[16px] font-extrabold
                  ${statusClass === 'verified' ? 'text-[#1c5e30]' : ''}
                ">
                  {status}
                </p>
                {me?.resident_id && (
                  <p className="text-[12px] text-gray-500 mt-2 font-mono">
                    {me.resident_id}
                  </p>
                )}
              </div>

              {/* Instructions */}
              <div className="mt-6 bg-white/95 border border-[#A8C99A] rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[#E5F5E9] flex items-center justify-center">
                    <FaQrcode className="text-[#0B5D2A]" size={18} />
                  </div>
                  <p className="text-[14px] font-extrabold text-[#075B2A]">
                    How to verify
                  </p>
                </div>
                <ul className="text-[12px] text-gray-600 leading-6 space-y-1 ml-1">
                  <li>1. Open your QR code from Profile → QR Code.</li>
                  <li>2. Show it to a barangay official.</li>
                  <li>3. They scan it - your info appears instantly.</li>
                </ul>
              </div>

              <button
                onClick={() => navigate("/qr-code")}
                className="w-full h-[54px] mt-6 bg-[#0B5D2A] text-white rounded-2xl font-extrabold text-[14px] shadow-md hover:bg-[#084A21] active:scale-[0.98] transition"
              >
                View My QR Code
              </button>
            </>
          )}

          <div className="h-8" />
        </main>
      </div>
    </div>
  );
}