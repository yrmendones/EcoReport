import { useNavigate } from "react-router-dom";
import { FaUser, FaUsers } from "react-icons/fa";

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
    <div className="min-h-screen bg-[#E5E7EB] flex items-center justify-center p-4">
      <div className="relative w-[390px] h-[844px] overflow-hidden rounded-[40px] shadow-2xl bg-white border-[5px] border-white">
        <img
          src={background}
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-white/15" />

        <div className="relative z-10 h-full flex flex-col items-center justify-center px-7 pb-10">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3">
              <img src={ecoLogo} alt="EcoReport" className="w-[50px] h-[50px] object-contain" />
              <h1 className="text-[28px] font-extrabold text-[#bbf18f]">EcoReport</h1>
            </div>

            <p className="text-[15px] font-medium text-[#fff9df] mt-3">
              Environmental Reporting System
            </p>

            <p className="text-[14px] text-[#ffffff] mt-1">
              Barangay Sto. Rosario Kanluran
            </p>
          </div>

          <div className="mt-12">
            <img
              src={barangayLogo}
              alt="Barangay Logo"
              className="w-[100px] h-[100px] object-contain"
            />
          </div>

          <div className="flex flex-col items-center gap-5 mt-12 w-full">
            <button
              type="button"
              onClick={handleResidentLogin}
              className="w-[250px] h-[52px] rounded-xl bg-[#176B05] text-white font-bold text-[14px] flex items-center justify-center gap-3 shadow-md hover:bg-[#125704] hover:scale-[1.02] active:scale-95 transition"
            >
              <FaUser size={18} />
              RESIDENT LOGIN
            </button>

            <button
              type="button"
              onClick={handleGuest}
              className="w-[250px] h-[52px] rounded-xl bg-[#82B85B] text-white font-bold text-[14px] flex items-center justify-center gap-3 shadow-md hover:bg-[#72A94D] hover:scale-[1.02] active:scale-95 transition"
            >
              <FaUsers size={18} />
              CONTINUE AS GUEST
            </button>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-20 flex justify-center pb-3">
          <div className="w-[90px] h-[5px] rounded-full bg-gray-800 opacity-70" />
        </div>
      </div>
    </div>
  );
}