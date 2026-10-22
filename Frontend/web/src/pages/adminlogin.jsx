import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api";

function EyeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#0c5e30"
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
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#0c5e30"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export default function AdminLogin() {
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
      const data = await apiFetch("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      localStorage.setItem("token", data.token);
      localStorage.setItem("admin", JSON.stringify(data.user));

      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate("/");
  };

  const handleForgotPassword = () => {
    navigate("/forgot-password");
  };

  return (
    <>
      <div className="admin-page">
        <button
          className="back-button"
          onClick={handleBack}
          type="button"
          aria-label="Go back"
        >
          <img src="/arrow.png" alt="Back" className="arrow-image" />
        </button>

        <div className="admin-card">
          {/* LEFT SIDE */}
          <div className="left-side">
            <img src="/bg.png" alt="" className="background-image" />
            <div className="left-content">
              <div className="eco-brand">
                <img src="/leaf.png" alt="EcoReport" className="leaf-image" />
                <span>EcoReport</span>
              </div>
              <div className="environment-text">
                <h3>Protect Our Environment</h3>
                <p>
                  Report environmental
                  <br />
                  concerns quickly and help
                  <br />
                  keep Barangay Sto. Rosario
                  <br />
                  Kanluran clean, safe, and
                  <br />
                  sustainable for everyone.
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE */}
          <div className="right-side">
            <div className="login-area">
              <div className="login-title">
                <h1>Barangay Login</h1>
                <p>For Barangay Officials and Administrators</p>
              </div>

              <form className="admin-form" onSubmit={handleLogin}>
                {error && (
                  <div
                    className="error-message"
                    style={{ color: "red", fontSize: "12px", marginBottom: "10px" }}
                  >
                    {error}
                  </div>
                )}

                <div className="input-group">
                  <label htmlFor="email">Email Address</label>
                  <input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="password">Password</label>
                  <div className="password-box">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="eye-button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>

                <div className="account-options">
                  <label className="remember">
                    <input type="checkbox" defaultChecked />
                    <span className="checkmark">✓</span>
                    <span>Remember me</span>
                  </label>

                  <button
                    type="button"
                    className="forgot-password"
                    onClick={handleForgotPassword}
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  className="login-submit"
                  disabled={loading}
                >
                  {loading ? "Logging in..." : "Login"}
                </button>
              </form>

              <div className="security-message">
                <img src="/security.png" alt="Security" className="security-image" />
                <span>
                  Accounts are created and managed by
                  Barangay Officials only.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        html, body, #root { width: 100%; height: 100%; margin: 0; padding: 0; }
        body { font-family: Arial, Helvetica, sans-serif; background: #ffffff; overflow: hidden; }

        .admin-page {
          position: relative;
          width: 100vw;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
          overflow: hidden;
        }

        .back-button {
          position: fixed;
          top: 17px;
          left: 40px;
          width: 40px;
          height: 40px;
          padding: 0;
          border: none;
          background: transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 100;
        }
        .arrow-image { width: 50px; height: 55px; display: block; object-fit: contain; transition: transform 0.15s ease; }
        .back-button:hover .arrow-image { transform: translateX(-2px); }

        .admin-card {
          width: 1249.7px;
          height: 500px;
          display: flex;
          position: relative;
          border: 2px solid #4d7d32;
          background: #ffffff;
          overflow: hidden;
          flex-shrink: 0;
        }

        .left-side { position: relative; width: 527px; height: 500px; overflow: hidden; flex-shrink: 0; }
        .background-image {
          position: absolute;
          top: 0; left: 0;
          width: 100%; height: 100%;
          display: block;
          object-fit: cover;
          object-position: center center;
          z-index: 0;
        }
        .left-content {
          position: relative;
          width: 100%; height: 100%;
          z-index: 2;
          padding-top: 72px;
          padding-left: 62px;
        }
        
        /* ✅ Light text colors for the dark background */
        .eco-brand {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 12px;
          color: #bbf18f; 
          font-size: 30px;
          font-weight: 800;
          line-height: 1;
        }
        .leaf-image { width: 51.7px; height: 54px; display: block; object-fit: contain; flex-shrink: 0; }

        .environment-text { position: absolute; top: 205px; left: 202px; width: 280px; }
        .environment-text h3 { margin: 0 0 15px 0; color: #bbf18f; font-size: 15px; font-weight: 800; line-height: 1; }
        .environment-text p { margin: 0; color: #e7ffd4; font-size: 17px; font-weight: 400; line-height: 1.4; }

        .right-side {
          width: 722.7px;
          height: 500px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
          flex-shrink: 0;
        }
        .login-area {
          width: 430px;
          height: 500px;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding-top: 42px;
        }

        .login-title { width: 430px; text-align: center; margin-bottom: 25px; }
        .login-title h1 { margin: 0; color: #0c5e30; font-size: 30px; font-weight: 800; line-height: 1; }
        .login-title p { margin: 6px 0 0 0; color: #13471e; font-size: 14px; font-weight: 400; line-height: 1; }

        .admin-form { width: 430px; display: flex; flex-direction: column; }
        .input-group { width: 430px; margin-bottom: 14px; }
        .input-group label { display: block; margin-bottom: 5px; color: #00682f; font-size: 14px; font-weight: 700; }

        .input-group > input,
        .password-box input {
          width: 430px;
          height: 40px;
          padding: 0 13px;
          border: 1px solid #71965f;
          border-radius: 7px;
          outline: none;
          background: #ffffff;
          color: #333333;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 14px;
          box-sizing: border-box;
        }
        .input-group > input::placeholder,
        .password-box input::placeholder { color: #888888; opacity: 1; }
        .input-group > input:focus,
        .password-box input:focus {
          border: 1px solid #71965f;
          outline: none;
          box-shadow: 0 0 0 2px rgba(113, 150, 95, 0.12);
        }

        .password-box { position: relative; width: 430px; height: 40px; }
        .password-box input { padding-right: 45px; }

        .eye-button {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          width: 30px;
          height: 30px;
          padding: 0;
          border: none;
          background: transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border-radius: 50%;
          transition: background 0.15s ease;
        }
        .eye-button:hover { background: rgba(12, 94, 48, 0.08); }

        .account-options {
          width: 430px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 0;
        }
        .remember { display: flex; align-items: center; color: #000000; font-size: 12px; cursor: pointer; }
        .remember input { display: none; }
        .checkmark {
          width: 13.4px; height: 13.7px;
          margin-right: 7px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #2f6206;
          border-radius: 3px;
          background: #ffffff;
          color: #ffffff;
          font-size: 10px;
          font-weight: bold;
          line-height: 1;
        }
        .remember input:checked + .checkmark { background: #286300; border-color: #286300; }

        .forgot-password {
          padding: 0;
          border: none;
          background: transparent;
          color: #767676;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 12px;
          cursor: pointer;
        }
        .forgot-password:hover { color: #2f6206; text-decoration: underline; }

        .login-submit {
          width: 342px;
          height: 52px;
          margin: 27px auto 0 auto;
          padding: 0;
          border: none;
          border-radius: 10px;
          background: #1c4000;
          color: #ffffff;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.28);
          transition: transform 0.15s ease, filter 0.15s ease, box-shadow 0.15s ease;
        }
        .login-submit:hover {
          filter: brightness(1.08);
          transform: translateY(-1px);
          box-shadow: 0 3px 7px rgba(0, 0, 0, 0.3);
        }
        .login-submit:active { transform: translateY(1px); }
        .login-submit:disabled { opacity: 0.6; cursor: not-allowed; }

        .security-message {
          width: 430px;
          margin-top: 31px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1px;
          color: #767676;
          font-size: 12px;
          line-height: 1.2;
          text-align: center;
        }
        .security-image { width: 25px; height: 26px; display: block; object-fit: contain; flex-shrink: 0; }

        @media (max-width: 1300px) {
          .admin-card {
            transform: scale(calc((100vw - 40px) / 1249.7));
            transform-origin: center center;
          }
        }
        @media (max-height: 540px) {
          .admin-card {
            transform: scale(min(
              calc((100vw - 40px) / 1249.7),
              calc((100vh - 30px) / 500)
            ));
            transform-origin: center center;
          }
        }
        @media (max-width: 700px) {
          .admin-page { height: auto; min-height: 100vh; padding: 50px 0 30px; overflow-y: auto; align-items: flex-start; }
          .admin-card { width: 94vw; height: auto; min-height: 650px; transform: none; flex-direction: column; }
          .left-side { width: 100%; height: 250px; }
          .right-side { width: 100%; height: 450px; }
          .left-content { padding-top: 40px; padding-left: 30px; }
          .environment-text { top: 135px; left: 105px; }
          .login-area { padding-top: 40px; transform: scale(0.85); transform-origin: top center; }
        }
      `}</style>
    </>
  );
}