import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaUser, FaUsers, FaTools } from "react-icons/fa";
import { DEFAULT_BARANGAY, fetchBarangayInfo } from "../../utils/barangay";

import background from "../../assets/images/background.png";
import ecoLogo from "../../assets/images/leaf.png";
import barangayLogo from "../../assets/images/blogo.png";

export default function Welcome() {
  const navigate = useNavigate();

  const handleResidentLogin = () => {
    navigate("/resident-login");
  };

  // Guest Home
  const handleGuest = () => {
    navigate("/guest-home");
  };

  return (
    <div className="min-h-[100dvh] bg-[#E5E7EB] flex items-center justify-center sm:py-6 sm:px-3">
      {/* Full screen on phones, phone frame only on sm and up */}
      <div className="relative w-full h-[100dvh] sm:w-[390px] sm:h-[844px] overflow-hidden sm:rounded-[40px] sm:shadow-2xl bg-white sm:border-[5px] sm:border-white">
        <img
          src={background}
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-white/15" />

        <div
          className="relative z-10 h-full flex flex-col items-center justify-center overflow-y-auto no-scrollbar"
          style={{
            padding: "28px 24px max(48px, calc(env(safe-area-inset-bottom) + 32px))",
            gap: "40px",
          }}
        >
          {/* TITLE */}
          <div className="text-center flex flex-col items-center shrink-0" style={{ gap: "12px" }}>
            <div className="flex items-center justify-center" style={{ gap: "12px" }}>
              <img
                src={ecoLogo}
                alt="EcoReport"
                className="w-[52px] h-[52px] object-contain shrink-0"
              />
              <h1 className="text-[30px] font-extrabold text-[#bbf18f] leading-tight">
                EcoReport
              </h1>
            </div>

            <div className="flex flex-col" style={{ gap: "6px" }}>
              <p className="text-[16px] font-semibold text-[#fff9df] leading-6">
                Environmental Reporting System
              </p>
              <p className="text-[15px] text-white leading-6">
                {barangay.name}
              </p>
            </div>
          </div>

          {/* BARANGAY LOGO */}
          <div className="shrink-0">
            <img
              src={barangayLogo}
              alt="Barangay Logo"
              className="w-[104px] h-[104px] object-contain"
            />
          </div>

          {/* BUTTONS */}
          <div className="flex flex-col items-center w-full shrink-0" style={{ gap: "16px" }}>
            <button
              type="button"
              onClick={handleResidentLogin}
              className="w-full max-w-[280px] min-h-[56px] rounded-2xl bg-[#176B05] text-white font-extrabold text-[15px] flex items-center justify-center shadow-md hover:bg-[#125704] active:scale-[0.98] transition"
              style={{ gap: "12px" }}
            >
              <FaUser size={18} />
              RESIDENT LOGIN
            </button>

            <button
              type="button"
              onClick={handleGuest}
              className="w-full max-w-[280px] min-h-[56px] rounded-2xl bg-[#82B85B] text-white font-extrabold text-[15px] flex items-center justify-center shadow-md hover:bg-[#72A94D] active:scale-[0.98] transition"
              style={{ gap: "12px" }}
            >
              <FaUsers size={18} />
              CONTINUE AS GUEST
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}