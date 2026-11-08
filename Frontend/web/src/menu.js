// ============================================================
// ROLE-BASED MENU
// ============================================================

const ADMIN_PATHS = [
  "/admindashboard",
  "/usermanagement",
  "/account-verification",
  "/monitoractivities",
  "/generatereports",
  "/systemsettings",
  "/auditlogs",
];

const OFFICIAL_PATHS = [
  "/dashboard",
  "/report",
  "/allreport",
  "/assignment",
  "/resident",
  "/qr-verification",
  "/announcement",
  "/notification",
  "/map",
  "/waste-schedule",
  "/certificate",
  "/health-center",
  "/emergency-hotline",
  "/inventory",
  "/blotter",
  "/disaster-emergency",
  "/analytics",
];

const ALL_MENU_ITEMS = [
  // ─── Admin pages ───
  { name: "Admin Dashboard",       icon: "/icons/dashboard.png",     path: "/admindashboard" },
  { name: "User Management",       icon: "/icons/resident.png",      path: "/usermanagement" },
  { name: "Account Verification",  icon: "/icons/qr.png",            path: "/account-verification" },
  { name: "Monitor Activities",    icon: "/icons/analytics.png",     path: "/monitoractivities" },
  { name: "Generate Reports",      icon: "/icons/report.png",        path: "/generatereports" },
  { name: "Audit Logs",            icon: "/icons/auditlogs.png",     path: "/auditlogs" },
  { name: "System Settings",       icon: "/icons/systemsettings.png", path: "/systemsettings" },

  // ─── Barangay Official pages ───
  { name: "Dashboard",             icon: "/icons/dashboard.png",     path: "/dashboard" },
  { name: "Report Management",     icon: "/icons/report.png",        path: "/report" },
  { name: "Assignment",            icon: "/icons/assignment.png",    path: "/assignment" },
  { name: "Resident",              icon: "/icons/resident.png",      path: "/resident" },
  { name: "QR Verification",       icon: "/icons/qr.png",            path: "/qr-verification" },
  { name: "Announcements",         icon: "/icons/announcement.png",  path: "/announcement" },
  { name: "Notification Center",   icon: "/icons/notification.png",  path: "/notification" },
  { name: "Map",                   icon: "/icons/map.png",           path: "/map" },
  { name: "Waste Schedule",        icon: "/icons/waste.png",         path: "/waste-schedule" },
  { name: "Certificate",           icon: "/icons/certificate.png",   path: "/certificate" },
  { name: "Health Center",         icon: "/icons/center.png",        path: "/health-center" },
  { name: "Emergency Hotline",     icon: "/icons/emergency.png",     path: "/emergency-hotline" },
  { name: "Inventory",             icon: "/icons/inventory.png",     path: "/inventory" },
  { name: "Blotter & Incident",    icon: "/icons/blotter.png",       path: "/blotter" },
  { name: "Disaster & Emergency",  icon: "/icons/emergency.png",     path: "/disaster-emergency" },
  { name: "Analytics",             icon: "/icons/analytics.png",     path: "/analytics" },
];

export function getStaffRole() {
  const token = localStorage.getItem("token");
  if (!token) return null;
  try {
    const admin = JSON.parse(localStorage.getItem("admin") || "{}");
    return admin.role || null;
  } catch {
    return null;
  }
}

export function getMenuItems(currentPath = "") {
  const role = getStaffRole();
  if (!role) return [];

  const allowedPaths =
    role === "admin" ? ADMIN_PATHS : role === "barangay_official" ? OFFICIAL_PATHS : [];

  return ALL_MENU_ITEMS
    .filter((item) => allowedPaths.includes(item.path))
    .map((item) => ({
      ...item,
      active: currentPath ? item.path === currentPath : false,
    }));
}