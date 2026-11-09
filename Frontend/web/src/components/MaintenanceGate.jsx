import { useEffect, useState } from "react";
import { apiFetch } from "../api";

/**
 * Wraps routes that should be blocked while maintenance mode is ON.
 * Staff (admin / barangay_official) bypass the block so they can turn it off.
 *
 * Not applied to:
 *   - /admin-login (the escape hatch — must always work)
 *   - /forgot-password (staff recovery)
 *   - /verify-resident/:token (staff verification tool)
 */
export default function MaintenanceGate({ children }) {
  const [state, setState] = useState(null); // null = checking

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch("/api/public/status");
        if (cancelled) return;
        setState({
          enabled: !!data.maintenance_mode,
          message: data.maintenance_message || "The app is under maintenance. Please try again later.",
        });
      } catch {
        if (!cancelled) setState({ enabled: false, message: "" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === null) {
    return (
      <div className="min-h-screen bg-[#E5E7EB] flex items-center justify-center">
        <p className="text-[#0B5D2A] font-bold text-sm">Loading…</p>
      </div>
    );
  }

  if (!state.enabled) return children;

  // Staff bypass
  let isStaff = false;
  try {
    const token = localStorage.getItem("token");
    const admin = JSON.parse(localStorage.getItem("admin") || "{}");
    isStaff =
      !!token &&
      (admin.role === "admin" || admin.role === "barangay_official");
  } catch {
    isStaff = false;
  }
  if (isStaff) return children;

  // Non-staff or no session → show maintenance screen
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#E5E7EB",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "16px",
          border: "1px solid #FCD34D",
          boxShadow: "0 6px 24px rgba(0,0,0,0.10)",
          maxWidth: "440px",
          width: "100%",
          padding: "36px 28px",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            background: "#FEF3C7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto",
            fontSize: "28px",
          }}
        >
          🛠️
        </div>
        <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#111" }}>
          Under Maintenance
        </h1>
        <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.6, color: "#555" }}>
          {state.message}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            marginTop: "8px",
            width: "100%",
            height: "44px",
            borderRadius: "8px",
            border: "none",
            background: "#0B5D2A",
            color: "#fff",
            fontWeight: 800,
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          Try Again
        </button>
        <a
          href="/admin-login"
          style={{
            width: "100%",
            height: "44px",
            borderRadius: "8px",
            border: "1px solid #0B5D2A",
            background: "#fff",
            color: "#0B5D2A",
            fontWeight: 800,
            fontSize: "14px",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          Staff Login
        </a>
      </div>
    </div>
  );
}