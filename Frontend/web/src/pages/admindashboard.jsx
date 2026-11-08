import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api";
import { getMenuItems } from "../menu";
import ProfileHeaderButton from "../components/ProfileHeaderButton";

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

export default function AdminDashboard() {
  const navigate = useNavigate();
  const menuItems = getMenuItems("/admindashboard");

  const [residents, setResidents] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [statsError, setStatsError] = useState("");
  const [activityError, setActivityError] = useState("");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoadingStats(true);
        const data = await apiFetch("/api/admin/residents");
        setResidents(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch residents:", err);
        setStatsError("Failed to load account stats.");
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStats();
  }, []);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        setLoadingActivity(true);
        const data = await apiFetch("/api/admin/audit-logs?page=1&limit=5");
        setActivity(data.logs || []);
      } catch (err) {
        console.error("Failed to fetch recent activity:", err);
        setActivityError("Failed to load recent activity.");
      } finally {
        setLoadingActivity(false);
      }
    };
    fetchActivity();
  }, []);

  // ─── COMPUTE STATS FROM RESIDENTS ───
  const stats = useMemo(() => {
    const total = residents.length;
    let pending = 0, verified = 0, rejected = 0, deactivated = 0;

    residents.forEach((r) => {
      const v = r.verification_status || (r.is_verified ? "Verified Resident" : "Pending Verification");
      if (v === "Pending Verification") pending++;
      else if (v === "Verified Resident") verified++;
      else if (v === "Rejected") rejected++;

      if (r.status === "Deactivated") deactivated++;
    });

    return { total, pending, verified, rejected, deactivated };
  }, [residents]);

  const statCards = [
    { label: "Total Residents", value: stats.total, path: "/account-verification" },
    { label: "Pending Verification", value: stats.pending, path: "/account-verification?status=pending" },
    { label: "Verified Accounts", value: stats.verified, path: "/account-verification?status=verified" },
    { label: "Rejected Accounts", value: stats.rejected, path: "/account-verification?status=rejected" },
    { label: "Deactivated Accounts", value: stats.deactivated, path: "/account-verification?status=deactivated" },
  ];

  const actions = [
    {
      title: "Account Verification",
      description: "Review new registrations. Approve or reject pending accounts.",
      path: "/account-verification",
    },
    {
      title: "User Management",
      description: "Manage residents and officials. Change account roles.",
      path: "/usermanagement",
    },
    {
      title: "Monitor Activities",
      description: "Retrieve and review system audit logs.",
      path: "/monitoractivities",
    },
    {
      title: "Generate Reports",
      description: "Preview, download, or print system reports.",
      path: "/generatereports",
    },
    {
      title: "System Settings",
      description: "Review and update system configuration.",
      path: "/systemsettings",
    },
  ];

  return (
    <>
      <div className="admin-page">
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
            <h2>Admin Dashboard</h2>
            <ProfileHeaderButton />
          </header>

          <section className="admin-content">
            <p className="admin-subtitle">
              Overview of accounts and system activity. Select an action below to get started.
            </p>

            {/* ─── SUMMARY STATS ─── */}
            <div className="stats-grid">
              {loadingStats ? (
                <div className="stats-loading">Loading stats…</div>
              ) : statsError ? (
                <div className="stats-error">
                  <span>{statsError}</span>
                  <button type="button" onClick={() => window.location.reload()}>
                    Retry
                  </button>
                </div>
              ) : (
                statCards.map((stat, index) => (
                  <button
                    key={index}
                    type="button"
                    className="stat-card"
                    onClick={() => stat.path && navigate(stat.path)}
                    title={stat.path ? `Go to ${stat.path}` : undefined}
                  >
                    <span className="stat-label">{stat.label}</span>
                    <span className="stat-value">{stat.value}</span>
                  </button>
                ))
              )}
            </div>

            {/* ─── ACTION CARDS ─── */}
            <div className="actions-grid">
              {actions.map((action, index) => (
                <div className="action-card" key={index}>
                  <h3>{action.title}</h3>
                  <p>{action.description}</p>
                  <button
                    type="button"
                    className="open-button"
                    onClick={() => navigate(action.path)}
                  >
                    Open
                  </button>
                </div>
              ))}
            </div>

            {/* ─── RECENT ACTIVITY ─── */}
            <div className="activity-card">
              <div className="activity-header">
                <h3>Recent Activity</h3>
                <button
                  type="button"
                  className="view-all-btn"
                  onClick={() => navigate("/auditlogs")}
                >
                  View All →
                </button>
              </div>

              {loadingActivity ? (
                <div className="activity-empty">Loading recent activity…</div>
              ) : activityError ? (
                <div className="activity-empty" style={{ color: "#b91c1c" }}>
                  {activityError}
                </div>
              ) : activity.length === 0 ? (
                <div className="activity-empty">
                  No activity recorded yet. Actions performed by staff will appear here.
                </div>
              ) : (
                <table className="activity-table">
                  <thead>
                    <tr>
                      <th>Date &amp; Time</th>
                      <th>Performed By</th>
                      <th>Action</th>
                      <th>IP Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activity.map((row) => (
                      <tr key={row.log_id}>
                        <td className="activity-date">{formatDateTime(row.created_at)}</td>
                        <td>{row.user_name || "System"}</td>
                        <td title={row.action || ""}>
                          <span className="action-text">{row.action || "—"}</span>
                        </td>
                        <td className="activity-ip">{row.ip_address || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </main>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        html, body, #root { margin: 0; padding: 0; width: 100%; height: 100%; }
        body { font-family: Arial, Helvetica, sans-serif; background: #ffffff; overflow: hidden; }

        .admin-page {
          width: 100vw; height: 100vh; display: flex;
          background: #ffffff; overflow: hidden;
        }

        /* SIDEBAR */
        .sidebar {
          position: relative; width: 320px; min-width: 320px;
          height: 100vh; flex-shrink: 0;
          background: #13471e; overflow: hidden;
        }
        .sidebar-background {
          position: absolute; inset: 0; width: 100%; height: 100%;
          object-fit: cover; object-position: center;
          z-index: 0; pointer-events: none;
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
          font-family: Arial, Helvetica, sans-serif; font-size: 15px; font-weight: 500;
          text-align: left; cursor: pointer; transition: background 0.15s ease;
        }
        .menu-item:hover { background: rgba(255,255,255,0.09); }
        .menu-item.active { background: rgba(0,0,0,0.28); padding-left: 38px; font-weight: 700; }
        .menu-icon { width: 30px; height: 28px; object-fit: contain; display: block; flex-shrink: 0; }
        .menu-text { white-space: nowrap; line-height: 1; }

        /* MAIN */
        .main-content {
          width: calc(100vw - 320px); height: 100vh; min-width: 0;
          padding: 0 12px 10px 12px; overflow-y: auto; background: #ffffff;
        }
        .top-header {
          width: calc(100% + 24px); height: 76px; margin-left: -12px;
          padding: 0 24px 0 18px;
          display: flex; align-items: center; justify-content: space-between;
          background: #13471e;
        }
        .top-header h2 { margin: 0; color: #ffffff; font-size: 12px; font-weight: 800; line-height: 1; }

        /* CONTENT */
        .admin-content { width: 100%; padding: 14px 4px 24px 4px; background: #ffffff; }
        .admin-subtitle { margin: 0 0 14px 0; color: #555555; font-size: 11px; }

        /* STATS */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 10px;
          margin-bottom: 14px;
        }
        .stats-loading, .stats-error {
          grid-column: 1 / -1;
          padding: 20px;
          text-align: center;
          background: #ffffff;
          border: 1px solid #66866b;
          border-radius: 4px;
          font-size: 11px;
          color: #666;
        }
        .stats-error { color: #b91c1c; font-weight: 700; }
        .stats-error button {
          margin-left: 10px;
          background: #0B5D2A; color: #ffffff; border: none;
          padding: 4px 12px; border-radius: 3px;
          font-size: 10px; font-weight: 700; cursor: pointer;
        }
        .stat-card {
          height: 74px;
          padding: 10px 12px;
          display: flex; flex-direction: column; justify-content: center;
          gap: 4px;
          background: #ffffff;
          border: 1px solid #66866b;
          border-radius: 4px;
          font-family: inherit;
          text-align: left;
          cursor: pointer;
          transition: background 0.15s ease, box-shadow 0.15s ease;
        }
        .stat-card:hover {
          background: #f3faf3;
          box-shadow: 0 2px 6px rgba(0,0,0,0.10);
        }
        .stat-label {
          color: #555555;
          font-size: 9px;
          font-weight: 600;
        }
        .stat-value {
          color: #13471e;
          font-size: 22px;
          font-weight: 800;
          line-height: 1;
        }

        /* ACTIONS */
        .actions-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 10px;
          margin-bottom: 14px;
        }
        .action-card {
          padding: 12px;
          display: flex; flex-direction: column;
          background: #ffffff;
          border: 1px solid #66866b;
          border-radius: 4px;
        }
        .action-card h3 {
          margin: 0 0 8px 0;
          color: #111111;
          font-size: 11px;
          font-weight: 800;
          line-height: 1.3;
        }
        .action-card p {
          margin: 0 0 12px 0;
          flex: 1;
          color: #555555;
          font-size: 9px;
          line-height: 1.4;
        }
        .open-button {
          width: 100%;
          height: 26px;
          border: none;
          border-radius: 3px;
          background: #17652c;
          color: #ffffff;
          font-family: inherit;
          font-size: 9px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .open-button:hover { background: #0e4f20; }

        /* RECENT ACTIVITY */
        .activity-card {
          padding: 12px;
          background: #ffffff;
          border: 1px solid #66866b;
          border-radius: 4px;
        }
        .activity-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        .activity-header h3 {
          margin: 0;
          color: #111111;
          font-size: 11px;
          font-weight: 800;
        }
        .view-all-btn {
          border: none;
          background: transparent;
          color: #17652c;
          font-family: inherit;
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
          padding: 4px 8px;
        }
        .view-all-btn:hover { text-decoration: underline; }

        .activity-empty {
          padding: 32px 20px;
          text-align: center;
          color: #888;
          font-size: 11px;
        }

        .activity-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }
        .activity-table th {
          height: 30px;
          padding: 0 10px;
          text-align: left;
          background: #eef5ee;
          color: #222222;
          font-size: 9px;
          font-weight: 800;
          border-bottom: 1px solid #78977d;
        }
        .activity-table td {
          height: 32px;
          padding: 0 10px;
          color: #222222;
          font-size: 9px;
          border-bottom: 1px solid #c8d4ca;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .activity-table tbody tr:last-child td { border-bottom: none; }
        .activity-table tbody tr:hover { background: #f7faf7; }

        .activity-table th:nth-child(1), .activity-table td:nth-child(1) { width: 22%; }
        .activity-table th:nth-child(2), .activity-table td:nth-child(2) { width: 22%; }
        .activity-table th:nth-child(3), .activity-table td:nth-child(3) { width: 42%; }
        .activity-table th:nth-child(4), .activity-table td:nth-child(4) { width: 14%; }

        .activity-date { color: #32754a; font-weight: 600; }
        .activity-ip {
          font-family: "Consolas", "Menlo", monospace;
          font-size: 9px;
          color: #666;
        }
        .action-text {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        @media (max-width: 1400px) {
          .stats-grid, .actions-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
        @media (max-width: 1100px) {
          .sidebar { width: 300px; min-width: 300px; }
          .main-content { width: calc(100vw - 300px); }
          .stats-grid, .actions-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
      `}</style>
    </>
  );
}