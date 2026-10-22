import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api";
import { getMenuItems } from "../menu";
import ProfileHeaderButton from "../components/ProfileHeaderButton";

const PAGE_SIZE = 25;

const DAY_OPTIONS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const WASTE_TYPE_OPTIONS = [
  "Biodegradable",
  "Recyclable",
  "Residual",
  "Hazardous Waste",
  "Special Collection",
];

const daySortIndex = (day) => {
  const idx = DAY_OPTIONS.indexOf(day);
  return idx === -1 ? 999 : idx;
};

export default function WasteSchedule() {
  const navigate = useNavigate();
  const menuItems = getMenuItems();

  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // Pagination
  const [page, setPage] = useState(1);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [formData, setFormData] = useState({
    day: "",
    type: "",
    status: "Active",
  });

  // ============================================================
  // FETCH
  // ============================================================
  const fetchSchedules = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await apiFetch("/api/admin/waste-schedule");
      setSchedules(data);
    } catch (err) {
      console.error("Error fetching waste schedule:", err);
      setError("Failed to load waste schedule. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  // ============================================================
  // FILTER + SORT (Monday → Sunday)
  // ============================================================
  const filteredSchedules = [...schedules]
    .filter((s) => {
      const term = search.toLowerCase().trim();
      if (!term) return true;
      return (
        s.day?.toLowerCase().includes(term) ||
        s.type?.toLowerCase().includes(term) ||
        s.status?.toLowerCase().includes(term)
      );
    })
    .sort((a, b) => daySortIndex(a.day) - daySortIndex(b.day));

  // ============================================================
  // PAGINATION
  // ============================================================
  const totalPages = Math.max(1, Math.ceil(filteredSchedules.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedSchedules = filteredSchedules.slice(
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
  }, [search]);

  // ============================================================
  // CREATE
  // ============================================================
  const handleAddSchedule = async (e) => {
    e.preventDefault();
    if (!formData.day || !formData.type) {
      alert("Day and waste type are required.");
      return;
    }
    try {
      await apiFetch("/api/admin/waste-schedule", {
        method: "POST",
        body: JSON.stringify({
          day: formData.day,
          type: formData.type,
          status: formData.status,
        }),
      });
      setShowAddModal(false);
      setFormData({ day: "", type: "", status: "Active" });
      fetchSchedules();
      alert("Schedule added!");
    } catch (err) {
      alert("Failed to add: " + err.message);
    }
  };

  // ============================================================
  // EDIT
  // ============================================================
  const handleEditClick = (schedule) => {
    setSelectedSchedule(schedule);
    setFormData({
      day: schedule.day,
      type: schedule.type,
      status: schedule.status || "Active",
    });
    setShowEditModal(true);
  };

  const handleUpdateSchedule = async (e) => {
    e.preventDefault();
    try {
      await apiFetch(`/api/admin/waste-schedule/${selectedSchedule.schedule_id}`, {
        method: "PUT",
        body: JSON.stringify({
          day: formData.day,
          type: formData.type,
          status: formData.status,
        }),
      });
      setShowEditModal(false);
      fetchSchedules();
      alert("Schedule updated!");
    } catch (err) {
      alert("Failed to update: " + err.message);
    }
  };

  // ============================================================
  // DELETE
  // ============================================================
  const handleDelete = async (schedule) => {
    if (!window.confirm(`Delete schedule for ${schedule.day}?`)) return;
    try {
      await apiFetch(`/api/admin/waste-schedule/${schedule.schedule_id}`, {
        method: "DELETE",
      });
      fetchSchedules();
      alert("Schedule deleted.");
    } catch (err) {
      alert("Failed to delete: " + err.message);
    }
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <>
      <div className="waste-page">
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
            <h2>Waste Collection Schedule</h2>
            <ProfileHeaderButton />
          </header>

          <section className="waste-content">
            {/* FILTER BAR */}
            <div className="filter-bar">
              <div className="search-box">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search schedule..."
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

              <button
                type="button"
                className="filter-export-btn"
                onClick={() => {
                  setFormData({ day: "", type: "", status: "Active" });
                  setShowAddModal(true);
                }}
              >
                + Add Schedule
              </button>
            </div>

            {/* TABLE */}
            <div className="table-wrapper">
              {loading ? (
                <div className="table-message">Loading schedule...</div>
              ) : error ? (
                <div className="table-message error">
                  <p>{error}</p>
                  <button onClick={fetchSchedules}>Try Again</button>
                </div>
              ) : (
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th>Day</th>
                      <th>Waste Type</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedSchedules.length > 0 ? (
                      paginatedSchedules.map((schedule) => (
                        <tr key={schedule.schedule_id}>
                          <td>{schedule.day}</td>
                          <td>{schedule.type}</td>
                          <td>
                            <span
                              className={
                                schedule.status === "Active"
                                  ? "status-active"
                                  : "status-inactive"
                              }
                            >
                              {schedule.status}
                            </span>
                          </td>
                          <td>
                            <div className="actions">
                              <button
                                type="button"
                                className="action-button edit"
                                title="Edit"
                                onClick={() => handleEditClick(schedule)}
                              >
                                ✎
                              </button>
                              <button
                                type="button"
                                className="action-button delete"
                                title="Delete"
                                onClick={() => handleDelete(schedule)}
                              >
                                🗑
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="text-center py-8 text-gray-500">
                          No waste schedule found.
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
            <h3>Add Waste Schedule</h3>
            <form onSubmit={handleAddSchedule}>
              <div className="form-group">
                <label>Day</label>
                <select
                  value={formData.day}
                  onChange={(e) => setFormData({ ...formData, day: e.target.value })}
                  required
                >
                  <option value="">Select day</option>
                  {DAY_OPTIONS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Waste Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  required
                >
                  <option value="">Select waste type</option>
                  {WASTE_TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
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
            <h3>Edit Waste Schedule</h3>
            <form onSubmit={handleUpdateSchedule}>
              <div className="form-group">
                <label>Day</label>
                <select
                  value={formData.day}
                  onChange={(e) => setFormData({ ...formData, day: e.target.value })}
                  required
                >
                  <option value="">Select day</option>
                  {DAY_OPTIONS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Waste Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  required
                >
                  <option value="">Select waste type</option>
                  {WASTE_TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
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

      <style>{`
        * { box-sizing: border-box; }
        html, body, #root { margin: 0; padding: 0; width: 100%; height: 100%; }
        body { font-family: Arial, Helvetica, sans-serif; background: #ffffff; overflow: hidden; }

        .waste-page { width: 100vw; height: 100vh; display: flex; background: #ffffff; overflow: hidden; }

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

        .waste-content {
          width: 100%;
          height: calc(100vh - 76px);
          padding: 10px 0 0 0;
          overflow: hidden;
          background: #ffffff;
          display: flex;
          flex-direction: column;
        }

        /* ─── FILTER BAR ─── */
        .filter-bar { width: 100%; height: 42px; display: flex; align-items: center; gap: 14px; padding: 0 2px; flex-shrink: 0; }

        .search-box { position: relative; width: 220px; height: 30px; display: flex; align-items: center; border: 1px solid #b7b7b7; border-radius: 3px; background: #ffffff; flex-shrink: 0; }
        .search-icon { width: 28px; display: flex; align-items: center; justify-content: center; color: #444; font-size: 11px; }
        .search-box input { flex: 1; width: 100%; height: 100%; border: none; outline: none; padding: 0 5px 0 0; font-family: Arial, Helvetica, sans-serif; font-size: 10px; color: #333; background: transparent; }
        .search-box input::placeholder { color: #999; }
        .clear-search { width: 24px; height: 24px; border: none; background: transparent; color: #555; cursor: pointer; font-size: 14px; }

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

        .reports-table th:nth-child(1), .reports-table td:nth-child(1) { width: 25%; }
        .reports-table th:nth-child(2), .reports-table td:nth-child(2) { width: 45%; }
        .reports-table th:nth-child(3), .reports-table td:nth-child(3) { width: 18%; }
        .reports-table th:nth-child(4), .reports-table td:nth-child(4) { width: 12%; text-align: center; }

        .status-active { color: #287128; font-size: 8px; font-weight: 700; }
        .status-inactive { color: #e11d2e; font-size: 8px; font-weight: 700; }

        .actions { display: flex; align-items: center; justify-content: center; gap: 8px; }
        .action-button { width: 17px; height: 17px; padding: 0; border: none; background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 11px; line-height: 1; }
        .action-button.edit { color: #4c78c2; }
        .action-button.delete { color: #e51f32; font-size: 15px; }
        .action-button:hover { transform: scale(1.15); }

        .table-message { padding: 40px; text-align: center; color: #666; font-size: 12px; }
        .table-message.error p { color: #b91c1c; font-weight: 700; margin-bottom: 10px; }
        .table-message.error button {
          background: #0B5D2A; color: white; border: none; padding: 6px 16px;
          border-radius: 4px; cursor: pointer; font-weight: 600;
        }

        /* ─── PAGINATION BAR ─── */
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
        .modal-content { background: #ffffff; padding: 30px; border-radius: 8px; width: 420px; max-width: 90%; box-shadow: 0 10px 30px rgba(0,0,0,0.3); max-height: 90vh; overflow-y: auto; }
        .modal-content h3 { margin-top: 0; font-size: 16px; color: #0B5D2A; }
        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; font-size: 12px; font-weight: 700; color: #333; margin-bottom: 4px; }
        .form-group input, .form-group select { width: 100%; padding: 8px 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; }
        .modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
        .btn-cancel { background: #ccc; border: none; padding: 8px 20px; border-radius: 4px; cursor: pointer; font-weight: 600; }
        .btn-save { background: #0B5D2A; color: white; border: none; padding: 8px 20px; border-radius: 4px; cursor: pointer; font-weight: 600; }
        .btn-save:hover { background: #084A21; }

        @media (max-width: 1100px) { .sidebar { width: 300px; min-width: 300px; } .main-content { width: calc(100vw - 300px); } }
      `}</style>
    </>
  );
}