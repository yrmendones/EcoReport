import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FaArrowLeft,
  FaMapMarkerAlt,
  FaSpinner,
} from "react-icons/fa";
import { apiFetch } from "../../api";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const MARKER_COLOR = "#0B5D2A";

const createDragMarkerIcon = () =>
  L.divIcon({
    html: `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36" fill="${MARKER_COLOR}" style="filter: drop-shadow(0 3px 4px rgba(0,0,0,0.45));">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
    `,
    className: "custom-drag-marker",
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });

export default function ReportLocation() {
  const navigate = useNavigate();
  const location = useLocation();
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const mapContainerRef = useRef(null);

  const reportType = location.state?.reportType || "";
  const images = location.state?.images || [];
  const videos = location.state?.videos || [];
  const description = location.state?.description || "";

  // ============================================================
  // BARANGAY CENTER, BOUNDS, AND POLYGON
  // ============================================================
  const BARANGAY_CENTER = {
    lat: 14.553353888073685,
    lng: 121.06622687426457,
  };

  const BARANGAY_BOUNDS = {
    north: 14.55769923756584,
    south: 14.549030925901317,
    east: 121.07067839910466,
    west: 121.06177492093398,
  };

  const BARANGAY_POLYGON = [
    [14.55769923756584, 121.06629257249703],
    [14.556346053245349, 121.06304747722577],
    [14.553353114581022, 121.06177492093398],
    [14.5503472066974, 121.06301684973586],
    [14.549030925901317, 121.06622365594112],
    [14.550284671220394, 121.0694687321997],
    [14.553314388592, 121.07067839910466],
    [14.556455506786161, 121.06931238647843],
  ];

  const [formData, setFormData] = useState({
    latitude: "",
    longitude: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [gettingLocation, setGettingLocation] = useState(false);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  // Ray-casting point-in-polygon test
  const isPointInPolygon = (lat, lng, polygon) => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [latI, lngI] = polygon[i];
      const [latJ, lngJ] = polygon[j];
      const intersect =
        (lngI > lng) !== (lngJ > lng) &&
        lat < ((latJ - latI) * (lng - lngI)) / (lngJ - lngI) + latI;
      if (intersect) inside = !inside;
    }
    return inside;
  };

  const isValidLocation = (lat, lng) =>
    isPointInPolygon(lat, lng, BARANGAY_POLYGON);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const bounds = [
      [BARANGAY_BOUNDS.south, BARANGAY_BOUNDS.west],
      [BARANGAY_BOUNDS.north, BARANGAY_BOUNDS.east],
    ];

    mapRef.current = L.map(mapContainerRef.current, {
      center: [BARANGAY_CENTER.lat, BARANGAY_CENTER.lng],
      zoom: 16,
      zoomControl: false,
      maxBounds: bounds,
      maxBoundsViscosity: 1.0,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(mapRef.current);

    // Barangay boundary polygon (not rectangle)
    L.polygon(BARANGAY_POLYGON, {
      color: "#0B5D2A",
      weight: 2,
      opacity: 0.7,
      fill: false,
      dashArray: "8, 4",
    }).addTo(mapRef.current);

    // Draggable marker at center
    const marker = L.marker([BARANGAY_CENTER.lat, BARANGAY_CENTER.lng], {
      draggable: true,
      icon: createDragMarkerIcon(),
    }).addTo(mapRef.current);
    markerRef.current = marker;

    setFormData({
      latitude: BARANGAY_CENTER.lat.toFixed(6),
      longitude: BARANGAY_CENTER.lng.toFixed(6),
    });

    // Constrain marker to the bounding box while dragging
    marker.on("drag", () => {
      const pos = marker.getLatLng();
      const lat = Math.max(BARANGAY_BOUNDS.south, Math.min(BARANGAY_BOUNDS.north, pos.lat));
      const lng = Math.max(BARANGAY_BOUNDS.west, Math.min(BARANGAY_BOUNDS.east, pos.lng));
      if (lat !== pos.lat || lng !== pos.lng) {
        marker.setLatLng([lat, lng]);
      }
    });

    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      setFormData({
        latitude: pos.lat.toFixed(6),
        longitude: pos.lng.toFixed(6),
      });
      setHasUserInteracted(true);
      setError("");
    });

    setMapInitialized(true);

    // Make sure the map measures its container after the layout is ready,
    // and again whenever the container size changes (e.g. phone rotation)
    const mapInstance = mapRef.current;
    const refreshTimer = setTimeout(() => {
      if (mapInstance) mapInstance.invalidateSize();
    }, 200);

    let resizeObserver = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        if (mapInstance) mapInstance.invalidateSize();
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      clearTimeout(refreshTimer);
      if (resizeObserver) resizeObserver.disconnect();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  // Update marker from formData
  useEffect(() => {
    if (markerRef.current && formData.latitude && formData.longitude) {
      const lat = parseFloat(formData.latitude);
      const lng = parseFloat(formData.longitude);
      if (!isNaN(lat) && !isNaN(lng) && isValidLocation(lat, lng)) {
        markerRef.current.setLatLng([lat, lng]);
        if (mapRef.current) {
          mapRef.current.setView([lat, lng], 16);
        }
      }
    }
  }, [formData.latitude, formData.longitude]);

  const getLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser. Please drag the marker to your location.");
      return;
    }

    setGettingLocation(true);
    setError("");
    setHasUserInteracted(false);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (!isValidLocation(latitude, longitude)) {
          setError(
            "Your GPS location is outside Barangay Sto. Rosario Kanluran.\n" +
            "Please drag the marker to your correct location on the map."
          );
          setGettingLocation(false);
          setHasUserInteracted(false);
          return;
        }
        setFormData({
          latitude: latitude.toFixed(6),
          longitude: longitude.toFixed(6),
        });
        setHasUserInteracted(true);
        setGettingLocation(false);
      },
      (err) => {
        console.error("Geolocation error:", err);
        let message = "Unable to get your location. ";
        switch (err.code) {
          case err.PERMISSION_DENIED:
            message += "Please allow location access or drag the marker manually.";
            break;
          case err.POSITION_UNAVAILABLE:
          case err.TIMEOUT:
            message += "Please drag the marker to your location on the map.";
            break;
          default:
            message += "Please drag the marker manually.";
        }
        setError(message);
        setGettingLocation(false);
        setHasUserInteracted(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  const handleManualChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    const lat = parseFloat(name === "latitude" ? value : formData.latitude);
    const lng = parseFloat(name === "longitude" ? value : formData.longitude);
    if (!isNaN(lat) && !isNaN(lng) && isValidLocation(lat, lng)) {
      setHasUserInteracted(true);
      setError("");
    }
  };

  const handleSubmit = async () => {
    const lat = parseFloat(formData.latitude);
    const lng = parseFloat(formData.longitude);

    if (!hasUserInteracted) {
      setError(
        "Please drag the marker to your exact location on the map\n" +
        "or use 'Get Current Location' first."
      );
      return;
    }

    if (!formData.latitude || !formData.longitude || isNaN(lat) || isNaN(lng)) {
      setError("Please drag the marker to your location on the map.");
      return;
    }

    if (!isValidLocation(lat, lng)) {
      setError("Location must be within Barangay Sto. Rosario Kanluran. Please drag the marker inside the barangay area.");
      return;
    }

    let user = null;
    try {
      user = JSON.parse(localStorage.getItem("user"));
    } catch (e) {
      console.error("Error parsing user from localStorage", e);
    }

    if (!user || !user.user_id) {
      alert("You must be logged in to submit a report.");
      navigate("/resident-login");
      return;
    }

    if (!reportType) {
      alert("Report type is missing. Please start over.");
      navigate("/create-report");
      return;
    }

    setLoading(true);
    setError("");

    try {
        const reportData = {
        category: reportType,
        description: description,
        address: "Barangay Sto. Rosario Kanluran, Pateros",
        latitude: formData.latitude,
        longitude: formData.longitude,
      };

      const response = await apiFetch("/api/reports", {
        method: "POST",
        body: JSON.stringify(reportData),
      });

      if (images && images.length > 0) {
        for (const imageUrl of images) {
          await apiFetch(`/api/reports/${response.report_id}/media`, {
            method: "POST",
            body: JSON.stringify({ file_url: imageUrl, file_type: "image" }),
          });
        }
      }

      if (videos && videos.length > 0) {
        for (const videoUrl of videos) {
          await apiFetch(`/api/reports/${response.report_id}/media`, {
            method: "POST",
            body: JSON.stringify({ file_url: videoUrl, file_type: "video" }),
          });
        }
      }

      navigate("/report-success", { state: { reportId: response.report_id } });
    } catch (err) {
      console.error("Submit error:", err);
      setError(err.message || "Failed to submit report.");
    } finally {
      setLoading(false);
    }
  };

  const isSubmitDisabled = loading || !hasUserInteracted;

  const coordInputClass =
    "block w-full min-w-0 h-[52px] bg-[#F4F7F3] border border-[#D5E4D1] rounded-xl text-[15px] text-gray-700 outline-none focus:border-[#0B5D2A] focus:ring-2 focus:ring-[#0B5D2A]/10";
  const coordInputStyle = { padding: "0 16px", boxSizing: "border-box" };
  const coordLabelClass =
    "block text-[12px] font-bold text-gray-600 uppercase tracking-wide";

  return (
    <div className="min-h-[100dvh] bg-[#E5E7EB] flex justify-center items-center sm:py-6 sm:px-3">
      <style>{`
        .hide-scrollbar {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }
      `}</style>

      <div className="relative w-full h-[100dvh] sm:w-[390px] sm:h-[844px] bg-[#F8FAF8] sm:rounded-[40px] sm:border-[5px] sm:border-white sm:shadow-2xl overflow-hidden flex flex-col">
        <header
          className="relative h-[82px] bg-[#0B5D2A] flex items-center justify-center shrink-0"
          style={{ padding: "0 64px" }}
        >
          <button
            type="button"
            onClick={() => navigate("/description-step")}
            aria-label="Back"
            className="absolute left-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center text-white text-[20px] bg-white/10 hover:bg-white/20 active:scale-95 transition"
          >
            <FaArrowLeft />
          </button>
          <h1 className="text-white text-[22px] font-extrabold text-center">
            Report Location
          </h1>
        </header>

        <main
          className="hide-scrollbar flex-1 overflow-y-auto flex flex-col"
          style={{
            padding:
              "28px 24px max(48px, calc(env(safe-area-inset-bottom) + 32px))",
            gap: "28px",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          <div className="shrink-0 flex flex-col" style={{ gap: "8px" }}>
            <p className="text-[15px] font-bold text-[#0B5D2A]">Step 4 of 4</p>
            <h2 className="text-[24px] font-extrabold text-gray-900 leading-tight">
              Set Your Location
            </h2>
            <p className="text-[14px] text-gray-600 leading-6">
              Drag the marker to your exact location within the barangay.
            </p>
            {!hasUserInteracted && (
              <p className="text-[14px] text-[#B8791F] font-bold leading-6">
                ⚠️ Please drag the marker or use GPS to set your location
              </p>
            )}
          </div>

          <section
            className="shrink-0 bg-white rounded-3xl border border-[#D5E4D1] shadow-sm flex flex-col"
            style={{ padding: "24px", gap: "20px", boxSizing: "border-box" }}
          >
            <div className="shrink-0" style={{ width: "100%" }}>
              <div
                ref={mapContainerRef}
                className="rounded-2xl overflow-hidden border border-[#C8DCC3] bg-[#DCEFD8]"
                style={{
                  width: "100%",
                  height: "240px",
                  minHeight: "240px",
                  position: "relative",
                  zIndex: 0,
                  boxSizing: "border-box",
                }}
              >
                {!mapInitialized && (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                    Loading map...
                  </div>
                )}
              </div>
              <p
                className="text-[13px] leading-5 text-gray-500 text-center"
                style={{ marginTop: "10px" }}
              >
                Drag the marker to your location (must be within Barangay Sto. Rosario Kanluran)
              </p>
            </div>

            <button
              type="button"
              onClick={getLocation}
              disabled={gettingLocation}
              className="w-full h-[54px] bg-[#0B5D2A] text-white rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 shadow-sm hover:bg-[#084A21] active:scale-[0.98] transition disabled:opacity-50"
            >
              {gettingLocation ? (
                <>
                  <FaSpinner className="animate-spin" />
                  Getting location...
                </>
              ) : (
                <>
                  <FaMapMarkerAlt size={16} />
                  Get Current Location (GPS)
                </>
              )}
            </button>

            <div className="grid grid-cols-2 gap-4">
              <div className="min-w-0 flex flex-col" style={{ gap: "8px" }}>
                <label htmlFor="latitude" className={coordLabelClass}>
                  Latitude
                </label>
                <input
                  id="latitude"
                  type="text"
                  name="latitude"
                  value={formData.latitude}
                  onChange={handleManualChange}
                  placeholder="14.552644"
                  className={coordInputClass}
                  style={coordInputStyle}
                />
              </div>
              <div className="min-w-0 flex flex-col" style={{ gap: "8px" }}>
                <label htmlFor="longitude" className={coordLabelClass}>
                  Longitude
                </label>
                <input
                  id="longitude"
                  type="text"
                  name="longitude"
                  value={formData.longitude}
                  onChange={handleManualChange}
                  placeholder="121.068783"
                  className={coordInputClass}
                  style={coordInputStyle}
                />
              </div>
            </div>

            {error && (
              <div
                className="bg-red-100 border border-red-400 rounded-xl text-red-700 text-[14px] leading-6 whitespace-pre-line break-words"
                style={{ padding: "14px 16px" }}
              >
                {error}
              </div>
            )}
          </section>

          <div className="shrink-0 flex flex-col" style={{ gap: "12px" }}>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitDisabled}
              className={`
                w-full min-h-[58px] rounded-2xl font-extrabold text-[16px] shadow-md flex items-center justify-center transition
                ${
                  isSubmitDisabled
                    ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                    : "bg-[#0B5D2A] text-white hover:bg-[#084A21] active:scale-[0.98]"
                }
              `}
              style={{ padding: "0 24px" }}
            >
              {loading ? "Submitting..." : "Submit Report"}
            </button>
            {!hasUserInteracted && !loading && (
              <p className="text-[13px] leading-5 text-gray-500 text-center">
                Drag the marker on the map to enable submission
              </p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}