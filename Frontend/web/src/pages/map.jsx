import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getMenuItems } from "../menu";
import ProfileHeaderButton from "../components/ProfileHeaderButton";

// Leaflet default icon
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

// ============================================================
// STATUS COLORS
// ============================================================
const STATUS_COLORS = {
  pending: "#f6a400",
  ongoing: "#3b82f6",
  assigned: "#7c3aed",
  resolved: "#22c55e",
  rejected: "#ef4444",
};

// Material Design pin SVG
const createPinSvg = (color) => `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32" fill="${color}" style="filter: drop-shadow(0 2px 3px rgba(0,0,0,0.4));">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
  </svg>
`;

const createPinIcon = (status) => {
  const color = STATUS_COLORS[status?.toLowerCase()] || "#6b7280";
  return L.divIcon({
    html: createPinSvg(color),
    className: "custom-pin-icon",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

export default function MapPage() {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  const markersRef = useRef([]);
  const menuItems = getMenuItems();

  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState("Status");
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ============================================================
  // FILTER OPTIONS
  // ============================================================
  const categoryOptions = [
    { value: "All", label: "All Categories" },
    { value: "Air Pollution", label: "Air Pollution" },
    { value: "Animal Waste", label: "Animal Waste" },
    { value: "Clogged Drainage", label: "Clogged Drainage" },
    { value: "Damaged Roads", label: "Damaged Roads" },
    { value: "Flooding", label: "Flooding" },
    { value: "Fallen Trees", label: "Fallen Trees" },
    { value: "Illegal Dumping", label: "Illegal Dumping" },
    { value: "Improper Garbage Disposal", label: "Improper Garbage Disposal" },
    { value: "Overgrown Grass", label: "Overgrown Grass" },
    { value: "Others Environmental Concerns", label: "Others" },
  ];

  const statusOptions = [
    { value: "Status", label: "All Status" },
    { value: "Pending", label: "Pending" },
    { value: "Ongoing", label: "Ongoing" },
    { value: "Assigned", label: "Assigned" },
    { value: "Resolved", label: "Resolved" },
    { value: "Rejected", label: "Rejected" },
  ];

  // ============================================================
  // FETCH REPORTS
  // ============================================================
  const fetchReports = async () => {
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams();
      if (category !== "All") params.append("category", category);
      if (status !== "Status") params.append("status", status);
      const query = params.toString() ? `?${params.toString()}` : "";
      const data = await apiFetch(`/api/admin/reports${query}`);
      setReports(data);
    } catch (err) {
      console.error("Error fetching reports:", err);
      setError("Failed to load map data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [category, status]);

  // ============================================================
  // INITIALIZE MAP
  // ============================================================
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const bounds = [
      [BARANGAY_BOUNDS.south, BARANGAY_BOUNDS.west],
      [BARANGAY_BOUNDS.north, BARANGAY_BOUNDS.east],
    ];

    const map = L.map(mapContainerRef.current, {
      center: [
        (BARANGAY_BOUNDS.north + BARANGAY_BOUNDS.south) / 2,
        (BARANGAY_BOUNDS.east + BARANGAY_BOUNDS.west) / 2,
      ],
      zoom: 15,
      maxBounds: bounds,
      maxBoundsViscosity: 1.0,
    });
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    L.rectangle(bounds, {
      color: "#0B5D2A",
      weight: 2,
      opacity: 0.6,
      fill: false,
      dashArray: "5, 5",
    }).addTo(map);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // ============================================================
  // UPDATE MARKERS
  // ============================================================
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => map.removeLayer(marker));
    markersRef.current = [];

    const validReports = reports.filter(
      (r) => r.latitude && r.longitude && !isNaN(r.latitude) && !isNaN(r.longitude)
    );

    if (validReports.length === 0) return;

    validReports.forEach((report) => {
      const lat = parseFloat(report.latitude);
      const lng = parseFloat(report.longitude);
      const statusClass = report.status?.toLowerCase() || "pending";

      const marker = L.marker([lat, lng], {
        icon: createPinIcon(statusClass),
      })
        .addTo(map)
        .bindPopup(`
          <div style="font-family: Arial, sans-serif; padding: 4px; max-width: 220px;">
            <strong>${report.category || "Report"}</strong><br/>
            <span style="font-size: 12px; color: #666;">${report.address || "Location"}</span><br/>
            <span style="font-size: 11px; color: #999;">Status: <strong>${report.status?.toUpperCase() || "UNKNOWN"}</strong></span><br/>
            <span style="font-size: 10px; color: #aaa;">ID: ER-${new Date().getFullYear()}-${String(report.report_id).padStart(4, "0")}</span>
          </div>
        `);

      markersRef.current.push(marker);
    });

    if (validReports.length > 0) {
      const group = L.featureGroup(markersRef.current);
      map.fitBounds(group.getBounds(), { padding: [30, 30] });
    }
  }, [reports]);

  return (
    <>
      <div className="map-page">

        <main className="main-content" style={{ backgroundColor: "#ffffff" }}>
          <header className="top-header" style={{ backgroundColor: "#13471e" }}>
            <h2>Environmental Map</h2>
            <ProfileHeaderButton />
          </header>

          <section className="map-content">
            {/* FILTERS */}
            <div className="map-filters">
              <label>Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {categoryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <label>Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* MAP + LEGEND */}
            <div className="map-section">
              <div className="map-box">
                <div
                  ref={mapContainerRef}
                  style={{ width: "100%", height: "100%" }}
                />
                {loading && (
                  <div className="map-loading">
                    <span>Loading reports...</span>
                  </div>
                )}
                {error && !loading && (
                  <div className="map-error">
                    <span>{error}</span>
                    <button onClick={fetchReports}>Retry</button>
                  </div>
                )}
                {!loading && !error && reports.length === 0 && (
                  <div className="map-empty">
                    <span>No reports found with the selected filters.</span>
                  </div>
                )}
              </div>

              <div className="map-legend">
                <h3>Legend</h3>
                <div className="legend-item">
                  <span className="legend-dot pending"></span>
                  <span>Pending</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot ongoing"></span>
                  <span>Ongoing</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot assigned"></span>
                  <span>Assigned</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot resolved"></span>
                  <span>Resolved</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot rejected"></span>
                  <span>Rejected</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot location"></span>
                  <span>Barangay Boundary</span>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        html, body, #root { margin: 0; padding: 0; width: 100%; height: 100%; }
        body { font-family: Arial, Helvetica, sans-serif; background: #ffffff; overflow: hidden; }

        .map-page { width: 100vw; height: 100vh; display: flex; background: #ffffff; overflow: hidden; }

        .sidebar { position: relative; width: 320px; min-width: 320px; height: 100vh; flex-shrink: 0; background: #13471e; overflow: hidden; }
        .sidebar-background { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center; z-index: 0; pointer-events: none; }
        .sidebar-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(3,77,30,0.91) 0%, rgba(3,76,29,0.87) 100%); z-index: 1; pointer-events: none; }
        .sidebar-content { position: relative; z-index: 2; width: 100%; height: 100%; }
        .sidebar-brand { height: 86px; display: flex; align-items: center; padding-left: 36px; gap: 10px; }
        .sidebar-brand-image { width: 51.7px; height: 54px; object-fit: contain; display: block; flex-shrink: 0; }
        .sidebar-brand-name { color: #fff9df; font-size: 20px; font-weight: 800; line-height: 1; white-space: nowrap; }
        .sidebar-barangay { height: 5px; display: flex; align-items: center; padding-left: 70px; color: #fff9df; font-size: 11px; font-weight: 500; border-bottom: 1px solid rgba(255,255,255,0.14); }
        .sidebar-menu { width: 100%; padding-top: 5px; }
        .menu-item { width: 100%; height: 30px; border: none; margin: 0; padding: 0 14px 0 42px; display: flex; align-items: center; gap: 14px; background: transparent; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 15px; font-weight: 50; text-align: left; cursor: pointer; transition: background 0.15s ease; }
        .menu-item:hover { background: rgba(255,255,255,0.09); }
        .menu-item.active { background: rgba(0,0,0,0.28); padding-left: 38px; font-weight: 700; }
        .menu-icon { width: 30px; height: 28px; object-fit: contain; display: block; flex-shrink: 0; }
        .menu-text { white-space: nowrap; line-height: 0; }

        .main-content { width: calc(100vw - 320px); height: 100vh; min-width: 0; padding: 0 12px 10px 12px; overflow: hidden; background: #ffffff; }
        .top-header { width: calc(100% + 24px); height: 76px; margin-left: -12px; padding: 0 24px 0 18px; display: flex; align-items: center; justify-content: space-between; background: #13471e; }
        .top-header h2 { margin: 0; color: #ffffff; font-size: 12px; font-weight: 800; line-height: 1; }
        .profile-image { width: 48px; height: 48px; object-fit: cover; display: block; border-radius: 50%; box-shadow: 0 1px 4px rgba(0,0,0,0.20); }

        .map-content {
          width: 100%;
          height: calc(100vh - 76px);
          padding: 12px 4px 0 4px;
          overflow: hidden;
          background: #ffffff;
          display: flex;
          flex-direction: column;
        }

        .map-filters {
          height: 40px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding-left: 8px;
          flex-shrink: 0;
        }
        .map-filters label { font-size: 8px; font-weight: 800; color: #111111; }
        .map-filters select {
          height: 24px;
          min-width: 110px;
          padding: 0 8px;
          border: 1px solid #7d977f;
          border-radius: 3px;
          background: #ffffff;
          color: #222222;
          font-size: 8px;
          outline: none;
          cursor: pointer;
        }

        .map-section {
          display: flex;
          flex: 1;
          gap: 12px;
          padding: 8px 4px 0 4px;
          min-height: 0;
        }

        .map-box {
          position: relative;
          flex: 1;
          min-height: 400px;
          height: 100%;
          overflow: hidden;
          border-radius: 4px;
          background: #e8ecec;
          border: 1px solid #a0b8a4;
        }
        .map-box .leaflet-container { width: 100%; height: 100%; }

        .custom-pin-icon {
          background: transparent;
          border: none;
        }

        .map-loading, .map-error, .map-empty {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(255,255,255,0.9);
          padding: 12px 20px;
          border-radius: 6px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          font-size: 12px;
          color: #333;
          z-index: 10;
          pointer-events: none;
        }
        .map-error button {
          pointer-events: auto;
          margin-left: 8px;
          background: #0B5D2A;
          color: #fff;
          border: none;
          padding: 2px 12px;
          border-radius: 4px;
          cursor: pointer;
        }

        .map-legend {
          width: 150px;
          height: 100%;
          padding: 8px 0 0 10px;
          background: #ffffff;
          flex-shrink: 0;
          border: 1px solid #d0d8d0;
          border-radius: 4px;
        }
        .map-legend h3 { margin: 0 0 16px 0; color: #111111; font-size: 10px; font-weight: 800; }
        .legend-item { height: 26px; display: flex; align-items: center; gap: 8px; color: #222222; font-size: 8px; font-weight: 400; }
        .legend-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
        .legend-dot.pending { background: #f6a400; }
        .legend-dot.ongoing { background: #3b82f6; }
        .legend-dot.assigned { background: #7c3aed; }
        .legend-dot.resolved { background: #22c55e; }
        .legend-dot.rejected { background: #ef4444; }
        .legend-dot.location {
          background: transparent;
          border: 2px dashed #0B5D2A;
          width: 14px;
          height: 14px;
          border-radius: 2px;
        }

        @media (max-width: 1100px) {
          .sidebar { width: 300px; min-width: 300px; }
          .main-content { width: calc(100vw - 300px); }
        }
        @media (max-width: 850px) {
          body { overflow: auto; }
          .map-page { width: 1100px; min-width: 1100px; height: 100vh; }
        }
      `}</style>
    </>
  );
}