import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaEnvelope,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaSpinner,
  FaCheckCircle,
  FaShieldAlt,
} from "react-icons/fa";
import { apiFetch } from "../../api";

const CODE_LENGTH = 6;

function PhoneFrame({ children, header }) {
  return (
    <div className="min-h-screen bg-[#E5E7EB] flex justify-center items-center py-6 px-3">
      <div className="relative w-[390px] h-[844px] bg-[#F8FAF8] rounded-[40px] border-[5px] border-white shadow-2xl overflow-hidden flex flex-col">
        {header}
        {children}
        <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none">
          <div className="w-[70px] h-[5px] rounded-full bg-gray-800 opacity-70" />
        </div>
      </div>
    </div>
  );
}

function Header({ title, onBack }) {
  return (
    <header className="h-[76px] bg-[#0B5D2A] rounded-t-[35px] flex items-center justify-center relative shrink-0">
      <button
        type="button"
        onClick={onBack}
        className="absolute left-5 w-[43px] h-[43px] rounded-full bg-white/10 flex items-center justify-center text-white text-[21px] hover:bg-white/20 transition"
        aria-label="Back"
      >
        <FaArrowLeft />
      </button>
      <h1 className="text-white text-[21px] font-bold">{title}</h1>
    </header>
  );
}

export default function ForgotPassword() {
  const navigate = useNavigate();

  // "email" | "verify" | "reset" | "success"
  const [step, setStep] = useState("email");

  const [email, setEmail] = useState("");
  const [code, setCode] = useState(Array(CODE_LENGTH).fill(""));
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [resendStatus, setResendStatus] = useState("");

  const inputRefs = useRef([]);

  useEffect(() => {
    if (step === "verify") {
      setTimeout(() => inputRefs.current[0]?.focus(), 120);
    }
  }, [step]);

  // ─── Send code ───
  const handleSendCode = async (e) => {
    if (e) e.preventDefault();
    setError("");
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    setLoading(true);
    try {
      await apiFetch("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      setCode(Array(CODE_LENGTH).fill(""));
      setResendStatus("");
      setStep("verify");
    } catch (err) {
      setError(err.message || "Failed to send code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Resend ───
  const handleResend = async () => {
    setResendStatus("");
    setError("");
    setResending(true);
    try {
      await apiFetch("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      setCode(Array(CODE_LENGTH).fill(""));
      setResendStatus("A new code has been sent to your email.");
      setTimeout(() => inputRefs.current[0]?.focus(), 120);
    } catch (err) {
      setError(err.message || "Failed to resend. Try again.");
    } finally {
      setResending(false);
    }
  };

  // ─── Code input handlers ───
  const handleCodeChange = (index, value) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...code];
    next[index] = digit;
    setCode(next);
    setError("");
    if (digit && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyDown = (index, e) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowRight" && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, CODE_LENGTH);
    if (pasted.length > 0) {
      const next = Array(CODE_LENGTH).fill("");
      pasted.split("").forEach((d, i) => (next[i] = d));
      setCode(next);
      const focusIndex = Math.min(pasted.length, CODE_LENGTH - 1);
      setTimeout(() => inputRefs.current[focusIndex]?.focus(), 20);
    }
  };

  // ─── Verify code ───
  const handleVerifyCode = async () => {
    const codeStr = code.join("");
    if (codeStr.length !== CODE_LENGTH) {
      setError("Please enter the full 6-digit code.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/api/auth/verify-reset-code", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), code: codeStr }),
      });
      if (data.valid) {
        setError("");
        setStep("reset");
      } else {
        setError("Invalid or expired code. Please try again.");
      }
    } catch (err) {
      setError(err.message || "Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Reset password ───
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    if (!newPassword || !confirmPassword) {
      setError("Please fill in both fields.");
      return;
    }
    if (newPassword.length < 8 || newPassword.length > 16) {
      setError("Password must be between 8 and 16 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await apiFetch("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          code: code.join(""),
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });
      setStep("success");
    } catch (err) {
      setError(err.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  // ══════════════════════════════════════════════════════════
  // SUCCESS
  // ══════════════════════════════════════════════════════════
  if (step === "success") {
    return (
      <PhoneFrame>
        <main className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div className="w-[100px] h-[100px] rounded-full bg-[#E5F5E9] flex items-center justify-center">
            <FaCheckCircle size={64} className="text-[#0B5D2A]" />
          </div>
          <h2 className="text-[26px] font-extrabold text-[#0B5D2A] mt-8 leading-tight">
            Password Reset
          </h2>
          <p className="text-[13px] text-gray-600 mt-4 leading-6 max-w-[280px]">
            Your password has been successfully reset.
            <br />
            Click below to log in.
          </p>
          <button
            type="button"
            onClick={() => navigate("/resident-login")}
            className="w-full h-[54px] mt-12 rounded-2xl bg-[#0B5D2A] text-white font-extrabold text-[14px] flex items-center justify-center shadow-md hover:bg-[#084A21] active:scale-[0.98] transition"
          >
            Continue
          </button>
        </main>
      </PhoneFrame>
    );
  }

  // ══════════════════════════════════════════════════════════
  // EMAIL
  // ══════════════════════════════════════════════════════════
  if (step === "email") {
    return (
      <PhoneFrame
        header={
          <Header
            title="Forgot Password"
            onBack={() => navigate("/resident-login")}
          />
        }
      >
        <main className="flex-1 overflow-y-auto px-7 pt-12 pb-8 no-scrollbar">
          <div className="flex flex-col items-center">
            <div className="w-[88px] h-[88px] rounded-full bg-[#E5F5E9] flex items-center justify-center">
              <FaEnvelope size={36} className="text-[#0B5D2A]" />
            </div>
            <h2 className="text-[22px] font-extrabold text-gray-900 mt-6 text-center leading-tight">
              Enter Email Address
            </h2>
            <p className="text-[13px] text-gray-500 mt-3 text-center leading-6 max-w-[300px]">
              Enter your email address and we'll send you a 6-digit verification
              code to reset your password.
            </p>
          </div>

          <form onSubmit={handleSendCode} className="mt-10">
            <label className="block text-[13px] font-bold text-[#0B5D2A] mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full h-[52px] px-4 rounded-xl border border-[#A8C99A] bg-white text-[13px] text-gray-700 outline-none focus:ring-2 focus:ring-[#0B5D2A]/20"
              required
            />

            {error && (
              <div className="mt-4 p-3 bg-red-100 border border-red-400 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="h-[44px]" />

            <button
              type="submit"
              disabled={loading}
              className="w-full h-[54px] rounded-2xl bg-[#0B5D2A] text-white font-extrabold text-[14px] flex items-center justify-center gap-2 shadow-md hover:bg-[#084A21] active:scale-[0.98] transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <FaSpinner className="animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Verification Code"
              )}
            </button>
          </form>
        </main>
      </PhoneFrame>
    );
  }

  // ══════════════════════════════════════════════════════════
  // VERIFY (6-digit code)
  // ══════════════════════════════════════════════════════════
  if (step === "verify") {
    return (
      <PhoneFrame
        header={<Header title="Verification" onBack={() => setStep("email")} />}
      >
        <main className="flex-1 overflow-y-auto px-6 pt-10 pb-8 no-scrollbar">
          <div className="flex justify-center">
            <div className="w-[84px] h-[84px] rounded-full bg-[#E5F5E9] flex items-center justify-center">
              <FaShieldAlt size={36} className="text-[#0B5D2A]" />
            </div>
          </div>

          <div className="text-center mt-8">
            <h2 className="text-[26px] font-extrabold text-[#0B5D2A] leading-tight">
              Enter Verification Code
            </h2>
            <p className="text-[13px] text-gray-500 mt-5 leading-6 px-4">
              We sent a 6-digit code to
            </p>
            <p className="text-[14px] font-bold text-[#0B5D2A] mt-1 break-all px-4">
              {email}
            </p>
          </div>

          <div className="h-[48px]" />

          <div className="flex justify-center gap-2.5">
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleCodeChange(index, e.target.value)}
                onKeyDown={(e) => handleCodeKeyDown(index, e)}
                onPaste={handleCodePaste}
                className="
                  w-[46px] h-[58px]
                  text-center
                  text-[26px]
                  font-extrabold
                  text-[#0B5D2A]
                  bg-white
                  border-2
                  border-[#A8C99A]
                  rounded-2xl
                  outline-none
                  transition-all
                  focus:border-[#0B5D2A]
                  focus:ring-4
                  focus:ring-[#0B5D2A]/10
                "
                style={{ caretColor: "transparent" }}
              />
            ))}
          </div>

          {error && (
            <div className="mt-6 p-3 bg-red-100 border border-red-400 rounded-lg text-red-700 text-[12px] text-center">
              {error}
            </div>
          )}

          {resendStatus && !error && (
            <div className="mt-6 p-3 bg-[#EFFAF2] border border-[#BFE3C8] rounded-lg text-[#0B5D2A] text-[12px] text-center flex items-center justify-center gap-2">
              <FaCheckCircle size={12} />
              {resendStatus}
            </div>
          )}

          <div className="h-[40px]" />

          <button
            type="button"
            onClick={handleVerifyCode}
            disabled={loading || code.join("").length !== CODE_LENGTH}
            className="
              w-full
              h-[54px]
              rounded-2xl
              bg-[#0B5D2A]
              text-white
              font-extrabold
              text-[15px]
              flex
              items-center
              justify-center
              gap-2
              shadow-md
              hover:bg-[#084A21]
              active:scale-[0.98]
              transition
              disabled:opacity-50
              disabled:cursor-not-allowed
            "
          >
            {loading ? (
              <>
                <FaSpinner className="animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify"
            )}
          </button>

          <div className="h-[36px]" />

          <div className="text-center">
            <p className="text-[13px] text-gray-600 leading-6">
              Didn't receive a code?{" "}
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="font-extrabold text-[#0B5D2A] hover:underline disabled:opacity-50"
              >
                {resending ? "Sending..." : "Click to resend"}
              </button>
            </p>
          </div>

          <div className="h-8" />
        </main>
      </PhoneFrame>
    );
  }

  // ══════════════════════════════════════════════════════════
  // RESET PASSWORD
  // ══════════════════════════════════════════════════════════
  if (step === "reset") {
    return (
      <PhoneFrame
        header={
          <Header title="Set New Password" onBack={() => setStep("verify")} />
        }
      >
        <main className="flex-1 overflow-y-auto px-7 pt-12 pb-8 no-scrollbar">
          <div className="flex flex-col items-center">
            <div className="w-[88px] h-[88px] rounded-full bg-[#E5F5E9] flex items-center justify-center">
              <FaLock size={34} className="text-[#0B5D2A]" />
            </div>
            <h2 className="text-[22px] font-extrabold text-gray-900 mt-6 text-center leading-tight">
              Set a New Password
            </h2>
            <p className="text-[13px] text-gray-500 mt-3 text-center leading-6 max-w-[300px]">
              Choose a strong password. You'll use this to log in to EcoReport.
            </p>
          </div>

          <form onSubmit={handleResetPassword} className="mt-10">
            <div className="mb-5">
              <label className="block text-[13px] font-bold text-[#0B5D2A] mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (8-16 characters)"
                  maxLength={16}
                  className="w-full h-[52px] px-4 pr-12 rounded-xl border border-[#A8C99A] bg-white text-[13px] text-gray-700 outline-none focus:ring-2 focus:ring-[#0B5D2A]/20"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#0B5D2A] text-[17px]"
                  aria-label={showNew ? "Hide password" : "Show password"}
                >
                  {showNew ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-bold text-[#0B5D2A] mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  maxLength={16}
                  className="w-full h-[52px] px-4 pr-12 rounded-xl border border-[#A8C99A] bg-white text-[13px] text-gray-700 outline-none focus:ring-2 focus:ring-[#0B5D2A]/20"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#0B5D2A] text-[17px]"
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-100 border border-red-400 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-[54px] mt-8 rounded-2xl bg-[#0B5D2A] text-white font-extrabold text-[14px] flex items-center justify-center gap-2 shadow-md hover:bg-[#084A21] active:scale-[0.98] transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <FaSpinner className="animate-spin" />
                  Resetting...
                </>
              ) : (
                "Reset Password"
              )}
            </button>
          </form>
        </main>
      </PhoneFrame>
    );
  }

  return null;
}