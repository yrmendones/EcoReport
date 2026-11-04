import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { getMenuItems } from "./menu";

import LoginPage from "./pages/loginpage";
import AdminLogin from "./pages/adminlogin";
import ForgotPassword from "./pages/forgotpassword";
import VerifyResident from "./pages/verifyresident";
import Dashboard from "./pages/dashboard";
import Report from "./pages/report";
import AllReport from "./pages/allreport";
import Assignment from "./pages/assignment";
import Resident from "./pages/resident";
import QR from "./pages/qr";
import Announcement from "./pages/announcement";
import Notification from "./pages/notification";
import Map from "./pages/map";
import WasteSchedule from "./pages/wasteschedule";
import Certificate from "./pages/certificate";
import HealthCenter from "./pages/healthcenter";
import Business from "./pages/business";
import Inventory from "./pages/inventory";
import Blotter from "./pages/blotter";
import DisasterEmergency from "./pages/disasteremergency";
import EmergencyHotline from "./pages/emergencyhotline";
import Analytics from "./pages/analytics";
import AuditLogs from "./pages/auditlogs";
import Profile from "./pages/profile";

// ============================================================
// AUTH HELPERS
// ============================================================
// Single source of truth for "who is logged in right now".
// Guards and sidebar both call this so they can never disagree.
function readAuth() {
  const token = localStorage.getItem("token");
  if (!token) return { token: null, role: null };
  try {
    const admin = JSON.parse(localStorage.getItem("admin") || "{}");
    return { token, role: admin.role || null };
  } catch {
    return { token, role: null };
  }
}

// ============================================================
// RequireStaff - admin OR barangay_official
// ============================================================
function RequireStaff({ children }) {
  const { token, role } = readAuth();
  const isStaff = role === "admin" || role === "barangay_official";
  if (!token || !isStaff) {
    return <Navigate to="/admin-login" replace />;
  }
  return children;
}

// ============================================================
// RequireAdmin - strictly admin
// ============================================================
function RequireAdmin({ children }) {
  const { token, role } = readAuth();

  // Not logged in at all → redirect to login
  if (!token) {
    return <Navigate to="/admin-login" replace />;
  }

  // Logged in but not an admin (i.e. barangay_official) → show denial
  if (role !== "admin") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          fontFamily: "Arial, sans-serif",
          background: "#F8FAF8",
          color: "#222",
          textAlign: "center",
          padding: "40px",
        }}
      >
        <h1 style={{ color: "#0B5D2A", fontSize: "28px", marginBottom: "12px" }}>
          Access Denied
        </h1>
        <p style={{ fontSize: "14px", color: "#555", marginBottom: "24px", maxWidth: "400px" }}>
          This page is only available to the system administrator.
        </p>
        <a
          href="/dashboard"
          style={{
            background: "#0B5D2A",
            color: "#fff",
            padding: "10px 24px",
            borderRadius: "6px",
            textDecoration: "none",
            fontWeight: 700,
            fontSize: "13px",
          }}
        >
          Back to Dashboard
        </a>
      </div>
    );
  }

  return children;
}

// ============================================================
// PersistentSidebar
// ============================================================
function PersistentSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const hideOn = ["/", "/login", "/admin-login", "/forgot-password", "/reset-password"];
  if (location.pathname.startsWith("/verify-resident/")) return null;
  if (hideOn.includes(location.pathname)) return null;

  // Do not render the sidebar for logged-out visitors. Without this, redirected to /admin-login.
  const { token, role } = readAuth();
  if (!token || (role !== "admin" && role !== "barangay_official")) return null;

  const menuItems = getMenuItems(location.pathname);

  return (
    <aside className="persistent-sidebar">
      <img src="/sidebar.png" alt="" className="persistent-sidebar-bg" />
      <div className="persistent-sidebar-overlay"></div>
      <div className="persistent-sidebar-content">
        <div className="persistent-sidebar-brand">
          <img src="/lightleaf.png" alt="EcoReport" className="persistent-sidebar-brand-img" />
          <span className="persistent-sidebar-brand-name">EcoReport</span>
        </div>
        <div className="persistent-sidebar-barangay">Barangay Sto. Rosario Kanluran</div>
        <nav className="persistent-sidebar-menu">
          {menuItems.map((item, index) => (
            <button
              key={index}
              type="button"
              className={`persistent-menu-item ${item.active ? "active" : ""}`}
              onClick={() => navigate(item.path)}
            >
              <img src={item.icon} alt="" className="persistent-menu-icon" />
              <span className="persistent-menu-text">{item.name}</span>
            </button>
          ))}
        </nav>
      </div>
    </aside>
  );
}

// ============================================================
// Root App
// ============================================================
export default function App() {
  return (
    <BrowserRouter>
      <PersistentSidebar />

      <Routes>
        {/* ---------- Public ---------- */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ForgotPassword />} />
        <Route path="/verify-resident/:token" element={<VerifyResident />} />

        {/* ---------- Staff (admin OR barangay_official) ---------- */}
        <Route path="/dashboard" element={<RequireStaff><Dashboard /></RequireStaff>} />
        <Route path="/report" element={<RequireStaff><Report /></RequireStaff>} />
        <Route path="/allreport" element={<RequireStaff><AllReport /></RequireStaff>} />
        <Route path="/allreport/:id" element={<RequireStaff><AllReport /></RequireStaff>} />
        <Route path="/assignment" element={<RequireStaff><Assignment /></RequireStaff>} />
        <Route path="/announcement" element={<RequireStaff><Announcement /></RequireStaff>} />
        <Route path="/notification" element={<RequireStaff><Notification /></RequireStaff>} />
        <Route path="/map" element={<RequireStaff><Map /></RequireStaff>} />
        <Route path="/waste-schedule" element={<RequireStaff><WasteSchedule /></RequireStaff>} />
        <Route path="/certificate" element={<RequireStaff><Certificate /></RequireStaff>} />
        <Route path="/health-center" element={<RequireStaff><HealthCenter /></RequireStaff>} />
        <Route path="/business" element={<RequireStaff><Business /></RequireStaff>} />
        <Route path="/inventory" element={<RequireStaff><Inventory /></RequireStaff>} />
        <Route path="/blotter" element={<RequireStaff><Blotter /></RequireStaff>} />
        <Route path="/disaster-emergency" element={<RequireStaff><DisasterEmergency /></RequireStaff>} />
        <Route path="/emergency-hotline" element={<RequireStaff><EmergencyHotline /></RequireStaff>} />
        <Route path="/analytics" element={<RequireStaff><Analytics /></RequireStaff>} />
        <Route path="/profile" element={<RequireStaff><Profile /></RequireStaff>} />

        {/* ---------- Admin only ---------- */}
        <Route path="/resident" element={<RequireAdmin><Resident /></RequireAdmin>} />
        <Route path="/qr" element={<RequireAdmin><QR /></RequireAdmin>} />
        <Route path="/auditlogs" element={<RequireAdmin><AuditLogs /></RequireAdmin>} />

        {/* ---------- Fallback ---------- */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}