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
import {
  DEFAULT_PASSWORD_POLICY,
  fetchPasswordPolicy,
  validatePassword as validatePasswordPolicy,
} from "../../utils/passwordPolicy";

const CODE_LENGTH = 6;

const labelClass = "block text-[14px] font-extrabold text-[#0B5D2A]";

const inputClass =
  "block w-full min-w-0 box-border min-h-[52px] rounded-2xl border border-[#A8C99A] bg-white text-[16px] text-gray-800 placeholder:text-gray-400 placeholder:text-[14px] outline-none transition focus:border-[#0B5D2A] focus:ring-2 focus:ring-[#0B5D2A]/20";

const eyeButtonClass =
  "absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-[#0B5D2A] text-[18px]";

const mainStyle = {
  padding: "28px 24px max(48px, calc(env(safe-area-inset-bottom) + 32px))",
  gap: "24px",
};

const primaryBtn =
  "btn-primary w-full min-h-[54px] rounded-2xl font-extrabold text-[16px] flex items-center justify-center shadow-md transition disabled:opacity-50 shrink-0";

function PhoneFrame({ children, header }) {
  return (
    <div className="min-h-[100dvh] bg-[#E5E7EB] flex justify-center items-center sm:py-6 sm:px-3">
      {/* Full screen on phones, phone frame only on sm and up */}
      <div className="relative w-full h-[100dvh] sm:w-[390px] sm:h-[844px] bg-[#F8FAF8] sm:rounded-[40px] sm:border-[5px] sm:border-white sm:shadow-2xl overflow-hidden flex flex-col">
        {header}
        {children}
      </div>
    </div>
  );
}

function Header({ title, onBack }) {
  return (
    <header
      className="relative h-[82px] bg-[#0B5D2A] flex items-center justify-center shrink-0"
      style={{ padding: "0 64px" }}
    >
      <button
        type="button"
        onClick={onBack}
        aria-label="Back"
        className="absolute left-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center text-white text-[20px] bg-white/10 hover:bg-white/20 active:scale-95 transition"
      >
        <FaArrowLeft />
      </button>
      <h1 className="text-white text-[22px] font-extrabold text-center">{title}</h1>
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

  const [passwordPolicy, setPasswordPolicy] = useState(DEFAULT_PASSWORD_POLICY);

  useEffect(() => {
    let cancelled = false;
    fetchPasswordPolicy(apiFetch).then((policy) => {
      if (!cancelled) setPasswordPolicy(policy);
    });
    return () => { cancelled = true; };
  }, []);

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
    const pwCheck = validatePasswordPolicy(newPassword, passwordPolicy);
    if (!pwCheck.ok) {
      setError(pwCheck.error);
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
        <main
          className="flex-1 overflow-y-auto no-scrollbar flex flex-col items-center justify-center text-center"
          style={mainStyle}
        >
          <div className="w-[100px] h-[100px] rounded-full bg-[#E5F5E9] flex items-center justify-center shrink-0">
            <FaCheckCircle size={64} className="text-[#0B5D2A]" />
          </div>

          <div className="flex flex-col items-center shrink-0" style={{ gap: "12px" }}>
            <h2 className="text-[26px] font-extrabold text-[#0B5D2A] leading-tight">
              Password Reset
            </h2>
            <p className="text-[14px] text-gray-600 leading-6 max-w-[300px]">
              Your password has been successfully reset.
              <br />
              Click below to log in.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/resident-login")}
            className={primaryBtn}
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
        <main
          className="flex-1 overflow-y-auto no-scrollbar flex flex-col"
          style={mainStyle}
        >
          <div className="flex flex-col items-center shrink-0" style={{ gap: "16px" }}>
            <div className="w-[88px] h-[88px] rounded-full bg-[#E5F5E9] flex items-center justify-center shrink-0">
              <FaEnvelope size={36} className="text-[#0B5D2A]" />
            </div>
            <div className="flex flex-col items-center text-center" style={{ gap: "8px" }}>
              <h2 className="text-[22px] font-extrabold text-gray-900 leading-tight">
                Enter Email Address
              </h2>
              <p className="text-[14px] text-gray-600 leading-6 max-w-[320px]">
                Enter your email address and we'll send you a 6-digit
                verification code to reset your password.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSendCode}
            className="flex flex-col shrink-0"
            style={{ gap: "24px" }}
          >
            <div className="flex flex-col" style={{ gap: "8px" }}>
              <label className={labelClass}>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                autoComplete="email"
                className={inputClass}
                style={{ padding: "0 16px" }}
                required
              />
            </div>

            {error && (
              <div
                className="bg-red-100 border border-red-400 rounded-xl text-red-700 text-sm leading-6 break-words"
                style={{ padding: "14px 16px" }}
              >
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className={primaryBtn} style={{ gap: "12px" }}>
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
        <main
          className="flex-1 overflow-y-auto no-scrollbar flex flex-col"
          style={mainStyle}
        >
          <div className="flex flex-col items-center shrink-0" style={{ gap: "16px" }}>
            <div className="w-[88px] h-[88px] rounded-full bg-[#E5F5E9] flex items-center justify-center shrink-0">
              <FaShieldAlt size={36} className="text-[#0B5D2A]" />
            </div>

            <div className="flex flex-col items-center text-center" style={{ gap: "8px" }}>
              <h2 className="text-[24px] font-extrabold text-[#0B5D2A] leading-tight">
                Enter Verification Code
              </h2>
              <p className="text-[14px] text-gray-600 leading-6">
                We sent a 6-digit code to
              </p>
              <p className="text-[15px] font-extrabold text-[#0B5D2A] break-all leading-6">
                {email}
              </p>
            </div>
          </div>

          <div className="flex justify-center shrink-0" style={{ gap: "8px" }}>
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
                className="flex-1 min-w-0 max-w-[50px] h-[60px] box-border text-center text-[24px] font-extrabold text-[#0B5D2A] bg-white border-2 border-[#A8C99A] rounded-2xl outline-none transition-all focus:border-[#0B5D2A] focus:ring-4 focus:ring-[#0B5D2A]/10"
                style={{ caretColor: "transparent" }}
              />
            ))}
          </div>

          {error && (
            <div
              className="bg-red-100 border border-red-400 rounded-xl text-red-700 text-[14px] leading-6 text-center break-words shrink-0"
              style={{ padding: "14px 16px" }}
            >
              {error}
            </div>
          )}

          {resendStatus && !error && (
            <div
              className="bg-[#EFFAF2] border border-[#BFE3C8] rounded-xl text-[#0B5D2A] text-[14px] leading-6 text-center flex items-center justify-center shrink-0"
              style={{ padding: "14px 16px", gap: "10px" }}
            >
              <FaCheckCircle size={14} className="shrink-0" />
              <span className="break-words">{resendStatus}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleVerifyCode}
            disabled={loading || code.join("").length !== CODE_LENGTH}
            className={`${primaryBtn} disabled:cursor-not-allowed`}
            style={{ gap: "12px" }}
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

          <div className="text-center shrink-0">
            <p className="text-[14px] text-gray-600 leading-6">
              Didn't receive a code?{" "}
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="min-h-[44px] font-extrabold text-[#0B5D2A] hover:underline disabled:opacity-50"
              >
                {resending ? "Sending..." : "Click to resend"}
              </button>
            </p>
          </div>
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
        <main
          className="flex-1 overflow-y-auto no-scrollbar flex flex-col"
          style={mainStyle}
        >
          <div className="flex flex-col items-center shrink-0" style={{ gap: "16px" }}>
            <div className="w-[88px] h-[88px] rounded-full bg-[#E5F5E9] flex items-center justify-center shrink-0">
              <FaLock size={34} className="text-[#0B5D2A]" />
            </div>
            <div className="flex flex-col items-center text-center" style={{ gap: "8px" }}>
              <h2 className="text-[22px] font-extrabold text-gray-900 leading-tight">
                Set a New Password
              </h2>
              <p className="text-[14px] text-gray-600 leading-6 max-w-[320px]">
                Choose a strong password. You'll use this to log in to EcoReport.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleResetPassword}
            className="flex flex-col shrink-0"
            style={{ gap: "24px" }}
          >
            <div className="flex flex-col" style={{ gap: "8px" }}>
              <label className={labelClass}>New Password</label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={`Enter new password (${passwordPolicy.min}-${passwordPolicy.max} characters)`}
                  autoComplete="new-password"
                  className={inputClass}
                  style={{ padding: "0 56px 0 16px" }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className={eyeButtonClass}
                  aria-label={showNew ? "Hide password" : "Show password"}
                >
                  {showNew ? <FaEye /> : <FaEyeSlash />}
                </button>
              </div>
            </div>

            <div className="flex flex-col" style={{ gap: "8px" }}>
              <label className={labelClass}>Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  className={inputClass}
                  style={{ padding: "0 56px 0 16px" }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className={eyeButtonClass}
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? <FaEye /> : <FaEyeSlash />}
                </button>
              </div>
            </div>

            {error && (
              <div
                className="bg-red-100 border border-red-400 rounded-xl text-red-700 text-sm leading-6 break-words"
                style={{ padding: "14px 16px" }}
              >
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className={primaryBtn} style={{ gap: "12px" }}>
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