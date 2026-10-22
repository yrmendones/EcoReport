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
    <div
      className="
        min-h-screen
        bg-[#E5E7EB]
        flex
        justify-center
        items-center
        py-6
        px-3
      "
    >
      {/* ================= PHONE FRAME ================= */}
      <div
        className="
          relative
          w-[390px]
          h-[844px]
          bg-[#F8FAF8]
          rounded-[40px]
          border-[5px]
          border-white
          shadow-2xl
          overflow-hidden
          flex
          flex-col
        "
      >
        {/* ================= HEADER ================= */}
        <header
          className="
            relative
            h-[82px]
            bg-[#0B5D2A]
            flex
            items-center
            justify-center
            shrink-0
          "
        >
          <button
            type="button"
            onClick={() => navigate("/profile")}
            className="
              absolute
              left-6
              top-1/2
              -translate-y-1/2
              w-11
              h-11
              rounded-full
              flex
              items-center
              justify-center
              text-white
              text-[20px]
              bg-white/10
              hover:bg-white/20
              active:scale-95
              transition
            "
          >
            <FaArrowLeft />
          </button>
          <h1 className="text-white text-[21px] font-extrabold">
            Change Password
          </h1>
        </header>

        {/* ================= MAIN CONTENT ================= */}
        <main
          className="
            flex-1
            overflow-y-auto
            px-6
            pt-8
            pb-8
            no-scrollbar
          "
        >
          {/* ================= LOCK ICON ================= */}
          <div className="flex justify-center items-center mb-8">
            <div
              className="
                w-[88px]
                h-[88px]
                rounded-full
                bg-[#E8F5E3]
                flex
                items-center
                justify-center
                shadow-sm
              "
            >
              <FaLock size={38} className="text-[#0B5D2A]" />
            </div>
          </div>

          {/* ================= INTRODUCTION ================= */}
          <div className="text-center mb-8">
            <h2 className="text-[20px] font-extrabold text-gray-900">
              Update Your Password
            </h2>
            <p className="text-[12px] text-gray-500 mt-2 leading-5">
              Enter your current password and create
              <br />
              a new password for your account.
            </p>
          </div>

          {/* ================= ERROR ================= */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* ================= SUCCESS ================= */}
          {success && (
            <div className="mb-4 p-3 bg-green-100 border border-green-400 rounded-lg flex items-center gap-3 text-green-700 text-sm">
              <FaCheckCircle size={18} />
              <span>Password changed successfully!</span>
            </div>
          )}

          {/* ================= FORM ================= */}
          <form onSubmit={handleSubmit} className="space-y-7">
            {/* CURRENT PASSWORD */}
            <div>
              <label className="block text-[13px] font-bold text-gray-800 mb-2">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="
                    w-full
                    h-[52px]
                    bg-white
                    border
                    border-[#C8DCC3]
                    rounded-2xl
                    px-4
                    pr-12
                    text-[13px]
                    outline-none
                    focus:border-[#0B5D2A]
                    focus:ring-2
                    focus:ring-[#0B5D2A]/10
                    transition
                  "
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="
                    absolute
                    right-4
                    top-1/2
                    -translate-y-1/2
                    text-gray-500
                    hover:text-gray-700
                    transition
                  "
                >
                  {showCurrent ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                </button>
              </div>
            </div>

            {/* NEW PASSWORD */}
            <div>
              <label className="block text-[13px] font-bold text-gray-800 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (8-16 characters)"
                  maxLength={16}
                  className="
                    w-full
                    h-[52px]
                    bg-white
                    border
                    border-[#C8DCC3]
                    rounded-2xl
                    px-4
                    pr-12
                    text-[13px]
                    outline-none
                    focus:border-[#0B5D2A]
                    focus:ring-2
                    focus:ring-[#0B5D2A]/10
                    transition
                  "
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="
                    absolute
                    right-4
                    top-1/2
                    -translate-y-1/2
                    text-gray-500
                    hover:text-gray-700
                    transition
                  "
                >
                  {showNew ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                </button>
              </div>
            </div>

            {/* CONFIRM PASSWORD */}
            <div>
              <label className="block text-[13px] font-bold text-gray-800 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  maxLength={16}
                  className="
                    w-full
                    h-[52px]
                    bg-white
                    border
                    border-[#C8DCC3]
                    rounded-2xl
                    px-4
                    pr-12
                    text-[13px]
                    outline-none
                    focus:border-[#0B5D2A]
                    focus:ring-2
                    focus:ring-[#0B5D2A]/10
                    transition
                  "
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="
                    absolute
                    right-4
                    top-1/2
                    -translate-y-1/2
                    text-gray-500
                    hover:text-gray-700
                    transition
                  "
                >
                  {showConfirm ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                </button>
              </div>
            </div>

            {/* ================= EXTRA SPACE BEFORE BUTTON ================= */}
            <div className="h-4" />

            {/* ================= UPDATE BUTTON ================= */}
            <button
              type="submit"
              disabled={loading}
              className="
                w-full
                h-[54px]
                rounded-2xl
                bg-[#0B5D2A]
                text-white
                font-extrabold
                text-[14px]
                flex
                items-center
                justify-center
                gap-2
                shadow-md
                hover:bg-[#084A21]
                active:scale-[0.98]
                transition
                disabled:opacity-50
              "
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
              <p className="text-center text-sm text-green-600 mt-4">
                Redirecting to profile...
              </p>
            )}
          </form>

          <div className="h-6" />
        </main>

        {/* ================= ANDROID HOME BAR ================= */}
        <div
          className="
            absolute
            bottom-3
            left-0
            right-0
            flex
            justify-center
            pointer-events-none
            z-30
          "
        >
          <div className="w-[70px] h-[5px] rounded-full bg-gray-800 opacity-70" />
        </div>
      </div>
    </div>
  );
}