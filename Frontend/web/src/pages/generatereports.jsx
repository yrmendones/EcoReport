import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api";
import { getMenuItems } from "../menu";
import ProfileHeaderButton from "../components/ProfileHeaderButton";

const PERIODS = ["Today", "This week", "This month", "Last month", "This year"];
const REPORT_TYPES = [
  "Account Activity",
  "Login Activity",
  "Verification Activity",
  "Admin Actions",
  "Security",
];

// ─────────────────────────────────────────────
// DATE HELPERS
// ─────────────────────────────────────────────
const toLocalDateStr = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const parseDate = (s) => {
  const [y, m, d] = String(s).split("-").map(Number);
  return new Date(y, m - 1, d);
};

const getPeriodRange = (period) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = toLocalDateStr(today);

  if (period === "Today") return { from: todayStr, to: todayStr };

  if (period === "This week") {
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    return { from: toLocalDateStr(start), to: todayStr };
  }

  if (period === "This month") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: toLocalDateStr(start), to: todayStr };
  }

  if (period === "Last month") {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0);
    return { from: toLocalDateStr(start), to: toLocalDateStr(end) };
  }

  // This year
  const start = new Date(today.getFullYear(), 0, 1);
  return { from: toLocalDateStr(start), to: todayStr };
};

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const buildBuckets = (period, from, to) => {
  const buckets = [];

  if (period === "This year") {
    const s = parseDate(from);
    const e = parseDate(to);
    let y = s.getFullYear();
    let m = s.getMonth();
    const endY = e.getFullYear();
    const endM = e.getMonth();
    while (y < endY || (y === endY && m <= endM)) {
      buckets.push({
        key: `${y}-${String(m + 1).padStart(2, "0")}`,
        label: monthNames[m],
      });
      m++;
      if (m > 11) { m = 0; y++; }
    }
    return buckets;
  }

  const s = parseDate(from);
  const e = parseDate(to);
  const d = new Date(s);
  while (d <= e) {
    buckets.push({
      key: toLocalDateStr(d),
      label: `${monthNames[d.getMonth()]} ${d.getDate()}`,
    });
    d.setDate(d.getDate() + 1);
  }
  return buckets;
};

// ─────────────────────────────────────────────
// AGGREGATION
// ─────────────────────────────────────────────
const aggregateReport = (type, residents, auditLogs, from, to, period) => {
  const inRange = (dateStr) => {
    const d = String(dateStr || "").split("T")[0].split(" ")[0];
    return d >= from && d <= to;
  };

  const residentsInRange = residents.filter((r) => inRange(r.registered_at));
  const logsInRange = auditLogs.filter((l) => inRange(l.created_at));

  const buckets = buildBuckets(period, from, to);
  const bucketMap = {};
  buckets.forEach((b) => { bucketMap[b.key] = 0; });

  const getKey = (dateStr) => {
    const d = String(dateStr || "").split("T")[0].split(" ")[0];
    return period === "This year" ? d.slice(0, 7) : d;
  };

  let stats = [];
  let chartTitle = "";
  let logsToChart = [];

  if (type === "Account Activity") {
    stats = [
      { label: "New Registrations", value: residentsInRange.length },
      { label: "Total Registered", value: residents.length },
      { label: "Pending", value: residents.filter((r) => r.verification_status === "Pending Verification").length },
      { label: "Verified", value: residents.filter((r) => r.verification_status === "Verified Resident").length },
      { label: "Rejected", value: residents.filter((r) => r.verification_status === "Rejected").length },
      { label: "Deactivated", value: residents.filter((r) => r.status === "Deactivated").length },
    ];
    chartTitle = period === "This year" ? "New registrations per month" : "New registrations per day";
    residentsInRange.forEach((r) => {
      const k = getKey(r.registered_at);
      if (bucketMap[k] !== undefined) bucketMap[k]++;
    });
  } else if (type === "Login Activity") {
    const staffLogins = logsInRange.filter((l) => /login/i.test(l.action || ""));
    const uniqueUsers = new Set(staffLogins.map((l) => l.user_name).filter(Boolean));
    const peak = (() => {
      const counts = {};
      staffLogins.forEach((l) => {
        const k = getKey(l.created_at);
        counts[k] = (counts[k] || 0) + 1;
      });
      let best = null, bestVal = 0;
      Object.entries(counts).forEach(([k, v]) => { if (v > bestVal) { bestVal = v; best = k; } });
      const b = buckets.find((x) => x.key === best);
      return b ? `${b.label} (${bestVal})` : "—";
    })();

    stats = [
      { label: "Staff Logins", value: staffLogins.length },
      { label: "Unique Staff Users", value: uniqueUsers.size },
      { label: "Total Audit Events", value: logsInRange.length },
      { label: "Peak Day", value: peak },
      { label: "Avg Events/Day", value: (logsInRange.length / Math.max(1, buckets.length)).toFixed(1) },
    ];
    chartTitle = period === "This year" ? "Logins per month" : "Logins per day";
    logsToChart = staffLogins;
  } else if (type === "Verification Activity") {
    const approved = logsInRange.filter((l) => /verification approved/i.test(l.action || ""));
    const rejected = logsInRange.filter((l) => /verification rejected/i.test(l.action || ""));
    const total = approved.length + rejected.length;
    const approvalRate = total > 0 ? `${Math.round((approved.length / total) * 100)}%` : "—";

    stats = [
      { label: "New Registrations", value: residentsInRange.length },
      { label: "Approved (period)", value: approved.length },
      { label: "Rejected (period)", value: rejected.length },
      { label: "Currently Pending", value: residents.filter((r) => r.verification_status === "Pending Verification").length },
      { label: "Currently Verified", value: residents.filter((r) => r.verification_status === "Verified Resident").length },
      { label: "Approval Rate", value: approvalRate },
    ];
    chartTitle = period === "This year" ? "Verifications per month" : "Verifications per day";
    logsToChart = logsInRange.filter((l) => /verification (approved|rejected)/i.test(l.action || ""));
  } else if (type === "Admin Actions") {
    const reportActions = logsInRange.filter((l) => /report/i.test(l.action || ""));
    const assignments = logsInRange.filter((l) => /assign/i.test(l.action || ""));
    const residentActions = logsInRange.filter((l) => /resident/i.test(l.action || ""));
    const announcements = logsInRange.filter((l) => /announcement/i.test(l.action || ""));
    const settings = logsInRange.filter((l) => /setting|notification center/i.test(l.action || ""));

    stats = [
      { label: "Total Actions", value: logsInRange.length },
      { label: "Report Actions", value: reportActions.length },
      { label: "Assignments", value: assignments.length },
      { label: "Resident Actions", value: residentActions.length },
      { label: "Announcements", value: announcements.length },
      { label: "Settings / Notifications", value: settings.length },
    ];
    chartTitle = period === "This year" ? "Actions per month" : "Actions per day";
    logsToChart = logsInRange;
  } else if (type === "Security") {
    const staffLogins = logsInRange.filter((l) => /login/i.test(l.action || ""));
    const deletions = logsInRange.filter((l) => /delet/i.test(l.action || ""));
    const deactivations = logsInRange.filter((l) => /deactivat/i.test(l.action || ""));
    const uniqueUsers = new Set(logsInRange.map((l) => l.user_name).filter(Boolean));

    stats = [
      { label: "Total Events", value: logsInRange.length },
      { label: "Staff Logins", value: staffLogins.length },
      { label: "Deletions", value: deletions.length },
      { label: "Deactivations", value: deactivations.length },
      { label: "Unique Users", value: uniqueUsers.size },
    ];
    chartTitle = period === "This year" ? "Events per month" : "Events per day";
    logsToChart = logsInRange;
  }

  logsToChart.forEach((l) => {
    const k = getKey(l.created_at);
    if (bucketMap[k] !== undefined) bucketMap[k]++;
  });

  const chart = buckets.map((b) => ({ label: b.label, value: bucketMap[b.key] || 0 }));
  return { stats, chart, chartTitle };
};

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────
export default function GenerateReports() {
  const navigate = useNavigate();
  const menuItems = getMenuItems("/generatereports");

  const [selectedType, setSelectedType] = useState("Account Activity");
  const [period, setPeriod] = useState("This month");

  const [residents, setResidents] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch raw data once
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        const from = toLocalDateStr(oneYearAgo);
        const to = toLocalDateStr(new Date());

        const [residentsData, logsData] = await Promise.all([
          apiFetch("/api/admin/residents"),
          apiFetch(`/api/admin/audit-logs?page=1&limit=5000&date_from=${from}&date_to=${to}`),
        ]);

        setResidents(Array.isArray(residentsData) ? residentsData : []);
        setAuditLogs(Array.isArray(logsData.logs) ? logsData.logs : []);
      } catch (err) {
        console.error("Failed to load report data:", err);
        setError("Failed to load report data. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Aggregate on every type/period change (client-side, no re-fetch)
  const report = useMemo(() => {
    if (loading || error) return null;
    const { from, to } = getPeriodRange(period);
    return aggregateReport(selectedType, residents, auditLogs, from, to, period);
  }, [selectedType, period, residents, auditLogs, loading, error]);

  const maxChart = report && report.chart.length > 0
    ? Math.max(...report.chart.map((c) => c.value), 1)
    : 1;

  const hasAnyData = report && report.chart.some((c) => c.value > 0);

  // ─────────────────────────────────────────────
  // EXPORT
  // ─────────────────────────────────────────────
  const handlePrint = () => window.print();
  const handleDownloadPDF = () => window.print();

  const handleDownloadCSV = () => {
    if (!report) return;
    const rows = [
      ["EcoReport — Generate Reports"],
      ["Barangay Sto. Rosario Kanluran"],
      [`Generated: ${new Date().toLocaleString()}`],
      [],
      ["Report Type", selectedType],
      ["Period", period],
      [],
      ["Metric", "Value"],
      ...report.stats.map((s) => [s.label, s.value]),
      [],
      [report.chartTitle, "Value"],
      ...report.chart.map((b) => [b.label, b.value]),
    ];
    const csv = rows
      .map((row) => row.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedType.replace(/\s+/g, "-").toLowerCase()}-${period.replace(/\s+/g, "-").toLowerCase()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <>
      <div className="generate-page">
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
                <button key={index} type="button"
                  className={`menu-item ${item.active ? "active" : ""}`}
                  onClick={() => navigate(item.path)}>
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
            <h2>Generate Reports</h2>
            <ProfileHeaderButton />
          </header>

          <section className="generate-content">
            <h1 className="page-title">Generate Reports</h1>
            <p className="page-subtitle">
              Select a report type and period, preview it, then download or print.
            </p>

            {/* 1. SELECT REPORT TYPE */}
            <div className="panel">
              <div className="panel-title">1. Select Report Type</div>

              <div className="type-row">
                {REPORT_TYPES.map((type) => (
                  <button key={type} type="button"
                    className={`type-button ${selectedType === type ? "selected" : ""}`}
                    onClick={() => setSelectedType(type)}>
                    {type}
                  </button>
                ))}
              </div>

              <label className="period-label">Period</label>
              <div className="period-wrapper">
                <select className="period-select" value={period}
                  onChange={(e) => setPeriod(e.target.value)}>
                  {PERIODS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            {/* 2. PREVIEW */}
            <div className="panel" id="print-area">
              <div className="panel-title">2. Preview Report</div>

              {loading ? (
                <div className="preview-loading">Loading report data…</div>
              ) : error ? (
                <div className="preview-loading" style={{ color: "#b91c1c" }}>
                  {error}
                </div>
              ) : report ? (
                <>
                  <div className="preview-title">
                    {selectedType}: {period}
                  </div>

                  <div className="stats-grid">
                    {report.stats.map((s) => (
                      <div className="stat-card" key={s.label}>
                        <div className="stat-label">{s.label}</div>
                        <div className="stat-value">{s.value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="chart-card">
                    <div className="chart-title">{report.chartTitle}</div>

                    {hasAnyData ? (
                      <div className="chart-bars">
                        {report.chart.map((b, i) => (
                          <div key={i} className="chart-bar-wrap">
                            <div
                              className="chart-bar"
                              style={{ height: `${(b.value / maxChart) * 100}%` }}
                              title={`${b.label}: ${b.value}`}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="chart-empty">No activity in this period.</div>
                    )}

                    <div className="chart-footer">
                      <span>{report.chart[0]?.label || ""}</span>
                      <span>{report.chart[Math.floor(report.chart.length / 2)]?.label || ""}</span>
                      <span>{report.chart[report.chart.length - 1]?.label || ""}</span>
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            {/* 3. DOWNLOAD */}
            <div className="panel no-print">
              <div className="panel-title">3. Download / Print</div>

              <div className="download-row">
                <button type="button" className="primary-button" onClick={handleDownloadPDF}
                  disabled={!report || loading}>
                  Download PDF
                </button>
                <button type="button" className="outline-button" onClick={handleDownloadCSV}
                  disabled={!report || loading}>
                  Download CSV
                </button>
                <button type="button" className="outline-button" onClick={handlePrint}
                  disabled={!report || loading}>
                  Print
                </button>
              </div>

              <p className="download-note">
                For PDF, choose "Save as PDF" in the print window.
              </p>
            </div>
          </section>
        </main>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        html, body, #root { margin: 0; padding: 0; width: 100%; height: 100%; }
        body { font-family: Arial, Helvetica, sans-serif; background: #ffffff; overflow: hidden; }

        .generate-page {
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
        .top-header h2 { margin: 0; color: #ffffff; font-size: 14px; font-weight: 800; line-height: 1; }

        /* CONTENT */
        .generate-content {
          width: 100%; height: calc(100vh - 76px);
          padding: 16px 8px 24px 8px;
          overflow-y: auto; background: #f1f4f9;
        }
        .page-title {
          margin: 0 0 4px 0; font-size: 18px; font-weight: 800; color: #0f1b3d;
        }
        .page-subtitle {
          margin: 0 0 14px 0; font-size: 11px; color: #6b7280;
        }

        /* PANELS */
        .panel {
          background: #ffffff; border: 1px solid #dfe3ea;
          border-radius: 8px; padding: 14px 14px 16px 14px;
          margin-bottom: 14px;
        }
        .panel-title {
          font-size: 12px; font-weight: 800;
          color: #0f1b3d; margin-bottom: 12px;
        }

        /* REPORT TYPE */
        .type-row {
          display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px;
        }
        .type-button {
          height: 30px; padding: 0 14px;
          border: 1px solid #9ca3af; border-radius: 4px;
          background: #ffffff; color: #1f2937;
          font-family: inherit; font-size: 11px; font-weight: 700;
          cursor: pointer; transition: all 0.15s ease;
        }
        .type-button:hover { background: #f3f4f6; }
        .type-button.selected {
          background: #1d4ed8; border-color: #1d4ed8; color: #ffffff;
        }

        .period-label {
          display: block; font-size: 10px; color: #374151;
          margin-bottom: 4px; font-weight: 700;
        }
        .period-wrapper { width: 160px; }
        .period-select {
          width: 100%; height: 32px; padding: 0 10px;
          border: 1px solid #9ca3af; border-radius: 5px;
          background: #ffffff; color: #111827;
          font-family: inherit; font-size: 11px; cursor: pointer;
        }

        /* PREVIEW */
        .preview-loading {
          padding: 40px 20px; text-align: center;
          color: #6b7280; font-size: 12px;
        }
        .preview-title {
          font-size: 13px; font-weight: 800; color: #0f1b3d;
          margin-bottom: 12px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 10px;
          margin-bottom: 14px;
        }
        .stat-card {
          border: 1px solid #dfe3ea; border-radius: 8px;
          padding: 10px 12px; background: #ffffff;
        }
        .stat-label {
          font-size: 10px; color: #6b7280; margin-bottom: 4px;
          font-weight: 600;
        }
        .stat-value {
          font-size: 20px; font-weight: 800; color: #0f1b3d;
          line-height: 1.2;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }

        .chart-card {
          border: 1px solid #dfe3ea; border-radius: 8px;
          padding: 12px 12px 10px 12px;
        }
        .chart-title {
          font-size: 11px; font-weight: 800;
          color: #0f1b3d; margin-bottom: 10px;
        }
        .chart-bars {
          height: 140px;
          display: flex; align-items: flex-end;
          gap: 3px; border-bottom: 1px solid #e5e7eb;
          padding-bottom: 2px;
        }
        .chart-bar-wrap {
          flex: 1; min-width: 0; height: 100%;
          display: flex; align-items: flex-end;
        }
        .chart-bar {
          width: 100%;
          background: #1d4ed8;
          border-radius: 2px 2px 0 0;
          min-height: 0;
          transition: height 0.25s ease;
        }
        .chart-bar:hover { background: #1e40af; }
        .chart-empty {
          padding: 40px 20px; text-align: center;
          color: #6b7280; font-size: 11px;
          border-bottom: 1px solid #e5e7eb;
        }
        .chart-footer {
          display: flex; justify-content: space-between;
          margin-top: 6px; font-size: 10px; color: #6b7280;
        }

        /* DOWNLOAD */
        .download-row { display: flex; gap: 8px; flex-wrap: wrap; }
        .primary-button, .outline-button {
          height: 32px; padding: 0 14px;
          border-radius: 4px; font-family: inherit;
          font-size: 11px; font-weight: 700; cursor: pointer;
          transition: all 0.15s ease;
        }
        .primary-button {
          background: #1d4ed8; border: 1px solid #1d4ed8;
          color: #ffffff;
        }
        .primary-button:hover:not(:disabled) { background: #1e40af; }
        .outline-button {
          background: #ffffff; border: 1px solid #9ca3af;
          color: #1f2937;
        }
        .outline-button:hover:not(:disabled) { background: #f3f4f6; }
        .primary-button:disabled, .outline-button:disabled {
          opacity: 0.5; cursor: not-allowed;
        }
        .download-note {
          margin: 10px 0 0 0; font-size: 10px; color: #6b7280;
        }

        @media (max-width: 1100px) {
          .sidebar { width: 300px; min-width: 300px; }
          .main-content { width: calc(100vw - 300px); }
        }

        /* PRINT */
        @media print {
          body { overflow: visible; }
          .sidebar, .top-header, .page-title, .page-subtitle,
          .no-print, .panel:not(#print-area) { display: none !important; }
          .generate-page, .main-content, .generate-content {
            display: block; width: 100%; height: auto;
            overflow: visible; padding: 0; background: #ffffff;
          }
          #print-area { border: none; }
        }
      `}</style>
    </>
  );
}