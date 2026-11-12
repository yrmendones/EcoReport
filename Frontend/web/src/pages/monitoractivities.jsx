import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api";
import { getMenuItems } from "../menu";
import ProfileHeaderButton from "../components/ProfileHeaderButton";

const PAGE_SIZE = 25;

const DATE_PRESETS = [
  { label: "Today", value: "today" },
  { label: "Last 7 days", value: "7days" },
  { label: "Last 30 days", value: "30days" },
  { label: "This Year", value: "year" },
  { label: "Custom Range", value: "custom" },
];

const TYPE_OPTIONS = ["All", "Audit", "User", "Security"];

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const toLocalDateStr = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const formatDateTime = (str) => {
  if (!str) return "—";
  const date = new Date(str);
  if (isNaN(date.getTime())) return str;
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const hour = date.getHours();
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  const ampm = hour >= 12 ? "PM" : "AM";
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()} | ${String(hour12).padStart(2, "0")}:${minute} ${ampm}`;
};

// Classify an audit log entry into Audit / User / Security.
// - Security = authentication, account state changes
// - User     = actions that affect the resident experience directly
// - Audit    = everything else (operational actions, data management)
const classifyType = (action = "") => {
  const a = String(action).toLowerCase();

  if (/\b(login|logout|password|deactivat|re-activat|lock account|unlock account)\b/.test(a)) {
    return "Security";
  }
  if (/\b(verification|verif)/.test(a)) {
    return "Security";
  }
  if (/(resident|announcement|notification center|notification|certificate|appointment|blotter|disaster alert|health)/.test(a)) {
    return "User";
  }
  return "Audit";
};

// Extract a short action label + affected record identifier from the
// raw `action` string. Examples:
//   "Updated report #123 status to ongoing" → { verb: "Update Report", record: "Report #123", extra: "status → ongoing" }
//   "Added resident RES-2026-0005 (Juan Cruz)" → { verb: "Add Resident", record: "RES-2026-0005", extra: "Juan Cruz" }
const parseAction = (raw = "") => {
  const text = String(raw || "").trim();

  // verb
  let verb = "Action";
  if (/^updated/i.test(text)) verb = "Update";
  else if (/^deleted/i.test(text)) verb = "Delete";
  else if (/^added/i.test(text)) verb = "Add";
  else if (/^created/i.test(text)) verb = "Create";
  else if (/^verification (approved|rejected)/i.test(text)) verb = "Verification";
  else if (/^assigned/i.test(text)) verb = "Assign";
  else if (/^sent/i.test(text)) verb = "Send";
  else if (/^login/i.test(text)) verb = "Login";
  else if (/^logged/i.test(text)) verb = "Logout";
  else if (/^changed/i.test(text)) verb = "Change";

  // entity
  let entity = "";
  if (/report/i.test(text)) entity = "Report";
  else if (/resident/i.test(text)) entity = "Resident";
  else if (/announcement/i.test(text)) entity = "Announcement";
  else if (/certificate/i.test(text)) entity = "Certificate";
  else if (/appointment/i.test(text)) entity = "Appointment";
  else if (/waste schedule/i.test(text)) entity = "Waste Schedule";
  else if (/inventory/i.test(text)) entity = "Inventory";
  else if (/blotter/i.test(text)) entity = "Blotter Case";
  else if (/business/i.test(text)) entity = "Business";
  else if (/disaster/i.test(text)) entity = "Disaster Alert";
  else if (/notification/i.test(text)) entity = "Notification";
  else if (/resident verification|verification/i.test(text)) entity = "Verification";

  // record ID
  let record = "—";
  let m;
  if ((m = text.match(/report[s]?\s*#?(\d+)/i))) record = `Report #${m[1]}`;
  else if ((m = text.match(/resident[s]?\s+(RES-[\d-]+)/i))) record = m[1];
  else if ((m = text.match(/certificate request[s]?\s*#?(\d+)/i))) record = `Certificate #${m[1]}`;
  else if ((m = text.match(/appointment[s]?\s*#?(\d+)/i))) record = `Appointment #${m[1]}`;
  else if ((m = text.match(/business[s]?\s+"([^"]+)"/i))) record = m[1];
  else if ((m = text.match(/disaster alert[s]?\s+"([^"]+)"/i))) record = m[1];
  else if ((m = text.match(/announcement[s]?\s+"([^"]+)"/i))) record = m[1];
  else if (/announcement/i.test(text)) record = "Announcement";
  else if (/waste schedule/i.test(text)) record = "Schedule";
  else if (/notification center/i.test(text)) record = "Notification";
  else if (/resident/i.test(text)) record = "Resident record";

  // extra (everything after the matched record, cleaned up)
  let extra = text;
  if (record !== "—") {
    extra = text
      .replace(new RegExp(record.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), "")
      .replace(/^[\s\-:→]+/, "")
      .trim();
  }

  return {
    verb: entity ? `${verb} ${entity}` : verb,
    record,
    extra: extra || "—",
  };
};

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────
export default function MonitorActivities() {
  const navigate = useNavigate();
  const menuItems = getMenuItems("/monitoractivities");

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [datePreset, setDatePreset] = useState("30days");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [page, setPage] = useState(1);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError("");
      // Fetch up to 1000 most recent logs; barangay-scale so this is fine.
      // Filtering + pagination happens client-side for instant feedback.
      const data = await apiFetch("/api/admin/audit-logs?page=1&limit=1000");
      setLogs(Array.isArray(data.logs) ? data.logs : []);
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);
      setError("Failed to load activity logs. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Enrich each log with parsed fields + type, once
  const enrichedLogs = useMemo(
    () =>
      logs.map((log) => {
        const parsed = parseAction(log.action);
        return {
          ...log,
          _type: classifyType(log.action),
          _verb: parsed.verb,
          _record: parsed.record,
          _extra: parsed.extra,
        };
      }),
    [logs]
  );

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
    if (datePreset === "year") {
      const start = new Date(today.getFullYear(), 0, 1);
      return { from: toLocalDateStr(start), to: toLocalDateStr(today) };
    }
    if (datePreset === "custom") {
      return { from: customStart || "", to: customEnd || "" };
    }
    return { from: "", to: "" };
  };

  const filteredLogs = enrichedLogs.filter((log) => {
    // search
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      (log.user_name || "").toLowerCase().includes(q) ||
      (log.action || "").toLowerCase().includes(q) ||
      (log.ip_address || "").toLowerCase().includes(q);

    // type
    const matchesType = typeFilter === "All" || log._type === typeFilter;

    // date
    let matchesDate = true;
    const { from, to } = getDateRange();
    if (from || to) {
      const d = String(log.created_at || "").split("T")[0].split(" ")[0];
      if (from && d < from) matchesDate = false;
      if (to && d > to) matchesDate = false;
    }

    return matchesSearch && matchesType && matchesDate;
  });

  // pagination
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedLogs = filteredLogs.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, datePreset, customStart, customEnd]);

  const pageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
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

  const hasActiveFilters =
    search.trim() !== "" || typeFilter !== "All" || datePreset !== "30days";

  const handleClearFilters = () => {
    setSearch("");
    setTypeFilter("All");
    setDatePreset("30days");
    setCustomStart("");
    setCustomEnd("");
    setPage(1);
  };

  // type badge colours
  const typeBadgeClass = (type) => {
    if (type === "User") return "type-badge user";
    if (type === "Security") return "type-badge security";
    return "type-badge audit";
  };

  return (
    <>
      <div className="monitor-page">
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
            <h2>Monitor Activities</h2>
            <ProfileHeaderButton />
          </header>

          <section className="monitor-content">
            <p className="monitor-subtitle">
              Audit trail of all staff actions. Records are read-only and cannot be edited or deleted.
            </p>

            <div className="monitor-card">
              {/* FILTERS */}
              <div className="monitor-filters">
                <div className="filter-group search-group">
                  <label>Search</label>
                  <div className="search-box">
                    <span className="search-icon">🔍</span>
                    <input
                      type="text"
                      placeholder="Name, action, or IP address"
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
                </div>

                <div className="filter-group">
                  <label>Log type</label>
                  <select
                    className="filter-select"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                  >
                    {TYPE_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t === "All" ? "All types" : t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label>Date</label>
                  <select
                    className="filter-select"
                    value={datePreset}
                    onChange={(e) => setDatePreset(e.target.value)}
                  >
                    {DATE_PRESETS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>

                {datePreset === "custom" && (
                  <div className="filter-group">
                    <label>Custom range</label>
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
                  </div>
                )}

                {hasActiveFilters && (
                  <button
                    type="button"
                    className="filter-clear-btn"
                    onClick={handleClearFilters}
                  >
                    Clear filters
                  </button>
                )}
              </div>

              {/* TABLE */}
              <div className="table-wrapper">
                {loading ? (
                  <div className="table-message">Loading activity logs…</div>
                ) : error ? (
                  <div className="table-message error">
                    <p>{error}</p>
                    <button onClick={fetchLogs}>Try Again</button>
                  </div>
                ) : (
                  <table className="logs-table">
                    <thead>
                      <tr>
                        <th>Date &amp; Time</th>
                        <th>Performed By</th>
                        <th>Action</th>
                        <th>Affected Record</th>
                        <th>Details</th>
                        <th>Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedLogs.length > 0 ? (
                        paginatedLogs.map((log) => (
                          <tr key={log.log_id}>
                            <td className="log-date">
                              {formatDateTime(log.created_at)}
                            </td>
                            <td>{log.user_name || "System"}</td>
                            <td title={log.action || ""}>{log._verb}</td>
                            <td className="log-record">{log._record}</td>
                            <td className="log-details" title={log._extra}>
                              {log._extra}
                            </td>
                            <td>
                              <span className={typeBadgeClass(log._type)}>
                                {log._type}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="no-results">
                            {hasActiveFilters
                              ? "No activity matches the selected filters."
                              : "No activity recorded yet. Staff actions will appear here."}
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
                    Showing {paginatedLogs.length} of {filteredLogs.length} record
                    {filteredLogs.length === 1 ? "" : "s"} · Page{" "}
                    <strong>{safePage}</strong> of <strong>{totalPages}</strong>
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
                        <span key={`e-${i}`} className="rp-page-ellipsis">
                          …
                        </span>
                      ) : (
                        <button
                          key={p}
                          type="button"
                          className={`rp-page-btn ${
                            p === safePage ? "active" : ""
                          }`}
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
            </div>
          </section>
        </main>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        html, body, #root { margin: 0; padding: 0; width: 100%; height: 100%; }
        body { font-family: Arial, Helvetica, sans-serif; background: #ffffff; overflow: hidden; }

        .monitor-page {
          width: 100vw; height: 100vh; display: flex;
          background: #ffffff; overflow: hidden;
        }

        /* SIDEBAR */
        .sidebar {
          position: relative; width: 320px; min-width: 320px;
          height: 100vh; flex-shrink: 0; background: #13471e; overflow: hidden;
        }
        .sidebar-background {
          position: absolute; inset: 0; width: 100%; height: 100%;
          object-fit: cover; object-position: center; z-index: 0; pointer-events: none;
        }
        .sidebar-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(180deg, rgba(3,77,30,0.91) 0%, rgba(3,76,29,0.87) 100%);
          z-index: 1; pointer-events: none;
        }
        .sidebar-content { position: relative; z-index: 2; width: 100%; height: 100%; }
        .sidebar-brand { height: 86px; display: flex; align-items: center; padding-left: 36px; gap: 10px; }
        .sidebar-brand-image { width: 51.7px; height: 54px; object-fit: contain; display: block; flex-shrink: 0; }
        .sidebar-brand-name { color: #fff9df; font-size: 20px; font-weight: 800; line-height: 1; white-space: nowrap; }
        .sidebar-barangay {
          height: 5px; display: flex; align-items: center; padding-left: 70px;
          color: #fff9df; font-size: 11px; font-weight: 500;
          border-bottom: 1px solid rgba(255,255,255,0.14);
        }
        .sidebar-menu {
          width: 100%; padding-top: 5px;
          max-height: calc(100vh - 96px); overflow-y: auto;
        }
        .menu-item {
          width: 100%; height: 30px; border: none; margin: 0;
          padding: 0 14px 0 42px; display: flex; align-items: center; gap: 14px;
          background: transparent; color: #ffffff;
          font-family: inherit; font-size: 15px; font-weight: 500;
          text-align: left; cursor: pointer; transition: background 0.15s ease;
        }
        .menu-item:hover { background: rgba(255,255,255,0.09); }
        .menu-item.active { background: rgba(0,0,0,0.28); padding-left: 38px; font-weight: 700; }
        .menu-icon { width: 30px; height: 28px; object-fit: contain; display: block; flex-shrink: 0; }
        .menu-text { white-space: nowrap; line-height: 1; }

        /* MAIN */
        .main-content {
          width: calc(100vw - 320px); height: 100vh; min-width: 0;
          padding: 0 12px 10px 12px; overflow: hidden; background: #ffffff;
        }
        .top-header {
          width: calc(100% + 24px); height: 76px; margin-left: -12px;
          padding: 0 24px 0 18px;
          display: flex; align-items: center; justify-content: space-between;
          background: #13471e;
        }
        .top-header h2 { margin: 0; color: #ffffff; font-size: 12px; font-weight: 800; line-height: 1; }

        /* CONTENT */
        .monitor-content {
          width: 100%; height: calc(100vh - 76px);
          padding: 14px 4px 0 4px; overflow: hidden;
          background: #ffffff; display: flex; flex-direction: column;
        }
        .monitor-subtitle {
          margin: 0 0 12px 0; color: #555555; font-size: 11px; flex-shrink: 0;
        }

        .monitor-card {
          flex: 1; min-height: 0;
          padding: 12px;
          background: #ffffff;
          border: 1px solid #66866b;
          border-radius: 4px;
          display: flex; flex-direction: column;
        }

        /* FILTERS */
        .monitor-filters {
          display: flex; align-items: flex-end; flex-wrap: wrap;
          gap: 12px; margin-bottom: 12px; flex-shrink: 0;
        }
        .filter-group { display: flex; flex-direction: column; gap: 4px; }
        .filter-group label {
          color: #111111; font-size: 9px; font-weight: 800;
        }
        .search-group { flex: 1; min-width: 240px; }

        .search-box {
          position: relative; width: 100%; height: 30px;
          display: flex; align-items: center;
          border: 1px solid #b7b7b7; border-radius: 3px;
          background: #ffffff;
        }
        .search-icon {
          width: 28px; display: flex; align-items: center;
          justify-content: center; color: #444; font-size: 11px;
        }
        .search-box input {
          flex: 1; width: 100%; height: 100%; border: none; outline: none;
          padding: 0 5px 0 0; font-family: inherit;
          font-size: 10px; color: #333; background: transparent;
        }
        .search-box input::placeholder { color: #999; }
        .clear-search {
          width: 24px; height: 24px; border: none; background: transparent;
          color: #555; cursor: pointer; font-size: 14px;
        }

        .filter-select {
          height: 30px; min-width: 130px; padding: 0 8px;
          border: 1px solid #a9b49f; border-radius: 3px;
          background: #ffffff; color: #444;
          font-family: inherit; font-size: 10px;
          outline: none; cursor: pointer;
        }

        .custom-range { display: flex; align-items: center; gap: 4px; }
        .filter-date-input {
          height: 30px; padding: 0 8px; width: 130px;
          border: 1px solid #a9b49f; border-radius: 3px;
          background: #ffffff; color: #333;
          font-family: inherit; font-size: 10px; outline: none;
        }
        .filter-date-input:focus { border-color: #17652c; }
        .range-sep { color: #666; font-size: 11px; }

        .filter-clear-btn {
          height: 30px; padding: 0 12px;
          border: 1px solid #e0a5a5; border-radius: 3px;
          background: #ffffff; color: #b3261e;
          font-family: inherit; font-size: 10px; font-weight: 700;
          cursor: pointer;
        }
        .filter-clear-btn:hover { background: #fdecec; }

        /* TABLE */
        .table-wrapper {
          width: 100%; flex: 1; min-height: 0; overflow: auto;
          border: 1px solid #66866b; background: #ffffff;
        }
        .logs-table {
          width: 100%; border-collapse: collapse;
          table-layout: fixed; font-size: 10px;
        }
        .logs-table thead {
          position: sticky; top: 0; z-index: 10;
          background: #eef5ee;
        }
        .logs-table th {
          height: 38px; padding: 0 10px;
          text-align: left; color: #222222;
          font-size: 10px; font-weight: 800;
          border-bottom: 1px solid #78977d;
        }
        .logs-table td {
          height: 42px; padding: 6px 10px;
          color: #222222; font-size: 10px;
          vertical-align: middle;
          border-bottom: 1px solid #c8d4ca;
          overflow: hidden; text-overflow: ellipsis;
          white-space: nowrap;
        }
        .logs-table tbody tr:hover { background: #f7faf7; }
        .logs-table tbody tr:last-child td { border-bottom: none; }

        .logs-table th:nth-child(1), .logs-table td:nth-child(1) { width: 19%; }
        .logs-table th:nth-child(2), .logs-table td:nth-child(2) { width: 15%; }
        .logs-table th:nth-child(3), .logs-table td:nth-child(3) { width: 15%; }
        .logs-table th:nth-child(4), .logs-table td:nth-child(4) { width: 14%; }
        .logs-table th:nth-child(5), .logs-table td:nth-child(5) { width: 26%; }
        .logs-table th:nth-child(6), .logs-table td:nth-child(6) { width: 11%; text-align: center; }

        .log-date { color: #32754a; font-weight: 600; }
        .log-record {
          font-family: "Consolas", "Menlo", monospace;
          font-size: 9px; color: #444;
        }
        .log-details { color: #555; }

        /* TYPE BADGES */
        .type-badge {
          display: inline-flex; align-items: center; justify-content: center;
          min-width: 60px; height: 20px; padding: 0 10px;
          border-radius: 10px; font-size: 9px; font-weight: 700;
        }
        .type-badge.audit {
          background: #e5e7eb; color: #525252; border: 1px solid #d1d5db;
        }
        .type-badge.user {
          background: #d1edcf; color: #2E7D32; border: 1px solid #b8dcba;
        }
        .type-badge.security {
          background: #f7eab3; color: #525252; border: 1px solid #d9cc9a;
        }

        .table-message {
          padding: 60px 20px; text-align: center;
          color: #666; font-size: 12px;
        }
        .table-message.error p { color: #b91c1c; font-weight: 700; margin-bottom: 10px; }
        .table-message.error button {
          background: #0B5D2A; color: #fff; border: none;
          padding: 6px 16px; border-radius: 4px;
          cursor: pointer; font-weight: 600;
        }
        .no-results {
          height: 80px !important; text-align: center !important;
          color: #888 !important;
        }

        /* PAGINATION */
        .rp-pagination-bar {
          width: 100%; height: 44px; display: flex;
          align-items: center; justify-content: space-between;
          gap: 12px; padding: 0 2px; margin-top: 6px;
          flex-shrink: 0; background: #ffffff;
          border-top: 1px solid #d4dcd4;
        }
        .rp-page-info { color: #4b5563; font-size: 11px; font-weight: 500; }
        .rp-page-info strong { color: #0B5D2A; font-weight: 800; }
        .rp-pagination-controls { display: flex; align-items: center; gap: 3px; }
        .rp-page-btn {
          min-width: 28px; height: 28px; padding: 0 8px;
          border: 1px solid #d4dcd4; border-radius: 4px;
          background: #ffffff; color: #374151;
          font-family: inherit; font-size: 11px; font-weight: 600;
          cursor: pointer; display: inline-flex;
          align-items: center; justify-content: center;
        }
        .rp-page-btn.rp-page-nav { padding: 0 10px; }
        .rp-page-btn:hover:not(:disabled):not(.active) {
          background: #f0f7f0; border-color: #b8c9b8;
        }
        .rp-page-btn.active {
          background: #0B5D2A; color: #fff;
          border-color: #0B5D2A; font-weight: 800;
        }
        .rp-page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .rp-page-ellipsis {
          padding: 0 4px; color: #9ca3af;
          font-size: 12px; user-select: none;
        }

        @media (max-width: 1100px) {
          .sidebar { width: 300px; min-width: 300px; }
          .main-content { width: calc(100vw - 300px); }
          .search-group { min-width: 180px; }
        }
      `}</style>
    </>
  );
}