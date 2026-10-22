import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api";
import { getMenuItems } from "../menu";
import ProfileHeaderButton from "../components/ProfileHeaderButton";

const PAGE_SIZE = 25;

const truncate = (text, maxLength = 40) => {
  if (!text) return "";
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
};

const INCIDENT_TYPES = [
  "Illegal Dumping",
  "Vandalism",
  "Sanitation Violation",
  "Public Disturbance",
  "Others",
];

const STATUS_OPTIONS = ["All Status", "Open", "Investigating", "Closed"];

const DATE_PRESETS = [
  { label: "Date", value: "date" },
  { label: "Today", value: "today" },
  { label: "Past 7 Days", value: "7days" },
  { label: "Past 30 Days", value: "30days" },
  { label: "Custom Range", value: "custom" },
];

const toLocalDateStr = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export default function Blotter() {
  const navigate = useNavigate();
  const menuItems = getMenuItems();

  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [datePreset, setDatePreset] = useState("date");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // Pagination
  const [page, setPage] = useState(1);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [formData, setFormData] = useState({
    incident_type: "",
    location: "",
    incident_date: "",
    description: "",
    status: "Open",
  });

  // ============================================================
  // FETCH
  // ============================================================
  const fetchIncidents = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await apiFetch("/api/admin/blotter");
      setIncidents(data);
    } catch (err) {
      console.error("Error fetching incidents:", err);
      setError("Failed to load incidents. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  // ============================================================
  // DATE RANGE HELPER
  // ============================================================
  const getDateRange = () => {
    const today = new Date();
    if (datePreset === "today") {
      const d = toLocalDateStr(today);
      return { from: d, to: d };
    }
    if (datePreset === "7days") {
      const start = new Date(today);
      start.setDate(start.getDate() - 6);
      return { from: toLocalDateStr(start), to: toLocalDateStr(today) };
    }
    if (datePreset === "30days") {
      const start = new Date(today);
      start.setDate(start.getDate() - 29);
      return { from: toLocalDateStr(start), to: toLocalDateStr(today) };
    }
    if (datePreset === "custom") {
      return { from: customStart || "", to: customEnd || "" };
    }
    return { from: "", to: "" };
  };

  // ============================================================
  // FILTER
  // ============================================================
  const filteredIncidents = incidents.filter((inc) => {
    const s = search.toLowerCase();
    const matchesSearch =
      !s ||
      inc.case_number?.toLowerCase().includes(s) ||
      inc.incident_type?.toLowerCase().includes(s) ||
      inc.location?.toLowerCase().includes(s) ||
      inc.description?.toLowerCase().includes(s);

    const matchesType = typeFilter === "All Types" || inc.incident_type === typeFilter;
    const matchesStatus = statusFilter === "All Status" || inc.status === statusFilter;

    let matchesDate = true;
    const { from, to } = getDateRange();
    if (from || to) {
      const raw = inc.incident_date ? String(inc.incident_date).split("T")[0].split(" ")[0] : "";
      if (raw) {
        if (from && raw < from) matchesDate = false;
        if (to && raw > to) matchesDate = false;
      }
    }

    return matchesSearch && matchesType && matchesStatus && matchesDate;
  });

  // ============================================================
  // PAGINATION
  // ============================================================
  const totalPages = Math.max(1, Math.ceil(filteredIncidents.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedIncidents = filteredIncidents.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const pageNumbers = () => {
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
  };

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, statusFilter, datePreset, customStart, customEnd]);

  const hasActiveFilters =
    search.trim() !== "" ||
    typeFilter !== "All Types" ||
    statusFilter !== "All Status" ||
    datePreset !== "date";

  const handleClearFilters = () => {
    setSearch("");
    setTypeFilter("All Types");
    setStatusFilter("All Status");
    setDatePreset("date");
    setCustomStart("");
    setCustomEnd("");
    setPage(1);
  };

  // ============================================================
  // HELPERS
  // ============================================================
  const formatDate = (d) => {
    if (!d) return "N/A";
    const date = new Date(d);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  // ============================================================
  // HANDLERS
  // ============================================================
  const handleAddIncident = async (e) => {
    e.preventDefault();
    if (!formData.incident_type || !formData.location || !formData.incident_date) {
      return alert("Incident type, location, and date are required.");
    }
    try {
      await apiFetch("/api/admin/blotter", {
        method: "POST",
        body: JSON.stringify(formData),
      });
      setShowAddModal(false);
      setFormData({
        incident_type: "",
        location: "",
        incident_date: "",
        description: "",
        status: "Open",
      });
      fetchIncidents();
      alert("Incident added!");
    } catch (err) {
      alert("Failed to add: " + err.message);
    }
  };

  const handleEditClick = (inc) => {
    setSelectedIncident(inc);
    setFormData({
      incident_type: inc.incident_type,
      location: inc.location,
      incident_date: inc.incident_date?.split("T")[0] || "",
      description: inc.description || "",
      status: inc.status || "Open",
    });
    setShowEditModal(true);
  };

  const handleUpdateIncident = async (e) => {
    e.preventDefault();
    try {
      await apiFetch(`/api/admin/blotter/${selectedIncident.blotter_id}`, {
        method: "PUT",
        body: JSON.stringify(formData),
      });
      setShowEditModal(false);
      fetchIncidents();
      alert("Incident updated!");
    } catch (err) {
      alert("Failed to update: " + err.message);
    }
  };

  const handleDelete = async (inc) => {
    if (!window.confirm(`Delete case ${inc.case_number}?`)) return;
    try {
      await apiFetch(`/api/admin/blotter/${inc.blotter_id}`, { method: "DELETE" });
      fetchIncidents();
      alert("Incident deleted.");
    } catch (err) {
      alert("Failed to delete: " + err.message);
    }
  };

  const handleViewClick = (inc) => {
    setSelectedIncident(inc);
    setShowViewModal(true);
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <>
      <div className="blotter-page">
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
            <h2>Blotter &amp; Incident Monitoring</h2>
            <ProfileHeaderButton />
          </header>

          <section className="blotter-content">
            {/* FILTER BAR */}
            <div className="filter-bar">
              <div className="search-box">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search incidents..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    type="button"
                    className="clear-search"
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                )}
              </div>

              <select
                className="filter-select"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="All Types">All Types</option>
                {INCIDENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

              <select
                className="filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              <select
                className="filter-select date-select"
                value={datePreset}
                onChange={(e) => setDatePreset(e.target.value)}
              >
                {DATE_PRESETS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>

              {datePreset === "custom" && (
                <div className="custom-range">
                  <input
                    type="date"
                    className="filter-date-input"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    max={customEnd || undefined}
                    aria-label="Start date"
                  />
                  <span className="range-sep">→</span>
                  <input
                    type="date"
                    className="filter-date-input"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    min={customStart || undefined}
                    aria-label="End date"
                  />
                </div>
              )}

              {hasActiveFilters && (
                <button
                  type="button"
                  className="filter-clear-btn"
                  onClick={handleClearFilters}
                >
                  Clear
                </button>
              )}

              <button
                type="button"
                className="filter-export-btn"
                onClick={() => {
                  setFormData({
                    incident_type: "",
                    location: "",
                    incident_date: "",
                    description: "",
                    status: "Open",
                  });
                  setShowAddModal(true);
                }}
              >
                + New Incident
              </button>
            </div>

            {/* TABLE */}
            <div className="table-wrapper">
              {loading ? (
                <div className="table-message">Loading incidents...</div>
              ) : error ? (
                <div className="table-message error">
                  <p>{error}</p>
                  <button onClick={fetchIncidents}>Try Again</button>
                </div>
              ) : (
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th>Case No.</th>
                      <th>Incident Type</th>
                      <th>Location</th>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedIncidents.length > 0 ? (
                      paginatedIncidents.map((inc) => (
                        <tr key={inc.blotter_id}>
                          <td className="case-no">{inc.case_number}</td>
                          <td>{inc.incident_type}</td>
                          <td>{inc.location}</td>
                          <td>{formatDate(inc.incident_date)}</td>
                          <td title={inc.description || ""}>
                            {truncate(inc.description || "—", 40)}
                          </td>
                          <td>
                            <span className={`incident-status ${inc.status?.toLowerCase()}`}>
                              {inc.status}
                            </span>
                          </td>
                          <td>
                            <div className="actions">
                              <button
                                type="button"
                                className="action-button edit"
                                title="Edit"
                                onClick={() => handleEditClick(inc)}
                              >
                                ✎
                              </button>
                              <button
                                type="button"
                                className="action-button view"
                                title="View"
                                onClick={() => handleViewClick(inc)}
                              >
                                ◉
                              </button>
                              <button
                                type="button"
                                className="action-button delete"
                                title="Delete"
                                onClick={() => handleDelete(inc)}
                              >
                                🗑
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="text-center py-8 text-gray-500">
                          No incidents found matching the filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* PAGINATION */}
            {!loading && !error && totalPages > 1 && (
              <div className="rp-pagination-bar">
                <div className="rp-page-info">
                  Page <strong>{safePage}</strong> of <strong>{totalPages}</strong>
                </div>

                <div className="rp-pagination-controls">
                  <button
                    type="button"
                    className="rp-page-btn rp-page-nav"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                  >
                    ‹ Prev
                  </button>

                  {pageNumbers().map((p, i) =>
                    p === "..." ? (
                      <span key={`ellipsis-${i}`} className="rp-page-ellipsis">…</span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        className={`rp-page-btn ${p === safePage ? "active" : ""}`}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </button>
                    )
                  )}

                  <button
                    type="button"
                    className="rp-page-btn rp-page-nav"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                  >
                    Next ›
                  </button>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>

      {/* ADD MODAL */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Report New Incident</h3>
            <form onSubmit={handleAddIncident}>
              <div className="form-group">
                <label>Incident Type</label>
                <select
                  value={formData.incident_type}
                  onChange={(e) => setFormData({ ...formData, incident_type: e.target.value })}
                  required
                >
                  <option value="">Select type</option>
                  {INCIDENT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., P. Gomez St."
                  required
                />
              </div>
              <div className="form-group">
                <label>Incident Date</label>
                <input
                  type="date"
                  value={formData.incident_date}
                  onChange={(e) => setFormData({ ...formData, incident_date: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="4"
                  placeholder="Describe the incident..."
                />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="Open">Open</option>
                  <option value="Investigating">Investigating</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-save">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Incident</h3>
            <form onSubmit={handleUpdateIncident}>
              <div className="form-group">
                <label>Incident Type</label>
                <select
                  value={formData.incident_type}
                  onChange={(e) => setFormData({ ...formData, incident_type: e.target.value })}
                  required
                >
                  {INCIDENT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Incident Date</label>
                <input
                  type="date"
                  value={formData.incident_date}
                  onChange={(e) => setFormData({ ...formData, incident_date: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="4"
                />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="Open">Open</option>
                  <option value="Investigating">Investigating</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-save">Update</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {showViewModal && selectedIncident && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Incident Details</h3>
            <div className="view-details">
              <p><strong>Case No.:</strong> {selectedIncident.case_number}</p>
              <p><strong>Type:</strong> {selectedIncident.incident_type}</p>
              <p><strong>Location:</strong> {selectedIncident.location}</p>
              <p><strong>Date:</strong> {formatDate(selectedIncident.incident_date)}</p>
              <p><strong>Status:</strong> {selectedIncident.status}</p>
              <p>
                <strong>Description:</strong>{" "}
                {selectedIncident.description || "No description provided."}
              </p>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowViewModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        * { box-sizing: border-box; }
        html, body, #root { margin: 0; padding: 0; width: 100%; height: 100%; }
        body { font-family: Arial, Helvetica, sans-serif; background: #ffffff; overflow: hidden; }

        .blotter-page { width: 100vw; height: 100vh; display: flex; background: #ffffff; overflow: hidden; }

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

        .blotter-content {
          width: 100%;
          height: calc(100vh - 76px);
          padding: 10px 0 0 0;
          overflow: hidden;
          background: #ffffff;
          display: flex;
          flex-direction: column;
        }

        /* FILTER BAR */
        .filter-bar { width: 100%; height: 42px; display: flex; align-items: center; gap: 14px; padding: 0 2px; flex-shrink: 0; }

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

        .filter-clear-btn { height: 30px; padding: 0 12px; border: 1px solid #e0a5a5; border-radius: 3px; background: #ffffff; color: #b3261e; font-family: Arial, Helvetica, sans-serif; font-size: 10px; font-weight: 700; cursor: pointer; flex-shrink: 0; }
        .filter-clear-btn:hover { background: #fdecec; }

        .filter-export-btn { height: 30px; padding: 0 14px; border: 1px solid #547f5c; border-radius: 3px; background: #367046; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 10px; font-weight: 700; cursor: pointer; margin-left: auto; flex-shrink: 0; }
        .filter-export-btn:hover { background: #2e623d; }

        /* TABLE */
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

        .reports-table th:nth-child(1), .reports-table td:nth-child(1) { width: 13%; }
        .reports-table th:nth-child(2), .reports-table td:nth-child(2) { width: 15%; }
        .reports-table th:nth-child(3), .reports-table td:nth-child(3) { width: 14%; }
        .reports-table th:nth-child(4), .reports-table td:nth-child(4) { width: 11%; }
        .reports-table th:nth-child(5), .reports-table td:nth-child(5) { width: 22%; }
        .reports-table th:nth-child(6), .reports-table td:nth-child(6) { width: 11%; }
        .reports-table th:nth-child(7), .reports-table td:nth-child(7) { width: 14%; text-align: center; }

        .case-no { color: #34734b !important; font-weight: 700; }

        .incident-status { font-size: 8px; font-weight: 700; text-transform: capitalize; }
        .incident-status.open { color: #f5a400; }
        .incident-status.investigating { color: #235ee8; }
        .incident-status.closed { color: #ff1e27; }

        .actions { display: flex; align-items: center; justify-content: center; gap: 8px; }
        .action-button { width: 17px; height: 17px; padding: 0; border: none; background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 11px; line-height: 1; }
        .action-button.edit { color: #4c78c2; }
        .action-button.view { color: #4b8a5c; }
        .action-button.delete { color: #e51f32; font-size: 15px; }
        .action-button:hover { transform: scale(1.15); }

        .table-message { padding: 40px; text-align: center; color: #666; font-size: 12px; }
        .table-message.error p { color: #b91c1c; font-weight: 700; margin-bottom: 10px; }
        .table-message.error button {
          background: #0B5D2A; color: white; border: none; padding: 6px 16px;
          border-radius: 4px; cursor: pointer; font-weight: 600;
        }

        /* PAGINATION BAR */
        .rp-pagination-bar {
          width: 100%;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 0 2px;
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
        .form-group input, .form-group select, .form-group textarea { width: 100%; padding: 8px 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; font-family: Arial; }
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