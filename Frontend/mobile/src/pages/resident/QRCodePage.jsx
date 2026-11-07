import { useState, useEffect } from "react";
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

// ✅ QR public base — set at build time via VITE_QR_BASE_URL
const qrPublicBase = import.meta.env.VITE_QR_BASE_URL;
if (!qrPublicBase && !import.meta.env.DEV) {
  console.error("VITE_QR_BASE_URL is not set — QR codes will be broken in production.");
}

export default function QRCodePage() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [qrToken, setQrToken] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);       // seconds
  const [tokenExpiresAt, setTokenExpiresAt] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Fetch user + generate a fresh 10-minute token
  const fetchUserAndToken = async (silent = false) => {
    try {
      if (!silent) setRefreshing(true);

      // 1) Load profile
      const data = await apiFetch("/api/users/me");
      setUser(data);

      // Keep localStorage in sync so other pages see verified state immediately
      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem(
        "user",
        JSON.stringify({
          ...stored,
          is_verified: data.is_verified,
          verification_status: data.verification_status,
        })
      );

      // 2) Generate a fresh token (invalidates previous one server-side)
      const tokenData = await apiFetch("/api/public/generate-qr-token", {
        method: "POST",
      });
      const now = Date.now();
      const expiresAt = tokenData.expires_at || now + 10 * 60 * 1000;
      setQrToken(tokenData.token);
      setTokenExpiresAt(expiresAt);
      setTimeLeft(Math.max(0, Math.floor((expiresAt - now) / 1000)));

      if (!silent) setError("");
    } catch (err) {
      console.error("Error fetching user / QR token:", err);
      if (!silent) {
        setError("Failed to generate secure QR code. Please try again.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUserAndToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Countdown + auto-refresh when the token expires
  useEffect(() => {
    if (!tokenExpiresAt) return;

    const timer = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.floor((tokenExpiresAt - Date.now()) / 1000)
      );
      setTimeLeft(remaining);

      if (remaining === 0) {
        clearInterval(timer);
        fetchUserAndToken(true); // silently regenerate
      }
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenExpiresAt]);

  // If the tab was backgrounded and the token expired while away, refresh on return
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && tokenExpiresAt) {
        if (Date.now() >= tokenExpiresAt) {
          fetchUserAndToken(true);
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const statusIconColor = isVerified
    ? "text-[#0B5D2A]"
    : isRejected
    ? "text-red-500"
    : "text-yellow-500";

  // ✅ Token-based QR URL — encodes /verify-resident/<token>
  const qrImageUrl =
    qrToken && qrPublicBase
      ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
          `${qrPublicBase}/verify-resident/${qrToken}`
        )}`
      : "";

  const verifyUrl =
    qrToken && qrPublicBase ? `${qrPublicBase}/verify-resident/${qrToken}` : "";

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
    if (!verifyUrl) return;
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
      <div className="min-h-[100dvh] bg-[#E5E7EB] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <FaSpinner className="animate-spin text-[#0B5D2A]" size={40} />
          <p className="text-[#0B5D2A] font-bold">Generating secure QR...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div
        className="min-h-[100dvh] bg-[#E5E7EB] flex items-center justify-center"
        style={{ padding: "0 24px" }}
      >
        <div
          className="bg-white rounded-3xl border border-red-300 text-center max-w-sm w-full flex flex-col items-center"
          style={{ padding: "32px 24px", gap: "16px" }}
        >
          <p className="text-[15px] font-bold text-red-600 leading-6">
            {error || "Unable to load profile."}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="min-h-[44px] text-[#0B5D2A] font-bold underline"
            style={{ padding: "0 16px" }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#E5E7EB] flex justify-center items-center sm:py-6 sm:px-3">
      {/* Full screen on phones, phone frame only on sm and up */}
      <div className="relative w-full h-[100dvh] sm:w-[390px] sm:h-[844px] bg-[#F8FAF8] sm:rounded-[40px] sm:border-[5px] sm:border-white sm:shadow-2xl overflow-hidden flex flex-col">
        {/* HEADER */}
        <header
          className="relative h-[82px] bg-[#0B5D2A] flex items-center justify-center shrink-0"
          style={{ padding: "0 64px" }}
        >
          <button
            type="button"
            onClick={() => navigate("/profile")}
            aria-label="Back"
            className="absolute left-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center text-white text-[20px] bg-white/10 hover:bg-white/20 active:scale-95 transition"
          >
            <FaArrowLeft />
          </button>
          <h1 className="text-white text-[22px] font-extrabold text-center">
            My QR Code
          </h1>
          <button
            type="button"
            onClick={() => fetchUserAndToken()}
            disabled={refreshing}
            aria-label="Refresh status"
            className="absolute right-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center text-white text-[17px] bg-white/10 hover:bg-white/20 active:scale-95 transition disabled:opacity-50"
            title="Refresh status & QR"
          >
            {refreshing ? <FaSpinner className="animate-spin" /> : "⟳"}
          </button>
        </header>

        {/* CONTENT */}
        <main
          className="flex-1 overflow-y-auto no-scrollbar flex flex-col"
          style={{
            padding: "28px 24px max(48px, calc(env(safe-area-inset-bottom) + 32px))",
            gap: "24px",
          }}
        >
          {/* QR SECTION */}
          <div className="flex flex-col items-center" style={{ gap: "16px" }}>
            <div className="w-12 h-12 rounded-full bg-[#E5F5E9] text-[#0B5D2A] flex items-center justify-center shrink-0">
              <FaQrcode size={24} />
            </div>

            <div className="flex flex-col items-center text-center" style={{ gap: "8px" }}>
              <h2 className="text-[22px] font-extrabold text-gray-900 leading-tight">
                Resident QR Code
              </h2>
              <p className="text-[14px] text-gray-600 leading-6">
                This QR code dynamically updates for your security.
              </p>
            </div>

            <div
              className="bg-white rounded-2xl border border-gray-200 shadow-sm"
              style={{ padding: "20px" }}
            >
              {qrImageUrl && timeLeft > 0 ? (
                <img
                  src={qrImageUrl}
                  alt="Resident QR Code"
                  className="w-[200px] h-[200px]"
                />
              ) : qrPublicBase ? (
                <div className="w-[200px] h-[200px] flex flex-col items-center justify-center text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
                  <FaTimesCircle className="text-red-400 mb-2" size={32} />
                  <p className="text-[14px] font-bold text-gray-700">
                    QR Code Expired
                  </p>
                  <p className="text-[12px] text-gray-500 mt-1 px-4">
                    Please generate a new one.
                  </p>
                  <button
                    onClick={() => fetchUserAndToken()}
                    className="mt-3 bg-[#0B5D2A] text-white text-[12px] font-bold px-4 py-2 rounded-lg shadow"
                  >
                    Generate New
                  </button>
                </div>
              ) : (
                <div className="w-[200px] h-[200px] flex items-center justify-center text-gray-400 text-[13px] text-center px-4">
                  No QR available. Contact the barangay admin.
                </div>
              )}
            </div>

            {/* Resident ID pill */}
            <div
              className="bg-[#E5F5E9] rounded-full max-w-full"
              style={{ padding: "8px 20px" }}
            >
              <p className="text-[#0B5D2A] text-[14px] font-bold break-all text-center leading-6">
                {getResidentId()}
              </p>
            </div>

            {/* Countdown pill */}
            {qrImageUrl && timeLeft > 0 && (
              <div
                className="bg-[#0B5D2A] text-white text-[12px] font-bold rounded-full shadow-md flex items-center"
                style={{ padding: "6px 16px", gap: "6px" }}
              >
                <FaClock size={12} />
                Expires in {formatTimeLeft()}
              </div>
            )}
          </div>

          {/* RESIDENT INFORMATION */}
          <div className="flex flex-col" style={{ gap: "16px" }}>
            <h2 className="text-[22px] font-extrabold text-gray-900 leading-tight">
              Resident Information
            </h2>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <InfoRow label="Full Name" value={getFullName()} />
              <InfoRow label="Resident ID" value={getResidentId()} />
              <InfoRow label="Address" value={getAddress()} />

              {/* STATUS */}
              <div
                className="border-b border-gray-200 flex flex-col"
                style={{ padding: "20px", gap: "8px" }}
              >
                <p className="text-[13px] font-semibold text-gray-500 leading-5">
                  Status
                </p>
                <div className="flex items-center flex-wrap" style={{ gap: "10px" }}>
                  <StatusIcon className={`${statusIconColor} shrink-0`} size={16} />
                  <span
                    className={`rounded-full text-[13px] font-extrabold ${
                      statusClass === "verified"
                        ? "bg-green-100 text-green-700"
                        : statusClass === "rejected"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                    style={{ padding: "6px 14px" }}
                  >
                    {verificationStatus}
                  </span>
                </div>
                {isRejected && (
                  <p className="text-[13px] text-red-600 leading-6 break-words">
                    Your verification was rejected. Please visit the barangay
                    hall with a valid ID to re-verify.
                  </p>
                )}
                {!isVerified && !isRejected && (
                  <p className="text-[13px] text-yellow-700 leading-6 break-words">
                    Waiting for barangay admin to verify your account.
                  </p>
                )}
              </div>

              <InfoRow
                label="Date Registered"
                value={formatDate(user.registered_at)}
                last
              />
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex" style={{ gap: "16px" }}>
            <button
              type="button"
              onClick={handleDownload}
              disabled={!qrImageUrl || timeLeft <= 0}
              className="flex-1 min-h-[54px] border border-[#0B5D2A] text-[#0B5D2A] bg-white rounded-2xl font-extrabold text-[15px] flex justify-center items-center hover:bg-[#E5F5E9] active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ gap: "10px" }}
            >
              <FaDownload />
              Download
            </button>

            <button
              type="button"
              onClick={handleShare}
              disabled={!qrImageUrl || timeLeft <= 0}
              className="flex-1 min-h-[54px] bg-[#0B5D2A] text-white rounded-2xl font-extrabold text-[15px] flex justify-center items-center hover:bg-[#084A22] active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ gap: "10px" }}
            >
              <FaShareAlt />
              Share
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

function InfoRow({ label, value, last = false }) {
  return (
    <div
      className={`flex flex-col ${!last ? "border-b border-gray-200" : ""}`}
      style={{ padding: "20px", gap: "8px" }}
    >
      <p className="text-[13px] font-semibold text-gray-500 leading-5">
        {label}
      </p>
      <p className="text-[15px] font-extrabold text-gray-900 leading-6 break-words [overflow-wrap:anywhere]">
        {value}
      </p>
    </div>
  );
}