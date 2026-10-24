import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaDownload,
  FaShareAlt,
  FaQrcode,
  FaCheckCircle,
  FaSpinner,
  FaClock,
  FaTimesCircle,
  FaSyncAlt,
} from "react-icons/fa";
import { apiFetch } from "../../api";

const formatDate = (d) => {
  if (!d) return "N/A";
  const str = String(d).split("T")[0].split(" ")[0];
  const [y, m, day] = str.split("-");
  if (!y || !m || !day) return "N/A";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parseInt(m, 10) - 1]} ${parseInt(day, 10)}, ${y}`;
};

const isNoMiddleName = (mid) => {
  if (!mid) return true;
  const n = String(mid).trim().toUpperCase();
  return n === "" || n === "N/A" || n === "NA" || n === "NONE" || n === "-";
};

export default function QRCodePage() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [qrToken, setQrToken] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0); // in seconds
  const [tokenExpiresAt, setTokenExpiresAt] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const fetchUserAndToken = async (silent = false) => {
    try {
      if (!silent) setRefreshing(true);
      
      // Fetch user info
      const data = await apiFetch("/api/users/me");
      setUser(data);
      
      // Keep localStorage user in sync
      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem(
        "user",
        JSON.stringify({
          ...stored,
          is_verified: data.is_verified,
          verification_status: data.verification_status,
        })
      );

      // Fetch secure token
      const tokenData = await apiFetch("/api/public/generate-qr-token", {
        method: "POST"
      });
      
      setQrToken(tokenData.token);
      setTimeLeft(600); // 10 minutes
      setTokenExpiresAt(Date.now() + 10 * 60 * 1000); // Save exact expiration time

    } catch (err) {
      console.error("Error fetching user/token:", err);
      if (!silent) setError("Failed to generate secure QR code. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUserAndToken();
  }, []);

  // Countdown timer + Auto-Refresh
  useEffect(() => {
    if (!tokenExpiresAt) return;

    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.floor((tokenExpiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining === 0) {
        clearInterval(timer);
        // silently auto-refresh
        fetchUserAndToken(true);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [tokenExpiresAt]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && tokenExpiresAt) {
        if (Date.now() >= tokenExpiresAt) {
          // Token expired while app was in background
          fetchUserAndToken(true);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [tokenExpiresAt]);

  const formatTimeLeft = () => {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const getFullName = () => {
    if (!user) return "N/A";
    const first = user.first_name || "";
    const mid = user.middle_name || "";
    const last = user.last_name || "";
    if (isNoMiddleName(mid)) return `${first} ${last}`.replace(/\s+/g, " ").trim() || "Resident";
    return `${first} ${mid} ${last}`.replace(/\s+/g, " ").trim() || "Resident";
  };

  const getResidentId = () => user?.resident_id || "N/A";
  const getAddress = () => user?.address || "P. Sto. Rosario Kanluran, Pateros";

  const getVerificationStatus = () => {
    if (!user) return "Pending Verification";
    if (user.verification_status) return user.verification_status;
    return user.is_verified ? "Verified Resident" : "Pending Verification";
  };

  const verificationStatus = getVerificationStatus();
  const isVerified = verificationStatus === "Verified Resident";
  const isRejected = verificationStatus === "Rejected";

  const statusClass = isVerified ? "verified" : isRejected ? "rejected" : "pending";
  const StatusIcon = isVerified ? FaCheckCircle : isRejected ? FaTimesCircle : FaClock;
  const statusIconColor = isVerified ? "text-[#0B5D2A]" : isRejected ? "text-red-500" : "text-yellow-500";

  // Use the environment variable for the QR base URL
const qrPublicBase = import.meta.env.VITE_QR_BASE_URL;

// Fallback for local development if env var is missing
if (!qrPublicBase) {
  console.warn("⚠️ VITE_QR_BASE_URL is not set. Using localhost fallback.");
}
  
  // Construct the secure URL using the token
  const qrImageUrl = qrToken
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
        `${qrPublicBase}/verify-resident/${qrToken}`
      )}`
    : "";

  const handleDownload = async () => {
    if (!qrImageUrl) return;
    try {
      const response = await fetch(qrImageUrl);
      if (!response.ok) throw new Error("Failed to fetch QR image.");
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `EcoReport-QR-${getResidentId()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (err) {
      console.error("QR download failed:", err);
      alert("Failed to download QR code. Please try again.");
    }
  };

  const handleShare = async () => {
    if (!qrToken) return;
    const verifyUrl = `${qrPublicBase}/verify-resident/${qrToken}`;
    const shareData = {
      title: "My EcoReport QR Code",
      text: `Verify my resident profile: ${verifyUrl}`,
      url: verifyUrl,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(verifyUrl);
        alert(`Secure link copied! (Expires in ${formatTimeLeft()})`);
      }
    } catch (err) {
      console.error("Share failed:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#E5E7EB] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <FaSpinner className="animate-spin text-[#0B5D2A]" size={40} />
          <p className="text-[#0B5D2A] font-bold">Generating secure QR...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-[#E5E7EB] flex items-center justify-center px-6">
        <div className="bg-white rounded-3xl border border-red-300 p-8 text-center max-w-sm w-full">
          <p className="text-[15px] font-bold text-red-600">{error || "Unable to load profile."}</p>
          <button onClick={() => window.location.reload()} className="mt-4 text-[#0B5D2A] font-bold underline">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E5E7EB] flex justify-center items-center py-6">
      <div className="relative w-[390px] h-[840px] bg-[#F8FAF8] rounded-[38px] shadow-2xl overflow-hidden flex flex-col">
        {/* HEADER */}
        <header className="h-[76px] bg-[#0B5D2A] rounded-t-[35px] flex items-center justify-center relative shrink-0">
          <button onClick={() => navigate("/profile")} className="absolute left-5 w-[43px] h-[43px] rounded-full bg-white/10 flex items-center justify-center text-white text-[21px] hover:bg-white/20 transition">
            <FaArrowLeft />
          </button>
          <h1 className="text-white text-[21px] font-bold">My QR Code</h1>
          <button onClick={() => fetchUserAndToken(false)} disabled={refreshing} className="absolute right-5 w-[43px] h-[43px] rounded-full bg-white/10 flex items-center justify-center text-white text-[17px] hover:bg-white/20 transition disabled:opacity-50" title="Refresh status & QR">
            {refreshing ? <FaSpinner className="animate-spin" /> : <FaSyncAlt />}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto px-5 pt-8 pb-6 no-scrollbar">
          {/* QR SECTION */}
          <div className="flex flex-col items-center">
            <div className="w-[48px] h-[48px] rounded-full bg-[#E5F5E9] text-[#0B5D2A] flex items-center justify-center mb-3">
              <FaQrcode size={24} />
            </div>

            <h2 className="text-[20px] font-bold text-gray-800">Resident QR Code</h2>
            <p className="text-[12px] text-gray-500 mt-2 text-center">
              This QR code dynamically updates for your security.
            </p>

            {/* TIMER / QR CONTAINER */}
            <div className="mt-6 bg-white p-4 rounded-[20px] border border-gray-200 shadow-sm relative">
              {timeLeft > 0 && qrImageUrl ? (
                <img src={qrImageUrl} alt="Resident QR Code" className="w-[200px] h-[200px]" />
              ) : (
                <div className="w-[200px] h-[200px] flex flex-col items-center justify-center text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
                  <FaTimesCircle className="text-red-400 mb-2" size={32} />
                  <p className="text-[14px] font-bold text-gray-700">QR Code Expired</p>
                  <p className="text-[11px] text-gray-500 mt-1 px-4">Please generate a new one.</p>
                  <button onClick={() => fetchUserAndToken(false)} className="mt-3 bg-[#0B5D2A] text-white text-[12px] font-bold px-4 py-2 rounded-lg shadow">
                    Generate New
                  </button>
                </div>
              )}
            </div>

            <div className="mt-5 px-5 py-2 bg-[#E5F5E9] rounded-full">
              <p className="text-[#0B5D2A] text-[13px] font-bold">{getResidentId()}</p>
            </div>

            {/* TIMER BELOW RESIDENT ID */}
            {timeLeft > 0 && qrImageUrl && (
              <div className="mt-3 bg-[#0B5D2A] text-white text-[12px] font-bold px-4 py-1.5 rounded-full shadow-md flex items-center gap-1.5">
                <FaClock size={12} />
                Expires in {formatTimeLeft()}
              </div>
            )}
          </div>

          <div className="h-7" />

          {/* RESIDENT INFORMATION */}
          <div>
            <h2 className="text-[18px] font-bold text-gray-800 mb-4">Resident Information</h2>

            <div className="bg-white rounded-[22px] border border-gray-200 shadow-sm overflow-hidden">
              <InfoRow label="Full Name" value={getFullName()} />
              <InfoRow label="Resident ID" value={getResidentId()} />
              <InfoRow label="Address" value={getAddress()} />

              {/* STATUS */}
              <div className="px-5 py-5 border-b border-gray-200">
                <p className="text-[12px] text-gray-500 mb-2">Status</p>
                <div className="flex items-center gap-2">
                  <StatusIcon className={statusIconColor} size={16} />
                  <span className={`px-3 py-1 rounded-full text-[12px] font-semibold ${statusClass === "verified" ? "bg-green-100 text-green-700" : ""} ${statusClass === "rejected" ? "bg-red-100 text-red-700" : ""} ${statusClass === "pending" ? "bg-yellow-100 text-yellow-700" : ""}`}>
                    {verificationStatus}
                  </span>
                </div>
              </div>

              <InfoRow label="Date Registered" value={formatDate(user.registered_at)} last />
            </div>
          </div>

          <div className="h-6" />

          {/* ACTION BUTTONS */}
          <div className="flex gap-4">
            <button onClick={handleDownload} disabled={!qrImageUrl || timeLeft <= 0} className="flex-1 h-[52px] border border-[#0B5D2A] text-[#0B5D2A] bg-white rounded-[15px] font-bold flex justify-center items-center gap-2 hover:bg-[#E5F5E9] active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed">
              <FaDownload /> Download
            </button>

            <button onClick={handleShare} disabled={!qrImageUrl || timeLeft <= 0} className="flex-1 h-[52px] bg-[#0B5D2A] text-white rounded-[15px] font-bold flex justify-center items-center gap-2 hover:bg-[#084A22] active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed">
              <FaShareAlt /> Share
            </button>
          </div>

          <div className="h-8" />
        </main>

        <div className="absolute bottom-[8px] left-0 right-0 flex justify-center pointer-events-none z-50">
          <div className="w-[60px] h-[5px] rounded-full bg-gray-700 opacity-80" />
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, last = false }) {
  return (
    <div className={`px-5 py-5 ${!last ? "border-b border-gray-200" : ""}`}>
      <p className="text-[12px] text-gray-500 mb-2">{label}</p>
      <p className="text-[14px] font-bold text-gray-800 leading-[20px] break-words">{value}</p>
    </div>
  );
}