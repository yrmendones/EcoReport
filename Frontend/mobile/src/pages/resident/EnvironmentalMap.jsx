import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaSpinner, FaLocationArrow } from "react-icons/fa";
import { apiFetch } from "../../api";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const BARANGAY_BOUNDS = {
  north: 14.5545,
  south: 14.5505,
  east: 121.0745008909207,
  west: 121.06424180477325,
};

const STATUS_COLORS = {
  pending: "#eab308",
  ongoing: "#3b82f6",
  resolved: "#22c55e",
  rejected: "#ef4444",
};

const createPinSvg = (color) => `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32" fill="${color}" style="filter: drop-shadow(0 2px 3px rgba(0,0,0,0.4));">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
  </svg>
`;

const createPinIcon = (status) => {
  const normalized = (status || "").toLowerCase();
  const displayStatus = normalized === "assigned" ? "ongoing" : normalized;
  const color = STATUS_COLORS[displayStatus] || "#6b7280";
  
  return L.divIcon({
    html: createPinSvg(color),
    className: "custom-pin-icon",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

// Reporter name based on privacy settings
const getReporterName = (report) => {
  if (report.user_id) {
    if (report.first_name && report.last_name)
      return `${report.first_name} ${report.last_name}`;
    if (report.first_name) return report.first_name;
    return "Anonymous";
  }
  return report.guest_name || "Guest";
};

export default function EnvironmentalMap() {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  const markersRef = useRef([]);

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userLocation, setUserLocation] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  const defaultCenter = [
    (BARANGAY_BOUNDS.north + BARANGAY_BOUNDS.south) / 2,
    (BARANGAY_BOUNDS.east + BARANGAY_BOUNDS.west) / 2,
  ];

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const bounds = [
      [BARANGAY_BOUNDS.south, BARANGAY_BOUNDS.west],
      [BARANGAY_BOUNDS.north, BARANGAY_BOUNDS.east],
    ];

    mapRef.current = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: 15,
      maxBounds: bounds,
      maxBoundsViscosity: 1.0,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
    }).addTo(mapRef.current);

    L.rectangle(bounds, {
      color: "#0B5D2A",
      weight: 2,
      opacity: 0.6,
      fill: false,
      dashArray: "5, 5",
    }).addTo(mapRef.current);

    // ✅ Fix Leaflet rendering size in flex containers
    setTimeout(() => {
      if (mapRef.current) mapRef.current.invalidateSize();
    }, 0);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  const fetchReports = async (lat, lng) => {
    try {
      setLoading(true);
      let url = "/api/reports/nearby";
      if (lat && lng) url += `?lat=${lat}&lng=${lng}`;
      const data = await apiFetch(url);
      const visible = data.filter((r) => r.status?.toLowerCase() !== "deleted");
      setReports(visible);
      renderMarkers(visible);
    } catch (err) {
      console.error("Error fetching reports:", err);
      setError("Failed to load nearby reports.");
    } finally {
      setLoading(false);
    }
  };

  const renderMarkers = (data) => {
    if (!mapRef.current) return;
    markersRef.current.forEach((m) => mapRef.current.removeLayer(m));
    markersRef.current = [];

    if (userLocation) {
      const userMarker = L.circleMarker([userLocation.lat, userLocation.lng], {
        radius: 8,
        fillColor: "#1769ff",
        color: "#ffffff",
        weight: 3,
        opacity: 1,
        fillOpacity: 1,
      })
        .addTo(mapRef.current)
        .bindPopup("<strong>Your Location</strong>");
      markersRef.current.push(userMarker);
    }

    data.forEach((report) => {
      if (!report.latitude || !report.longitude) return;
      const lat = parseFloat(report.latitude);
      const lng = parseFloat(report.longitude);

      // Reporter name
      const reporter = getReporterName(report);

      const marker = L.marker([lat, lng], {
        icon: createPinIcon(report.status),
      })
        .addTo(mapRef.current)
        .bindPopup(`
          <div style="font-family: Arial; padding: 4px; max-width: 220px; line-height: 1.5;">
            <strong style="font-size: 13px;">${report.category || "Report"}</strong><br/>
            <span style="font-size: 11px; color: #666;">${report.address || "Location"}</span><br/>
            <span style="font-size: 11px; color: #666;">Reported by: <strong>${reporter}</strong></span><br/>
            <span style="font-size: 11px; color: #999;">Status: ${report.status?.toUpperCase()}</span>
          </div>
        `);

      markersRef.current.push(marker);
    });
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          if (mapRef.current) mapRef.current.setView([latitude, longitude], 15);
          fetchReports(latitude, longitude);
        },
        () => {
          fetchReports(defaultCenter[0], defaultCenter[1]);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    } else {
      fetchReports(defaultCenter[0], defaultCenter[1]);
    }
  }, []);

  const handleGetLocation = () => {
    setGettingLocation(true);
    if (!navigator.geolocation) {
      alert("Geolocation is not supported.");
      setGettingLocation(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        if (mapRef.current) mapRef.current.setView([latitude, longitude], 16);
        fetchReports(latitude, longitude);
        setGettingLocation(false);
      },
      () => {
        alert("Unable to get your location.");
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  return (
    <div className="min-h-[100dvh] bg-[#E5E7EB] flex justify-center items-center sm:py-6 sm:px-3">
      {/* Full screen on phones, phone frame only on sm and up */}
      <div className="relative w-full h-[100dvh] sm:w-[390px] sm:h-[844px] bg-[#F8FAF8] sm:rounded-[40px] sm:border-[5px] sm:border-white sm:shadow-2xl overflow-hidden flex flex-col">
        {/* HEADER */}
        <header className="relative h-[82px] bg-[#0B5D2A] flex items-center justify-center shrink-0 px-6">
          <button
            type="button"
            onClick={() => navigate("/resident-dashboard")}
            aria-label="Back"
            className="absolute left-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center text-white text-[20px] bg-white/10 hover:bg-white/20 active:scale-95 transition"
          >
            <FaArrowLeft />
          </button>
          <h1 className="text-white text-[20px] font-extrabold">
            Environmental Map
          </h1>
        </header>

        {/* MAP + LEGEND */}
        <div
          className="shrink-0 flex flex-col gap-5"
          style={{ padding: "16px 20px 4px" }}
        >
          <div
            className="relative rounded-2xl overflow-hidden border border-[#C8DCC3] bg-[#DCEFD8] shadow-sm"
            style={{ height: "clamp(220px, 34dvh, 300px)" }}
          >
            <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-10">
                <FaSpinner className="animate-spin text-[#0B5D2A]" size={30} />
              </div>
            )}
            <button
              type="button"
              onClick={handleGetLocation}
              disabled={gettingLocation}
              aria-label="Find my location"
              className="absolute bottom-3 right-3 z-[1000] w-11 h-11 rounded-full bg-white shadow-md flex items-center justify-center text-[#0B5D2A] hover:bg-gray-100 disabled:opacity-50"
              title="Find my location"
            >
              {gettingLocation ? (
                <FaSpinner className="animate-spin" size={18} />
              ) : (
                <FaLocationArrow size={18} />
              )}
            </button>
          </div>

          {/* LEGEND: Pending, Ongoing, Resolved, Rejected */}
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-bold text-gray-700">
            {Object.entries(STATUS_COLORS).map(([key, color]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ background: color }}
                />
                <span className="capitalize">{key}</span>
              </div>
            ))}
          </div>
        </div>

        {/* NEARBY REPORTS */}
        <main
          className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-5"
          style={{ padding: "24px 20px 40px" }}
        >
          <div className="flex flex-col gap-1.5">
            <h2 className="text-[19px] font-extrabold text-gray-900">
              Nearby Reports
            </h2>
            <p className="text-[12px] text-gray-500 leading-5">
              Environmental issues reported in your area.
            </p>
          </div>

          {error && (
            <div
              className="bg-white rounded-2xl border border-red-300 shadow-sm text-center flex flex-col items-center gap-3"
              style={{ padding: "28px 20px" }}
            >
              <p className="text-[13px] font-bold text-red-600">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 text-[#0B5D2A] font-bold underline"
              >
                Try Again
              </button>
            </div>
          )}

          {!loading && !error && (
            <div className="flex flex-col gap-4">
              {reports.length > 0 ? (
                reports.map((report) => (
                  <div
                    key={report.report_id}
                    className="bg-white rounded-2xl border border-[#D5E4D1] shadow-sm"
                    style={{ padding: "16px", boxSizing: "border-box" }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1 flex flex-col gap-1">
                        <h3 className="font-extrabold text-[14px] text-gray-900 leading-5">
                          {report.category}
                        </h3>

                        {/* Reporter name on card list */}
                        <p className="text-[11px] text-[#0B5D2A] font-bold">
                          Reported by: {getReporterName(report)}
                        </p>

                        <p className="text-[12px] text-gray-500 truncate">
                          {report.address ||
                            `${report.latitude}, ${report.longitude}`}
                        </p>

                        <div className="flex items-center gap-2">
                          <p className="text-[11px] text-gray-400">
                            ER-2026-
                            {String(report.report_id).padStart(4, "0")}
                          </p>
                          {report.distance_km != null && (
                            <>
                              <span className="text-[11px] text-gray-400">•</span>
                              <p className="text-[11px] text-[#0B5D2A] font-bold">
                                {parseFloat(report.distance_km).toFixed(2)} km
                                away
                              </p>
                            </>
                          )}
                        </div>
                      </div>

                      <span
                        className="shrink-0 px-3 py-1.5 rounded-full text-[11px] font-extrabold capitalize"
                        style={{
                          background: `${
                            STATUS_COLORS[
                              report.status?.toLowerCase() === "assigned" 
                                ? "ongoing" 
                                : report.status?.toLowerCase()
                            ] || "#6b7280"
                          }22`,
                          color:
                            STATUS_COLORS[
                              report.status?.toLowerCase() === "assigned" 
                                ? "ongoing" 
                                : report.status?.toLowerCase()
                            ] || "#6b7280",
                        }}
                      >
                        {report.status?.toLowerCase() === "assigned"
                          ? "ongoing"
                          : report.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div
                  className="bg-white rounded-2xl border border-[#D5E4D1] text-center"
                  style={{ padding: "32px 20px" }}
                >
                  <p className="text-[13px] font-semibold text-gray-500">
                    No reports available.
                  </p>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Fake home bar, desktop frame only */}
        <div className="hidden sm:flex absolute bottom-3 left-0 right-0 justify-center pointer-events-none z-50">
          <div className="w-[70px] h-[5px] rounded-full bg-gray-800 opacity-70" />
        </div>
      </div>
    </div>
  );
}