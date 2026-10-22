import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api";
import { getMenuItems } from "../menu";
import ProfileHeaderButton from "../components/ProfileHeaderButton";

// ─── Category filter
const FILTER_OPTIONS = [
  { label: "All Activities", keyword: "" },
  { label: "Login", keyword: "Login" },
  { label: "Reports", keyword: "report" },
  { label: "Assignments", keyword: "assignment" },
  { label: "Residents", keyword: "resident" },
  { label: "Verification", keyword: "verification" },
  { label: "Certificates", keyword: "certificate" },
  { label: "Announcements", keyword: "announcement" },
  { label: "Notifications", keyword: "notification" },
  { label: "Disaster", keyword: "disaster" },
  { label: "Inventory", keyword: "inventory" },
  { label: "Business", keyword: "business" },
  { label: "Blotter", keyword: "blotter" },
  { label: "Health", keyword: "health" },
  { label: "Waste", keyword: "waste" },
];

const DATE_PRESETS = [
  { label: "All Time", value: "all" },
  { label: "Today", value: "today" },
  { label: "Past 7 Days", value: "7days" },
  { label: "Past 30 Days", value: "30days" },
  { label: "Custom Range", value: "custom" },
];

const PAGE_SIZE = 25;
const EXPORT_LIMIT = 10000;

const formatDateTime = (str) => {
  if (!str) return "N/A";
  const safe = String(str).replace("T", " ");
  const [datePart, timePart] = safe.split(" ");
  const [y, m, d] = (datePart || "").split("-");
  if (!y || !m || !d) return str;

  const [hh = "00", mm = "00"] = (timePart || "").split(":");
  const hour24 = parseInt(hh, 10);
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const ampm = hour24 >= 12 ? "PM" : "AM";

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthName = months[parseInt(m, 10) - 1] || m;

  return `${monthName} ${parseInt(d, 10)}, ${y} | ${String(hour12).padStart(2, "0")}:${mm} ${ampm}`;
};

const toLocalDateStr = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export default function AuditLogs() {
  const navigate = useNavigate();
  const menuItems = getMenuItems();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  const [filter, setFilter] = useState("All Activities");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [datePreset, setDatePreset] = useState("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);

  const searchDebounceRef = useRef(null);

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

  const buildQuery = (extra = {}) => {
    const params = new URLSearchParams();
    const keyword = FILTER_OPTIONS.find((f) => f.label === filter)?.keyword || "";
    if (keyword) params.append("filter", keyword);
    if (search.trim()) params.append("search", search.trim());
    const { from, to } = getDateRange();
    if (from) params.append("date_from", from);
    if (to) params.append("date_to", to);
    Object.entries(extra).forEach(([k, v]) => params.append(k, v));
    return params.toString();
  };

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const qs = buildQuery({ page, limit: PAGE_SIZE });
      const data = await apiFetch(`/api/admin/audit-logs?${qs}`);

      if (Array.isArray(data)) {
        setLogs(data);
        setTotal(data.length);
        setTotalPages(1);
      } else {
        setLogs(data.logs || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 0);
      }
    } catch (err) {
      console.error("Error fetching audit logs:", err);
      setError("Failed to load audit logs. Please try again.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, search, datePreset, customStart, customEnd, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(searchDebounceRef.current);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [filter, datePreset, customStart, customEnd]);

  const handleClearFilters = () => {
    setFilter("All Activities");
    setSearchInput("");
    setSearch("");
    setDatePreset("all");
    setCustomStart("");
    setCustomEnd("");
    setPage(1);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const qs = buildQuery({ page: 1, limit: EXPORT_LIMIT });
      const data = await apiFetch(`/api/admin/audit-logs?${qs}`);
      const rows = Array.isArray(data) ? data : data.logs || [];

      if (rows.length === 0) {
        alert("No logs match the current filters — nothing to export.");
        setExporting(false);
        return;
      }

      const escapeCsv = (v) =>
        `"${String(v ?? "").replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;

      const header = ["User", "Action", "Date & Time", "IP Address"];
      const csvLines = [header.join(",")];
      rows.forEach((log) => {
        csvLines.push(
          [
            escapeCsv(log.user_name || "System"),
            escapeCsv(log.action || ""),
            escapeCsv(formatDateTime(log.created_at)),
            escapeCsv(log.ip_address || ""),
          ].join(",")
        );
      });

      const csvContent = "\uFEFF" + csvLines.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `EcoReport-AuditLogs-${toLocalDateStr(new Date())}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Export failed: " + err.message);
    } finally {
      setExporting(false);
    }
  };

  const pageNumbers = () => {
    const pages = [];
    const maxButtons = 5;
    if (totalPages <= maxButtons + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      if (start > 2) pages.push("...");
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  const hasActiveFilters =
    filter !== "All Activities" ||
    searchInput.trim() !== "" ||
    datePreset !== "all";

  return (
    <div className="audit-page">
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

      <main className="main-content">
        <header className="top-header">
          <h2>Audit Logs</h2>
          <ProfileHeaderButton />
        </header>

        <section className="audit-content">
          {/* ─── FILTER BAR ─── */}
          <div className="filter-bar">
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search logs..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              {searchInput && (
                <button
                  type="button"
                  className="clear-search"
                  onClick={() => setSearchInput("")}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>

            <select
              className="filter-select"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              {FILTER_OPTIONS.map((f) => (
                <option key={f.label} value={f.label}>{f.label}</option>
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
              <div className="audit-custom-range">
                <input
                  type="date"
                  className="filter-date-input"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  max={customEnd || undefined}
                  aria-label="Start date"
                />
                <span className="audit-range-sep">→</span>
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
              onClick={handleExport}
              disabled={exporting || loading}
            >
              {exporting ? "Exporting..." : "⬇ Export CSV"}
            </button>
          </div>

          {/* ─── TABLE ─── */}
          <div className="table-wrapper">
            {loading ? (
              <div className="audit-message">Loading audit logs...</div>
            ) : error ? (
              <div className="audit-message error">
                <p>{error}</p>
                <button onClick={fetchLogs}>Try Again</button>
              </div>
            ) : logs.length === 0 ? (
              <div className="audit-message">
                {hasActiveFilters
                  ? "No logs match the selected filters."
                  : "No activity logs recorded yet."}
              </div>
            ) : (
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Action</th>
                    <th>Date &amp; Time</th>
                    <th>IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.log_id}>
                      <td>{log.user_name || "System"}</td>
                      <td className="action-cell">{log.action}</td>
                      <td>{formatDateTime(log.created_at)}</td>
                      <td className="ip-cell">{log.ip_address || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* ─── PAGINATION ─── */}
          {!loading && !error && totalPages > 1 && (
            <div className="audit-pagination-bar">
              <div className="audit-page-info">
                Page <strong>{page}</strong> of <strong>{totalPages}</strong>
              </div>

              <div className="audit-pagination-controls">
                <button
                  type="button"
                  className="audit-page-btn audit-page-nav"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  ‹ Prev
                </button>

                {pageNumbers().map((p, i) =>
                  p === "..." ? (
                    <span key={`ellipsis-${i}`} className="audit-page-ellipsis">
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      className={`audit-page-btn ${p === page ? "active" : ""}`}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </button>
                  )
                )}

                <button
                  type="button"
                  className="audit-page-btn audit-page-nav"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next ›
                </button>
              </div>
            </div>
          )}
        </section>
      </main>

      <style>{`
        * { box-sizing: border-box; }
        html, body, #root { margin: 0; padding: 0; width: 100%; height: 100%; }
        body { font-family: Arial, Helvetica, sans-serif; background: #ffffff; overflow: hidden; }

        .audit-page { width: 100vw; height: 100vh; display: flex; background: #ffffff; overflow: hidden; }

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

        /* ─── CONTENT ─── */
        .audit-content {
          width: 100%;
          height: calc(100vh - 76px);
          padding: 10px 0 0 0;
          overflow: hidden;
          background: #ffffff;
          display: flex;
          flex-direction: column;
        }

        /* ─── FILTER BAR ─── */
        .filter-bar {
          width: 100%;
          height: 42px;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 0 2px;
          margin-bottom: 0;
          flex-shrink: 0;
        }

        .search-box {
          position: relative;
          width: 220px;
          height: 30px;
          display: flex;
          align-items: center;
          border: 1px solid #b7b7b7;
          border-radius: 3px;
          background: #ffffff;
          flex-shrink: 0;
        }
        .search-icon {
          width: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #444;
          font-size: 11px;
        }
        .search-box input {
          flex: 1;
          width: 100%;
          height: 100%;
          border: none;
          outline: none;
          padding: 0 5px 0 0;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 10px;
          color: #333;
          background: transparent;
        }
        .search-box input::placeholder { color: #999; }
        .clear-search {
          width: 24px;
          height: 24px;
          border: none;
          background: transparent;
          color: #555;
          cursor: pointer;
          font-size: 14px;
        }

        .filter-select {
          width: 130px;
          height: 30px;
          padding: 0 8px;
          border: 1px solid #a9b49f;
          border-radius: 3px;
          background: #ffffff;
          color: #444;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 10px;
          outline: none;
          cursor: pointer;
          flex-shrink: 0;
        }
        .date-select { width: 120px; }

        .audit-custom-range {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-shrink: 0;
        }
        .filter-date-input {
          width: 120px;
          height: 30px;
          padding: 0 8px;
          border: 1px solid #a9b49f;
          border-radius: 3px;
          background: #ffffff;
          color: #333;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 10px;
          outline: none;
        }
        .filter-date-input:focus { border-color: #17652c; }
        .audit-range-sep { color: #666; font-size: 11px; }

        .filter-clear-btn {
          height: 30px;
          padding: 0 12px;
          border: 1px solid #e0a5a5;
          border-radius: 3px;
          background: #ffffff;
          color: #b3261e;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
          flex-shrink: 0;
        }
        .filter-clear-btn:hover { background: #fdecec; }

        .filter-export-btn {
          height: 30px;
          padding: 0 12px;
          border: 1px solid #547f5c;
          border-radius: 3px;
          background: #367046;
          color: #ffffff;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
          margin-left: auto;
          flex-shrink: 0;
          transition: background 0.15s ease;
        }
        .filter-export-btn:hover:not(:disabled) { background: #2e623d; }
        .filter-export-btn:disabled { opacity: 0.55; cursor: not-allowed; }

        /* ─── TABLE (matches reports-table) ─── */
        .table-wrapper {
          width: 100%;
          flex: 1;
          min-height: 0;
          overflow: auto;
          border: 1px solid #66866b;
          background: #ffffff;
          margin-top: 4px;
        }

        .reports-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 9px;
        }
        .reports-table thead {
          position: sticky;
          top: 0;
          z-index: 10;
          height: 38px;
          background: #ffffff;
        }
        .reports-table th {
          height: 38px;
          padding: 0 7px;
          text-align: left;
          color: #222222;
          font-size: 9px;
          font-weight: 800;
          border-bottom: 1px solid #78977d;
        }
        .reports-table td {
          height: 43px;
          padding: 4px 7px;
          color: #222222;
          font-size: 9px;
          vertical-align: middle;
          border-bottom: 1px solid #9cb1a0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .reports-table tbody tr:hover { background: #f7faf7; }

        .reports-table th:nth-child(1), .reports-table td:nth-child(1) { width: 20%; }
        .reports-table th:nth-child(2), .reports-table td:nth-child(2) { width: 40%; }
        .reports-table th:nth-child(3), .reports-table td:nth-child(3) { width: 25%; }
        .reports-table th:nth-child(4), .reports-table td:nth-child(4) { width: 15%; }

        .action-cell { color: #1f4a2c; font-weight: 500; }
        .ip-cell { color: #666; font-family: "Consolas", "Menlo", monospace; font-size: 9px; }

        .audit-message {
          padding: 40px;
          text-align: center;
          color: #666;
          font-size: 12px;
        }
        .audit-message.error p { color: #b91c1c; font-weight: 700; margin-bottom: 10px; }
        .audit-message.error button {
          background: #0B5D2A; color: white; border: none; padding: 6px 16px;
          border-radius: 4px; cursor: pointer; font-weight: 600;
        }

        /* ─── PAGINATION BAR ─── */
        .audit-pagination-bar {
          width: 100%;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 0 2px;
          flex-shrink: 0;
          background: #ffffff;
        }

        .audit-page-info {
          color: #4b5563;
          font-size: 11px;
          font-weight: 500;
        }
        .audit-page-info strong {
          color: #0B5D2A;
          font-weight: 800;
        }

        .audit-pagination-controls {
          display: flex;
          align-items: center;
          gap: 3px;
        }

        .audit-page-btn {
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
        .audit-page-btn.audit-page-nav {
          padding: 0 10px;
          gap: 4px;
        }
        .audit-page-btn:hover:not(:disabled):not(.active) {
          background: #f0f7f0;
          border-color: #b8c9b8;
        }
        .audit-page-btn.active {
          background: #0B5D2A;
          color: #ffffff;
          border-color: #0B5D2A;
          font-weight: 800;
        }
        .audit-page-btn:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }
        .audit-page-ellipsis {
          padding: 0 4px;
          color: #9ca3af;
          font-size: 12px;
          user-select: none;
          display: inline-flex;
          align-items: center;
          height: 28px;
        }

        @media (max-width: 1100px) {
          .sidebar { width: 300px; min-width: 300px; }
          .main-content { width: calc(100vw - 300px); }
        }
      `}</style>
    </div>
  );
}