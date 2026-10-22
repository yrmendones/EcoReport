import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api";
import { getMenuItems } from "../menu";
import ProfileHeaderButton from "../components/ProfileHeaderButton";

const PAGE_SIZE = 25;

const truncate = (text, maxLength = 30) => {
  if (!text) return "";
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
};

const APPOINTMENT_TYPES = [
  "General Consultation",
  "Fever / Cough / Flu",
  "Vaccination",
  "Blood Pressure Check",
  "Dental Check-up",
  "Maternal Care",
  "Child Immunization",
  "Prenatal Check-up",
  "Other",
];

const APPOINTMENT_STATUSES = ["Pending", "Confirmed", "Completed", "Cancelled"];

const ANNOUNCEMENT_STATUSES = ["All Status", "Published", "Draft"];

const DATE_PRESETS = [
  { label: "Date", value: "date" },
  { label: "Today", value: "today" },
  { label: "Past 7 Days", value: "7days" },
  { label: "Past 30 Days", value: "30days" },
  { label: "Custom Range", value: "custom" },
];

const getLocalTodayStr = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const toDateOnly = (d) => {
  if (!d) return "";
  return String(d).split("T")[0].split(" ")[0];
};

const toLocalDateStr = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

// ─── Pagination helpers ───
function pageNumbersFor(safePage, totalPages) {
  const pages = [];
  const maxButtons = 5;
  if (totalPages <= maxButtons + 2) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    const start = Math.max(2, safePage - 1);
    const end = Math.min(totalPages - 1, safePage + 1);
    if (start > 2) pages.push("...");
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push("...");
    pages.push(totalPages);
  }
  return pages;
}

function PaginationBar({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  const safePage = Math.min(page, totalPages);

  return (
    <div className="rp-pagination-bar">
      <div className="rp-page-info">
        Page <strong>{safePage}</strong> of <strong>{totalPages}</strong>
      </div>

      <div className="rp-pagination-controls">
        <button
          type="button"
          className="rp-page-btn rp-page-nav"
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          disabled={safePage === 1}
        >
          ‹ Prev
        </button>

        {pageNumbersFor(safePage, totalPages).map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="rp-page-ellipsis">…</span>
          ) : (
            <button
              key={p}
              type="button"
              className={`rp-page-btn ${p === safePage ? "active" : ""}`}
              onClick={() => onPageChange(p)}
            >
              {p}
            </button>
          )
        )}

        <button
          type="button"
          className="rp-page-btn rp-page-nav"
          onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
          disabled={safePage === totalPages}
        >
          Next ›
        </button>
      </div>
    </div>
  );
}

// ─── Date range helper ───
function getDateRangeFor(preset, customStart, customEnd) {
  const today = new Date();
  if (preset === "today") {
    const d = toLocalDateStr(today);
    return { from: d, to: d };
  }
  if (preset === "7days") {
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    return { from: toLocalDateStr(start), to: toLocalDateStr(today) };
  }
  if (preset === "30days") {
    const start = new Date(today);
    start.setDate(start.getDate() - 29);
    return { from: toLocalDateStr(start), to: toLocalDateStr(today) };
  }
  if (preset === "custom") {
    return { from: customStart || "", to: customEnd || "" };
  }
  return { from: "", to: "" };
}

export default function HealthCenter() {
  const navigate = useNavigate();
  const menuItems = getMenuItems();

  const [activeTab, setActiveTab] = useState("Overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [stats, setStats] = useState({
    today: 0, consultations: 0, vaccinations: 0,
    maternal: 0, child: 0, dental: 0, bp: 0,
  });
  const [appointments, setAppointments] = useState([]);
  const [services, setServices] = useState([]);
  const [healthAnnouncements, setHealthAnnouncements] = useState([]);
  const [medicalStaff, setMedicalStaff] = useState([]);
  const [healthInfo, setHealthInfo] = useState(null);

  // ── Pagination (one per tab) ──
  const [overviewPage, setOverviewPage] = useState(1);
  const [appointmentsPage, setAppointmentsPage] = useState(1);
  const [servicesPage, setServicesPage] = useState(1);
  const [staffPage, setStaffPage] = useState(1);
  const [announcementsPage, setAnnouncementsPage] = useState(1);

  // ── Appointments filters ──
  const [apptSearch, setApptSearch] = useState("");
  const [apptTypeFilter, setApptTypeFilter] = useState("All Types");
  const [apptStatusFilter, setApptStatusFilter] = useState("All Status");
  const [apptDatePreset, setApptDatePreset] = useState("date");
  const [apptCustomStart, setApptCustomStart] = useState("");
  const [apptCustomEnd, setApptCustomEnd] = useState("");

  // ── Services filter ──
  const [serviceSearch, setServiceSearch] = useState("");

  // ── Medical Staff filter ──
  const [staffSearch, setStaffSearch] = useState("");

  // ── Health Announcements filters ──
  const [annSearch, setAnnSearch] = useState("");
  const [annStatusFilter, setAnnStatusFilter] = useState("All Status");
  const [annDatePreset, setAnnDatePreset] = useState("date");
  const [annCustomStart, setAnnCustomStart] = useState("");
  const [annCustomEnd, setAnnCustomEnd] = useState("");

  // ── Modals ──
  const [showAddService, setShowAddService] = useState(false);
  const [showEditService, setShowEditService] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [serviceForm, setServiceForm] = useState({ service_name: "", status: "Active" });

  const [showViewAppointment, setShowViewAppointment] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showEditAppointment, setShowEditAppointment] = useState(false);
  const [editAppointmentStatus, setEditAppointmentStatus] = useState("Pending");

  const [showAddAnn, setShowAddAnn] = useState(false);
  const [showEditAnn, setShowEditAnn] = useState(false);
  const [selectedAnn, setSelectedAnn] = useState(null);
  const [annForm, setAnnForm] = useState({ title: "", content: "", status: "Draft" });

  const [showAddStaff, setShowAddStaff] = useState(false);
  const [showEditStaff, setShowEditStaff] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [staffForm, setStaffForm] = useState({ staff_name: "", role: "" });

  const [showEditInfo, setShowEditInfo] = useState(false);
  const [infoForm, setInfoForm] = useState({
    location: "", contact_number: "", operating_days: "", operating_hours: "",
  });

  // ── Fetch ──
  const fetchAll = async () => {
    try {
      setLoading(true);
      setError("");
      const [statsData, appointmentsData, servicesData, annData, staffData, infoData] = await Promise.all([
        apiFetch("/api/admin/appointments/stats"),
        apiFetch("/api/admin/appointments"),
        apiFetch("/api/health-center/services?all=true"),
        apiFetch("/api/admin/announcements"),
        apiFetch("/api/health-center/staff"),
        apiFetch("/api/health-center/info"),
      ]);
      setStats(statsData);
      setAppointments(appointmentsData);
      setServices(servicesData);
      setHealthAnnouncements(annData.filter((a) => a.category === "Health"));
      setMedicalStaff(staffData || []);
      setHealthInfo(infoData || {});
    } catch (err) {
      console.error("Error fetching health center data:", err);
      setError("Failed to load health center data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const formatDate = (d) => {
    if (!d) return "N/A";
    const date = new Date(d);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return "N/A";
    const parts = String(timeStr).split(":");
    if (parts.length < 2) return timeStr;
    const hour24 = parseInt(parts[0], 10);
    const minute = parts[1];
    if (isNaN(hour24)) return timeStr;
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    const ampm = hour24 >= 12 ? "PM" : "AM";
    return `${hour12}:${minute} ${ampm}`;
  };

  // ── Paginate helper ──
  const paginate = (list, page) => {
    const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const items = list.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
    return { items, totalPages, safePage };
  };

  // ── Upcoming appointments (Overview) ──
  const todayStr = getLocalTodayStr();
  const upcomingAppointments = appointments
    .filter((a) => {
      const apptDate = toDateOnly(a.appointment_date);
      return apptDate && apptDate >= todayStr;
    })
    .sort((a, b) => toDateOnly(a.appointment_date).localeCompare(toDateOnly(b.appointment_date)));

  const overviewPaged = paginate(upcomingAppointments, overviewPage);

  // ── Filtered appointments (Appointments tab) ──
  const apptFiltered = appointments.filter((a) => {
    const s = apptSearch.toLowerCase();
    const matchesSearch =
      !s ||
      a.full_name?.toLowerCase().includes(s) ||
      a.contact_number?.toLowerCase().includes(s) ||
      a.reason?.toLowerCase().includes(s) ||
      a.symptoms?.toLowerCase().includes(s);

    const matchesType = apptTypeFilter === "All Types" || a.reason === apptTypeFilter;
    const matchesStatus = apptStatusFilter === "All Status" || a.status === apptStatusFilter;

    let matchesDate = true;
    const { from, to } = getDateRangeFor(apptDatePreset, apptCustomStart, apptCustomEnd);
    if (from || to) {
      const raw = toDateOnly(a.appointment_date);
      if (raw) {
        if (from && raw < from) matchesDate = false;
        if (to && raw > to) matchesDate = false;
      }
    }

    return matchesSearch && matchesType && matchesStatus && matchesDate;
  });
  const appointmentsPaged = paginate(apptFiltered, appointmentsPage);

  // ── Filtered services (Services tab) ──
  const servicesFiltered = services.filter((s) => {
    const term = serviceSearch.toLowerCase().trim();
    if (!term) return true;
    return (
      s.service_name?.toLowerCase().includes(term) ||
      s.status?.toLowerCase().includes(term)
    );
  });
  const servicesPaged = paginate(servicesFiltered, servicesPage);

  // ── Filtered staff (Medical Staff tab) ──
  const staffFiltered = medicalStaff.filter((s) => {
    const term = staffSearch.toLowerCase().trim();
    if (!term) return true;
    return (
      s.staff_name?.toLowerCase().includes(term) ||
      s.role?.toLowerCase().includes(term)
    );
  });
  const staffPaged = paginate(staffFiltered, staffPage);

  // ── Filtered announcements (Health Announcements tab) ──
  const annFiltered = healthAnnouncements.filter((a) => {
    const term = annSearch.toLowerCase().trim();
    const matchesSearch =
      !term ||
      a.title?.toLowerCase().includes(term) ||
      a.content?.toLowerCase().includes(term);

    const matchesStatus = annStatusFilter === "All Status" || a.status === annStatusFilter;

    let matchesDate = true;
    const { from, to } = getDateRangeFor(annDatePreset, annCustomStart, annCustomEnd);
    if (from || to) {
      const raw = a.posted_at ? String(a.posted_at).split("T")[0].split(" ")[0] : "";
      if (raw) {
        if (from && raw < from) matchesDate = false;
        if (to && raw > to) matchesDate = false;
      }
    }

    return matchesSearch && matchesStatus && matchesDate;
  });
  const annPaged = paginate(annFiltered, announcementsPage);

  // ── Reset pages on filter/tab change ──
  useEffect(() => { setOverviewPage(1); }, [activeTab]);
  useEffect(() => { setAppointmentsPage(1); }, [apptSearch, apptTypeFilter, apptStatusFilter, apptDatePreset, apptCustomStart, apptCustomEnd]);
  useEffect(() => { setServicesPage(1); }, [serviceSearch]);
  useEffect(() => { setStaffPage(1); }, [staffSearch]);
  useEffect(() => { setAnnouncementsPage(1); }, [annSearch, annStatusFilter, annDatePreset, annCustomStart, annCustomEnd]);

  // ── Handlers ──
  const handleAddService = async (e) => {
    e.preventDefault();
    if (!serviceForm.service_name) return alert("Service name is required.");
    try {
      await apiFetch("/api/health-center/services", { method: "POST", body: JSON.stringify(serviceForm) });
      setShowAddService(false);
      setServiceForm({ service_name: "", status: "Active" });
      fetchAll();
      alert("Service added!");
    } catch (err) { alert("Failed to add: " + err.message); }
  };

  const handleEditService = (svc) => {
    setSelectedService(svc);
    setServiceForm({ service_name: svc.service_name, status: svc.status || "Active" });
    setShowEditService(true);
  };

  const handleUpdateService = async (e) => {
    e.preventDefault();
    try {
      await apiFetch(`/api/health-center/services/${selectedService.service_id}`, { method: "PUT", body: JSON.stringify(serviceForm) });
      setShowEditService(false);
      fetchAll();
      alert("Service updated!");
    } catch (err) { alert("Failed to update: " + err.message); }
  };

  const handleDeleteService = async (svc) => {
    if (!window.confirm(`Delete service "${svc.service_name}"?`)) return;
    try {
      await apiFetch(`/api/health-center/services/${svc.service_id}`, { method: "DELETE" });
      fetchAll();
      alert("Service deleted.");
    } catch (err) { alert("Failed to delete: " + err.message); }
  };

  const handleViewAppointment = (a) => { setSelectedAppointment(a); setShowViewAppointment(true); };
  const handleEditAppointment = (a) => { setSelectedAppointment(a); setEditAppointmentStatus(a.status); setShowEditAppointment(true); };

  const handleUpdateAppointment = async (e) => {
    e.preventDefault();
    try {
      await apiFetch(`/api/admin/appointments/${selectedAppointment.appointment_id}`, { method: "PUT", body: JSON.stringify({ status: editAppointmentStatus }) });
      setShowEditAppointment(false);
      fetchAll();
      alert("Appointment updated!");
    } catch (err) { alert("Failed to update: " + err.message); }
  };

  const handleDeleteAppointment = async (a) => {
    if (!window.confirm(`Delete appointment for ${a.full_name}?`)) return;
    try {
      await apiFetch(`/api/admin/appointments/${a.appointment_id}`, { method: "DELETE" });
      fetchAll();
      alert("Appointment deleted.");
    } catch (err) { alert("Failed to delete: " + err.message); }
  };

  const handleAddAnnouncement = async (e) => {
    e.preventDefault();
    if (!annForm.title || !annForm.content) return alert("Title and description are required.");
    try {
      await apiFetch("/api/admin/announcements", {
        method: "POST",
        body: JSON.stringify({ title: annForm.title, content: annForm.content, category: "Health", status: annForm.status }),
      });
      setShowAddAnn(false);
      setAnnForm({ title: "", content: "", status: "Draft" });
      fetchAll();
      alert("Health announcement created!");
    } catch (err) { alert("Failed to create: " + err.message); }
  };

  const handleEditAnnouncement = (ann) => {
    setSelectedAnn(ann);
    setAnnForm({ title: ann.title, content: ann.content, status: ann.status || "Draft" });
    setShowEditAnn(true);
  };

  const handleUpdateAnnouncement = async (e) => {
    e.preventDefault();
    try {
      await apiFetch(`/api/admin/announcements/${selectedAnn.announcement_id}`, {
        method: "PUT",
        body: JSON.stringify({ title: annForm.title, content: annForm.content, category: "Health", status: annForm.status }),
      });
      setShowEditAnn(false);
      fetchAll();
      alert("Health announcement updated!");
    } catch (err) { alert("Failed to update: " + err.message); }
  };

  const handleDeleteAnnouncement = async (ann) => {
    if (!window.confirm(`Delete announcement "${ann.title}"?`)) return;
    try {
      await apiFetch(`/api/admin/announcements/${ann.announcement_id}`, { method: "DELETE" });
      fetchAll();
      alert("Announcement deleted.");
    } catch (err) { alert("Failed to delete: " + err.message); }
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (!staffForm.staff_name || !staffForm.role) return alert("Staff name and role are required.");
    try {
      await apiFetch("/api/health-center/staff", { method: "POST", body: JSON.stringify(staffForm) });
      setShowAddStaff(false);
      setStaffForm({ staff_name: "", role: "" });
      fetchAll();
      alert("Staff added!");
    } catch (err) { alert("Failed to add: " + err.message); }
  };

  const handleEditStaff = (s) => {
    setSelectedStaff(s);
    setStaffForm({ staff_name: s.staff_name, role: s.role });
    setShowEditStaff(true);
  };

  const handleUpdateStaff = async (e) => {
    e.preventDefault();
    try {
      await apiFetch(`/api/health-center/staff/${selectedStaff.staff_id}`, { method: "PUT", body: JSON.stringify(staffForm) });
      setShowEditStaff(false);
      fetchAll();
      alert("Staff updated!");
    } catch (err) { alert("Failed to update: " + err.message); }
  };

  const handleDeleteStaff = async (s) => {
    if (!window.confirm(`Delete staff "${s.staff_name}"?`)) return;
    try {
      await apiFetch(`/api/health-center/staff/${s.staff_id}`, { method: "DELETE" });
      fetchAll();
      alert("Staff deleted.");
    } catch (err) { alert("Failed to delete: " + err.message); }
  };

  const handleEditInfo = () => {
    setInfoForm({
      location: healthInfo?.location || "",
      contact_number: healthInfo?.contact_number || "",
      operating_days: healthInfo?.operating_days || "",
      operating_hours: healthInfo?.operating_hours || "",
    });
    setShowEditInfo(true);
  };

  const handleUpdateInfo = async (e) => {
    e.preventDefault();
    try {
      await apiFetch("/api/health-center/info", { method: "PUT", body: JSON.stringify(infoForm) });
      setShowEditInfo(false);
      fetchAll();
      alert("Health center information updated!");
    } catch (err) { alert("Failed to update: " + err.message); }
  };

  return (
    <>
      <div className="health-page">
        {/* SIDEBAR */}
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

        {/* MAIN */}
        <main className="main-content">
          <header className="top-header">
            <h2>Health Center Management</h2>
            <ProfileHeaderButton />
          </header>

          <section className="health-content">
            {/* TABS */}
            <div className="health-tabs">
              {["Overview", "Appointments", "Services", "Medical Staff", "Health Announcements"].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={`health-tab ${activeTab === tab ? "active" : ""}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* ══════════════════════════════════════════════════════
                OVERVIEW TAB
            ══════════════════════════════════════════════════════ */}
            {activeTab === "Overview" && (
              <div className="tab-content">
                <div className="info-card">
                  <div className="info-card-header">
                    <div className="info-card-title">Health Center Information</div>
                    <button className="edit-info-btn" onClick={handleEditInfo}>✎ Edit Info</button>
                  </div>
                  <div className="info-card-body">
                    <div className="info-card-row">
                      <span className="info-card-label">Location:</span>
                      <span className="info-card-value">{healthInfo?.location || "Not set"}</span>
                    </div>
                    <div className="info-card-row">
                      <span className="info-card-label">Contact Number:</span>
                      <span className="info-card-value">{healthInfo?.contact_number || "Not set"}</span>
                    </div>
                    <div className="info-card-row">
                      <span className="info-card-label">Operating Days:</span>
                      <span className="info-card-value">{healthInfo?.operating_days || "Not set"}</span>
                    </div>
                    <div className="info-card-row">
                      <span className="info-card-label">Operating Hours:</span>
                      <span className="info-card-value">{healthInfo?.operating_hours || "Not set"}</span>
                    </div>
                  </div>
                </div>

                <div className="statistics">
                  <div className="stat-card"><div className="stat-title">Appointments Today</div><div className="stat-number">{stats.today}</div></div>
                  <div className="stat-card"><div className="stat-title">Consultations Today</div><div className="stat-number">{stats.consultations}</div></div>
                  <div className="stat-card"><div className="stat-title">Vaccinations Today</div><div className="stat-number">{stats.vaccinations}</div></div>
                  <div className="stat-card"><div className="stat-title">Maternal Care Today</div><div className="stat-number">{stats.maternal}</div></div>
                  <div className="stat-card"><div className="stat-title">Child Immunization Today</div><div className="stat-number">{stats.child}</div></div>
                  <div className="stat-card"><div className="stat-title">Dental Services Today</div><div className="stat-number">{stats.dental}</div></div>
                  <div className="stat-card"><div className="stat-title">Blood Pressure Check Today</div><div className="stat-number">{stats.bp}</div></div>
                </div>

                <div className="appointments-box">
                  <div className="appointments-title">Upcoming Appointments</div>
                  <div className="appointments-table-wrapper table-overview-appointments">
                    <table className="reports-table">
                      <thead>
                        <tr>
                          <th>Full Name</th>
                          <th>Age</th>
                          <th>Contact</th>
                          <th>Type</th>
                          <th>Date</th>
                          <th>Time</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overviewPaged.items.length > 0 ? (
                          overviewPaged.items.map((a) => (
                            <tr key={a.appointment_id}>
                              <td>{a.full_name}</td>
                              <td>{a.age}</td>
                              <td>{a.contact_number}</td>
                              <td>{a.reason}</td>
                              <td>{formatDate(a.appointment_date)}</td>
                              <td>{formatTime(a.preferred_time)}</td>
                              <td><span className={`apt-status ${a.status.toLowerCase()}`}>{a.status}</span></td>
                              <td>
                                <div className="actions">
                                  <button className="action-button view" onClick={() => handleViewAppointment(a)} title="View">◉</button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="8" className="text-center py-4 text-gray-500">
                              No upcoming appointments.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <PaginationBar page={overviewPaged.safePage} totalPages={overviewPaged.totalPages} onPageChange={setOverviewPage} />
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════
                APPOINTMENTS TAB
            ══════════════════════════════════════════════════════ */}
            {activeTab === "Appointments" && (
              <div className="tab-content">
                <div className="filter-bar">
                  <div className="search-box">
                    <span className="search-icon">🔍</span>
                    <input
                      type="text"
                      placeholder="Search appointments..."
                      value={apptSearch}
                      onChange={(e) => setApptSearch(e.target.value)}
                    />
                    {apptSearch && (
                      <button
                        type="button"
                        className="clear-search"
                        onClick={() => setApptSearch("")}
                        aria-label="Clear search"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  <select
                    className="filter-select"
                    value={apptTypeFilter}
                    onChange={(e) => setApptTypeFilter(e.target.value)}
                  >
                    <option value="All Types">All Types</option>
                    {APPOINTMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>

                  <select
                    className="filter-select"
                    value={apptStatusFilter}
                    onChange={(e) => setApptStatusFilter(e.target.value)}
                  >
                    <option value="All Status">All Status</option>
                    {APPOINTMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>

                  <select
                    className="filter-select date-select"
                    value={apptDatePreset}
                    onChange={(e) => setApptDatePreset(e.target.value)}
                  >
                    {DATE_PRESETS.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>

                  {apptDatePreset === "custom" && (
                    <div className="custom-range">
                      <input
                        type="date"
                        className="filter-date-input"
                        value={apptCustomStart}
                        onChange={(e) => setApptCustomStart(e.target.value)}
                        max={apptCustomEnd || undefined}
                        aria-label="Start date"
                      />
                      <span className="range-sep">→</span>
                      <input
                        type="date"
                        className="filter-date-input"
                        value={apptCustomEnd}
                        onChange={(e) => setApptCustomEnd(e.target.value)}
                        min={apptCustomStart || undefined}
                        aria-label="End date"
                      />
                    </div>
                  )}
                </div>

                <div className="table-wrapper table-appointments">
                  <table className="reports-table">
                    <thead>
                      <tr>
                        <th>Full Name</th>
                        <th>Age</th>
                        <th>Contact</th>
                        <th>Type</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appointmentsPaged.items.length > 0 ? (
                        appointmentsPaged.items.map((a) => (
                          <tr key={a.appointment_id}>
                            <td>{a.full_name}</td>
                            <td>{a.age}</td>
                            <td>{a.contact_number}</td>
                            <td>{a.reason}</td>
                            <td>{formatDate(a.appointment_date)}</td>
                            <td>{formatTime(a.preferred_time)}</td>
                            <td><span className={`apt-status ${a.status.toLowerCase()}`}>{a.status}</span></td>
                            <td>
                              <div className="actions">
                                <button className="action-button edit" onClick={() => handleEditAppointment(a)} title="Edit">✎</button>
                                <button className="action-button view" onClick={() => handleViewAppointment(a)} title="View">◉</button>
                                <button className="action-button delete" onClick={() => handleDeleteAppointment(a)} title="Delete">🗑</button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="8" className="text-center py-4 text-gray-500">
                            No appointments found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <PaginationBar page={appointmentsPaged.safePage} totalPages={appointmentsPaged.totalPages} onPageChange={setAppointmentsPage} />
              </div>
            )}

            {/* ══════════════════════════════════════════════════════
                SERVICES TAB
            ══════════════════════════════════════════════════════ */}
            {activeTab === "Services" && (
              <div className="tab-content">
                <div className="filter-bar">
                  <div className="search-box">
                    <span className="search-icon">🔍</span>
                    <input
                      type="text"
                      placeholder="Search services..."
                      value={serviceSearch}
                      onChange={(e) => setServiceSearch(e.target.value)}
                    />
                    {serviceSearch && (
                      <button
                        type="button"
                        className="clear-search"
                        onClick={() => setServiceSearch("")}
                        aria-label="Clear search"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    className="filter-export-btn"
                    onClick={() => { setServiceForm({ service_name: "", status: "Active" }); setShowAddService(true); }}
                  >
                    + Add Service
                  </button>
                </div>

                <div className="table-wrapper table-services">
                  <table className="reports-table">
                    <thead>
                      <tr>
                        <th>Service Name</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {servicesPaged.items.length > 0 ? (
                        servicesPaged.items.map((svc) => (
                          <tr key={svc.service_id}>
                            <td>{svc.service_name}</td>
                            <td>
                              <span className={`svc-status ${(svc.status || "Active").toLowerCase()}`}>
                                {svc.status || "Active"}
                              </span>
                            </td>
                            <td>
                              <div className="actions">
                                <button className="action-button edit" onClick={() => handleEditService(svc)} title="Edit">✎</button>
                                <button className="action-button delete" onClick={() => handleDeleteService(svc)} title="Delete">🗑</button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="3" className="text-center py-4 text-gray-500">
                            No services found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <PaginationBar page={servicesPaged.safePage} totalPages={servicesPaged.totalPages} onPageChange={setServicesPage} />
              </div>
            )}

            {/* ══════════════════════════════════════════════════════
                MEDICAL STAFF TAB
            ══════════════════════════════════════════════════════ */}
            {activeTab === "Medical Staff" && (
              <div className="tab-content">
                <div className="filter-bar">
                  <div className="search-box">
                    <span className="search-icon">🔍</span>
                    <input
                      type="text"
                      placeholder="Search staff..."
                      value={staffSearch}
                      onChange={(e) => setStaffSearch(e.target.value)}
                    />
                    {staffSearch && (
                      <button
                        type="button"
                        className="clear-search"
                        onClick={() => setStaffSearch("")}
                        aria-label="Clear search"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    className="filter-export-btn"
                    onClick={() => { setStaffForm({ staff_name: "", role: "" }); setShowAddStaff(true); }}
                  >
                    + Add Staff
                  </button>
                </div>

                <div className="table-wrapper table-staff">
                  <table className="reports-table">
                    <thead>
                      <tr>
                        <th>Staff Name</th>
                        <th>Role</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staffPaged.items.length > 0 ? (
                        staffPaged.items.map((s) => (
                          <tr key={s.staff_id}>
                            <td>{s.staff_name}</td>
                            <td>{s.role}</td>
                            <td>
                              <div className="actions">
                                <button className="action-button edit" onClick={() => handleEditStaff(s)} title="Edit">✎</button>
                                <button className="action-button delete" onClick={() => handleDeleteStaff(s)} title="Delete">🗑</button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="3" className="text-center py-4 text-gray-500">
                            No medical staff added yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <PaginationBar page={staffPaged.safePage} totalPages={staffPaged.totalPages} onPageChange={setStaffPage} />
              </div>
            )}

            {/* ══════════════════════════════════════════════════════
                HEALTH ANNOUNCEMENTS TAB
            ══════════════════════════════════════════════════════ */}
            {activeTab === "Health Announcements" && (
              <div className="tab-content">
                <div className="filter-bar">
                  <div className="search-box">
                    <span className="search-icon">🔍</span>
                    <input
                      type="text"
                      placeholder="Search announcements..."
                      value={annSearch}
                      onChange={(e) => setAnnSearch(e.target.value)}
                    />
                    {annSearch && (
                      <button
                        type="button"
                        className="clear-search"
                        onClick={() => setAnnSearch("")}
                        aria-label="Clear search"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  <select
                    className="filter-select"
                    value={annStatusFilter}
                    onChange={(e) => setAnnStatusFilter(e.target.value)}
                  >
                    {ANNOUNCEMENT_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>

                  <select
                    className="filter-select date-select"
                    value={annDatePreset}
                    onChange={(e) => setAnnDatePreset(e.target.value)}
                  >
                    {DATE_PRESETS.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>

                  {annDatePreset === "custom" && (
                    <div className="custom-range">
                      <input
                        type="date"
                        className="filter-date-input"
                        value={annCustomStart}
                        onChange={(e) => setAnnCustomStart(e.target.value)}
                        max={annCustomEnd || undefined}
                        aria-label="Start date"
                      />
                      <span className="range-sep">→</span>
                      <input
                        type="date"
                        className="filter-date-input"
                        value={annCustomEnd}
                        onChange={(e) => setAnnCustomEnd(e.target.value)}
                        min={annCustomStart || undefined}
                        aria-label="End date"
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    className="filter-export-btn"
                    onClick={() => { setAnnForm({ title: "", content: "", status: "Draft" }); setShowAddAnn(true); }}
                  >
                    + Create Announcement
                  </button>
                </div>

                <div className="table-wrapper table-announcements">
                  <table className="reports-table">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Category</th>
                        <th>Date Posted</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {annPaged.items.length > 0 ? (
                        annPaged.items.map((ann) => (
                          <tr key={ann.announcement_id}>
                            <td title={ann.title}>{truncate(ann.title, 40)}</td>
                            <td>{ann.category || "Health"}</td>
                            <td>{ann.date || formatDate(ann.posted_at)}</td>
                            <td>
                              <span className={`svc-status ${(ann.status || "Draft").toLowerCase()}`}>
                                {ann.status || "Draft"}
                              </span>
                            </td>
                            <td>
                              <div className="actions">
                                <button className="action-button edit" onClick={() => handleEditAnnouncement(ann)} title="Edit">✎</button>
                                <button className="action-button delete" onClick={() => handleDeleteAnnouncement(ann)} title="Delete">🗑</button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="text-center py-4 text-gray-500">
                            No health announcements yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <PaginationBar page={annPaged.safePage} totalPages={annPaged.totalPages} onPageChange={setAnnouncementsPage} />
              </div>
            )}
          </section>
        </main>
      </div>

      {/* ═══════════════════════════════════════════════════════
          MODALS
      ═══════════════════════════════════════════════════════ */}

      {showViewAppointment && selectedAppointment && (
        <div className="modal-overlay" onClick={() => setShowViewAppointment(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Appointment Details</h3>
            <div className="view-details">
              <p><strong>Full Name:</strong> {selectedAppointment.full_name}</p>
              <p><strong>Age:</strong> {selectedAppointment.age}</p>
              <p><strong>Contact:</strong> {selectedAppointment.contact_number}</p>
              <p><strong>Type:</strong> {selectedAppointment.reason}</p>
              <p><strong>Description:</strong> {selectedAppointment.symptoms || "No description provided."}</p>
              <p><strong>Date:</strong> {formatDate(selectedAppointment.appointment_date)}</p>
              <p><strong>Time:</strong> {formatTime(selectedAppointment.preferred_time)}</p>
              <p><strong>Status:</strong> {selectedAppointment.status}</p>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowViewAppointment(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showEditAppointment && (
        <div className="modal-overlay" onClick={() => setShowEditAppointment(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Appointment Status</h3>
            <form onSubmit={handleUpdateAppointment}>
              <div className="form-group">
                <label>Status</label>
                <select value={editAppointmentStatus} onChange={(e) => setEditAppointmentStatus(e.target.value)}>
                  {APPOINTMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowEditAppointment(false)}>Cancel</button>
                <button type="submit" className="btn-save">Update</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddService && (
        <div className="modal-overlay" onClick={() => setShowAddService(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Add Health Service</h3>
            <form onSubmit={handleAddService}>
              <div className="form-group">
                <label>Service Name</label>
                <input type="text" value={serviceForm.service_name} onChange={(e) => setServiceForm({ ...serviceForm, service_name: e.target.value })} required placeholder="e.g., General Consultation" />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={serviceForm.status} onChange={(e) => setServiceForm({ ...serviceForm, status: e.target.value })}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowAddService(false)}>Cancel</button>
                <button type="submit" className="btn-save">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditService && (
        <div className="modal-overlay" onClick={() => setShowEditService(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Health Service</h3>
            <form onSubmit={handleUpdateService}>
              <div className="form-group">
                <label>Service Name</label>
                <input type="text" value={serviceForm.service_name} onChange={(e) => setServiceForm({ ...serviceForm, service_name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={serviceForm.status} onChange={(e) => setServiceForm({ ...serviceForm, status: e.target.value })}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowEditService(false)}>Cancel</button>
                <button type="submit" className="btn-save">Update</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddAnn && (
        <div className="modal-overlay" onClick={() => setShowAddAnn(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Create Health Announcement</h3>
            <form onSubmit={handleAddAnnouncement}>
              <div className="form-group">
                <label>Title</label>
                <input type="text" value={annForm.title} onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })} required placeholder="Enter announcement title" />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={annForm.content} onChange={(e) => setAnnForm({ ...annForm, content: e.target.value })} required rows="4" placeholder="Enter announcement description" style={{ width: "100%", padding: "8px 10px", border: "1px solid #ccc", borderRadius: "4px", fontSize: "13px", fontFamily: "Arial" }} />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={annForm.status} onChange={(e) => setAnnForm({ ...annForm, status: e.target.value })}>
                  <option value="Draft">Draft</option>
                  <option value="Published">Published</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowAddAnn(false)}>Cancel</button>
                <button type="submit" className="btn-save">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditAnn && (
        <div className="modal-overlay" onClick={() => setShowEditAnn(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Health Announcement</h3>
            <form onSubmit={handleUpdateAnnouncement}>
              <div className="form-group">
                <label>Title</label>
                <input type="text" value={annForm.title} onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={annForm.content} onChange={(e) => setAnnForm({ ...annForm, content: e.target.value })} required rows="4" style={{ width: "100%", padding: "8px 10px", border: "1px solid #ccc", borderRadius: "4px", fontSize: "13px", fontFamily: "Arial" }} />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={annForm.status} onChange={(e) => setAnnForm({ ...annForm, status: e.target.value })}>
                  <option value="Draft">Draft</option>
                  <option value="Published">Published</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowEditAnn(false)}>Cancel</button>
                <button type="submit" className="btn-save">Update</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddStaff && (
        <div className="modal-overlay" onClick={() => setShowAddStaff(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Add Medical Staff</h3>
            <form onSubmit={handleAddStaff}>
              <div className="form-group">
                <label>Staff Name</label>
                <input type="text" value={staffForm.staff_name} onChange={(e) => setStaffForm({ ...staffForm, staff_name: e.target.value })} required placeholder="e.g., Dr. Maria Santos" />
              </div>
              <div className="form-group">
                <label>Role</label>
                <input type="text" value={staffForm.role} onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })} required placeholder="e.g., Municipal Doctor" />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowAddStaff(false)}>Cancel</button>
                <button type="submit" className="btn-save">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditStaff && (
        <div className="modal-overlay" onClick={() => setShowEditStaff(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Medical Staff</h3>
            <form onSubmit={handleUpdateStaff}>
              <div className="form-group">
                <label>Staff Name</label>
                <input type="text" value={staffForm.staff_name} onChange={(e) => setStaffForm({ ...staffForm, staff_name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Role</label>
                <input type="text" value={staffForm.role} onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })} required />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowEditStaff(false)}>Cancel</button>
                <button type="submit" className="btn-save">Update</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditInfo && (
        <div className="modal-overlay" onClick={() => setShowEditInfo(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Health Center Information</h3>
            <form onSubmit={handleUpdateInfo}>
              <div className="form-group">
                <label>Location</label>
                <input type="text" value={infoForm.location} onChange={(e) => setInfoForm({ ...infoForm, location: e.target.value })} required placeholder="Barangay Hall Compound, Sto. Rosario Kanluran, Pateros" />
              </div>
              <div className="form-group">
                <label>Contact Number</label>
                <input type="text" value={infoForm.contact_number} onChange={(e) => setInfoForm({ ...infoForm, contact_number: e.target.value })} required placeholder="(02) 8642-9999" />
              </div>
              <div className="form-group">
                <label>Operating Days</label>
                <input type="text" value={infoForm.operating_days} onChange={(e) => setInfoForm({ ...infoForm, operating_days: e.target.value })} required placeholder="Monday - Friday" />
              </div>
              <div className="form-group">
                <label>Operating Hours</label>
                <input type="text" value={infoForm.operating_hours} onChange={(e) => setInfoForm({ ...infoForm, operating_hours: e.target.value })} required placeholder="8:00 AM - 5:00 PM" />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowEditInfo(false)}>Cancel</button>
                <button type="submit" className="btn-save">Update</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        * { box-sizing: border-box; }
        html, body, #root { margin: 0; padding: 0; width: 100%; height: 100%; }
        body { font-family: Arial, Helvetica, sans-serif; background: #ffffff; overflow: hidden; }

        .health-page { width: 100vw; height: 100vh; display: flex; background: #ffffff; overflow: hidden; }

        .sidebar { position: relative; width: 320px; min-width: 320px; height: 100vh; flex-shrink: 0; background: #13471e; overflow: hidden; }
        .sidebar-background { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center; z-index: 0; pointer-events: none; }
        .sidebar-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(3,77,30,0.91) 0%, rgba(3,76,29,0.87) 100%); z-index: 1; pointer-events: none; }
        .sidebar-content { position: relative; z-index: 2; width: 100%; height: 100%; }
        .sidebar-brand { height: 86px; display: flex; align-items: center; padding-left: 36px; gap: 10px; }
        .sidebar-brand-image { width: 51.7px; height: 54px; object-fit: contain; display: block; flex-shrink: 0; }
        .sidebar-brand-name { color: #fff9df; font-size: 20px; font-weight: 800; line-height: 1; white-space: nowrap; }
        .sidebar-barangay { height: 5px; display: flex; align-items: center; padding-left: 70px; color: #fff9df; font-size: 11px; font-weight: 500; border-bottom: 1px solid rgba(255,255,255,0.14); }
        .sidebar-menu { width: 100%; padding-top: 5px; }
        .menu-item { width: 100%; height: 30px; border: none; margin: 0; padding: 0 14px 0 42px; display: flex; align-items: center; gap: 14px; background: transparent; color: #ffffff; font-size: 15px; font-weight: 500; text-align: left; cursor: pointer; transition: background 0.15s ease; }
        .menu-item:hover { background: rgba(255,255,255,0.09); }
        .menu-item.active { background: rgba(0,0,0,0.28); padding-left: 38px; font-weight: 700; }
        .menu-icon { width: 30px; height: 28px; object-fit: contain; display: block; flex-shrink: 0; }
        .menu-text { white-space: nowrap; line-height: 1; }

        .main-content { width: calc(100vw - 320px); height: 100vh; min-width: 0; padding: 0 12px 10px 12px; overflow: hidden; background: #ffffff; }
        .top-header { width: calc(100% + 24px); height: 76px; margin-left: -12px; padding: 0 24px 0 18px; display: flex; align-items: center; justify-content: space-between; background: #13471e; }
        .top-header h2 { margin: 0; color: #ffffff; font-size: 12px; font-weight: 800; line-height: 1; }

        .health-content { width: 100%; height: calc(100vh - 76px); padding: 10px 0 0 0; overflow: hidden; background: #ffffff; display: flex; flex-direction: column; }

        .health-tabs { width: 100%; height: 42px; display: flex; align-items: center; gap: 8px; padding: 0 2px; flex-shrink: 0; overflow-x: auto; overflow-y: hidden; scrollbar-width: none; }
        .health-tabs::-webkit-scrollbar { display: none; }
        .health-tab { height: 30px; padding: 0 14px; border: 1px solid #a6b7a7; border-radius: 3px; background: #ffffff; color: #444444; font-size: 10px; font-weight: 600; cursor: pointer; white-space: nowrap; flex-shrink: 0; }
        .health-tab.active { background: #367046; color: #ffffff; border-color: #367046; font-weight: 800; }
        .health-tab:hover:not(.active) { background: #f3f7f3; }

        .tab-content {
          width: 100%;
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        /* ─── OVERVIEW ─── */
        .info-card {
          width: 100%;
          border: 1px solid #76977d;
          border-radius: 3px;
          background: #ffffff;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
          padding: 12px 16px;
          margin-bottom: 14px;
          flex-shrink: 0;
        }
        .info-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .info-card-title { color: #1c421f; font-size: 11px; font-weight: 800; }
        .edit-info-btn { height: 22px; padding: 0 12px; border: 1px solid #547f5c; border-radius: 3px; background: #ffffff; color: #367046; font-size: 9px; font-weight: 700; cursor: pointer; }
        .edit-info-btn:hover { background: #edf4ee; }
        .info-card-body { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; }
        .info-card-row { display: flex; align-items: center; gap: 6px; font-size: 10px; }
        .info-card-label { color: #666; font-weight: 700; min-width: 110px; }
        .info-card-value { color: #222; font-weight: 500; }

        .statistics { width: 100%; display: flex; gap: 12px; padding-left: 2px; margin-bottom: 14px; flex-wrap: wrap; flex-shrink: 0; }
        .stat-card { position: relative; flex: 1; min-width: 120px; height: 70px; border: 1px solid #76977d; border-radius: 2px; background: #ffffff; padding: 10px 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.10); }
        .stat-title { color: #1c421f; font-size: 9px; font-weight: 800; margin-bottom: 7px; line-height: 1.2; }
        .stat-number { color: #244f19; font-size: 22px; font-weight: 800; line-height: 1; }

        .appointments-box {
          width: 100%;
          flex: 1;
          min-height: 0;
          border: 1px solid #66866b;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .appointments-title { height: 40px; display: flex; align-items: center; padding-left: 12px; border-bottom: 1px solid #66866b; color: #111111; font-size: 10px; font-weight: 800; flex-shrink: 0; }
        .appointments-table-wrapper { flex: 1; min-height: 0; overflow: auto; }

        /* ─── FILTER BAR ─── */
        .filter-bar { width: 100%; height: 42px; display: flex; align-items: center; gap: 14px; padding: 0 2px; flex-shrink: 0; margin-bottom: 4px; }

        .search-box { position: relative; width: 220px; height: 30px; display: flex; align-items: center; border: 1px solid #b7b7b7; border-radius: 3px; background: #ffffff; flex-shrink: 0; }
        .search-icon { width: 28px; display: flex; align-items: center; justify-content: center; color: #444; font-size: 11px; }
        .search-box input { flex: 1; width: 100%; height: 100%; border: none; outline: none; padding: 0 5px 0 0; font-family: Arial, Helvetica, sans-serif; font-size: 10px; color: #333; background: transparent; }
        .search-box input::placeholder { color: #999; }
        .clear-search { width: 24px; height: 24px; border: none; background: transparent; color: #555; cursor: pointer; font-size: 14px; }

        .filter-select { width: 130px; height: 30px; padding: 0 8px; border: 1px solid #a9b49f; border-radius: 3px; background: #ffffff; color: #444; font-family: Arial, Helvetica, sans-serif; font-size: 10px; outline: none; cursor: pointer; flex-shrink: 0; }
        .date-select { width: 130px; }

        .custom-range { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
        .filter-date-input { width: 130px; height: 30px; padding: 0 8px; border: 1px solid #a9b49f; border-radius: 3px; background: #ffffff; color: #333; font-family: Arial, Helvetica, sans-serif; font-size: 10px; outline: none; }
        .filter-date-input:focus { border-color: #17652c; }
        .range-sep { color: #666; font-size: 11px; }

        .filter-export-btn { height: 30px; padding: 0 14px; border: 1px solid #547f5c; border-radius: 3px; background: #367046; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 10px; font-weight: 700; cursor: pointer; margin-left: auto; flex-shrink: 0; }
        .filter-export-btn:hover { background: #2e623d; }

        /* ─── TABLE ─── */
        .table-wrapper {
          width: 100%;
          flex: 1;
          min-height: 0;
          overflow: auto;
          border: 1px solid #66866b;
          background: #ffffff;
          margin-top: 4px;
        }

        .reports-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 9px; }
        .reports-table thead { position: sticky; top: 0; z-index: 10; height: 38px; background: #ffffff; }
        .reports-table th { height: 38px; padding: 0 7px; text-align: left; color: #222222; font-size: 9px; font-weight: 800; border-bottom: 1px solid #78977d; }
        .reports-table td { height: 43px; padding: 4px 7px; color: #222222; font-size: 9px; vertical-align: middle; border-bottom: 1px solid #9cb1a0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .reports-table tbody tr:hover { background: #f7faf7; }

        /* ─── OVERVIEW — Upcoming Appointments ─── */
        .table-overview-appointments .reports-table th,
        .table-overview-appointments .reports-table td { text-align: center; }
        .table-overview-appointments .reports-table th:nth-child(1),
        .table-overview-appointments .reports-table td:nth-child(1) { width: 20%; text-align: left; }
        .table-overview-appointments .reports-table th:nth-child(2),
        .table-overview-appointments .reports-table td:nth-child(2) { width: 6%; }
        .table-overview-appointments .reports-table th:nth-child(3),
        .table-overview-appointments .reports-table td:nth-child(3) { width: 15%; }
        .table-overview-appointments .reports-table th:nth-child(4),
        .table-overview-appointments .reports-table td:nth-child(4) { width: 18%; text-align: left; }
        .table-overview-appointments .reports-table th:nth-child(5),
        .table-overview-appointments .reports-table td:nth-child(5) { width: 12%; }
        .table-overview-appointments .reports-table th:nth-child(6),
        .table-overview-appointments .reports-table td:nth-child(6) { width: 10%; }
        .table-overview-appointments .reports-table th:nth-child(7),
        .table-overview-appointments .reports-table td:nth-child(7) { width: 10%; }
        .table-overview-appointments .reports-table th:nth-child(8),
        .table-overview-appointments .reports-table td:nth-child(8) { width: 9%; }

        /* ─── APPOINTMENTS TAB ─── */
        .table-appointments .reports-table th,
        .table-appointments .reports-table td { text-align: center; }
        .table-appointments .reports-table th:nth-child(1),
        .table-appointments .reports-table td:nth-child(1) { width: 20%; text-align: left; }
        .table-appointments .reports-table th:nth-child(2),
        .table-appointments .reports-table td:nth-child(2) { width: 6%; }
        .table-appointments .reports-table th:nth-child(3),
        .table-appointments .reports-table td:nth-child(3) { width: 15%; }
        .table-appointments .reports-table th:nth-child(4),
        .table-appointments .reports-table td:nth-child(4) { width: 18%; text-align: left; }
        .table-appointments .reports-table th:nth-child(5),
        .table-appointments .reports-table td:nth-child(5) { width: 12%; }
        .table-appointments .reports-table th:nth-child(6),
        .table-appointments .reports-table td:nth-child(6) { width: 10%; }
        .table-appointments .reports-table th:nth-child(7),
        .table-appointments .reports-table td:nth-child(7) { width: 10%; }
        .table-appointments .reports-table th:nth-child(8),
        .table-appointments .reports-table td:nth-child(8) { width: 9%; }

        /* ─── SERVICES TAB ─── */
        .table-services .reports-table th:nth-child(1),
        .table-services .reports-table td:nth-child(1) { width: 65%; text-align: left; }
        .table-services .reports-table th:nth-child(2),
        .table-services .reports-table td:nth-child(2) { width: 18%; }
        .table-services .reports-table th:nth-child(3),
        .table-services .reports-table td:nth-child(3) { width: 17%; text-align: center; }

        /* ─── MEDICAL STAFF TAB ─── */
        .table-staff .reports-table th:nth-child(1),
        .table-staff .reports-table td:nth-child(1) { width: 50%; text-align: left; }
        .table-staff .reports-table th:nth-child(2),
        .table-staff .reports-table td:nth-child(2) { width: 33%; }
        .table-staff .reports-table th:nth-child(3),
        .table-staff .reports-table td:nth-child(3) { width: 17%; text-align: center; }

        /* ─── HEALTH ANNOUNCEMENTS TAB ─── */
        .table-announcements .reports-table th:nth-child(1),
        .table-announcements .reports-table td:nth-child(1) { width: 40%; text-align: left; }
        .table-announcements .reports-table th:nth-child(2),
        .table-announcements .reports-table td:nth-child(2) { width: 15%; }
        .table-announcements .reports-table th:nth-child(3),
        .table-announcements .reports-table td:nth-child(3) { width: 20%; }
        .table-announcements .reports-table th:nth-child(4),
        .table-announcements .reports-table td:nth-child(4) { width: 12%; }
        .table-announcements .reports-table th:nth-child(5),
        .table-announcements .reports-table td:nth-child(5) { width: 13%; text-align: center; }

        .apt-status { font-size: 8px; font-weight: 700; }
        .apt-status.pending { color: #d28a00; }
        .apt-status.confirmed { color: #2870b8; }
        .apt-status.completed { color: #287128; }
        .apt-status.cancelled { color: #e11d2e; }

        .svc-status { font-size: 8px; font-weight: 700; text-transform: capitalize; }
        .svc-status.active, .svc-status.published { color: #287128; }
        .svc-status.inactive, .svc-status.draft { color: #e11d2e; }

        .actions { display: flex; align-items: center; justify-content: center; gap: 8px; }
        .action-button { width: 17px; height: 17px; padding: 0; border: none; background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 11px; line-height: 1; }
        .action-button.edit { color: #4c78c2; }
        .action-button.view { color: #4b8a5c; }
        .action-button.delete { color: #e51f32; font-size: 15px; }
        .action-button:hover { transform: scale(1.15); }

        /* ─── PAGINATION BAR ─── */
        .rp-pagination-bar {
          width: 100%;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 0 8px;
          margin-bottom: 8px;
          flex-shrink: 0;
          background: #ffffff;
          border-top: 1px solid #d4dcd4;
        }
        .rp-page-info { color: #4b5563; font-size: 11px; font-weight: 500; }
        .rp-page-info strong { color: #0B5D2A; font-weight: 800; }
        .rp-pagination-controls { display: flex; align-items: center; gap: 3px; }
        .rp-page-btn {
          min-width: 28px;
          height: 28px;
          padding: 0 8px;
          border: 1px solid #d4dcd4;
          border-radius: 4px;
          background: #ffffff;
          color: #374151;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .rp-page-btn.rp-page-nav { padding: 0 10px; gap: 4px; }
        .rp-page-btn:hover:not(:disabled):not(.active) { background: #f0f7f0; border-color: #b8c9b8; }
        .rp-page-btn.active { background: #0B5D2A; color: #ffffff; border-color: #0B5D2A; font-weight: 800; }
        .rp-page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .rp-page-ellipsis {
          padding: 0 4px;
          color: #9ca3af;
          font-size: 12px;
          user-select: none;
          display: inline-flex;
          align-items: center;
          height: 28px;
        }

        /* MODALS */
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-content { background: #fff; padding: 30px; border-radius: 8px; width: 420px; max-width: 90%; box-shadow: 0 10px 30px rgba(0,0,0,0.3); max-height: 90vh; overflow-y: auto; }
        .modal-content h3 { margin-top: 0; font-size: 16px; color: #0B5D2A; }
        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; font-size: 12px; font-weight: 700; color: #333; margin-bottom: 4px; }
        .form-group input, .form-group select, .form-group textarea { width: 100%; padding: 8px 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; }
        .view-details p { margin: 8px 0; font-size: 13px; color: #333; }
        .view-details strong { color: #0B5D2A; }
        .modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
        .btn-cancel { background: #ccc; border: none; padding: 8px 20px; border-radius: 4px; cursor: pointer; font-weight: 600; }
        .btn-save { background: #0B5D2A; color: white; border: none; padding: 8px 20px; border-radius: 4px; cursor: pointer; font-weight: 600; }
        .btn-save:hover { background: #084A21; }

        @media (max-width: 1100px) {
          .sidebar { width: 300px; min-width: 300px; }
          .main-content { width: calc(100vw - 300px); }
        }
      `}</style>
    </>
  );
}