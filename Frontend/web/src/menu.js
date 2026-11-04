const ADMIN_ONLY = ["Resident", "QR Verification", "Audit Logs"];

const ALL_MENU_ITEMS = [
  { name: "Dashboard", icon: "/icons/dashboard.png", path: "/dashboard" },
  { name: "Report Management", icon: "/icons/report.png", path: "/report" },
  { name: "Assignment", icon: "/icons/assignment.png", path: "/assignment" },
  { name: "Resident", icon: "/icons/resident.png", path: "/resident" },
  { name: "QR Verification", icon: "/icons/qr.png", path: "/qr" },
  { name: "Announcements", icon: "/icons/announcement.png", path: "/announcement" },
  { name: "Notification Center", icon: "/icons/notification.png", path: "/notification" },
  { name: "Map", icon: "/icons/map.png", path: "/map" },
  { name: "Waste Schedule", icon: "/icons/waste.png", path: "/waste-schedule" },
  { name: "Certificate", icon: "/icons/certificate.png", path: "/certificate" },
  { name: "Health Center", icon: "/icons/center.png", path: "/health-center" },
  { name: "Business", icon: "/icons/business.png", path: "/business" },
  { name: "Inventory", icon: "/icons/inventory.png", path: "/inventory" },
  { name: "Blotter & Incident", icon: "/icons/blotter.png", path: "/blotter" },
  { name: "Disaster & Emergency", icon: "/icons/emergency.png", path: "/disaster-emergency" },
  { name: "Emergency Hotline", icon: "/icons/emergency.png", path: "/emergency-hotline" },
  { name: "Analytics", icon: "/icons/analytics.png", path: "/analytics" },
  { name: "Audit Logs", icon: "/icons/auditlogs.png", path: "/auditlogs" },
];

/**
 * Returns the current staff role: "admin" | "barangay_official" | null.
 * Returns null when there is no token in storage - i.e. nobody is logged in.
 */
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

/**
 * Menu items filtered for the current role. Returns [] when not authenticated, so callers can't accidentally render admin-only entries to a logged-out visitor.
 */
export function getMenuItems(currentPath = "") {
  const role = getStaffRole();
  if (!role) return [];

  const isAdminRole = role === "admin";

  return ALL_MENU_ITEMS
    .filter((item) => isAdminRole || !ADMIN_ONLY.includes(item.name))
    .map((item) => ({
      ...item,
      active: currentPath ? item.path === currentPath : false,
    }));
}