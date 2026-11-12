import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaEye, FaEyeSlash } from "react-icons/fa";
import { useState, useEffect } from "react";
import { apiFetch } from "../../api";
import { DEFAULT_BARANGAY, fetchBarangayInfo } from "../../utils/barangay";

import background from "../../assets/images/bg.png";
import ecoLogo from "../../assets/images/eco-logo.png";

export default function ResidentLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [barangay, setBarangay] = useState(DEFAULT_BARANGAY);
  useEffect(() => {
    let cancelled = false;
    fetchBarangayInfo(apiFetch).then((info) => {
      if (!cancelled) setBarangay(info);
    });
    return () => { cancelled = true; };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      navigate("/resident-dashboard");
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    navigate("/forgot-password");
  };

  const inputClass =
    "block w-full min-w-0 min-h-[54px] rounded-2xl border-[1.5px] border-[#A8C99A] bg-white text-[16px] text-gray-800 placeholder:text-gray-400 shadow-sm outline-none transition focus:border-[#0B5D2A] focus:ring-2 focus:ring-[#0B5D2A]/30";

  return (
    <div className="min-h-[100dvh] bg-[#E5E7EB] flex items-center justify-center sm:py-6 sm:px-3">
      {/* Full screen on phones, phone frame only on sm and up */}
      <div className="relative w-full h-[100dvh] sm:w-[390px] sm:h-[844px] overflow-hidden bg-[#F8FAF8] sm:rounded-[40px] sm:border-[5px] sm:border-white sm:shadow-2xl">
        <img
          src={background}
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-white/20" />

        {/* Back button */}
        <button
          type="button"
          onClick={() => navigate("/")}
          aria-label="Back"
          className="absolute top-6 left-5 z-30 w-11 h-11 rounded-full flex items-center justify-center bg-white/85 text-[#0B5D2A] text-[18px] shadow-md hover:bg-white active:scale-95 transition"
        >
          <FaArrowLeft />
        </button>

        <main
          className="relative z-10 h-full overflow-y-auto no-scrollbar flex flex-col"
          style={{
            padding: "84px 24px max(48px, calc(env(safe-area-inset-bottom) + 32px))",
            gap: "28px",
          }}
        >
          {/* HEADER: logo + description */}
          <div className="flex flex-col items-center shrink-0" style={{ gap: "12px" }}>
            <div className="flex items-center justify-center" style={{ gap: "10px" }}>
              <img
                src={ecoLogo}
                alt="EcoReport"
                className="w-10 h-10 object-contain shrink-0"
              />
              <h1 className="text-[24px] font-extrabold text-[#0B5D2A] leading-tight">
                EcoReport
              </h1>
            </div>

            <div className="flex flex-col items-center text-center" style={{ gap: "8px" }}>
              <h3 className="text-[16px] font-extrabold text-[#075B2A] leading-6">
                Protect Our Environment
              </h3>
              <p className="text-[14px] leading-6 text-gray-700 max-w-[320px]">
                Report environmental concerns quickly and help keep{" "}
                {barangay.name} clean, safe, and sustainable for everyone.
              </p>
            </div>
          </div>

          {/* TITLE */}
          <h2 className="text-center text-[22px] font-extrabold text-[#075B2A] leading-tight shrink-0">
            Resident Login
          </h2>

          {/* FORM */}
          <form
            onSubmit={handleLogin}
            className="flex flex-col shrink-0"
            style={{ gap: "20px" }}
          >
            <div className="flex flex-col" style={{ gap: "8px" }}>
              <label htmlFor="email" className="text-[14px] font-extrabold text-[#075B2A]">
                Email Address
              </label>
              <input
                id="email"
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

            <div className="flex flex-col" style={{ gap: "8px" }}>
              <label htmlFor="password" className="text-[14px] font-extrabold text-[#075B2A]">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className={inputClass}
                  style={{ padding: "0 56px 0 16px" }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-[#0B5D2A] text-[18px]"
                >
                  {showPassword ? <FaEye /> : <FaEyeSlash />}
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

            <div className="flex justify-between items-center" style={{ gap: "12px" }}>
              <label
                className="flex items-center min-h-[44px] text-[14px] text-gray-700"
                style={{ gap: "10px" }}
              >
                <input
                  type="checkbox"
                  className="w-[18px] h-[18px] accent-[#0B5D2A]"
                />
                Remember me
              </label>

              <button
                type="button"
                onClick={handleForgotPassword}
                className="min-h-[44px] text-[14px] font-extrabold text-[#075B2A] hover:underline"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full min-h-[54px] rounded-2xl text-[16px] font-extrabold shadow-md transition disabled:opacity-50"
              style={{ marginTop: "4px" }}
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          {/* REGISTER */}
          <p className="text-center text-[14px] text-gray-700 leading-6 shrink-0">
            Don't have an account?{" "}
            <button
              type="button"
              onClick={() => navigate("/register")}
              className="min-h-[44px] text-[#0B5D2A] font-extrabold hover:underline"
            >
              Register here
            </button>
          </p>
        </main>
      </div>
    </div>
  );
}