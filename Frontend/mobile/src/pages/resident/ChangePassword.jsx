import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaSpinner,
  FaCheckCircle,
} from "react-icons/fa";
import { apiFetch } from "../../api";

const INPUT_CLASS =
  "w-full min-h-[52px] bg-white border border-[#C8DCC3] rounded-2xl text-[14px] outline-none focus:border-[#0B5D2A] focus:ring-2 focus:ring-[#0B5D2A]/10 transition";
const LABEL_CLASS = "block text-[14px] font-extrabold text-gray-900";
const EYE_BTN_CLASS =
  "absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-gray-500 hover:text-gray-700 transition";

export default function ChangePassword() {
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    // Validate
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("All fields are required.");
      return;
    }

    if (newPassword.length < 8 || newPassword.length > 16) {
      setError("New password must be between 8 and 16 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      setError("New password must be different from current password.");
      return;
    }

    setLoading(true);

    try {
      await apiFetch("/api/users/me/password", {
        method: "PUT",
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });

      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        navigate("/profile");
      }, 2000);
    } catch (err) {
      setError(err.message || "Failed to change password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
            Change Password
          </h1>
        </header>

        {/* CONTENT */}
        <main
          className="flex-1 overflow-y-auto no-scrollbar"
          style={{
            padding: "28px 24px max(48px, calc(env(safe-area-inset-bottom) + 32px))",
          }}
        >
          <div className="flex flex-col" style={{ gap: "24px" }}>
            {/* LOCK ICON */}
            <div className="flex justify-center items-center">
              <div className="w-[88px] h-[88px] rounded-full bg-[#E8F5E3] flex items-center justify-center shadow-sm">
                <FaLock size={38} className="text-[#0B5D2A]" />
              </div>
            </div>

            {/* INTRODUCTION */}
            <div className="text-center flex flex-col" style={{ gap: "8px" }}>
              <h2 className="text-[22px] font-extrabold text-gray-900 leading-tight">
                Update Your Password
              </h2>
              <p className="text-[14px] text-gray-600 leading-6">
                Enter your current password and create a new password for your
                account.
              </p>
            </div>

            {/* ERROR */}
            {error && (
              <div
                className="bg-red-100 border border-red-400 rounded-xl text-red-700 text-sm leading-6 break-words"
                style={{ padding: "14px 16px" }}
              >
                {error}
              </div>
            )}

            {/* SUCCESS */}
            {success && (
              <div
                className="bg-green-100 border border-green-400 rounded-xl flex items-center text-green-700 text-sm leading-6"
                style={{ padding: "14px 16px", gap: "12px" }}
              >
                <FaCheckCircle size={18} />
                <span>Password changed successfully!</span>
              </div>
            )}

            {/* FORM */}
            <form
              onSubmit={handleSubmit}
              className="flex flex-col"
              style={{ gap: "24px" }}
            >
              {/* CURRENT PASSWORD */}
              <div className="flex flex-col" style={{ gap: "8px" }}>
                <label className={LABEL_CLASS}>Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrent ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    maxLength={16}
                    className={INPUT_CLASS}
                    style={{ padding: "0 56px 0 16px" }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    aria-label={showCurrent ? "Hide password" : "Show password"}
                    className={EYE_BTN_CLASS}
                  >
                    {showCurrent ? <FaEye size={18} /> : <FaEyeSlash size={18} />}
                  </button>
                </div>
              </div>

              {/* NEW PASSWORD */}
              <div className="flex flex-col" style={{ gap: "8px" }}>
                <label className={LABEL_CLASS}>New Password</label>
                <div className="relative">
                  <input
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (8-16 characters)"
                    maxLength={16}
                    className={INPUT_CLASS}
                    style={{ padding: "0 56px 0 16px" }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    aria-label={showNew ? "Hide password" : "Show password"}
                    className={EYE_BTN_CLASS}
                  >
                    {showNew ? <FaEye size={18} /> : <FaEyeSlash size={18} />}
                  </button>
                </div>
              </div>

              {/* CONFIRM PASSWORD */}
              <div className="flex flex-col" style={{ gap: "8px" }}>
                <label className={LABEL_CLASS}>Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    maxLength={16}
                    className={INPUT_CLASS}
                    style={{ padding: "0 56px 0 16px" }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                    className={EYE_BTN_CLASS}
                  >
                    {showConfirm ? <FaEye size={18} /> : <FaEyeSlash size={18} />}
                  </button>
                </div>
              </div>

              {/* UPDATE BUTTON */}
              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[54px] rounded-2xl bg-[#0B5D2A] text-white font-extrabold text-[16px] flex items-center justify-center shadow-md hover:bg-[#084A21] active:scale-[0.98] transition disabled:opacity-50"
                style={{ gap: "12px", marginTop: "8px" }}
              >
                {loading ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Password"
                )}
              </button>

              {success && (
                <p className="text-center text-sm text-green-600 leading-6">
                  Redirecting to profile...
                </p>
              )}
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}