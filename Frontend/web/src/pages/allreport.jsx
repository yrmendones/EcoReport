import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { apiFetch } from "../api";
import { getMenuItems } from "../menu";
import ProfileHeaderButton from "../components/ProfileHeaderButton";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const BARANGAY_BOUNDS = {
  north: 14.5545,
  south: 14.5505,
  east: 121.0745008909207,
  west: 121.06424180477325,
};

// Map from file extension
function getVideoMimeType(url) {
  if (!url) return "";
  const lower = url.toLowerCase();
  if (lower.endsWith(".mp4")) return "video/mp4";
  if (lower.endsWith(".webm")) return "video/webm";
  if (lower.endsWith(".ogg") || lower.endsWith(".ogv")) return "video/ogg";
  if (lower.endsWith(".mov")) return "video/quicktime";
  if (lower.endsWith(".avi")) return "video/x-msvideo";
  if (lower.endsWith(".mkv")) return "video/x-matroska";
  return "";
}

export default function AllReport() {
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const { id: routeId } = useParams();
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  const menuItems = getMenuItems("/allreport");

  // Lightbox state
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [videoError, setVideoError] = useState(false);

  const [report, setReport] = useState(routerLocation.state?.report || null);
  const [loading, setLoading] = useState(!routerLocation.state?.report && !!routeId);
  const [error, setError] = useState("");

  const mode = routerLocation.state?.mode || "edit";

  useEffect(() => {
    // If router state already gave us the report, skip the fetch.
    if (routerLocation.state?.report) return;

    // No id in URL → nothing to load; send admin back to the report list.
    if (!routeId) {
      navigate("/report", { replace: true });
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const data = await apiFetch(`/api/admin/reports/${routeId}`);
        if (!cancelled) setReport(data);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load report.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [routeId, routerLocation.state?.report, navigate]);

  // Normalized media list (fallback to empty array)
  const mediaList = Array.isArray(report.media) ? report.media : [];

  const getReporterName = () => {
    if (report.user_id) {
      const firstName = report.first_name || '';
      const lastName = report.last_name || '';
      const fullName = `${firstName} ${lastName}`.trim();
      return fullName || 'Anonymous Resident';
    } else {
      return report.guest_name || 'Anonymous Guest';
    }
  };

  const getContact = () => {
    if (report.user_id) {
      return report.contact_number || report.contact || 'N/A';
    } else {
      return report.guest_mobile || 'N/A';
    }
  };

  const getLocationDisplay = () => {
    if (report.address) return report.address;
    if (report.latitude && report.longitude) {
      const lat = parseFloat(report.latitude);
      const lng = parseFloat(report.longitude);
      const isInside = lat >= BARANGAY_BOUNDS.south && lat <= BARANGAY_BOUNDS.north &&
                       lng >= BARANGAY_BOUNDS.west && lng <= BARANGAY_BOUNDS.east;
      if (isInside) {
        return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      } else {
        return "📍 Outside of Barangay";
      }
    }
    return "N/A";
  };

  const getFormattedDate = () => {
    if (report.submitted_at) {
      const date = new Date(report.submitted_at);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) +
             ' | ' +
             date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    return report.date || 'N/A';
  };

  useEffect(() => {
    if (!report) return;
    if (!mapContainerRef.current || mapRef.current) return;

    const hasCoords = report.latitude && report.longitude;
    const centerLat = hasCoords ? parseFloat(report.latitude) : 14.5526;
    const centerLng = hasCoords ? parseFloat(report.longitude) : 121.0688;

    const map = L.map(mapContainerRef.current).setView([centerLat, centerLng], 15);
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const bounds = [
      [BARANGAY_BOUNDS.south, BARANGAY_BOUNDS.west],
      [BARANGAY_BOUNDS.north, BARANGAY_BOUNDS.east],
    ];
    L.rectangle(bounds, {
      color: "#0B5D2A",
      weight: 2,
      opacity: 0.6,
      fill: false,
      dashArray: "5, 5",
    }).addTo(map);

    if (hasCoords) {
      const lat = parseFloat(report.latitude);
      const lng = parseFloat(report.longitude);
      L.marker([lat, lng])
        .addTo(map)
        .bindPopup(`
          <strong>${report.category || "Report"}</strong><br/>
          ${report.address || getLocationDisplay()}
        `)
        .openPopup();
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [report]);

  // Lightbox navigation
  const openLightbox = (index) => {
    setVideoError(false);
    setLightboxIndex(index);
  };
  const closeLightbox = () => {
    setVideoError(false);
    setLightboxIndex(null);
  };

  const prevMedia = () => {
    if (lightboxIndex === null) return;
    setVideoError(false);
    setLightboxIndex((prev) => (prev === 0 ? mediaList.length - 1 : prev - 1));
  };
  const nextMedia = () => {
    if (lightboxIndex === null) return;
    setVideoError(false);
    setLightboxIndex((prev) => (prev === mediaList.length - 1 ? 0 : prev + 1));
  };

  // Keyboard nav for the lightbox (Esc, Left, Right)
  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") prevMedia();
      if (e.key === "ArrowRight") nextMedia();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIndex]);

  const getStatusClass = (status) => status.toLowerCase().replace(/\s+/g, "-");

  const handleAccept = async () => {
    if (!window.confirm(`Accept this report? Status will change to "Ongoing".`)) return;
    try {
      await apiFetch(`/api/admin/reports/${report.report_id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'ongoing' })
      });
      alert('✅ Report accepted! Status changed to Ongoing.');
      navigate('/report');
    } catch (err) {
      alert('❌ Failed to update status: ' + err.message);
    }
  };

  const handleReject = async () => {
    if (!window.confirm(`Reject this report? Status will change to "Rejected".`)) return;
    try {
      await apiFetch(`/api/admin/reports/${report.report_id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'rejected' })
      });
      alert('✅ Report rejected.');
      navigate('/report');
    } catch (err) {
      alert('❌ Failed to update status: ' + err.message);
    }
  };

  const handleAssign = async () => {
    const worker = prompt('Enter the name of the worker to assign:');
    if (!worker) return;
    if (!window.confirm(`Assign this report to "${worker}"?`)) return;
    try {
      await apiFetch(`/api/admin/reports/${report.report_id}/assign`, {
        method: 'PUT',
        body: JSON.stringify({ worker })
      });
      alert(`✅ Report assigned to ${worker}. Status changed to Assigned.`);
      navigate('/report');
    } catch (err) {
      alert('❌ Failed to assign: ' + err.message);
    }
  };

  const handleResolve = async () => {
    if (!window.confirm(`Mark this report as "Resolved"?`)) return;
    try {
      await apiFetch(`/api/admin/reports/${report.report_id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'resolved' })
      });
      alert('✅ Report marked as Resolved!');
      navigate('/report');
    } catch (err) {
      alert('❌ Failed to update status: ' + err.message);
    }
  };

  const handleBack = () => navigate("/report");

  const currentMedia = lightboxIndex !== null ? mediaList[lightboxIndex] : null;

  // ── Loading state ──
  if (loading) {
    return (
      <div className="allreport-page">
        <main className="main-content">
          <header className="top-header">
            <h2>Report Details</h2>
            <ProfileHeaderButton />
          </header>
          <section className="allreport-content">
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh", color: "#666", fontSize: 13 }}>
              Loading report...
            </div>
          </section>
        </main>
      </div>
    );
  }

  // ── Error / not-found state ──
  if (error || !report) {
    return (
      <div className="allreport-page">
        <main className="main-content">
          <header className="top-header">
            <h2>Report Details</h2>
            <ProfileHeaderButton />
          </header>
          <section className="allreport-content">
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "60vh", gap: 12 }}>
              <p style={{ color: "#b91c1c", fontSize: 13, fontWeight: 700 }}>
                {error || "Report not found."}
              </p>
              <button
                type="button"
                onClick={() => navigate("/report")}
                style={{ background: "#0B5D2A", color: "#fff", border: "none", padding: "8px 20px", borderRadius: 4, fontWeight: 700, fontSize: 12, cursor: "pointer" }}
              >
                Back to Reports
              </button>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <>
      <div className="allreport-page">
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
             <h2>{mode === "view" ? "View Report" : "Report Details"}</h2>
             <ProfileHeaderButton />
          </header>

          <section className="allreport-content">
            <button type="button" className="back-button" onClick={handleBack}>
              ‹ Back to Reports
            </button>

            <div className="details-grid">
              <div className="report-information-card">
                <div className="card-title">Report Information</div>
                <div className="information-list">
                  <div className="information-row">
                    <div className="information-label">Report ID</div>
                    <div className="information-value">
                      {report.id || (report.report_id ? `ER-${new Date().getFullYear()}-${String(report.report_id).padStart(4, "0")}` : "N/A")}
                    </div>
                  </div>
                  <div className="information-row">
                    <div className="information-label">Category</div>
                    <div className="information-value">{report.category}</div>
                  </div>
                  <div className="information-row">
                    <div className="information-label">Reporter</div>
                    <div className="information-value">{getReporterName()}</div>
                  </div>
                  <div className="information-row">
                    <div className="information-label">Contact</div>
                    <div className="information-value">{getContact()}</div>
                  </div>
                  <div className="information-row">
                    <div className="information-label">Type</div>
                    <div className="information-value">{report.user_id ? '👤 Resident' : '👤 Guest'}</div>
                  </div>
                  <div className="information-row">
                    <div className="information-label">Date submitted</div>
                    <div className="information-value">{getFormattedDate()}</div>
                  </div>
                  <div className="information-row">
                    <div className="information-label">Location</div>
                    <div className="information-value location-value">{getLocationDisplay()}</div>
                  </div>
                  <div className="information-row description-row">
                    <div className="information-label">Description</div>
                    <div className="information-value description-value">{report.description || "No description provided."}</div>
                  </div>
                  <div className="information-row status-row">
                    <div className="information-label">Status</div>
                    <div className="information-value">
                      <span className={`status-badge ${getStatusClass(report.status)}`}>
                        {report.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="map-card">
                <div className="card-title">Location on Map</div>
                <div
                  className="map-container"
                  ref={mapContainerRef}
                  style={{ height: "200px", margin: "10px", borderRadius: "4px", overflow: "hidden" }}
                />
                <div className="evidence-title">Evidence</div>
                <div className="evidence-grid">
                  {mediaList.length > 0 ? (
                    mediaList.map((item, index) => (
                      <button
                        key={index}
                        type="button"
                        className="evidence-image-wrapper"
                        onClick={() => openLightbox(index)}
                        title="Click to view full size"
                      >
                        {item.file_type === "video" ? (
                          <div className="evidence-video-thumb">
                            <video
                              src={item.file_url}
                              className="evidence-image"
                              muted
                              playsInline
                              preload="metadata"
                            />
                            <div className="video-play-overlay">▶</div>
                          </div>
                        ) : (
                          <img
                            src={item.file_url}
                            alt={`Evidence ${index + 1}`}
                            className="evidence-image"
                          />
                        )}
                      </button>
                    ))
                  ) : (
                    <p className="text-gray-400 text-[8px] col-span-3 text-center py-4">No evidence uploaded</p>
                  )}
                </div>
              </div>
            </div>

            {mode !== "view" && (
              <div className="actions-section">
                <div className="actions-title">Actions</div>
                <div className="actions-row">
                  <button type="button" className="accept-button" onClick={handleAccept}>Accept Report</button>
                  <button type="button" className="reject-button" onClick={handleReject}>Reject Report</button>
                  <button type="button" className="assign-button" onClick={handleAssign}>Assign Worker</button>
                  <button type="button" className="resolve-button" onClick={handleResolve}>Resolved</button>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>

      {/* ============================================================
          FULLSCREEN LIGHTBOX
          ============================================================ */}
      {lightboxIndex !== null && currentMedia && (
        <div className="lightbox-overlay" onClick={closeLightbox}>
          <button
            type="button"
            className="lightbox-close"
            onClick={(e) => { e.stopPropagation(); closeLightbox(); }}
            aria-label="Close"
          >
            ✕
          </button>

          {mediaList.length > 1 && (
            <div className="lightbox-counter">
              {lightboxIndex + 1} / {mediaList.length}
            </div>
          )}

          {mediaList.length > 1 && (
            <>
              <button
                type="button"
                className="lightbox-nav lightbox-prev"
                onClick={(e) => { e.stopPropagation(); prevMedia(); }}
                aria-label="Previous"
              >
                ‹
              </button>
              <button
                type="button"
                className="lightbox-nav lightbox-next"
                onClick={(e) => { e.stopPropagation(); nextMedia(); }}
                aria-label="Next"
              >
                ›
              </button>
            </>
          )}

          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            {currentMedia.file_type === "video" ? (
              videoError ? (
                <div className="video-error-panel">
                  <div className="video-error-icon">⚠️</div>
                  <h3 className="video-error-title">Video can't be played in this browser</h3>
                  <p className="video-error-text">
                    The uploaded video may use a codec (like HEVC or AVI) that the browser doesn't support.
                    Download it to view locally with VLC or another media player.
                  </p>
                  <a
                    className="video-error-download"
                    href={currentMedia.file_url}
                    download
                    onClick={(e) => e.stopPropagation()}
                  >
                    ⬇ Download Video
                  </a>
                </div>
              ) : (
                <video
                  key={currentMedia.file_url}
                  className="lightbox-media"
                  controls
                  autoPlay
                  muted
                  playsInline
                  preload="auto"
                  onError={() => setVideoError(true)}
                >
                  <source
                    src={currentMedia.file_url}
                    type={getVideoMimeType(currentMedia.file_url) || "video/mp4"}
                  />
                  Your browser cannot play this video format.
                </video>
              )
            ) : (
              <img
                src={currentMedia.file_url}
                alt={`Evidence ${lightboxIndex + 1}`}
                className="lightbox-media"
              />
            )}
          </div>
        </div>
      )}

      <style>{`
        * { box-sizing: border-box; }
        html, body, #root { margin: 0; padding: 0; width: 100%; height: 100%; }
        body { font-family: Arial, Helvetica, sans-serif; background: #ffffff; overflow: hidden; }

        .allreport-page { width: 100vw; height: 100vh; display: flex; background: #ffffff; overflow: hidden; }

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
        .menu-item.active { background: rgba(0,0,0,0.28); border-left: 0 solid #ffffff; padding-left: 38px; font-weight: 700; }
        .menu-icon { width: 30px; height: 28px; object-fit: contain; display: block; flex-shrink: 0; }
        .menu-text { white-space: nowrap; line-height: 0; }

        .main-content { width: calc(100vw - 320px); height: 100vh; min-width: 0; padding: 0 12px 10px 12px; overflow: hidden; background: #ffffff; }
        .top-header { width: calc(100% + 24px); height: 76px; margin-left: -12px; padding: 0 24px 0 18px; display: flex; align-items: center; justify-content: space-between; background: #13471e; }
        .top-header h2 { margin: 0; color: #ffffff; font-size: 12px; font-weight: 800; line-height: 1; }
        .profile-image { width: 48px; height: 48px; object-fit: cover; display: block; border-radius: 50%; box-shadow: 0 1px 4px rgba(0,0,0,0.20); }

        .allreport-content { width: 100%; height: calc(100vh - 76px); padding: 10px 12px 24px 2px; overflow-y: auto; background: #ffffff; }
        .back-button { height: 22px; padding: 0 4px; border: none; background: transparent; color: #356c43; font-family: Arial, Helvetica, sans-serif; font-size: 8px; cursor: pointer; margin-bottom: 5px; }
        .back-button:hover { text-decoration: underline; }

        .details-grid { width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 14px; align-items: stretch; }
        .report-information-card, .map-card { background: #ffffff; border: 1px solid #a7b8aa; border-radius: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.14); overflow: hidden; }
        .report-information-card { min-height: 256px; }
        .map-card { min-height: 256px; padding-bottom: 8px; }
        .card-title { height: 31px; display: flex; align-items: center; padding: 0 8px; color: #1c1c1c; font-size: 10px; font-weight: 800; border-bottom: 1px solid #e0e5e0; }

        .information-list { width: 100%; padding: 7px 9px 5px 9px; }
        .information-row { display: grid; grid-template-columns: 75px minmax(0, 1fr); min-height: 27px; align-items: center; }
        .information-label { color: #161616; font-size: 9px; font-weight: 800; line-height: 1.2; }
        .information-value { color: #333333; font-size: 9px; font-weight: 400; line-height: 1.25; min-width: 0; }
        .location-value { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .description-row { min-height: 35px; align-items: start; padding-top: 6px; padding-bottom: 8px; }
        .description-value { padding-right: 5px; white-space: normal !important; word-break: break-word; overflow-wrap: anywhere; }
        .date-divider { margin: 0 4px; color: #888888; }
        .status-row { min-height: 30px; }
        .status-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 84px; height: 20px; padding: 0 8px; border-radius: 4px; font-size: 8px; font-weight: 700; border: 1px solid rgba(0,0,0,0.12); box-shadow: 0 1px 3px rgba(0,0,0,0.12); }
        .status-badge.pending { background: #ffe995; color: #8b6800; }
        .status-badge.ongoing { background: #a9cbff; color: #0750ad; }
        .status-badge.assigned { background: #cdb2ff; color: #5730a3; }
        .status-badge.resolved { background: #bde5bd; color: #236523; }
        .status-badge.rejected { background: #ffb8b8; color: #9b1d1d; }

        .map-container { height: 200px; margin: 10px; border-radius: 4px; overflow: hidden; border: 1px solid #d0d6d0; background: #e8ecec; }

        .evidence-title { color: #1b1b1b; font-size: 9px; font-weight: 800; margin: 0 8px 5px 8px; }
        .evidence-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 0 8px; }

        .evidence-image-wrapper {
          position: relative;
          height: 80px;
          border-radius: 4px;
          overflow: hidden;
          background: #dfe5df;
          border: 1px solid #c3cec4;
          cursor: pointer;
          padding: 0;
          display: block;
          transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
        }
        .evidence-image-wrapper:hover {
          transform: scale(1.03);
          box-shadow: 0 4px 10px rgba(0,0,0,0.18);
          border-color: #0B5D2A;
        }

        .evidence-image { width: 100%; height: 100%; object-fit: cover; display: block; pointer-events: none; }
        .evidence-video-thumb { position: relative; width: 100%; height: 100%; background: #000; }
        .video-play-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0,0,0,0.35);
          color: #ffffff;
          font-size: 18px;
          pointer-events: none;
        }

        .actions-section { width: 100%; margin-top: 7px; }
        .actions-title { color: #1c1c1c; font-size: 9px; font-weight: 800; margin-bottom: 5px; }
        .actions-row { width: 100%; display: grid; grid-template-columns: 84px 84px 84px 84px; justify-content: space-between; align-items: center; }
        .accept-button { height: 26px; border: none; border-radius: 3px; background: #3c7c4a; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 10px; font-weight: 700; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.18); }
        .accept-button:hover { background: #2e673b; }
        .reject-button { height: 26px; border: none; border-radius: 3px; background: #e00000; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 10px; font-weight: 700; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.18); }
        .reject-button:hover { background: #bd0000; }
        .assign-button { height: 26px; border: 1px solid #9db09f; border-radius: 3px; background: #ffffff; color: #315f3b; font-family: Arial, Helvetica, sans-serif; font-size: 8px; font-weight: 700; cursor: pointer; }
        .assign-button:hover { background: #f1f6f1; }
        .resolve-button { height: 26px; border: none; border-radius: 3px; background: #2d7a3a; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 10px; font-weight: 700; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.18); }
        .resolve-button:hover { background: #1f5f2a; }

        /* ============================================================
           LIGHTBOX STYLES
           ============================================================ */
        .lightbox-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.92);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: lightboxFadeIn 0.15s ease;
        }

        @keyframes lightboxFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .lightbox-content {
          max-width: 90vw;
          max-height: 90vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .lightbox-media {
          max-width: 90vw;
          max-height: 90vh;
          object-fit: contain;
          border-radius: 6px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.5);
          background: #000;
          display: block;
        }

        .lightbox-close {
          position: absolute;
          top: 20px;
          right: 24px;
          width: 44px;
          height: 44px;
          border: none;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.15);
          color: #ffffff;
          font-size: 20px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s ease, transform 0.15s ease;
          z-index: 10001;
        }
        .lightbox-close:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: scale(1.08);
        }

        .lightbox-counter {
          position: absolute;
          top: 30px;
          left: 50%;
          transform: translateX(-50%);
          color: #ffffff;
          font-size: 13px;
          font-weight: 700;
          background: rgba(0, 0, 0, 0.55);
          padding: 6px 14px;
          border-radius: 999px;
          z-index: 10001;
        }

        .lightbox-nav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 52px;
          height: 52px;
          border: none;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.15);
          color: #ffffff;
          font-size: 30px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s ease, transform 0.15s ease;
          z-index: 10001;
          padding-bottom: 4px;
        }
        .lightbox-nav:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-50%) scale(1.08);
        }
        .lightbox-prev { left: 24px; }
        .lightbox-next { right: 24px; }

        /* ── Video error fallback panel ── */
        .video-error-panel {
          background: #1f2937;
          border: 1px solid #374151;
          border-radius: 12px;
          padding: 40px 48px;
          text-align: center;
          max-width: 480px;
          color: #e5e7eb;
          box-shadow: 0 10px 40px rgba(0,0,0,0.5);
        }
        .video-error-icon {
          font-size: 44px;
          margin-bottom: 16px;
          line-height: 1;
        }
        .video-error-title {
          color: #ffffff;
          font-size: 18px;
          font-weight: 800;
          margin: 0 0 12px 0;
        }
        .video-error-text {
          color: #9ca3af;
          font-size: 13px;
          line-height: 1.6;
          margin: 0 0 24px 0;
        }
        .video-error-download {
          display: inline-block;
          background: #0B5D2A;
          color: #ffffff;
          text-decoration: none;
          padding: 12px 28px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 800;
          transition: background 0.15s ease, transform 0.15s ease;
        }
        .video-error-download:hover {
          background: #084A21;
          transform: translateY(-1px);
        }

        @media (max-width: 1100px) { .sidebar { width: 300px; min-width: 300px; } .main-content { width: calc(100vw - 300px); } .details-grid { grid-template-columns: 1.4fr 1fr; } }
        @media (max-width: 850px) { body { overflow: auto; } .allreport-page { width: 1100px; min-width: 1100px; height: 100vh; } }
      `}</style>
    </>
  );
}