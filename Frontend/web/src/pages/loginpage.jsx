import React from "react";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const navigate = useNavigate();

  const handleAdminLogin = () => {
    navigate("/admin-login");
  };

  return (
    <>
      <div className="login-page">
        <div className="login-container">
          <div className="brand-section">
            <div className="brand-title">
              <img src="/leaf.png" alt="EcoReport Leaf" className="leaf-icon" />
              <span>EcoReport</span>
            </div>
            <div className="brand-subtitle">Environmental Reporting System</div>
            <div className="barangay-name">Barangay Sto. Rosario Kanluran</div>
          </div>

          <div className="seal-container">
            <img
              src="/logo.png"
              alt="Barangay Sto. Rosario Kanluran"
              className="barangay-logo"
            />
          </div>

          <div className="buttons-container">
            <button
              type="button"
              className="login-button admin-button"
              onClick={handleAdminLogin}
            >
              <img src="/admin.png" alt="" className="login-icon" />
              <span>BARANGAY LOGIN</span>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        html, body, #root { margin: 0; padding: 0; width: 100%; height: 100%; }
        body { font-family: Arial, Helvetica, sans-serif; overflow: hidden; }

        .login-page {
          width: 100vw; height: 100vh;
          display: flex;
          justify-content: center; align-items: center;
          position: relative;
          background-image: url("/bg.png");
          background-size: cover;
          background-position: center center;
          background-repeat: no-repeat;
          overflow: hidden;
        }

        .login-container {
          width: 300px;
          display: flex; flex-direction: column; align-items: center;
          margin: 0; position: relative; z-index: 2;
        }

        .brand-section { width: 100%; text-align: center; }

        .brand-title {
          display: flex; align-items: center; justify-content: center;
          gap: 5px; color: #bbf18f; font-size: 30px; font-weight: 800; line-height: 1;
        }
        .leaf-icon { width: 51.7px; height: 54px; object-fit: contain; display: block; }
        .brand-subtitle { margin-top: 5px; color: #fff9df; font-size: 15px; font-weight: 500; }
        .barangay-name { margin-top: 2px; color: #ffffff; font-size: 15px; font-weight: 500; }

        .seal-container {
          width: 152.1px; height: 152.8px;
          margin-top: 20px;
          display: flex; justify-content: center; align-items: center;
        }
        .barangay-logo { width: 152.1px; height: 152.8px; object-fit: contain; display: block; }

        .buttons-container {
          width: 342.1px; margin-top: 10px;
          display: flex; flex-direction: column; align-items: center; gap: 10px;
        }

        .login-button {
          width: 342.1px; height: 52px;
          padding: 0; border: none; border-radius: 10px;
          color: white;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 14px; font-weight: 500;
          display: flex; justify-content: center; align-items: center;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.25);
          transition: transform 0.15s ease, filter 0.15s ease, box-shadow 0.15s ease;
        }

        .login-icon {
          width: 30.5px; height: 55.5px;
          object-fit: contain;
          display: block;
          margin-right: 4px;
          flex-shrink: 0;
        }

        .admin-button { background: #2f6206; }

        .login-button:hover {
          filter: brightness(1.08);
          transform: translateY(-1px);
          box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
        }
        .login-button:active {
          transform: translateY(1px);
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
        }

        @media (max-width: 700px) { .login-container { transform: scale(0.95); } }
        @media (max-height: 600px) { .login-container { transform: scale(0.85); } }
        @media (max-height: 500px) { .login-container { transform: scale(0.75); } }
      `}</style>
    </>
  );
}