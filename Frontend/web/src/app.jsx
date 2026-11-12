import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate, useLocation } from "react-router-dom";
import { apiFetch } from "./api";
import { getMenuSections } from "./menu";
import MaintenanceGate from "./components/MaintenanceGate";
import { DEFAULT_BARANGAY, fetchBarangayInfo } from "./utils/barangay";

// Public
import LoginPage from "./pages/loginpage";
import AdminLogin from "./pages/adminlogin";
import ForgotPassword from "./pages/forgotpassword";
import VerifyResident from "./pages/verifyresident";

// Admin-only pages
import AdminDashboard from "./pages/admindashboard";
import UserManagement from "./pages/usermanagement";
import AccountVerification from "./pages/accountverification";
import MonitorActivities from "./pages/monitoractivities";
import GenerateReports from "./pages/generatereports";
import SystemSettings from "./pages/systemsettings";
import AuditLogs from "./pages/auditlogs";

// Barangay official pages
import Dashboard from "./pages/dashboard";
import Report from "./pages/report";
import AllReport from "./pages/allreport";
import Assignment from "./pages/assignment";
import Resident from "./pages/resident";
import QRVerification from "./pages/qrverification";
import Announcement from "./pages/announcement";
import Notification from "./pages/notification";
import MapPage from "./pages/map";
import WasteSchedule from "./pages/wasteschedule";
import Certificate from "./pages/certificate";
import HealthCenter from "./pages/healthcenter";
import EmergencyHotline from "./pages/emergencyhotline";
import Inventory from "./pages/inventory";
import Blotter from "./pages/blotter";
import DisasterEmergency from "./pages/disasteremergency";
import Analytics from "./pages/analytics";
import Profile from "./pages/profile";

// ============================================================
// AUTH HELPERS
// ============================================================
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
// RequireStaff — admin OR barangay_official (used for Profile)
// ============================================================
function RequireStaff({ children }) {
  const { token, role } = readAuth();
  const isStaff = role === "admin" || role === "barangay_official";
  if (!token || !isStaff) return <Navigate to="/admin-login" replace />;
  return children;
}

// ============================================================
// RequireAdmin — strictly admin
// ============================================================
function RequireAdmin({ children }) {
  const { token, role } = readAuth();
  if (!token) return <Navigate to="/admin-login" replace />;

  if (role !== "admin") {
    return (
      <AccessDenied
        title="Admin Only"
        message="This page is only available to the System Administrator."
        backHref="/dashboard"
        backLabel="Back to Dashboard"
      />
    );
  }
  return children;
}

// ============================================================
// RequireOfficial — strictly barangay_official
// ============================================================
function RequireOfficial({ children }) {
  const { token, role } = readAuth();
  if (!token) return <Navigate to="/admin-login" replace />;

  if (role !== "barangay_official") {
    return (
      <AccessDenied
        title="Barangay Official Only"
        message="This page is only available to Barangay Officials."
        backHref="/admindashboard"
        backLabel="Back to Admin Dashboard"
      />
    );
  }
  return children;
}

// ============================================================
// Access Denied panel
// ============================================================
function AccessDenied({ title, message, backHref, backLabel }) {
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
        {title}
      </h1>
      <p style={{ fontSize: "14px", color: "#555", marginBottom: "24px", maxWidth: "400px" }}>
        {message}
      </p>
      <a
        href={backHref}
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
        {backLabel}
      </a>
    </div>
  );
}

// ============================================================
// PersistentSidebar - renders the role-filtered menu
// ============================================================
function PersistentSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch barangay name once on mount. Hooks must run before the early
  // returns below (rules of hooks). The helper caches, so even when the
  // sidebar is hidden the cost is one request per full page load.
  const [barangay, setBarangay] = useState(DEFAULT_BARANGAY);
  useEffect(() => {
    let cancelled = false;
    fetchBarangayInfo(apiFetch).then((info) => {
      if (!cancelled) setBarangay(info);
    });
    return () => { cancelled = true; };
  }, []);

  const hideOn = ["/", "/login", "/admin-login", "/forgot-password", "/reset-password"];
  if (location.pathname.startsWith("/verify-resident/")) return null;
  if (hideOn.includes(location.pathname)) return null;

  const { token, role } = readAuth();
  if (!token || (role !== "admin" && role !== "barangay_official")) return null;

  const menuSections = getMenuSections(location.pathname);
  if (menuSections.length === 0) return null;

  return (
    <aside className="persistent-sidebar">
      <img src="/sidebar.png" alt="" className="persistent-sidebar-bg" />
      <div className="persistent-sidebar-overlay"></div>
      <div className="persistent-sidebar-content">
        <div className="persistent-sidebar-brand">
          <img src="/lightleaf.png" alt="EcoReport" className="persistent-sidebar-brand-img" />
          <span className="persistent-sidebar-brand-name">EcoReport</span>
        </div>
        <div className="persistent-sidebar-barangay">{barangay.name}</div>
        <nav className="persistent-sidebar-menu">
          {menuSections.map((section, si) => (
            <div key={si} className="persistent-menu-section">
              {section.title && (
                <div className="persistent-menu-section-title">
                  {section.title}
                </div>
              )}
              {section.items.map((item, index) => (
                <button
                  key={`${si}-${index}`}
                  type="button"
                  className={`persistent-menu-item ${item.active ? "active" : ""}`}
                  onClick={() => navigate(item.path)}
                >
                  <img src={item.icon} alt="" className="persistent-menu-icon" />
                  <span className="persistent-menu-text">{item.name}</span>
                </button>
              ))}
            </div>
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
        {/* ---------- ESCAPE HATCHES (always accessible) ---------- */}
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ForgotPassword />} />
        <Route path="/verify-resident/:token" element={<VerifyResident />} />

        {/* ---------- MAINTENANCE-GATED (blocked unless staff) ---------- */}
        <Route element={<MaintenanceGate><Outlet /></MaintenanceGate>}>
          {/* Public landing */}
          <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* ADMIN ONLY */}
          <Route path="/admindashboard" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
          <Route path="/usermanagement" element={<RequireAdmin><UserManagement /></RequireAdmin>} />
          <Route path="/account-verification" element={<RequireAdmin><AccountVerification /></RequireAdmin>} />
          <Route path="/monitoractivities" element={<RequireAdmin><MonitorActivities /></RequireAdmin>} />
          <Route path="/generatereports" element={<RequireAdmin><GenerateReports /></RequireAdmin>} />
          <Route path="/systemsettings" element={<RequireAdmin><SystemSettings /></RequireAdmin>} />
          <Route path="/auditlogs" element={<RequireAdmin><AuditLogs /></RequireAdmin>} />

          {/* BARANGAY OFFICIAL ONLY */}
          <Route path="/dashboard" element={<RequireOfficial><Dashboard /></RequireOfficial>} />
          <Route path="/report" element={<RequireOfficial><Report /></RequireOfficial>} />
          <Route path="/allreport" element={<RequireOfficial><AllReport /></RequireOfficial>} />
          <Route path="/allreport/:id" element={<RequireOfficial><AllReport /></RequireOfficial>} />
          <Route path="/assignment" element={<RequireOfficial><Assignment /></RequireOfficial>} />
          <Route path="/resident" element={<RequireOfficial><Resident /></RequireOfficial>} />
          <Route path="/qr-verification" element={<RequireOfficial><QRVerification /></RequireOfficial>} />
          <Route path="/announcement" element={<RequireOfficial><Announcement /></RequireOfficial>} />
          <Route path="/notification" element={<RequireOfficial><Notification /></RequireOfficial>} />
          <Route path="/map" element={<RequireOfficial><MapPage /></RequireOfficial>} />
          <Route path="/waste-schedule" element={<RequireOfficial><WasteSchedule /></RequireOfficial>} />
          <Route path="/certificate" element={<RequireOfficial><Certificate /></RequireOfficial>} />
          <Route path="/health-center" element={<RequireOfficial><HealthCenter /></RequireOfficial>} />
          <Route path="/emergency-hotline" element={<RequireOfficial><EmergencyHotline /></RequireOfficial>} />
          <Route path="/inventory" element={<RequireOfficial><Inventory /></RequireOfficial>} />
          <Route path="/blotter" element={<RequireOfficial><Blotter /></RequireOfficial>} />
          <Route path="/disaster-emergency" element={<RequireOfficial><DisasterEmergency /></RequireOfficial>} />
          <Route path="/analytics" element={<RequireOfficial><Analytics /></RequireOfficial>} />

          {/* SHARED (both roles) */}
          <Route path="/profile" element={<RequireStaff><Profile /></RequireStaff>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}