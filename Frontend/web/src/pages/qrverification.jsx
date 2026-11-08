import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { apiFetch } from "../api";
import { getMenuItems } from "../menu";
import ProfileHeaderButton from "../components/ProfileHeaderButton";

const SCANNER_ELEMENT_ID = "qr-scanner-viewport";

// Extract the token from a scanned QR string.
// QR content is normally the full URL: https://<web>/verify-resident/<token>
// If someone scans a bare token, we still accept it.
const extractToken = (raw) => {
  if (!raw) return null;
  const trimmed = String(raw).trim();

  const urlMatch = trimmed.match(/\/verify-resident\/([A-Za-z0-9]+)/);
  if (urlMatch) return urlMatch[1];

  // Bare token: 64-char hex typical from generateQRToken
  if (/^[A-Za-z0-9]{20,}$/.test(trimmed)) return trimmed;

  return null;
};

export default function QRVerification() {
  const navigate = useNavigate();
  const menuItems = getMenuItems("/qr-verification");

  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [pastedValue, setPastedValue] = useState("");
  const [pasteError, setPasteError] = useState("");
  const scannerRef = useRef(null);

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, []);

  const goToVerification = (token) => {
    navigate(`/verify-resident/${token}`);
  };

  // ─────────────────────────────────────────────
  // START SCANNER
  // ─────────────────────────────────────────────
  const startScanner = async () => {
    setCameraError("");
    setScanning(true);

    // Wait a tick so #qr-scanner-viewport is in the DOM
    await new Promise((r) => setTimeout(r, 100));

    try {
      const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          const token = extractToken(decodedText);
          if (!token) return;

          // Stop immediately on successful decode
          scanner.stop().then(() => scanner.clear()).catch(() => {});
          scannerRef.current = null;
          setScanning(false);
          goToVerification(token);
        },
        () => {} // ignore per-frame decode errors (normal while scanning)
      );
    } catch (err) {
      console.error("Scanner start failed:", err);
      setCameraError(
        "Camera unavailable. Please allow camera access, or use the paste field below."
      );
      setScanning(false);
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
          await scannerRef.current.clear();
        } catch { /* ignore */ }
        scannerRef.current = null;
      }
    }
  };

  const stopScanner = async () => {
    if (!scannerRef.current) {
      setScanning(false);
      return;
    }
    try {
      await scannerRef.current.stop();
      await scannerRef.current.clear();
    } catch { /* ignore */ }
    scannerRef.current = null;
    setScanning(false);
  };

  // ─────────────────────────────────────────────
  // PASTE HANDLER
  // ─────────────────────────────────────────────
  const handlePasteSubmit = () => {
    setPasteError("");
    const token = extractToken(pastedValue);
    if (!token) {
      setPasteError(
        "That doesn't look like a valid verification token or URL. Paste the full URL (with /verify-resident/...) or the token itself."
      );
      return;
    }
    goToVerification(token);
  };

  return (
    <>
      <div className="qr-page">
        <aside className="sidebar">
          <img src="/sidebar.png" alt="" className="sidebar-background" />
          <div className="sidebar-overlay"></div>
          <div className="sidebar-content">
            <div className="sidebar-brand">
              <img src="/lightleaf.png" alt="EcoReport" className="sidebar-brand-image" />
              <span className="sidebar-brand-name">EcoReport</span>
            </div>
            <div className="sidebar-barangay">Barangay Sto. Rosario Kanluran</div>
            <nav className="sidebar-menu">
              {menuItems.map((item, index) => (
                <button
                  key={index}
                  type="button"
                  className={`menu-item ${item.active ? "active" : ""}`}
                  onClick={() => navigate(item.path)}
                >
                  <img src={item.icon} alt="" className="menu-icon" />
                  <span className="menu-text">{item.name}</span>
                </button>
              ))}
            </nav>
          </div>
        </aside>

        <main className="main-content">
          <header className="top-header">
            <h2>QR Verification</h2>
            <ProfileHeaderButton />
          </header>

          <section className="qr-content">
            <div className="qr-intro">
              <h1 className="qr-title">Verify a Resident</h1>
              <p className="qr-subtitle">
                Ask the resident to open <strong>EcoReport → Profile → QR Code</strong> on their phone,
                then scan their QR below. Their info appears in a new page with a Print button.
              </p>
            </div>

            {/* SCANNER CARD */}
            <div className="qr-card">
              <div className="qr-card-title">
                Scan QR Code
                {!scanning && (
                  <button type="button" className="qr-start-btn" onClick={startScanner}>
                    📷 Open Camera
                  </button>
                )}
                {scanning && (
                  <button type="button" className="qr-stop-btn" onClick={stopScanner}>
                    Stop
                  </button>
                )}
              </div>

              <div className="scanner-wrapper">
                {!scanning && !cameraError && (
                  <div className="scanner-placeholder">
                    <div className="scanner-frame">
                      <div className="scanner-corners" />
                    </div>
                    <p className="scanner-hint">
                      Point the camera at the resident's QR code.
                    </p>
                  </div>
                )}

                <div
                  id={SCANNER_ELEMENT_ID}
                  className="scanner-viewport"
                  style={{ display: scanning ? "block" : "none" }}
                />

                {cameraError && (
                  <div className="scanner-error">{cameraError}</div>
                )}
              </div>
            </div>

            {/* PASTE FALLBACK */}
            <div className="qr-card">
              <div className="qr-card-title">
                Or paste the verification link
              </div>
              <p className="qr-card-hint">
                If the camera isn't available, paste the URL the resident's QR points to
                (format: <code>https://your-web.pages.dev/verify-resident/&lt;token&gt;</code>)
                or the token itself.
              </p>

              <div className="paste-row">
                <input
                  type="text"
                  className="paste-input"
                  placeholder="Paste verification URL or token"
                  value={pastedValue}
                  onChange={(e) => {
                    setPastedValue(e.target.value);
                    setPasteError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handlePasteSubmit();
                  }}
                />
                <button
                  type="button"
                  className="paste-submit"
                  onClick={handlePasteSubmit}
                  disabled={!pastedValue.trim()}
                >
                  Open Verification
                </button>
              </div>
              {pasteError && <div className="paste-error">{pasteError}</div>}
            </div>

            {/* INSTRUCTIONS */}
            <div className="qr-card instructions-card">
              <div className="qr-card-title">How this works</div>
              <ol className="instructions-list">
                <li>Resident opens <strong>Profile → QR Code</strong> in the mobile app. The QR refreshes every 10 minutes for security.</li>
                <li>The official scans it here (or on their phone with the native camera).</li>
                <li>A verification page opens showing the resident's ID, name, address, and verification status.</li>
                <li>Click <strong>Print Resident Info</strong> at the bottom of that page to produce a physical record for the barangay file.</li>
              </ol>
              <p className="instructions-note">
                <strong>Note:</strong> The QR scan is read-only. Approving or rejecting accounts is
                done in <em>Account Verification</em> (admin only). This page only confirms
                identity in person.
              </p>
            </div>
          </section>
        </main>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        html, body, #root { margin: 0; padding: 0; width: 100%; height: 100%; }
        body { font-family: Arial, Helvetica, sans-serif; background: #ffffff; overflow: hidden; }

        .qr-page {
          width: 100vw; height: 100vh; display: flex;
          background: #ffffff; overflow: hidden;
        }

        /* SIDEBAR */
        .sidebar {
          position: relative; width: 320px; min-width: 320px;
          height: 100vh; flex-shrink: 0; background: #13471e; overflow: hidden;
        }
        .sidebar-background {
          position: absolute; inset: 0; width: 100%; height: 100%;
          object-fit: cover; object-position: center; z-index: 0; pointer-events: none;
        }
        .sidebar-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(180deg, rgba(3,77,30,0.91) 0%, rgba(3,76,29,0.87) 100%);
          z-index: 1; pointer-events: none;
        }
        .sidebar-content { position: relative; z-index: 2; width: 100%; height: 100%; }
        .sidebar-brand { height: 86px; display: flex; align-items: center; padding-left: 36px; gap: 10px; }
        .sidebar-brand-image { width: 51.7px; height: 54px; object-fit: contain; display: block; flex-shrink: 0; }
        .sidebar-brand-name { color: #fff9df; font-size: 20px; font-weight: 800; line-height: 1; white-space: nowrap; }
        .sidebar-barangay {
          height: 5px; display: flex; align-items: center; padding-left: 70px;
          color: #fff9df; font-size: 11px; font-weight: 500;
          border-bottom: 1px solid rgba(255,255,255,0.14);
        }
        .sidebar-menu {
          width: 100%; padding-top: 5px;
          max-height: calc(100vh - 96px); overflow-y: auto;
        }
        .menu-item {
          width: 100%; height: 30px; border: none; margin: 0;
          padding: 0 14px 0 42px; display: flex; align-items: center; gap: 14px;
          background: transparent; color: #ffffff;
          font-family: inherit; font-size: 15px; font-weight: 500;
          text-align: left; cursor: pointer; transition: background 0.15s ease;
        }
        .menu-item:hover { background: rgba(255,255,255,0.09); }
        .menu-item.active { background: rgba(0,0,0,0.28); padding-left: 38px; font-weight: 700; }
        .menu-icon { width: 30px; height: 28px; object-fit: contain; display: block; flex-shrink: 0; }
        .menu-text { white-space: nowrap; line-height: 1; }

        /* MAIN */
        .main-content {
          width: calc(100vw - 320px); height: 100vh; min-width: 0;
          padding: 0 12px 10px 12px; overflow: hidden; background: #ffffff;
        }
        .top-header {
          width: calc(100% + 24px); height: 76px; margin-left: -12px;
          padding: 0 24px 0 18px;
          display: flex; align-items: center; justify-content: space-between;
          background: #13471e;
        }
        .top-header h2 { margin: 0; color: #ffffff; font-size: 12px; font-weight: 800; line-height: 1; }

        /* CONTENT */
        .qr-content {
          width: 100%; height: calc(100vh - 76px);
          padding: 20px 6px 24px 6px;
          overflow-y: auto; background: #f4f8f4;
        }

        .qr-intro {
          margin-bottom: 18px;
          padding: 20px 24px;
          background: #ffffff;
          border: 1px solid #D5E4D1;
          border-radius: 6px;
        }
        .qr-title {
          margin: 0 0 6px 0;
          font-size: 20px; font-weight: 800; color: #13471e;
        }
        .qr-subtitle {
          margin: 0; font-size: 12px; line-height: 1.6; color: #555;
        }
        .qr-subtitle strong { color: #0B5D2A; }

        .qr-card {
          margin-bottom: 14px;
          padding: 16px 18px;
          background: #ffffff;
          border: 1px solid #D5E4D1;
          border-radius: 6px;
        }
        .qr-card-title {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px;
          font-size: 13px; font-weight: 800; color: #13471e;
          margin-bottom: 12px;
        }
        .qr-card-hint {
          margin: 0 0 12px 0; font-size: 11px; line-height: 1.6; color: #555;
        }
        .qr-card-hint code {
          background: #f0f5f0;
          padding: 2px 6px; border-radius: 3px;
          font-family: Consolas, monospace; font-size: 10px;
        }

        .qr-start-btn, .qr-stop-btn {
          height: 32px; padding: 0 16px;
          border: none; border-radius: 4px;
          font-family: inherit; font-size: 11px; font-weight: 700;
          cursor: pointer; transition: background 0.15s ease;
        }
        .qr-start-btn { background: #347145; color: #ffffff; }
        .qr-start-btn:hover { background: #285d37; }
        .qr-stop-btn { background: #c62828; color: #ffffff; }
        .qr-stop-btn:hover { background: #a52020; }

        /* SCANNER */
        .scanner-wrapper {
          position: relative;
          min-height: 280px;
          background: #0f1f12;
          border-radius: 6px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .scanner-placeholder {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 16px; padding: 40px 20px;
          text-align: center;
        }
        .scanner-frame {
          position: relative;
          width: 200px; height: 200px;
          border: 2px dashed rgba(255,255,255,0.5);
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
        }
        .scanner-corners {
          width: 100%; height: 100%;
          background-image:
            linear-gradient(45deg, transparent 45%, #bbf18f 45%, #bbf18f 55%, transparent 55%),
            linear-gradient(-45deg, transparent 45%, #bbf18f 45%, #bbf18f 55%, transparent 55%);
          background-size: 20px 20px;
          background-position: top left, bottom right;
          background-repeat: no-repeat;
        }
        .scanner-hint {
          margin: 0; color: #bbf18f; font-size: 12px;
        }

        .scanner-viewport {
          width: 100%;
          min-height: 280px;
          display: none;
        }
        .scanner-viewport video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover;
          border-radius: 6px;
        }
        .scanner-viewport img[alt="Info icon"] { display: none; }

        .scanner-error {
          padding: 40px 20px;
          color: #ffb8b8;
          text-align: center;
          font-size: 12px;
          line-height: 1.6;
        }

        /* PASTE */
        .paste-row {
          display: flex; gap: 8px;
        }
        .paste-input {
          flex: 1; min-width: 0;
          height: 40px; padding: 0 12px;
          border: 1px solid #b7b7b7; border-radius: 4px;
          background: #ffffff; color: #333;
          font-family: Consolas, monospace;
          font-size: 11px;
          outline: none;
        }
        .paste-input:focus { border-color: #0B5D2A; }
        .paste-submit {
          height: 40px; padding: 0 18px;
          border: none; border-radius: 4px;
          background: #347145; color: #ffffff;
          font-family: inherit; font-size: 11px; font-weight: 700;
          cursor: pointer; white-space: nowrap;
          transition: background 0.15s ease;
        }
        .paste-submit:hover:not(:disabled) { background: #285d37; }
        .paste-submit:disabled { opacity: 0.55; cursor: not-allowed; }

        .paste-error {
          margin-top: 8px;
          font-size: 11px; color: #b91c1c;
          line-height: 1.5;
        }

        /* INSTRUCTIONS */
        .instructions-card {
          background: #F0F8ED;
          border-color: #BFE3C8;
        }
        .instructions-list {
          margin: 0 0 12px 0;
          padding-left: 22px;
          font-size: 12px; line-height: 1.8; color: #333;
        }
        .instructions-list li { margin-bottom: 6px; }
        .instructions-note {
          margin: 0; padding: 10px 12px;
          background: #ffffff;
          border-radius: 4px;
          font-size: 11px; line-height: 1.6; color: #555;
        }

        @media (max-width: 1100px) {
          .sidebar { width: 300px; min-width: 300px; }
          .main-content { width: calc(100vw - 300px); }
        }
      `}</style>
    </>
  );
}