import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaEye, FaEyeSlash } from "react-icons/fa";
import { useState } from "react";
import { apiFetch } from "../../api";

import background from "../../assets/images/bg.png";
import ecoLogo from "../../assets/images/eco-logo.png";

export default function ResidentLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    "block w-full min-w-0 h-[54px] px-4 rounded-[14px] border-[1.5px] border-[#A8C99A] bg-white text-[16px] text-gray-800 placeholder:text-gray-400 shadow-sm outline-none transition focus:border-[#0B5D2A] focus:ring-2 focus:ring-[#0B5D2A]/30";

  return (
    <div className="min-h-[100dvh] bg-[#E5E7EB] flex items-center justify-center sm:p-4">
      {/* Full screen on phones, phone frame only on sm and up */}
      <div className="relative w-full h-[100dvh] sm:w-[390px] sm:h-[844px] overflow-hidden bg-[#F8FAF8] sm:rounded-[40px] sm:border-[5px] sm:border-white sm:shadow-2xl">
        <img
          src={background}
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-white/20" />

        {/* logo + EcoReport + description, centered at the top */}
        <div className="absolute top-9 inset-x-0 z-20 flex flex-col items-center gap-1 px-6 sm:px-8 pointer-events-none">
          <div className="flex items-center gap-2 h-[48px]">
            <img
              src={ecoLogo}
              alt="EcoReport"
              className="w-[40px] h-[40px] object-contain"
            />
            <h1 className="text-[22px] font-extrabold text-[#0B5D2A] leading-none">
              EcoReport
            </h1>
          </div>

          <div className="flex flex-col items-center gap-2 text-center">
            <h3 className="text-[15px] font-bold text-[#075B2A]">
              Protect Our Environment
            </h3>
            <p className="text-[12px] leading-relaxed text-gray-700 max-w-[300px]">
              Report environmental concerns quickly and help keep Barangay Sto.
              Rosario Kanluran clean, safe, and sustainable for everyone.
            </p>
          </div>
        </div>

        {/* Back button */}
        <button
          type="button"
          onClick={() => navigate("/")}
          aria-label="Back"
          className="absolute top-9 left-6 sm:left-8 z-30 w-[44px] h-[44px] rounded-full flex items-center justify-center bg-white/85 text-[#0B5D2A] text-[17px] shadow-md hover:bg-white active:scale-95 transition"
        >
          <FaArrowLeft />
        </button>

        {/* header */}
        <div className="relative z-10 h-full flex flex-col gap-8 overflow-y-auto px-6 sm:px-8 pt-[210px] pb-8">
          <div className="flex-1 flex flex-col justify-center items-center w-full">
            <div className="w-full max-w-[350px] flex flex-col gap-4">
              <h2 className="text-center text-[22px] font-bold text-[#075B2A] mb-8">
                Resident Login
              </h2>

              <form onSubmit={handleLogin} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="email"
                    className="text-[14px] font-bold text-[#075B2A]"
                  >
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
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="password"
                    className="text-[14px] font-bold text-[#075B2A]"
                  >
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
                      className={`${inputClass} pr-12`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-1 top-1/2 -translate-y-1/2 w-[44px] h-[44px] flex items-center justify-center text-[#0B5D2A] text-[17px]"
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-100 border border-red-400 rounded-[14px] text-red-700 text-sm">
                    {error}
                  </div>
                )}

                <div className="flex justify-between items-center gap-3">
                  <label className="flex items-center gap-2 py-1 text-[12px] text-gray-700">
                    <input
                      type="checkbox"
                      className="w-[16px] h-[16px] accent-[#0B5D2A]"
                    />
                    Remember me
                  </label>

                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="py-1 text-[12px] font-semibold text-[#075B2A] hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-[52px] rounded-[14px] bg-[#176B05] text-white text-[14px] font-bold shadow-md hover:bg-[#125704] active:scale-95 transition disabled:opacity-50"
                  >
                    {loading ? "Logging in..." : "Login"}
                  </button>
                </div>
              </form>

              <p className="text-center text-[12px] text-gray-700 mt-2">
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => navigate("/register")}
                  className="py-1 text-[#0B5D2A] font-bold hover:underline"
                >
                  Register here
                </button>
              </p>
            </div>
          </div>

          {/* Fake home indicator, desktop frame only */}
          <div className="hidden sm:flex justify-center shrink-0">
            <div className="w-[70px] h-[5px] rounded-full bg-gray-800 opacity-70" />
          </div>
        </div>
      </div>
    </div>
  );
}