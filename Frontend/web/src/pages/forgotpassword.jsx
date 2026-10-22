import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api";

const CODE_LENGTH = 6;

function EyeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#0B5D2A"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#0B5D2A"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
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
    e.preventDefault();
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

  // ─── Code inputs ───
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

  // ─── Verify ───
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

  // ─── Reset ───
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
  // RENDER
  // ══════════════════════════════════════════════════════════
  return (
    <div className="fp-page">
      <div className="fp-card">
        <div className="fp-brand">
          <img src="/leaf.png" alt="EcoReport" className="fp-leaf" />
          <span>EcoReport</span>
        </div>

        {/* ─── EMAIL ─── */}
        {step === "email" && (
          <>
            <div className="fp-icon-box">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#0B5D2A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h2>Forgot Your Password?</h2>
            <p>
              Enter your email address and we'll send you a 6-digit verification
              code to reset your password.
            </p>

            <form onSubmit={handleSendCode}>
              <label>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                autoFocus
              />
              {error && <div className="fp-error">{error}</div>}
              <button type="submit" className="fp-primary-btn" disabled={loading}>
                {loading ? "Sending..." : "Send Verification Code"}
              </button>
            </form>

            <button
              type="button"
              className="fp-link-btn"
              onClick={() => navigate("/admin-login")}
            >
              ← Back to Login
            </button>
          </>
        )}

        {/* ─── VERIFY ─── */}
        {step === "verify" && (
          <>
            <div className="fp-icon-box">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#0B5D2A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>

            <h2 className="fp-verify-title">Enter Verification Code</h2>
            <p className="fp-verify-sub">
              We sent a 6-digit code to <strong>{email}</strong>
            </p>

            <div className="fp-code-row">
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(index, e)}
                  onPaste={handleCodePaste}
                  className="fp-code-input"
                  style={{ caretColor: "transparent" }}
                />
              ))}
            </div>

            {error && <div className="fp-error">{error}</div>}
            {resendStatus && !error && (
              <div className="fp-success-banner">{resendStatus}</div>
            )}

            <button
              type="button"
              onClick={handleVerifyCode}
              disabled={loading || code.join("").length !== CODE_LENGTH}
              className="fp-primary-btn"
              style={{ marginTop: 24 }}
            >
              {loading ? "Verifying..." : "Verify"}
            </button>

            <p className="fp-resend-line">
              Didn't receive a code?{" "}
              <button
                type="button"
                className="fp-resend-btn"
                onClick={handleResend}
                disabled={resending}
              >
                {resending ? "Sending..." : "Click to resend"}
              </button>
            </p>
          </>
        )}

        {/* ─── RESET ─── */}
        {step === "reset" && (
          <>
            <div className="fp-icon-box">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#0B5D2A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h2>Set a New Password</h2>
            <p>
              Choose a strong password. You'll use it to log in to the admin panel.
            </p>

            <form onSubmit={handleResetPassword}>
              <label>New Password</label>
              <div className="fp-password-wrap">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (8-16 characters)"
                  maxLength={16}
                  required
                  autoFocus
                />
                <button
                   type="button"
                   className="fp-eye-btn"
                   onClick={() => setShowNew(!showNew)}
                   aria-label={showNew ? "Hide password" : "Show password"}
                   title={showNew ? "Hide password" : "Show password"}
                >
                   {showNew ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>

              <label>Confirm Password</label>
              <div className="fp-password-wrap">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  maxLength={16}
                  required
                />
                <button
                   type="button"
                   className="fp-eye-btn"
                   onClick={() => setShowConfirm(!showConfirm)}
                   aria-label={showConfirm ? "Hide password" : "Show password"}
                   title={showConfirm ? "Hide password" : "Show password"}
                >
                   {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>

              {error && <div className="fp-error">{error}</div>}

              <button type="submit" className="fp-primary-btn" disabled={loading}>
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </form>

            <button
              type="button"
              className="fp-link-btn"
              onClick={() => navigate("/admin-login")}
            >
              ← Back to Login
            </button>
          </>
        )}

        {/* ─── SUCCESS ─── */}
        {step === "success" && (
          <>
            <div className="fp-icon-box fp-icon-success">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#0B5D2A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2>Password Reset</h2>
            <p>
              Your password has been updated successfully. You can now log in
              with your new password.
            </p>
            <button
              type="button"
              className="fp-primary-btn"
              onClick={() => navigate("/admin-login")}
            >
              Continue to Login
            </button>
          </>
        )}
      </div>

      <style>{`
        * { box-sizing: border-box; }
        html, body, #root { margin: 0; padding: 0; width: 100%; height: 100%; }

        .fp-page {
          width: 100vw; height: 100vh;
          display: flex; align-items: center; justify-content: center;
          background: #E5E7EB;
          font-family: Arial, Helvetica, sans-serif;
          padding: 20px;
          overflow-y: auto;
        }

        .fp-card {
          width: 100%; max-width: 480px;
          background: #ffffff;
          border: 1px solid #a7b8aa;
          border-radius: 12px;
          padding: 40px 40px 32px;
          box-shadow: 0 6px 24px rgba(0,0,0,0.10);
          text-align: center;
        }

        .fp-brand {
          display: flex; align-items: center; justify-content: center;
          gap: 10px; color: #0B5D2A;
          font-size: 24px; font-weight: 800;
          margin-bottom: 22px;
        }
        .fp-leaf { width: 42px; height: 44px; object-fit: contain; }

        .fp-icon-box {
          width: 72px; height: 72px; border-radius: 50%;
          background: #E8F5E3;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 18px;
        }
        .fp-icon-box.fp-icon-success { background: #E8F5E3; }

        .fp-card h2 {
          margin: 0 0 12px 0;
          color: #0B5D2A;
          font-size: 22px; font-weight: 800;
        }

        .fp-verify-title {
          font-size: 26px !important;
          margin: 6px 0 12px 0 !important;
          color: #0B5D2A !important;
        }

        .fp-verify-sub {
          color: #666 !important;
          font-size: 13px !important;
        }

        .fp-card p {
          margin: 0 0 20px 0;
          color: #555; font-size: 13px; line-height: 1.6;
        }

        .fp-card form {
          display: flex; flex-direction: column; gap: 8px;
          text-align: left; margin-bottom: 18px;
        }

        .fp-card label {
          color: #0B5D2A; font-size: 13px; font-weight: 700; margin-top: 6px;
        }

        .fp-card input {
          width: 100%; height: 46px;
          padding: 0 14px;
          border: 1px solid #71965f; border-radius: 8px;
          font-size: 14px; color: #333;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .fp-card input:focus {
          border-color: #0B5D2A;
          box-shadow: 0 0 0 3px rgba(11,93,42,0.10);
        }

        /* ─── Code row ─── */
        .fp-code-row {
          display: flex;
          justify-content: center;
          gap: 10px;
          margin: 26px 0 6px 0;
        }
        .fp-code-input {
          width: 52px !important;
          height: 60px !important;
          padding: 0 !important;
          text-align: center;
          font-size: 24px !important;
          font-weight: 800;
          color: #0B5D2A !important;
          border: 2px solid #A8C99A !important;
          border-radius: 12px !important;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .fp-code-input:focus {
          border-color: #0B5D2A !important;
          box-shadow: 0 0 0 4px rgba(11,93,42,0.10) !important;
        }

        .fp-password-wrap { position: relative; }
        .fp-password-wrap input { padding-right: 46px; }

        .fp-eye-btn {
          position: absolute; right: 8px; top: 50%;
          transform: translateY(-50%);
          width: 34px; height: 34px;
          border: none; background: transparent;
          cursor: pointer;
          color: #0B5D2A; border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
        }
        .fp-eye-btn:hover { background: rgba(11,93,42,0.08); }

        .fp-error {
          background: #FDECEC; border: 1px solid #e5b5b5;
          color: #a71d1d; padding: 10px 14px;
          border-radius: 8px; font-size: 12px;
          margin-top: 12px;
        }

        .fp-success-banner {
          background: #EFFAF2; border: 1px solid #BFE3C8;
          color: #0B5D2A; padding: 10px 14px;
          border-radius: 8px; font-size: 12px;
          margin-top: 12px;
        }

        .fp-primary-btn {
          width: 100%; height: 48px; margin-top: 14px;
          border: none; border-radius: 10px;
          background: #0B5D2A; color: #fff;
          font-size: 14px; font-weight: 800;
          cursor: pointer;
          box-shadow: 0 3px 8px rgba(0,0,0,0.18);
          transition: background 0.15s ease, transform 0.15s ease;
        }
        .fp-primary-btn:hover:not(:disabled) {
          background: #084A21; transform: translateY(-1px);
        }
        .fp-primary-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .fp-link-btn {
          border: none; background: transparent;
          color: #356c43; font-size: 13px; font-weight: 700;
          cursor: pointer; padding: 8px 12px; margin-top: 4px;
        }
        .fp-link-btn:hover { text-decoration: underline; }

        .fp-resend-line {
          margin-top: 22px !important;
          color: #555;
          font-size: 13px;
        }

        .fp-resend-btn {
          border: none; background: transparent;
          color: #0B5D2A;
          font-weight: 800;
          font-size: 13px;
          cursor: pointer;
          padding: 0;
        }
        .fp-resend-btn:hover:not(:disabled) { text-decoration: underline; }
        .fp-resend-btn:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>
    </div>
  );
}