// ============================================================
// ROLE-BASED MENU
// ============================================================

const ADMIN_MENU_ITEMS = [
  { name: "Admin Dashboard",       icon: "/icons/dashboard.png",     path: "/admindashboard" },
  { name: "User Management",       icon: "/icons/resident.png",      path: "/usermanagement" },
  { name: "Account Verification",  icon: "/icons/qr.png",            path: "/account-verification" },
  { name: "Monitor Activities",    icon: "/icons/analytics.png",     path: "/monitoractivities" },
  { name: "Generate Reports",      icon: "/icons/report.png",        path: "/generatereports" },
  { name: "Audit Logs",            icon: "/icons/auditlogs.png",     path: "/auditlogs" },
  { name: "System Settings",       icon: "/icons/systemsettings.png", path: "/systemsettings" },
];

// Grouped sections for the Barangay Official sidebar
const OFFICIAL_SECTIONS = [
  {
    title: "CORE OPERATIONS",
    items: [
      { name: "Dashboard",            icon: "/icons/dashboard.png",  path: "/dashboard" },
      { name: "Report Management",    icon: "/icons/report.png",     path: "/report" },
      { name: "Assignments",          icon: "/icons/assignment.png", path: "/assignment" },
      { name: "Blotter & Incident",   icon: "/icons/blotter.png",    path: "/blotter" },
      { name: "Disaster & Emergency", icon: "/icons/emergency.png",  path: "/disaster-emergency" },
    ],
  },
  {
    title: "COMMUNITY SERVICES",
    items: [
      { name: "Residents",        icon: "/icons/resident.png",    path: "/resident" },
      { name: "QR Verification",  icon: "/icons/qr.png",          path: "/qr-verification" },
      { name: "Certificates",     icon: "/icons/certificate.png", path: "/certificate" },
      { name: "Health Center",    icon: "/icons/center.png",      path: "/health-center" },
      { name: "Waste Schedule",   icon: "/icons/waste.png",       path: "/waste-schedule" },
    ],
  },
  {
    title: "COMMUNICATIONS",
    items: [
      { name: "Announcements",       icon: "/icons/announcement.png", path: "/announcement" },
      { name: "Notification Center", icon: "/icons/notification.png", path: "/notification" },
      { name: "Emergency Hotlines",  icon: "/icons/emergency.png",    path: "/emergency-hotline" },
    ],
  },
  {
    title: "SPATIAL & DATA TOOLS",
    items: [
      { name: "Map",       icon: "/icons/map.png",       path: "/map" },
      { name: "Analytics", icon: "/icons/analytics.png", path: "/analytics" },
      { name: "Inventory", icon: "/icons/inventory.png", path: "/inventory" },
    ],
  },
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

// ─── FLAT LIST ───
export function getMenuItems(currentPath = "") {
  const role = getStaffRole();
  if (!role) return [];

  if (role === "admin") {
    return ADMIN_MENU_ITEMS.map((item) => ({
      ...item,
      active: currentPath ? item.path === currentPath : false,
    }));
  }

  if (role === "barangay_official") {
    return OFFICIAL_SECTIONS.flatMap((section) =>
      section.items.map((item) => ({
        ...item,
        active: currentPath ? item.path === currentPath : false,
      }))
    );
  }

  return [];
}

// ─── GROUPED ───
export function getMenuSections(currentPath = "") {
  const role = getStaffRole();
  if (!role) return [];

  if (role === "admin") {
    return [
      {
        title: "", // no header for admin
        items: ADMIN_MENU_ITEMS.map((item) => ({
          ...item,
          active: currentPath ? item.path === currentPath : false,
        })),
      },
    ];
  }

  if (role === "barangay_official") {
    return OFFICIAL_SECTIONS.map((section) => ({
      title: section.title,
      items: section.items.map((item) => ({
        ...item,
        active: currentPath ? item.path === currentPath : false,
      })),
    }));
  }

  return [];
}