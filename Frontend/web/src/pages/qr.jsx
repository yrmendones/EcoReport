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

const getFullName = (resident) => {
  if (!resident) return "N/A";
  const first = resident.first_name || "";
  const mid = resident.middle_name || "";
  const last = resident.last_name || "";
  if (isNoMiddleName(mid)) {
    return `${first} ${last}`.replace(/\s+/g, " ").trim() || "N/A";
  }
  return `${first} ${mid} ${last}`.replace(/\s+/g, " ").trim() || "N/A";
};

const formatDate = (d) => {
  if (!d) return "N/A";
  const str = String(d).split("T")[0].split(" ")[0];
  const [y, m, day] = str.split("-");
  if (!y || !m || !day) return "N/A";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parseInt(m, 10) - 1]} ${parseInt(day, 10)}, ${y}`;
};

const toDateOnly = (d) => (!d ? "" : String(d).split("T")[0].split(" ")[0]);

const toLocalDateStr = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const STATUS_OPTIONS = ["All Status", "Pending Verification", "Verified Resident", "Rejected"];
const DATE_PRESETS = [
  { label: "Date", value: "date" },
  { label: "Today", value: "today" },
  { label: "Past 7 Days", value: "7days" },
  { label: "Past 30 Days", value: "30days" },
  { label: "Custom Range", value: "custom" },
];

export default function QR() {
  const navigate = useNavigate();
  const menuItems = getMenuItems("/qr");

  const [view, setView] = useState("list");
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [datePreset, setDatePreset] = useState("date");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // Pagination
  const [page, setPage] = useState(1);

  // Detail view
  const [selectedResident, setSelectedResident] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [showIdLightbox, setShowIdLightbox] = useState(false);

  // ============================================================
  // FETCH
  // ============================================================
  const fetchResidents = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await apiFetch("/api/admin/residents");
      setResidents(data);
    } catch (err) {
      console.error("Error fetching residents:", err);
      setError("Failed to load residents. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResidents();
  }, []);

  // Close lightbox on ESC
  useEffect(() => {
    if (!showIdLightbox) return;
    const onKey = (e) => { if (e.key === "Escape") setShowIdLightbox(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showIdLightbox]);

  // ============================================================
  // PRINT
  // ============================================================
    const handlePrint = () => {
    if (!selectedResident) {
      alert("No resident selected.");
      return;
    }

    const fullName = getFullName(selectedResident);
    const residentId = selectedResident.resident_id || "N/A";
    const address = selectedResident.address || "—";
    const contact = selectedResident.contact_number || "—";
    const dateRegistered = formatDate(selectedResident.registered_at);
    const status = currentStatus || "N/A";

    const printWindow = window.open("", "_blank", "width=800,height=900");
    if (!printWindow) {
      alert("Please allow pop-ups for this site to print the resident information.");
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>EcoReport Resident Info — ${residentId}</title>
          <style>
            * { box-sizing: border-box; }
            html, body { margin: 0; padding: 0; background: #fff; font-family: Arial, Helvetica, sans-serif; }
            body { display: flex; justify-content: center; align-items: flex-start; padding: 40px 20px; }
            
            .print-card { width: 550px; border: 2px solid #0B5D2A; border-radius: 12px; padding: 36px 32px; text-align: center; }
            
            .print-header { color: #0B5D2A; font-size: 24px; font-weight: 800; margin: 0 0 4px 0; }
            .print-sub { color: #444; font-size: 12px; margin: 0 0 2px 0; }
            .print-title { color: #0B5D2A; font-size: 16px; font-weight: 700; margin: 28px 0 20px 0; border-bottom: 2px solid #0B5D2A; padding-bottom: 8px; display: inline-block; }
            .print-id { display: inline-block; background: #E5F5E9; color: #0B5D2A; font-weight: 800; font-size: 16px; padding: 8px 24px; border-radius: 999px; margin-bottom: 24px; }
            
            .print-info { text-align: left; font-size: 13px; color: #333; line-height: 2; border-top: 1px solid #ddd; padding-top: 20px; margin-top: 4px; }
            .print-info strong { color: #0B5D2A; display: inline-block; min-width: 150px; }
            .print-info div { margin-bottom: 6px; word-break: break-word; }
            
            .print-footer { margin-top: 30px; font-size: 11px; color: #666; font-style: italic; }
            @media print { 
              body { padding: 0; } 
              .print-card { border: 1px solid #000; } 
            }
          </style>
        </head>
        <body onload="window.print();">
          <div class="print-card">
            <h1 class="print-header">EcoReport</h1>
            <p class="print-sub">Barangay Sto. Rosario Kanluran</p>
            <p class="print-sub">Environmental Reporting System</p>

            <div class="print-id">${residentId}</div>

            <div class="print-info">
              <div><strong>Full Name:</strong> ${fullName}</div>
              <div><strong>Address:</strong> ${address}</div>
              <div><strong>Contact:</strong> ${contact}</div>
              <div><strong>Date Registered:</strong> ${dateRegistered}</div>
              <div><strong>Status:</strong> ${status}</div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onafterprint = () => printWindow.close();
  };

  // ============================================================
  // DATE RANGE
  // ============================================================
  const getDateRange = () => {
    const today = new Date();
    if (datePreset === "today") { const d = toLocalDateStr(today); return { from: d, to: d }; }
    if (datePreset === "7days") {
      const start = new Date(today); start.setDate(start.getDate() - 6);
      return { from: toLocalDateStr(start), to: toLocalDateStr(today) };
    }
    if (datePreset === "30days") {
      const start = new Date(today); start.setDate(start.getDate() - 29);
      return { from: toLocalDateStr(start), to: toLocalDateStr(today) };
    }
    if (datePreset === "custom") return { from: customStart || "", to: customEnd || "" };
    return { from: "", to: "" };
  };

  // ============================================================
  // FILTER + PAGINATION
  // ============================================================
  const filteredResidents = residents.filter((r) => {
    const s = search.toLowerCase();
    const matchesSearch =
      !s ||
      r.resident_id?.toLowerCase().includes(s) ||
      r.first_name?.toLowerCase().includes(s) ||
      r.last_name?.toLowerCase().includes(s) ||
      r.address?.toLowerCase().includes(s) ||
      r.contact_number?.toLowerCase().includes(s);
    const matchesStatus = statusFilter === "All Status" || r.verification_status === statusFilter;
    let matchesDate = true;
    const { from, to } = getDateRange();
    if (from || to) {
      const regDate = toDateOnly(r.registered_at);
      if (from && regDate < from) matchesDate = false;
      if (to && regDate > to) matchesDate = false;
    }
    return matchesSearch && matchesStatus && matchesDate;
  });

  const totalPages = Math.max(1, Math.ceil(filteredResidents.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedResidents = filteredResidents.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const pageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) pages.push(i); }
    else {
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

  useEffect(() => { setPage(1); }, [search, statusFilter, datePreset, customStart, customEnd]);

  const hasActiveFilters =
    search.trim() !== "" || statusFilter !== "All Status" || datePreset !== "date";

  const handleClearFilters = () => {
    setSearch(""); setStatusFilter("All Status"); setDatePreset("date");
    setCustomStart(""); setCustomEnd(""); setPage(1);
  };

  const getVerificationStatus = (r) =>
    r.verification_status || (r.is_verified ? "Verified Resident" : "Pending Verification");

  const getStatusClass = (status) => {
    if (status === "Verified Resident") return "verified";
    if (status === "Rejected") return "rejected";
    return "pending";
  };

  const handleEditClick = (resident) => { setSelectedResident(resident); setView("detail"); };
  const handleBackToList = () => { setSelectedResident(null); setView("list"); };

  const handleDelete = async (resident) => {
    if (!window.confirm(`Delete resident ${getFullName(resident)}? This cannot be undone.`)) return;
    try {
      await apiFetch(`/api/admin/residents/${resident.user_id}`, { method: "DELETE" });
      fetchResidents();
      alert("Resident deleted.");
    } catch (err) { alert("Failed to delete: " + err.message); }
  };

  const handleVerify = async () => {
    if (!selectedResident) return;
    const currentStatus = getVerificationStatus(selectedResident);
    if (currentStatus === "Verified Resident") { alert("Already verified."); return; }
    if (!window.confirm(`Verify ${getFullName(selectedResident)}?`)) return;
    setVerifying(true);
    try {
      await apiFetch(`/api/admin/residents/${selectedResident.user_id}/verify`, { method: "PUT" });
      setSelectedResident((prev) => ({ ...prev, is_verified: 1, verification_status: "Verified Resident" }));
      fetchResidents();
      alert("✅ Resident verified!");
    } catch (err) { alert("❌ Failed to verify: " + err.message); }
    finally { setVerifying(false); }
  };

  const handleReject = async () => {
    if (!selectedResident) return;
    if (!window.confirm(`Reject verification for ${getFullName(selectedResident)}?`)) return;
    setRejecting(true);
    try {
      await apiFetch(`/api/admin/residents/${selectedResident.user_id}/reject`, { method: "PUT" });
      setSelectedResident((prev) => ({ ...prev, is_verified: 0, verification_status: "Rejected" }));
      fetchResidents();
      alert("Resident verification rejected.");
    } catch (err) { alert("❌ Failed to reject: " + err.message); }
    finally { setRejecting(false); }
  };

  const currentStatus = selectedResident ? getVerificationStatus(selectedResident) : null;

  return (
    <>
      <div className="qr-page">
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

        <main className="main-content">
          <header className="top-header">
            <h2>QR Verification</h2>
            <ProfileHeaderButton />
          </header>

          {view === "list" && (
            <section className="qr-content">
              <div className="filter-bar">
                <div className="search-box">
                  <span className="search-icon">🔍</span>
                  <input type="text" placeholder="Search residents..."
                    value={search} onChange={(e) => setSearch(e.target.value)} />
                  {search && (
                    <button type="button" className="clear-search"
                      onClick={() => setSearch("")} aria-label="Clear">×</button>
                  )}
                </div>

                <select className="filter-select" value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}>
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>

                <select className="filter-select date-select" value={datePreset}
                  onChange={(e) => setDatePreset(e.target.value)}>
                  {DATE_PRESETS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>

                {datePreset === "custom" && (
                  <div className="custom-range">
                    <input type="date" className="filter-date-input" value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      max={customEnd || undefined} aria-label="Start" />
                    <span className="range-sep">→</span>
                    <input type="date" className="filter-date-input" value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      min={customStart || undefined} aria-label="End" />
                  </div>
                )}

                {hasActiveFilters && (
                  <button type="button" className="filter-clear-btn" onClick={handleClearFilters}>
                    Clear
                  </button>
                )}
              </div>

              <div className="table-wrapper">
                {loading ? (
                  <div className="table-message">Loading residents...</div>
                ) : error ? (
                  <div className="table-message error">
                    <p>{error}</p>
                    <button onClick={fetchResidents}>Try Again</button>
                  </div>
                ) : (
                  <table className="reports-table">
                    <thead>
                      <tr>
                        <th>Resident ID</th>
                        <th>Full Name</th>
                        <th>Address</th>
                        <th>Contact</th>
                        <th>Date Registered</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedResidents.length > 0 ? (
                        paginatedResidents.map((r) => {
                          const status = getVerificationStatus(r);
                          return (
                            <tr key={r.user_id}>
                              <td className="resident-id">{r.resident_id || "N/A"}</td>
                              <td>{getFullName(r)}</td>
                              <td>{r.address || "N/A"}</td>
                              <td>{r.contact_number || "N/A"}</td>
                              <td>{formatDate(r.registered_at)}</td>
                              <td><span className={`vstatus ${getStatusClass(status)}`}>{status}</span></td>
                              <td>
                                <div className="actions">
                                  <button className="action-button edit" title="View / Verify"
                                    onClick={() => handleEditClick(r)}>✎</button>
                                  <button className="action-button delete" title="Delete"
                                    onClick={() => handleDelete(r)}>🗑</button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="7" className="text-center py-8 text-gray-500">
                            No residents found matching the filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              {!loading && !error && totalPages > 1 && (
                <div className="rp-pagination-bar">
                  <div className="rp-page-info">
                    Page <strong>{safePage}</strong> of <strong>{totalPages}</strong>
                  </div>
                  <div className="rp-pagination-controls">
                    <button type="button" className="rp-page-btn rp-page-nav"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={safePage === 1}>‹ Prev</button>
                    {pageNumbers().map((p, i) =>
                      p === "..." ? (
                        <span key={`e-${i}`} className="rp-page-ellipsis">…</span>
                      ) : (
                        <button key={p} type="button"
                          className={`rp-page-btn ${p === safePage ? "active" : ""}`}
                          onClick={() => setPage(p)}>{p}</button>
                      )
                    )}
                    <button type="button" className="rp-page-btn rp-page-nav"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={safePage === totalPages}>Next ›</button>
                  </div>
                </div>
              )}
            </section>
          )}

          {view === "detail" && selectedResident && (
            <section className="qr-content-detail">
              <button type="button" className="back-button" onClick={handleBackToList}>
                ‹ Back to QR Verification
              </button>

              <div className="verification-cards">
                <div className="resident-information-card">
                  <div className="card-title">Resident Information</div>
                  <div className="resident-info-row">
                    <div className="resident-info-label">Resident ID</div>
                    <div className="resident-info-value">{selectedResident.resident_id || "N/A"}</div>
                  </div>
                  <div className="resident-info-row">
                    <div className="resident-info-label">Full Name</div>
                    <div className="resident-info-value">{getFullName(selectedResident)}</div>
                  </div>
                  <div className="resident-info-row address-row">
                    <div className="resident-info-label">Address</div>
                    <div className="resident-info-value">{selectedResident.address || "—"}</div>
                  </div>
                  <div className="resident-info-row">
                    <div className="resident-info-label">Contact</div>
                    <div className="resident-info-value">{selectedResident.contact_number || "—"}</div>
                  </div>
                  <div className="resident-info-row">
                    <div className="resident-info-label">Date Registered</div>
                    <div className="resident-info-value">{formatDate(selectedResident.registered_at)}</div>
                  </div>
                  <div className="resident-info-row status-row">
                    <div className="resident-info-label">Status</div>
                    <div className="resident-info-value">
                      <span className={`verified-badge ${getStatusClass(currentStatus)}`}>
                        {currentStatus}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="uploaded-id-card">
                  <div className="card-title">Uploaded Resident ID</div>
                  <div className="uploaded-id-wrapper">
                    {selectedResident.valid_id_url ? (
                      <button type="button" className="uploaded-id-button"
                        onClick={() => setShowIdLightbox(true)} title="Click to view full size">
                        <img src={selectedResident.valid_id_url} alt="Uploaded Resident ID"
                          className="uploaded-id-image" />
                        <div className="zoom-hint">🔍 Click to enlarge</div>
                      </button>
                    ) : (
                      <div className="uploaded-id-empty">No ID uploaded during registration</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="verification-actions">
                <button type="button"
                  className={`verification-button verify ${currentStatus === "Verified Resident" ? "verified" : ""}`}
                  onClick={handleVerify}
                  disabled={currentStatus === "Verified Resident" || verifying}>
                  {verifying ? "Verifying..."
                    : currentStatus === "Verified Resident" ? "✓ Verified Resident"
                    : "Verify Resident"}
                </button>

                <button type="button"
                  className={`verification-button reject ${currentStatus === "Rejected" ? "rejected" : ""}`}
                  onClick={handleReject}
                  disabled={currentStatus === "Rejected" || rejecting}>
                  {rejecting ? "Rejecting..."
                    : currentStatus === "Rejected" ? "✕ Rejected"
                    : "Reject Verification"}
                </button>

                <button type="button" className="verification-button print" onClick={handlePrint}>
                  Print Resident Info
                </button>
              </div>
            </section>
          )}
        </main>
      </div>

      {/* FULLSCREEN LIGHTBOX for Uploaded Resident ID */}
      {showIdLightbox && selectedResident?.valid_id_url && (
        <div className="lightbox-overlay" onClick={() => setShowIdLightbox(false)}>
          <button type="button" className="lightbox-close"
            onClick={(e) => { e.stopPropagation(); setShowIdLightbox(false); }}
            aria-label="Close">✕</button>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img src={selectedResident.valid_id_url} alt="Uploaded Resident ID (full size)"
              className="lightbox-media" />
          </div>
        </div>
      )}

      <style>{`
        * { box-sizing: border-box; }
        html, body, #root { margin: 0; padding: 0; width: 100%; height: 100%; }
        body { font-family: Arial, Helvetica, sans-serif; background: #ffffff; overflow: hidden; }

        .qr-page { width: 100vw; height: 100vh; display: flex; background: #ffffff; overflow: hidden; }

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

        .qr-content { width: 100%; height: calc(100vh - 76px); padding: 10px 0 0 0; overflow: hidden; background: #ffffff; display: flex; flex-direction: column; }

        .filter-bar { width: 100%; height: 42px; display: flex; align-items: center; gap: 14px; padding: 0 2px; flex-shrink: 0; }
        .search-box { position: relative; width: 220px; height: 30px; display: flex; align-items: center; border: 1px solid #b7b7b7; border-radius: 3px; background: #ffffff; flex-shrink: 0; }
        .search-icon { width: 28px; display: flex; align-items: center; justify-content: center; color: #444; font-size: 11px; }
        .search-box input { flex: 1; width: 100%; height: 100%; border: none; outline: none; padding: 0 5px 0 0; font-family: Arial, Helvetica, sans-serif; font-size: 10px; color: #333; background: transparent; }
        .search-box input::placeholder { color: #999; }
        .clear-search { width: 24px; height: 24px; border: none; background: transparent; color: #555; cursor: pointer; font-size: 14px; }

        .filter-select { width: 150px; height: 30px; padding: 0 8px; border: 1px solid #a9b49f; border-radius: 3px; background: #ffffff; color: #444; font-family: Arial, Helvetica, sans-serif; font-size: 10px; outline: none; cursor: pointer; flex-shrink: 0; }
        .date-select { width: 130px; }

        .custom-range { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
        .filter-date-input { width: 130px; height: 30px; padding: 0 8px; border: 1px solid #a9b49f; border-radius: 3px; background: #ffffff; color: #333; font-size: 10px; outline: none; }
        .filter-date-input:focus { border-color: #17652c; }
        .range-sep { color: #666; font-size: 11px; }

        .filter-clear-btn { height: 30px; padding: 0 12px; border: 1px solid #e0a5a5; border-radius: 3px; background: #ffffff; color: #b3261e; font-size: 10px; font-weight: 700; cursor: pointer; flex-shrink: 0; }
        .filter-clear-btn:hover { background: #fdecec; }

        .filter-export-btn { height: 30px; padding: 0 14px; border: 1px solid #547f5c; border-radius: 3px; background: #367046; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 10px; font-weight: 700; cursor: pointer; margin-left: auto; flex-shrink: 0; }
        .filter-export-btn:hover { background: #2e623d; }

        .table-wrapper { width: 100%; flex: 1; min-height: 0; overflow: auto; border: 1px solid #66866b; background: #ffffff; margin-top: 4px; }

        .reports-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 9px; }
        .reports-table thead { position: sticky; top: 0; z-index: 10; height: 38px; background: #ffffff; }
        .reports-table th { height: 38px; padding: 0 7px; text-align: left; color: #222222; font-size: 9px; font-weight: 800; border-bottom: 1px solid #78977d; }
        .reports-table td { height: 43px; padding: 4px 7px; color: #222222; font-size: 9px; vertical-align: middle; border-bottom: 1px solid #9cb1a0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .reports-table tbody tr:hover { background: #f7faf7; }

        .reports-table th:nth-child(1), .reports-table td:nth-child(1) { width: 14%; }
        .reports-table th:nth-child(2), .reports-table td:nth-child(2) { width: 18%; }
        .reports-table th:nth-child(3), .reports-table td:nth-child(3) { width: 20%; }
        .reports-table th:nth-child(4), .reports-table td:nth-child(4) { width: 13%; }
        .reports-table th:nth-child(5), .reports-table td:nth-child(5) { width: 13%; }
        .reports-table th:nth-child(6), .reports-table td:nth-child(6) { width: 12%; }
        .reports-table th:nth-child(7), .reports-table td:nth-child(7) { width: 10%; text-align: center; }

        .resident-id { color: #34734b !important; font-size: 8px !important; }
        .vstatus { font-size: 8px; font-weight: 700; }
        .vstatus.pending { color: #d28a00; }
        .vstatus.verified { color: #287128; }
        .vstatus.rejected { color: #e11d2e; }

        .actions { display: flex; align-items: center; justify-content: center; gap: 8px; }
        .action-button { width: 17px; height: 17px; padding: 0; border: none; background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 11px; line-height: 1; }
        .action-button.edit { color: #4c78c2; }
        .action-button.delete { color: #e51f32; font-size: 15px; }
        .action-button:hover { transform: scale(1.15); }

        .table-message { padding: 40px; text-align: center; color: #666; font-size: 12px; }
        .table-message.error p { color: #b91c1c; font-weight: 700; margin-bottom: 10px; }
        .table-message.error button { background: #0B5D2A; color: white; border: none; padding: 6px 16px; border-radius: 4px; cursor: pointer; font-weight: 600; }

        .rp-pagination-bar { width: 100%; height: 44px; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 0 2px; margin-bottom: 8px; flex-shrink: 0; background: #ffffff; border-top: 1px solid #d4dcd4; }
        .rp-page-info { color: #4b5563; font-size: 11px; font-weight: 500; }
        .rp-page-info strong { color: #0B5D2A; font-weight: 800; }
        .rp-pagination-controls { display: flex; align-items: center; gap: 3px; }
        .rp-page-btn { min-width: 28px; height: 28px; padding: 0 8px; border: 1px solid #d4dcd4; border-radius: 4px; background: #ffffff; color: #374151; font-family: Arial, Helvetica, sans-serif; font-size: 11px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: background 0.15s ease, border-color 0.15s ease; }
        .rp-page-btn.rp-page-nav { padding: 0 10px; gap: 4px; }
        .rp-page-btn:hover:not(:disabled):not(.active) { background: #f0f7f0; border-color: #b8c9b8; }
        .rp-page-btn.active { background: #0B5D2A; color: #ffffff; border-color: #0B5D2A; font-weight: 800; }
        .rp-page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .rp-page-ellipsis { padding: 0 4px; color: #9ca3af; font-size: 12px; user-select: none; display: inline-flex; align-items: center; height: 28px; }

        /* DETAIL */
        .qr-content-detail { width: 100%; height: calc(100vh - 76px); padding: 14px 4px 0 4px; overflow: auto; background: #ffffff; }
        .back-button { height: 24px; padding: 0 4px; border: none; background: transparent; color: #356c43; font-family: Arial, Helvetica, sans-serif; font-size: 10px; cursor: pointer; margin-bottom: 12px; }
        .back-button:hover { text-decoration: underline; }

        .verification-cards { width: 100%; height: 303px; display: flex; gap: 14px; margin-bottom: 14px; }
        .resident-information-card { flex: 1.2; height: 303px; border: 1px solid #78957e; border-radius: 2px; background: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.14); overflow: hidden; }
        .uploaded-id-card { flex: 1; height: 303px; border: 1px solid #78957e; border-radius: 2px; background: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.14); overflow: hidden; }
        .card-title { height: 37px; padding: 12px 10px 0 10px; color: #111111; font-size: 9px; font-weight: 800; }

        .resident-info-row { width: 100%; min-height: 43px; display: flex; align-items: center; padding: 0 10px; }
        .resident-info-label { width: 32%; color: #111111; font-size: 8px; font-weight: 800; }
        .resident-info-value { width: 68%; color: #333333; font-size: 8px; line-height: 1.5; word-break: break-word; }
        .address-row { min-height: 48px; }
        .status-row { min-height: 43px; }

        .verified-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 110px; height: 19px; padding: 0 10px; border-radius: 3px; font-size: 7px; font-weight: 700; box-shadow: 0 1px 2px rgba(0,0,0,0.10); }
        .verified-badge.verified { border: 1px solid #8db788; background: #ddf5d8; color: #286c2d; }
        .verified-badge.pending { border: 1px solid #e6c84a; background: #fff8d8; color: #856400; }
        .verified-badge.rejected { border: 1px solid #e5a5a5; background: #ffe0e0; color: #b3261e; }

        .uploaded-id-wrapper { width: 100%; height: 260px; display: flex; align-items: center; justify-content: center; padding: 0 14px 14px 14px; }
        .uploaded-id-button { position: relative; max-width: 100%; max-height: 240px; padding: 0; border: none; background: transparent; cursor: pointer; border-radius: 4px; overflow: hidden; transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .uploaded-id-button:hover { transform: scale(1.02); box-shadow: 0 6px 18px rgba(0,0,0,0.20); }
        .uploaded-id-image { max-width: 100%; max-height: 240px; object-fit: contain; display: block; border-radius: 4px; border: 1px solid #d0d8d0; pointer-events: none; }
        .zoom-hint { position: absolute; bottom: 6px; right: 6px; background: rgba(0,0,0,0.65); color: #ffffff; font-size: 8px; font-weight: 700; padding: 3px 8px; border-radius: 999px; opacity: 0; transition: opacity 0.15s ease; pointer-events: none; }
        .uploaded-id-button:hover .zoom-hint { opacity: 1; }
        .uploaded-id-empty { color: #999; font-size: 10px; text-align: center; padding: 0 12px; line-height: 1.6; }

        .qr-image-wrapper { width: 100%; height: 260px; display: flex; align-items: center; justify-content: center; padding: 0 14px 14px 14px; }
        .qr-image { width: 200px; height: 200px; object-fit: contain; }
        .qr-empty { color: #999; font-size: 11px; }

        .verification-actions { width: 100%; display: flex; align-items: center; gap: 14px; padding: 0 4px 20px 4px; }
        .verification-button { height: 30px; padding: 0 16px; border-radius: 3px; display: flex; align-items: center; justify-content: center; font-family: Arial, Helvetica, sans-serif; font-size: 10px; font-weight: 700; cursor: pointer; white-space: nowrap; }
        .verification-button.verify { min-width: 130px; border: 1px solid #789a7d; background: #347145; color: #ffffff; }
        .verification-button.verify.verified { background: #9bbf9e; cursor: not-allowed; opacity: 0.7; }
        .verification-button.reject { min-width: 140px; border: 1px solid #a53232; background: #c62828; color: #ffffff; }
        .verification-button.reject.rejected { background: #e0a3a3; border-color: #c98282; cursor: not-allowed; opacity: 0.7; }
        .verification-button.print { min-width: 120px; border: 1px solid #78957e; background: #ffffff; color: #333333; }
        .verification-button:hover:not(:disabled) { transform: translateY(-1px); }

        /* LIGHTBOX */
        .lightbox-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.92); display: flex; align-items: center; justify-content: center; z-index: 9999; animation: lightboxFadeIn 0.15s ease; }
        @keyframes lightboxFadeIn { from { opacity: 0; } to { opacity: 1; } }
        .lightbox-content { max-width: 90vw; max-height: 90vh; display: flex; align-items: center; justify-content: center; }
        .lightbox-media { max-width: 90vw; max-height: 90vh; object-fit: contain; border-radius: 6px; box-shadow: 0 10px 40px rgba(0,0,0,0.5); background: #000; }
        .lightbox-close { position: absolute; top: 20px; right: 24px; width: 44px; height: 44px; border: none; border-radius: 50%; background: rgba(255, 255, 255, 0.15); color: #ffffff; font-size: 20px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.15s ease, transform 0.15s ease; z-index: 10001; }
        .lightbox-close:hover { background: rgba(255, 255, 255, 0.3); transform: scale(1.08); }

        @media (max-width: 1100px) { .sidebar { width: 300px; min-width: 300px; } .main-content { width: calc(100vw - 300px); } }
      `}</style>
    </>
  );
}