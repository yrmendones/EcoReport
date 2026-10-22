import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api";
import { getMenuItems } from "../menu";
import ProfileHeaderButton from "../components/ProfileHeaderButton";

const PAGE_SIZE = 25;

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

export default function Report() {
  const navigate = useNavigate();
  const menuItems = getMenuItems();

  // ============================================================
  // STATE
  // ============================================================
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [datePreset, setDatePreset] = useState("date");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // Pagination
  const [page, setPage] = useState(1);

  // ============================================================
  // CATEGORIES
  // ============================================================
  const categories = [
    "All Categories",
    "Air Pollution",
    "Animal Waste",
    "Clogged Drainage",
    "Damaged Roads",
    "Flooding",
    "Fallen Trees",
    "Illegal Dumping",
    "Improper Garbage Disposal",
    "Overgrown Grass",
    "Others Environmental Concerns",
  ];

  // ============================================================
  // FETCH REPORTS
  // ============================================================
  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await apiFetch("/api/admin/reports");
      setReports(data);
    } catch (err) {
      console.error("Error fetching reports:", err);
      setError("Failed to load reports. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // STATUS CLASS
  // ============================================================
  const getStatusClass = (status) => {
    return status.toLowerCase().replace(/\s+/g, "-");
  };

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
    // "date" preset = no date filter
    return { from: "", to: "" };
  };

  // ============================================================
  // FILTER LOGIC
  // ============================================================
  const filteredReports = reports.filter((report) => {
    const searchValue = search.toLowerCase();

    const matchesSearch =
      report.report_id?.toString().includes(searchValue) ||
      report.category?.toLowerCase().includes(searchValue) ||
      report.first_name?.toLowerCase().includes(searchValue) ||
      report.last_name?.toLowerCase().includes(searchValue) ||
      report.guest_name?.toLowerCase().includes(searchValue) ||
      report.address?.toLowerCase().includes(searchValue) ||
      report.status?.toLowerCase().includes(searchValue);

    const matchesCategory =
      categoryFilter === "All Categories" || report.category === categoryFilter;

    const matchesStatus =
      statusFilter === "All Status" ||
      report.status?.toLowerCase() === statusFilter.toLowerCase();

    let matchesDate = true;
    const { from, to } = getDateRange();
    if (from || to) {
      const submitted = (report.submitted_at || "").toString().split("T")[0].split(" ")[0];
      if (from && submitted < from) matchesDate = false;
      if (to && submitted > to) matchesDate = false;
    }

    return matchesSearch && matchesCategory && matchesStatus && matchesDate;
  });

  // ============================================================
  // PAGINATION (client-side — 25 rows per page)
  // ============================================================
  const totalPages = Math.max(1, Math.ceil(filteredReports.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedReports = filteredReports.slice(
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

  // Reset to page 1 whenever a filter changes
  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, statusFilter, datePreset, customStart, customEnd]);

  // ============================================================
  // CLEAR FILTERS
  // ============================================================
  const hasActiveFilters =
    search.trim() !== "" ||
    categoryFilter !== "All Categories" ||
    statusFilter !== "All Status" ||
    datePreset !== "date";

  const handleClearFilters = () => {
    setSearch("");
    setCategoryFilter("All Categories");
    setStatusFilter("All Status");
    setDatePreset("date");
    setCustomStart("");
    setCustomEnd("");
    setPage(1);
  };

  // ============================================================
  // GET REPORTER FULL NAME
  // ============================================================
  const getReporterName = (report) => {
    if (report.user_id) {
      const firstName = report.first_name || "";
      const lastName = report.last_name || "";
      const fullName = `${firstName} ${lastName}`.trim();
      return fullName || "Anonymous Resident";
    } else {
      return report.guest_name || "Anonymous Guest";
    }
  };

  // ============================================================
  // HANDLE EDIT
  // ============================================================
  const handleEdit = (report) => {
    navigate(`/allreport/${report.report_id}`, {
      state: { report: report, mode: "edit" },
    });
  };

  // ============================================================
  // HANDLE DELETE
  // ============================================================
  const handleDelete = async (reportId) => {
    if (!window.confirm("Are you sure you want to delete this report?")) return;

    try {
      await apiFetch(`/api/admin/reports/${reportId}`, {
        method: "DELETE",
      });
      fetchReports();
    } catch (err) {
      console.error("Error deleting report:", err);
      alert("Failed to delete report. Please try again.");
    }
  };

  return (
    <>
      <div className="report-page">
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

        {/* MAIN CONTENT */}
        <main className="main-content">
          <header className="top-header">
            <h2>Report Management - all reports</h2>
            <ProfileHeaderButton />
          </header>

          <section className="report-content">
            {/* FILTER BAR */}
            <div className="filter-bar">
              <div className="search-box">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search reports..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    className="clear-search"
                    type="button"
                    onClick={() => setSearch("")}
                  >
                    ×
                  </button>
                )}
              </div>

              <select
                className="filter-select"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <select
                className="filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All Status">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Ongoing">Ongoing</option>
                <option value="Assigned">Assigned</option>
                <option value="Resolved">Resolved</option>
                <option value="Rejected">Rejected</option>
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

              <button type="button" className="filter-button" onClick={fetchReports}>
                <span>☷</span> Refresh
              </button>
            </div>

            {/* TABLE */}
            <div className="table-wrapper">
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <p className="text-gray-500">Loading reports...</p>
                </div>
              ) : error ? (
                <div className="flex justify-center items-center h-64 flex-col gap-4">
                  <p className="text-red-500">{error}</p>
                  <button
                    onClick={fetchReports}
                    className="px-4 py-2 bg-[#0B5D2A] text-white rounded-lg"
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th>Report ID</th>
                      <th>Category</th>
                      <th>Reporter</th>
                      <th>Type</th>
                      <th>Location</th>
                      <th>Date Submitted</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedReports.length > 0 ? (
                      paginatedReports.map((report, index) => {
                        const formattedDate = new Date(report.submitted_at).toLocaleDateString(
                          "en-US",
                          { year: "numeric", month: "short", day: "numeric" }
                        );
                        const formattedTime = new Date(report.submitted_at).toLocaleTimeString(
                          "en-US",
                          { hour: "2-digit", minute: "2-digit" }
                        );

                        return (
                          <tr key={index}>
                            <td className="report-id">
                              ER-{new Date().getFullYear()}-{String(report.report_id).padStart(4, "0")}
                            </td>
                            <td>{report.category}</td>
                            <td>{getReporterName(report)}</td>
                            <td>{report.user_id ? "Resident" : "Guest"}</td>
                            <td>
                              {report.address ||
                                report.location ||
                                (report.latitude && report.longitude
                                  ? `${parseFloat(report.latitude).toFixed(6)}, ${parseFloat(
                                      report.longitude
                                    ).toFixed(6)}`
                                  : "N/A")}
                            </td>
                            <td className="date-cell">
                              <span>{formattedDate}</span>
                              <span>{formattedTime}</span>
                            </td>
                            <td>
                              <span className={`status-badge ${getStatusClass(report.status)}`}>
                                {report.status}
                              </span>
                            </td>
                            <td>
                              <div className="actions">
                                <button
                                  type="button"
                                  className="action-button edit"
                                  title="Edit Report"
                                  onClick={() => handleEdit(report)}
                                >
                                  ✎
                                </button>
                                <button
                                  type="button"
                                  className="action-button delete"
                                  title="Delete"
                                  onClick={() => handleDelete(report.report_id)}
                                >
                                  🗑
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="8" className="text-center py-8 text-gray-500">
                          No reports found matching your filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* PAGINATION BAR */}
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
                      <span key={`ellipsis-${i}`} className="rp-page-ellipsis">
                        …
                      </span>
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

      <style>{`
        * { box-sizing: border-box; }
        html, body, #root { margin: 0; padding: 0; width: 100%; height: 100%; }
        body { font-family: Arial, Helvetica, sans-serif; background: #ffffff; overflow: hidden; }

        .report-page { width: 100vw; height: 100vh; display: flex; background: #ffffff; overflow: hidden; }

        .sidebar { position: relative; width: 320px; min-width: 320px; height: 100vh; flex-shrink: 0; background: #13471e; overflow: hidden; }
        .sidebar-background { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center; opacity: 1; z-index: 0; pointer-events: none; }
        .sidebar-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(3,77,30,0.91) 0%, rgba(3,76,29,0.87) 100%); z-index: 1; pointer-events: none; }
        .sidebar-content { position: relative; z-index: 2; width: 100%; height: 100%; }
        .sidebar-brand { height: 86px; display: flex; align-items: center; padding-left: 36px; gap: 10px; }
        .sidebar-brand-image { width: 51.7px; height: 54px; object-fit: contain; display: block; flex-shrink: 0; }
        .sidebar-brand-name { color: #fff9df; font-size: 20px; font-weight: 800; line-height: 1; white-space: nowrap; }
        .sidebar-barangay { height: 5px; display: flex; align-items: center; padding-left: 70px; color: #fff9df; font-size: 11px; font-weight: 500; border-bottom: 1px solid rgba(255,255,255,0.14); }
        .sidebar-menu { width: 100%; padding-top: 5px; }
        .menu-item { width: 100%; height: 30px; border: none; margin: 0; padding: 0 14px 0 42px; display: flex; align-items: center; gap: 14px; background: transparent; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 15px; font-weight: 500; text-align: left; cursor: pointer; transition: background 0.15s ease; }
        .menu-item:hover { background: rgba(255,255,255,0.09); }
        .menu-item.active { background: rgba(0,0,0,0.28); padding-left: 38px; font-weight: 700; }
        .menu-icon { width: 30px; height: 28px; object-fit: contain; display: block; flex-shrink: 0; }
        .menu-text { white-space: nowrap; line-height: 1; }

        .main-content { width: calc(100vw - 320px); height: 100vh; min-width: 0; padding: 0 12px 10px 12px; overflow: hidden; background: #ffffff; }
        .top-header { width: calc(100% + 24px); height: 76px; margin-left: -12px; padding: 0 24px 0 18px; display: flex; align-items: center; justify-content: space-between; background: #13471e; }
        .top-header h2 { margin: 0; color: #ffffff; font-size: 12px; font-weight: 800; line-height: 1; }

        .report-content {
          width: 100%;
          height: calc(100vh - 76px);
          padding: 10px 0 0 0;
          overflow: hidden;
          background: #ffffff;
          display: flex;
          flex-direction: column;
        }

        /* ─── FILTER BAR ─── */
        .filter-bar { width: 100%; height: 42px; display: flex; align-items: center; gap: 14px; padding: 0 2px; margin-bottom: 0; flex-shrink: 0; }
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

        .filter-button { height: 30px; width: 88px; border: none; border-radius: 3px; background: #17652c; color: #ffffff; display: flex; align-items: center; justify-content: center; gap: 6px; font-family: Arial, Helvetica, sans-serif; font-size: 10px; font-weight: 700; cursor: pointer; margin-left: auto; flex-shrink: 0; }
        .filter-button:hover { background: #0e4f20; }

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
        .reports-table thead {
          position: sticky;
          top: 0;
          z-index: 10;
          height: 38px;
          background: #ffffff;
        }
        .reports-table th { height: 38px; padding: 0 7px; text-align: left; color: #222222; font-size: 9px; font-weight: 800; border-bottom: 1px solid #78977d; }
        .reports-table td { height: 43px; padding: 4px 7px; color: #222222; font-size: 9px; vertical-align: middle; border-bottom: 1px solid #9cb1a0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .reports-table tbody tr:hover { background: #f7faf7; }

        /* Column widths */
        .reports-table th:nth-child(1), .reports-table td:nth-child(1) { width: 9%; }
        .reports-table th:nth-child(2), .reports-table td:nth-child(2) { width: 14%; }
        .reports-table th:nth-child(3), .reports-table td:nth-child(3) { width: 17%; }
        .reports-table th:nth-child(4), .reports-table td:nth-child(4) { width: 12%; }
        .reports-table th:nth-child(5), .reports-table td:nth-child(5) { width: 25%; }
        .reports-table th:nth-child(6), .reports-table td:nth-child(6) { width: 17%; }
        .reports-table th:nth-child(7), .reports-table td:nth-child(7) { width: 10%; }
        .reports-table th:nth-child(8), .reports-table td:nth-child(8) { width: 10%; text-align: center; }

        .report-id { color: #32754a !important; font-size: 8px !important; }
        .date-cell { white-space: normal !important; line-height: 1.25; }
        .date-cell span { display: block; }

        .status-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 54px; height: 21px; padding: 0 8px; border-radius: 3px; font-size: 8px; font-weight: 700; border: 1px solid rgba(0,0,0,0.15); box-shadow: 0 1px 2px rgba(0,0,0,0.15); }
        .status-badge.pending { background: #fff0a8; color: #856400; }
        .status-badge.ongoing { background: #a8c8ff; color: #0750ad; }
        .status-badge.assigned { background: #cdb2ff; color: #5730a3; }
        .status-badge.resolved { background: #bde5bd; color: #236523; }
        .status-badge.rejected { background: #ffb8b8; color: #9b1d1d; }

        .actions { display: flex; align-items: center; justify-content: center; gap: 8px; }
        .action-button { width: 17px; height: 17px; padding: 0; border: none; background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 11px; line-height: 1; }
        .action-button.edit { color: #4c78c2; }
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

        @media (max-width: 1100px) { .sidebar { width: 300px; min-width: 300px; } .main-content { width: calc(100vw - 300px); } .search-box { width: 180px; } .filter-select { width: 110px; } }
        @media (max-width: 850px) { body { overflow: auto; } .report-page { width: 1100px; min-width: 1100px; height: 100vh; } }
      `}</style>
    </>
  );
}