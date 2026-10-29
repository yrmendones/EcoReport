import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch } from "../api";

const isNoMiddleName = (mid) => {
  if (!mid) return true;
  const n = String(mid).trim().toUpperCase();
  return n === "" || n === "N/A" || n === "NA" || n === "NONE" || n === "-";
};

const getFullName = (r) => {
  if (!r) return "N/A";
  const first = r.first_name || "";
  const mid = r.middle_name || "";
  const last = r.last_name || "";
  if (isNoMiddleName(mid)) return `${first} ${last}`.replace(/\s+/g, " ").trim() || "N/A";
  return `${first} ${mid} ${last}`.replace(/\s+/g, " ").trim() || "N/A";
};

const formatDate = (d) => {
  if (!d) return "N/A";
  const str = String(d).split("T")[0].split(" ")[0];
  const [y, m, day] = str.split("-");
  if (!y || !m || !day) return "N/A";
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(m, 10) - 1]} ${parseInt(day, 10)}, ${y}`;
};

export default function VerifyResident() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [resident, setResident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchResident = async () => {
      try {
        setLoading(true);
        const data = await apiFetch(`/api/public/verify-token/${encodeURIComponent(token)}`);
        setResident(data);
      } catch (err) {
        console.error("Error fetching resident:", err);
        setError(err.message || "QR Code is invalid or has expired.");
      } finally {
        setLoading(false);
      }
    };
    fetchResident();
  }, [token]);

  const getStatus = () => {
    if (!resident) return "Pending Verification";
    if (resident.verification_status) return resident.verification_status;
    return resident.is_verified ? "Verified Resident" : "Pending Verification";
  };

  const status = getStatus();
  const statusClass =
    status === "Verified Resident" ? "verified"
    : status === "Rejected" ? "rejected"
    : "pending";

  if (loading) {
    return (
      <div className="vr-page">
        <div className="vr-card">
          <div className="vr-spinner" />
          <p>Verifying resident...</p>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  if (error || !resident) {
    return (
      <div className="vr-page">
        <div className="vr-card">
          <div className="vr-icon-box vr-icon-error">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2>Invalid or Expired Link</h2>
          <p>{error || "This QR code may have expired. Please ask the resident to refresh their QR code."}</p>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="vr-page">
      <div className="vr-card">
        <div className="vr-brand">
          <img src="/leaf.png" alt="EcoReport" className="vr-leaf" />
          <span>EcoReport</span>
        </div>

        <p className="vr-subtitle">Barangay Sto. Rosario Kanluran</p>
        <h1 className="vr-title">Resident Verification</h1>

        {/* Status badge */}
        <div className={`vr-status ${statusClass}`} style={{ marginTop: '20px' }}>
          {status === "Verified Resident" && "✓ "}
          {status === "Rejected" && "✕ "}
          {status}
        </div>

        {/* Info */}
        <div className="vr-info">
          <InfoRow label="Resident ID" value={resident.resident_id} />
          <InfoRow label="Full Name" value={getFullName(resident)} />
          <InfoRow label="Address" value={resident.address || "—"} />
          <InfoRow label="Contact" value={resident.contact_number || "—"} />
          <InfoRow label="Date Registered" value={formatDate(resident.registered_at)} last />
        </div>

        <p className="vr-footer">
          This page confirms the resident's identity as registered with Barangay Sto. Rosario Kanluran.
        </p>
      </div>

      <style>{styles}</style>
    </div>
  );
}

function InfoRow({ label, value, last = false }) {
  return (
    <div className={`vr-row ${last ? "vr-row-last" : ""}`}>
      <span className="vr-label">{label}</span>
      <span className="vr-value">{value}</span>
    </div>
  );
}

const styles = `
  * { box-sizing: border-box; }
  html, body, #root { margin: 0; padding: 0; width: 100%; height: 100%; }

  .vr-page {
    width: 100vw;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #E8F5E3 0%, #DCEFD8 100%);
    padding: 24px 16px;
    font-family: Arial, Helvetica, sans-serif;
  }

  .vr-card {
    width: 100%;
    max-width: 480px;
    background: #ffffff;
    border-radius: 20px;
    box-shadow: 0 20px 60px rgba(11, 93, 42, 0.15);
    padding: 40px 36px 32px;
    text-align: center;
  }

  .vr-brand {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    color: #0B5D2A;
    font-size: 22px;
    font-weight: 800;
    margin-bottom: 6px;
  }
  .vr-leaf { width: 38px; height: 40px; object-fit: contain; }

  .vr-subtitle { color: #666; font-size: 12px; margin: 0 0 4px 0; font-weight: 500; }
  .vr-title { color: #0B5D2A; font-size: 20px; font-weight: 800; margin: 0 0 24px 0; }

  .vr-status {
    display: inline-block;
    padding: 8px 24px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 800;
    margin-bottom: 26px;
    letter-spacing: 0.3px;
  }
  .vr-status.verified { background: #E5F5E9; color: #1c5e30; border: 1px solid #A9C9A1; }
  .vr-status.pending  { background: #FFF8D8; color: #856400; border: 1px solid #D6C66A; }
  .vr-status.rejected { background: #FDECEC; color: #a71d1d; border: 1px solid #e5b5b5; }

  .vr-info {
    background: #F8FAF8;
    border: 1px solid #E0E7E0;
    border-radius: 12px;
    overflow: hidden;
    text-align: left;
    margin-bottom: 22px;
  }
  .vr-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    padding: 13px 18px;
    border-bottom: 1px solid #E0E7E0;
  }
  .vr-row-last { border-bottom: none; }
  .vr-label { color: #666; font-size: 12px; font-weight: 700; flex-shrink: 0; }
  .vr-value { color: #222; font-size: 12px; text-align: right; word-break: break-word; font-weight: 500; }

  .vr-footer {
    color: #888;
    font-size: 11px;
    line-height: 1.6;
    margin: 0;
    padding-top: 6px;
  }

  .vr-icon-box {
    width: 72px; height: 72px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 16px;
  }
  .vr-icon-error { background: #FDECEC; }

  .vr-spinner {
    width: 40px; height: 40px;
    border: 3px solid #E8F5E3;
    border-top-color: #0B5D2A;
    border-radius: 50%;
    animation: vr-spin 0.8s linear infinite;
    margin: 0 auto 16px;
  }
  @keyframes vr-spin { to { transform: rotate(360deg); } }
`;