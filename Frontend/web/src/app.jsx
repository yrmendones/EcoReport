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
// PersistentSidebar
// ============================================================
function PersistentSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const hideOn = ["/", "/login", "/admin-login", "/forgot-password", "/reset-password"];
  if (location.pathname.startsWith("/verify-resident/")) return null;
  if (hideOn.includes(location.pathname)) return null;

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
// Admin-only route guard
// ============================================================
function RequireAdmin({ children }) {
  let role = "admin";
  try {
    const admin = JSON.parse(localStorage.getItem("admin") || "{}");
    role = admin.role || "admin";
  } catch { /* ignore */ }

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
// Root App
// ============================================================
export default function App() {
  return (
    <BrowserRouter>
      {/* Persistent sidebar */}
      <PersistentSidebar />

      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ForgotPassword />} />

        <Route path="/verify-resident/:id" element={<VerifyResident />} />

        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/report" element={<Report />} />
        <Route path="/allreport" element={<AllReport />} />
        <Route path="/allreport/:id" element={<AllReport />} />
        <Route path="/assignment" element={<Assignment />} />
        <Route path="/announcement" element={<Announcement />} />
        <Route path="/notification" element={<Notification />} />
        <Route path="/map" element={<Map />} />
        <Route path="/waste-schedule" element={<WasteSchedule />} />
        <Route path="/certificate" element={<Certificate />} />
        <Route path="/health-center" element={<HealthCenter />} />
        <Route path="/business" element={<Business />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/blotter" element={<Blotter />} />
        <Route path="/disaster-emergency" element={<DisasterEmergency />} />
        <Route path="/emergency-hotline" element={<EmergencyHotline />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/profile" element={<Profile />} />

        <Route path="/resident" element={<RequireAdmin><Resident /></RequireAdmin>} />
        <Route path="/qr" element={<RequireAdmin><QR /></RequireAdmin>} />
        <Route path="/auditlogs" element={<RequireAdmin><AuditLogs /></RequireAdmin>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}