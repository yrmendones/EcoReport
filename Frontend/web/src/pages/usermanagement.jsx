import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api";
import { getMenuItems } from "../menu";
import ProfileHeaderButton from "../components/ProfileHeaderButton";

const PAGE_SIZE = 25;

const isNoMiddleName = (mid) => {
  if (!mid) return true;
  const n = String(mid).trim().toUpperCase();
  return n === "" || n === "N/A" || n === "NA" || n === "NONE" || n === "-";
};

const getFullName = (user) => {
  if (!user) return "—";
  const first = user.first_name || "";
  const mid = user.middle_name || "";
  const last = user.last_name || "";
  if (isNoMiddleName(mid)) {
    return `${first} ${last}`.replace(/\s+/g, " ").trim() || "—";
  }
  return `${first} ${mid} ${last}`.replace(/\s+/g, " ").trim() || "—";
};

const roleLabel = (role) => {
  if (role === "barangay_official") return "Barangay Official";
  if (role === "resident") return "Resident";
  return role || "—";
};

export default function UserManagement() {
  const navigate = useNavigate();
  const menuItems = getMenuItems("/usermanagement");

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const [openMenuId, setOpenMenuId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [page, setPage] = useState(1)

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await apiFetch("/api/admin/users");
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch users:", err);
      setError("Failed to load users. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const close = () => setOpenMenuId(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  // ─────────────────────────────────────────────
  // FILTERS
  // ─────────────────────────────────────────────
  const filteredUsers = users.filter((u) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      (u.resident_id || "").toLowerCase().includes(q) ||
      getFullName(u).toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.address || "").toLowerCase().includes(q);

    const matchesRole =
      roleFilter === "all" || u.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const counts = {
    all: users.length,
    resident: users.filter((u) => u.role === "resident").length,
    barangay_official: users.filter((u) => u.role === "barangay_official").length,
  };

  // ─────────────────────────────────────────────
  // PAGINATION
  // ─────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedUsers = filteredUsers.slice(
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

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setPage(1);
  }, [search, roleFilter]);

  // ─────────────────────────────────────────────
  // ACTIONS
  // ─────────────────────────────────────────────
  const closeMenu = () => setOpenMenuId(null);

  const handleChangeRole = async (user) => {
    closeMenu();
    const newRole = user.role === "resident" ? "barangay_official" : "resident";
    const newLabel = roleLabel(newRole);

    const confirmMsg =
      `Change role of ${getFullName(user)} from ${roleLabel(user.role)} to ${newLabel}?\n\n` +
      `The user will need to log out and log in again for their new permissions to take effect.`;
    if (!window.confirm(confirmMsg)) return;

    setBusyId(user.user_id);
    try {
      await apiFetch(`/api/admin/users/${user.user_id}/role`, {
        method: "PUT",
        body: JSON.stringify({ role: newRole }),
      });
      await fetchUsers();
      alert(`Role changed to ${newLabel}. The user has been notified to log in again.`);
    } catch (err) {
      alert("Failed to change role: " + err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleLock = async (user) => {
    closeMenu();
    const currentlyLocked = user.status === "Deactivated";
    if (currentlyLocked) {
      // Unlock = set status back to Online
      await handleStatusChange(user, "Online", "Unlock");
    } else {
      if (!window.confirm(`Lock the account of ${getFullName(user)}? They will not be able to log in.`)) return;
      await handleStatusChange(user, "Deactivated", "Lock");
    }
  };

  const handleToggleDeactivate = async (user) => {
    closeMenu();
    const deactivating = user.status !== "Deactivated";
    const msg = deactivating
      ? `Deactivate ${getFullName(user)}? They will not be able to log in until reactivated.`
      : `Reactivate ${getFullName(user)}? They will be able to log in again.`;
    if (!window.confirm(msg)) return;
    await handleStatusChange(user, deactivating ? "Deactivated" : "Online", deactivating ? "Deactivate" : "Reactivate");
  };

  const handleStatusChange = async (user, status, label) => {
    setBusyId(user.user_id);
    try {
      await apiFetch(`/api/admin/residents/${user.user_id}`, {
        method: "PUT",
        body: JSON.stringify({
          first_name: user.first_name,
          middle_name: user.middle_name,
          last_name: user.last_name,
          house_no: user.house_no,
          street: user.street,
          contact_number: user.contact_number,
          email: user.email,
          status,
        }),
      });
      await fetchUsers();
    } catch (err) {
      alert(`${label} failed: ` + err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleUnlock = async (user) => {
    closeMenu();
    if (!window.confirm(`Reset failed login attempts for ${getFullName(user)}?\n\nThey will be able to log in again immediately.`)) return;

    setBusyId(user.user_id);
    try {
      await apiFetch(`/api/admin/users/${user.user_id}/unlock`, { method: "PUT" });
      await fetchUsers();
      alert("Account unlocked. The user can log in again.");
    } catch (err) {
      alert("Failed to unlock: " + err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (user) => {
    closeMenu();
    const confirm1 = window.confirm(
      `Permanently delete ${getFullName(user)} (${roleLabel(user.role)})?\n\nThis cannot be undone.`
    );
    if (!confirm1) return;
    const confirm2 = window.confirm(
      "Are you absolutely sure? All their reports and records will be lost."
    );
    if (!confirm2) return;

    setBusyId(user.user_id);
    try {
      await apiFetch(`/api/admin/users/${user.user_id}`, { method: "DELETE" });
      await fetchUsers();
    } catch (err) {
      alert("Failed to delete: " + err.message);
    } finally {
      setBusyId(null);
    }
  };

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <>
      <div className="users-page">
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
            <h2>User Management</h2>
            <ProfileHeaderButton />
          </header>

          <section className="users-content">
            <p className="users-subtitle">
              Manage resident and barangay official accounts. Change roles, lock access, or remove accounts.
            </p>

            <div className="users-toolbar">
              <div className="toolbar-left">
                <div className="search-box">
                  <span className="search-icon">🔍</span>
                  <input
                    type="text"
                    placeholder="Search name, ID, or email"
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
                  className="role-filter"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <option value="all">All roles ({counts.all})</option>
                  <option value="resident">Residents ({counts.resident})</option>
                  <option value="barangay_official">
                    Barangay Officials ({counts.barangay_official})
                  </option>
                </select>
              </div>

              <div className="users-count">
                {filteredUsers.length} {filteredUsers.length === 1 ? "user" : "users"}
              </div>
            </div>

            <div className="users-table-wrapper">
              {loading ? (
                <div className="table-message">Loading users…</div>
              ) : error ? (
                <div className="table-message error">
                  <p>{error}</p>
                  <button onClick={fetchUsers}>Try Again</button>
                </div>
              ) : (
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Resident ID</th>
                      <th>Full Name</th>
                      <th>Email</th>
                      <th>Contact</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUsers.length > 0 ? (
                      paginatedUsers.map((u) => {
                        const isBusy = busyId === u.user_id;
                        return (
                          <tr key={u.user_id}>
                            <td className="resident-id">{u.resident_id || "—"}</td>
                            <td>{getFullName(u)}</td>
                            <td className="email-cell" title={u.email || ""}>{u.email || "—"}</td>
                            <td>{u.contact_number || "—"}</td>
                            <td>
                              <span className={`role-badge ${u.role}`}>
                                {roleLabel(u.role)}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                <span
                                  className={`user-status ${
                                    u.status === "Deactivated"
                                      ? "deactivated"
                                      : u.status === "Online"
                                      ? "online"
                                      : "offline"
                                  }`}
                                >
                                  {u.status || "Offline"}
                                </span>
                                {u.is_locked ? (
                                  <span
                                    className="user-status deactivated"
                                    title={
                                      u.locked_until && new Date(u.locked_until).getFullYear() < 9999
                                        ? `Locked until ${new Date(u.locked_until).toLocaleString("en-US", {
                                            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                                          })}`
                                        : "Locked until admin unlocks"
                                    }
                                  >
                                    🔒 Locked
                                  </span>
                                ) : null}
                              </div>
                            </td>
                            <td className="actions-cell">
                              <div
                                className="manage-wrapper"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  className="manage-button"
                                  onClick={() =>
                                    setOpenMenuId(
                                      openMenuId === u.user_id ? null : u.user_id
                                    )
                                  }
                                  disabled={isBusy}
                                >
                                  {isBusy ? "Working…" : "Manage ▾"}
                                </button>

                                {openMenuId === u.user_id && (
                                  <div className="manage-menu">
                                    {u.is_locked ? (
                                      <button
                                        type="button"
                                        onClick={() => handleUnlock(u)}
                                        style={{ color: "#B83232", fontWeight: 700 }}
                                      >
                                        🔓 Reset failed logins
                                      </button>
                                    ) : null}
                                    <button
                                      type="button"
                                      onClick={() => handleChangeRole(u)}
                                    >
                                      {u.role === "resident"
                                        ? "→ Promote to Barangay Official"
                                        : "→ Demote to Resident"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleLock(u)}
                                    >
                                      {u.status === "Deactivated"
                                        ? "Unlock account"
                                        : "Lock account"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleDeactivate(u)}
                                    >
                                      {u.status === "Deactivated"
                                        ? "Reactivate account"
                                        : "Deactivate account"}
                                    </button>
                                    <button
                                      type="button"
                                      className="danger"
                                      onClick={() => handleDelete(u)}
                                    >
                                      Delete permanently…
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="7" className="text-center py-8">
                          {search || roleFilter !== "all"
                            ? "No users match the current filters."
                            : "No users registered yet."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* ─── PAGINATION ─── */}
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

      <style>{`
        * { box-sizing: border-box; }
        html, body, #root { margin: 0; padding: 0; width: 100%; height: 100%; }
        body { font-family: Arial, Helvetica, sans-serif; background: #ffffff; overflow: hidden; }

        .users-page {
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
        .users-content {
          width: 100%; height: calc(100vh - 76px);
          padding: 14px 4px 0 4px; overflow: hidden;
          background: #ffffff; display: flex; flex-direction: column;
        }
        .users-subtitle {
          margin: 0 0 12px 0; color: #555; font-size: 11px; flex-shrink: 0;
        }

        .users-toolbar {
          display: flex; align-items: center;
          justify-content: space-between; gap: 12px;
          margin-bottom: 10px; flex-shrink: 0;
        }
        .toolbar-left { display: flex; align-items: center; gap: 10px; }

        .search-box {
          position: relative; width: 240px; height: 30px;
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

        .role-filter {
          height: 30px; padding: 0 10px;
          border: 1px solid #a9b49f; border-radius: 3px;
          background: #ffffff; color: #444;
          font-family: inherit; font-size: 10px;
          cursor: pointer; outline: none;
        }

        .users-count { color: #4b5563; font-size: 11px; font-weight: 600; }

        /* TABLE */
        .users-table-wrapper {
          width: 100%; flex: 1; min-height: 0; overflow: auto;
          border: 1px solid #66866b; background: #ffffff;
        }
        .users-table {
          width: 100%; border-collapse: collapse;
          table-layout: fixed; font-size: 10px;
        }
        .users-table thead {
          position: sticky; top: 0; z-index: 10;
          background: #eef5ee;
        }
        .users-table th {
          height: 38px; padding: 0 10px;
          text-align: left; color: #222;
          font-size: 10px; font-weight: 800;
          border-bottom: 1px solid #78977d;
        }
        .users-table td {
          height: 46px; padding: 6px 10px;
          color: #222; font-size: 10px; vertical-align: middle;
          border-bottom: 1px solid #c8d4ca;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .users-table tbody tr:hover { background: #f7faf7; }
        .users-table tbody tr:last-child td { border-bottom: none; }

        .users-table th:nth-child(1), .users-table td:nth-child(1) { width: 13%; }
        .users-table th:nth-child(2), .users-table td:nth-child(2) { width: 19%; }
        .users-table th:nth-child(3), .users-table td:nth-child(3) { width: 20%; }
        .users-table th:nth-child(4), .users-table td:nth-child(4) { width: 13%; }
        .users-table th:nth-child(5), .users-table td:nth-child(5) { width: 14%; }
        .users-table th:nth-child(6), .users-table td:nth-child(6) { width: 10%; }
        .users-table th:nth-child(7), .users-table td:nth-child(7) { width: 11%; }

        .resident-id {
          color: #34734b !important;
          font-family: "Consolas", "Menlo", monospace;
          font-size: 9px !important;
          font-weight: 600;
        }
        .email-cell { color: #555; font-size: 9px; }

        /* ROLE BADGE */
        .role-badge {
          display: inline-flex; align-items: center; justify-content: center;
          min-width: 90px; height: 22px; padding: 0 10px;
          border-radius: 11px;
          font-size: 9px; font-weight: 700;
          white-space: nowrap;
        }
        .role-badge.resident {
          background: #E3F1E7; color: #14532d;
          border: 1px solid #B9D9C0;
        }
        .role-badge.barangay_official {
          background: #E1E9F7; color: #1D3B73;
          border: 1px solid #B8C9E4;
        }

        /* STATUS */
        .user-status {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 3px 10px;
          border-radius: 10px;
          font-size: 9px;
          font-weight: 700;
          white-space: nowrap;
          line-height: 1;
        }
        .user-status.online      { background: #d1edcf; color: #2E7D32; }
        .user-status.offline     { background: #e5e7eb; color: #525252; }
        .user-status.deactivated { background: #ffc8c8; color: #525252; }

        /* MANAGE DROPDOWN */
        .actions-cell { overflow: visible !important; }
        .manage-wrapper {
          position: relative; display: inline-block;
        }
        .manage-button {
          height: 24px; padding: 0 10px;
          border: 1px solid #347145; border-radius: 3px;
          background: #ffffff; color: #347145;
          font-family: inherit; font-size: 9px; font-weight: 700;
          cursor: pointer;
        }
        .manage-button:hover:not(:disabled) { background: #f3f8f4; }
        .manage-button:disabled { opacity: 0.55; cursor: wait; }

        .manage-menu {
          position: absolute;
          top: 100%; right: 0;
          margin-top: 4px; width: 220px;
          z-index: 50;
          background: #ffffff;
          border: 1px solid #78957e;
          border-radius: 4px;
          box-shadow: 0 4px 14px rgba(0,0,0,0.15);
          padding: 4px 0;
        }
        .manage-menu button {
          display: block; width: 100%;
          padding: 8px 12px;
          border: none; background: transparent;
          text-align: left;
          font-family: inherit; font-size: 10px;
          color: #333; cursor: pointer;
          white-space: normal;
        }
        .manage-menu button:hover { background: #f3f8f4; }
        .manage-menu button.danger {
          color: #d51f1f; font-weight: 700;
          border-top: 1px solid #e3ebe5;
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

        .text-center { text-align: center; color: #888; }

        @media (max-width: 1100px) {
          .sidebar { width: 300px; min-width: 300px; }
          .main-content { width: calc(100vw - 300px); }
        }
      `}</style>
    </>
  );
}