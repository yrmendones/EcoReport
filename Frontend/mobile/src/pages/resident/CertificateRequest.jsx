import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaFileAlt,
  FaCheckCircle,
  FaSpinner,
  FaExclamationTriangle,
} from "react-icons/fa";
import { apiFetch } from "../../api";

/* ---------- Shared layout pieces ---------- */

// Full screen on phones, phone frame only on sm and up
function PhoneFrame({ children }) {
  return (
    <div className="min-h-[100dvh] bg-[#E5E7EB] flex justify-center items-center sm:py-6 sm:px-3">
      <div className="relative w-full h-[100dvh] sm:w-[390px] sm:h-[844px] bg-[#F8FAF8] sm:rounded-[40px] sm:border-[5px] sm:border-white sm:shadow-2xl overflow-hidden flex flex-col">
        {children}

        {/* Fake home bar, desktop frame only */}
        <div className="hidden sm:flex absolute bottom-3 left-0 right-0 justify-center pointer-events-none z-30">
          <div className="w-[70px] h-[5px] rounded-full bg-gray-800 opacity-70" />
        </div>
      </div>
    </div>
  );
}

function PageHeader({ title, onBack }) {
  return (
    <header className="relative h-[82px] bg-[#0B5D2A] flex items-center justify-center shrink-0 px-6">
      <button
        type="button"
        onClick={onBack}
        aria-label="Back"
        className="absolute left-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center text-white text-[20px] bg-white/10 hover:bg-white/20 active:scale-95 transition"
      >
        <FaArrowLeft />
      </button>
      <h1 className="text-white text-[20px] font-extrabold">{title}</h1>
    </header>
  );
}

export default function CertificateRequest() {
  const navigate = useNavigate();

  const [verificationLoading, setVerificationLoading] = useState(true);
  const [userStatus, setUserStatus] = useState({
    is_verified: 0,
    verification_status: "Pending Verification",
  });

  const [certificate, setCertificate] = useState("");
  const [purpose, setPurpose] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Check verification status on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await apiFetch("/api/users/me");
        setUserStatus({
          is_verified: data.is_verified || 0,
          verification_status: data.verification_status || "Pending Verification",
        });
      } catch (err) {
        console.error("Failed to load verification status:", err);
      } finally {
        setVerificationLoading(false);
      }
    };
    fetchUser();
  }, []);

  const isVerified =
    userStatus.is_verified === 1 &&
    userStatus.verification_status === "Verified Resident";

  const handleSubmit = async () => {
    if (!certificate || !purpose || !date) {
      alert("Please complete all required fields.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (!user || !user.user_id) {
        alert("You must be logged in to request a certificate.");
        navigate("/resident-login");
        return;
      }

      await apiFetch("/api/certificates", {
        method: "POST",
        body: JSON.stringify({
          user_id: user.user_id,
          certificate_type: certificate,
          purpose: purpose,
          preferred_release_date: date,
          notes: notes || null,
        }),
      });

      setSuccess(true);
      setCertificate("");
      setPurpose("");
      setDate("");
      setNotes("");

      setTimeout(() => {
        navigate("/resident-dashboard");
      }, 2000);
    } catch (err) {
      console.error("Error submitting certificate request:", err);
      setError(err.message || "Failed to submit request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fieldClass =
    "block w-full min-w-0 h-[52px] border border-[#C8DCC3] rounded-xl text-[16px] text-gray-700 bg-white outline-none focus:border-[#0B5D2A] focus:ring-2 focus:ring-[#0B5D2A]/10";
  const fieldStyle = { padding: "0 16px", boxSizing: "border-box" };
  const labelClass = "block text-[14px] font-bold text-gray-800";

  // Loading state
  if (verificationLoading) {
    return (
      <div className="min-h-[100dvh] bg-[#E5E7EB] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <FaSpinner className="animate-spin text-[#0B5D2A]" size={40} />
          <p className="text-[#0B5D2A] font-bold">Checking account status...</p>
        </div>
      </div>
    );
  }

  // Block pending / rejected residents
  if (!isVerified) {
    return (
      <PhoneFrame>
        <PageHeader
          title="Certificate Request"
          onBack={() => navigate("/resident-dashboard")}
        />

        <main
          className="flex-1 overflow-y-auto no-scrollbar flex flex-col items-center justify-center gap-6 text-center"
          style={{ padding: "24px 32px" }}
        >
          <div className="w-[90px] h-[90px] rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
            <FaExclamationTriangle size={40} className="text-yellow-600" />
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-[20px] font-extrabold text-gray-900">
              Verification Required
            </h2>

            <p className="text-[13px] text-gray-600 leading-6">
              Your account is still pending verification. Please wait for the
              barangay to verify your account before requesting certificates.
            </p>
          </div>

          <div className="w-full flex flex-col gap-3">
            <button
              onClick={() => navigate("/qr-code")}
              className="w-full h-[52px] bg-[#0B5D2A] text-white rounded-2xl font-extrabold text-[14px] shadow-md hover:bg-[#084A21] active:scale-[0.98] transition"
            >
              View My QR Code
            </button>

            <button
              onClick={() => navigate("/resident-dashboard")}
              className="w-full h-[52px] border border-[#0B5D2A] text-[#0B5D2A] rounded-2xl font-extrabold text-[14px] hover:bg-[#F0F8ED] active:scale-[0.98] transition"
            >
              Back to Dashboard
            </button>
          </div>
        </main>
      </PhoneFrame>
    );
  }

  // Normal form
  return (
    <PhoneFrame>
      <PageHeader
        title="Certificate Request"
        onBack={() => navigate("/resident-dashboard")}
      />

      <main
        className="flex-1 overflow-y-auto no-scrollbar"
        style={{ padding: "24px 20px 40px" }}
      >
        <div
          className="bg-white rounded-2xl border border-[#D5E4D1] shadow-sm flex flex-col gap-5"
          style={{ padding: "24px 20px", boxSizing: "border-box" }}
        >
          {/* ICON + TITLE */}
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-[78px] h-[78px] rounded-full bg-[#E8F5E3] flex items-center justify-center">
              <FaFileAlt size={42} className="text-[#0B5D2A]" />
            </div>

            <div className="flex flex-col gap-2">
              <h2 className="text-[21px] font-extrabold text-[#0B5D2A]">
                Request Certificate
              </h2>
              <p className="text-[12px] text-gray-500 leading-5">
                Fill out the form below to request a certificate.
              </p>
            </div>
          </div>

          {/* MESSAGES */}
          {success && (
            <div className="p-4 bg-green-100 border border-green-400 rounded-xl flex items-center gap-3 text-green-700 text-sm">
              <FaCheckCircle size={20} className="shrink-0" />
              <span>Certificate request submitted successfully!</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-100 border border-red-400 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* CERTIFICATE TYPE */}
          <div className="flex flex-col gap-2">
            <label htmlFor="certificate" className={labelClass}>
              Certificate Type
            </label>
            <select
              id="certificate"
              value={certificate}
              onChange={(e) => setCertificate(e.target.value)}
              className={fieldClass}
              style={fieldStyle}
              disabled={loading}
            >
              <option value="">Select Certificate</option>
              <option>Barangay Clearance</option>
              <option>Certificate of Residency</option>
              <option>Certificate of Indigency</option>
              <option>Business Clearance</option>
            </select>
          </div>

          {/* PURPOSE */}
          <div className="flex flex-col gap-2">
            <label htmlFor="purpose" className={labelClass}>
              Purpose
            </label>
            <input
              id="purpose"
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Enter purpose"
              className={fieldClass}
              style={fieldStyle}
              disabled={loading}
            />
          </div>

          {/* RELEASE DATE */}
          <div className="flex flex-col gap-2">
            <label htmlFor="release-date" className={labelClass}>
              Preferred Release Date
            </label>
            <input
              id="release-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={fieldClass}
              style={fieldStyle}
              disabled={loading}
              min={new Date().toISOString().split("T")[0]}
            />
          </div>

          {/* NOTES */}
          <div className="flex flex-col gap-2">
            <label htmlFor="notes" className={labelClass}>
              Additional Notes
            </label>
            <textarea
              id="notes"
              rows="4"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional..."
              className="block w-full border border-[#C8DCC3] rounded-xl text-[16px] text-gray-700 resize-none outline-none focus:border-[#0B5D2A] focus:ring-2 focus:ring-[#0B5D2A]/10"
              style={{ padding: "14px 16px", boxSizing: "border-box" }}
              disabled={loading}
            />
          </div>

          {/* SUBMIT */}
          <div className="flex flex-col gap-4 pt-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || success}
              className="w-full h-[54px] rounded-2xl bg-[#0B5D2A] text-white font-extrabold text-[15px] flex items-center justify-center shadow-md hover:bg-[#084A21] active:scale-[0.98] transition disabled:opacity-50"
            >
              {loading ? "Submitting..." : "Submit Request"}
            </button>

            {success && (
              <p className="text-center text-sm text-green-600">
                Redirecting to dashboard...
              </p>
            )}
          </div>
        </div>
      </main>
    </PhoneFrame>
  );
}