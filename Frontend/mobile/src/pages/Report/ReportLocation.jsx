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
  // BARANGAY CENTER AND BOUNDARIES
  // ============================================================
  const BARANGAY_CENTER = {
    lat: 14.55264385736503,
    lng: 121.06878333266629,
  };

  const BARANGAY_BOUNDS = {
    north: 14.5545,
    south: 14.5505,
    east: 121.0745008909207,
    west: 121.06424180477325,
  };

  const [formData, setFormData] = useState({
    latitude: "",
    longitude: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [gettingLocation, setGettingLocation] = useState(false);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  // Validate if coordinates are within barangay
  const isValidLocation = (lat, lng) => {
    return (
      lat >= BARANGAY_BOUNDS.south &&
      lat <= BARANGAY_BOUNDS.north &&
      lng >= BARANGAY_BOUNDS.west &&
      lng <= BARANGAY_BOUNDS.east
    );
  };

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
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(mapRef.current);

    // barangay boundary overlay
    L.rectangle(bounds, {
      color: "#0B5D2A",
      weight: 2,
      opacity: 0.7,
      fill: false,
      dashArray: "8, 4",
    }).addTo(mapRef.current);

    // draggable marker at center
    const marker = L.marker([BARANGAY_CENTER.lat, BARANGAY_CENTER.lng], {
      draggable: true,
      icon: createDragMarkerIcon(),
    }).addTo(mapRef.current);
    markerRef.current = marker;

    // Set initial form data to center
    setFormData({
      latitude: BARANGAY_CENTER.lat.toFixed(6),
      longitude: BARANGAY_CENTER.lng.toFixed(6),
    });

    // Constrain marker within bounds
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

    return () => {
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
      setHasUserInteracted(true); // User typed valid coordinates
      setError("");
    }
  };

  const handleSubmit = async () => {
    const lat = parseFloat(formData.latitude);
    const lng = parseFloat(formData.longitude);

    // ============================================================
    // User must interact with the location first
    // ============================================================
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
        user_id: user.user_id,
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

  // Check if submit should be disabled
  const isSubmitDisabled = loading || !hasUserInteracted;

  return (
    <div className="min-h-screen bg-[#E5E7EB] flex justify-center items-center py-6 px-3">
      <div className="relative w-[390px] h-[844px] bg-[#F8FAF8] rounded-[40px] border-[5px] border-white shadow-2xl overflow-hidden flex flex-col">
        
        {/* HEADER */}
        <header className="relative h-[82px] bg-[#0B5D2A] flex items-center justify-center shrink-0">
          <button
            type="button"
            onClick={() => navigate("/description-step")}
            className="absolute left-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center text-white text-[20px] bg-white/10 hover:bg-white/20 active:scale-95 transition"
          >
            <FaArrowLeft />
          </button>
          <h1 className="text-white text-[21px] font-extrabold">Report Location</h1>
        </header>

        {/* MAIN CONTENT */}
        <main className="flex-1 overflow-y-auto px-6 pt-7 pb-4 no-scrollbar">
          <div className="mb-6">
            <p className="text-[13px] font-bold text-[#0B5D2A] mb-2">Step 4 of 4</p>
            <h2 className="text-[21px] font-extrabold text-gray-900 leading-tight">Set Your Location</h2>
            <p className="text-[12px] text-gray-500 mt-2 leading-5">
              Drag the marker to your exact location within the barangay.
            </p>
            {!hasUserInteracted && (
              <p className="text-[11px] text-[#D89A00] font-bold mt-1">
                ⚠️ Please drag the marker or use GPS to set your location
              </p>
            )}
          </div>

          <section className="bg-white rounded-3xl border border-[#D5E4D1] shadow-sm px-6 py-7">
            {/* MAP */}
            <div className="mb-5">
              <div
                ref={mapContainerRef}
                className="w-full h-[200px] rounded-2xl overflow-hidden border border-[#C8DCC3] bg-[#DCEFD8]"
              >
                {!mapInitialized && (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                    Loading map...
                  </div>
                )}
              </div>
              <p className="text-[9px] text-gray-400 mt-1 text-center">
                Drag the marker to your location (must be within Barangay Sto. Rosario Kanluran)
              </p>
            </div>

            {/* GET LOCATION BUTTON */}
            <button
              type="button"
              onClick={getLocation}
              disabled={gettingLocation}
              className="w-full h-[50px] bg-[#0B5D2A] text-white rounded-2xl font-bold text-[13px] flex items-center justify-center gap-2 shadow-sm hover:bg-[#084A21] active:scale-[0.98] transition disabled:opacity-50"
            >
              {gettingLocation ? (
                <>
                  <FaSpinner className="animate-spin" />
                  Getting location...
                </>
              ) : (
                <>
                  <FaMapMarkerAlt size={15} />
                  Get Current Location (GPS)
                </>
              )}
            </button>

            <div className="h-5" />

            {/* MANUAL INPUT */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2 block">
                  Latitude
                </label>
                <input
                  type="text"
                  name="latitude"
                  value={formData.latitude}
                  onChange={handleManualChange}
                  placeholder="14.552644"
                  className="w-full h-[48px] bg-[#F4F7F3] border border-[#D5E4D1] rounded-xl px-4 text-[13px] text-gray-700 outline-none focus:border-[#0B5D2A] focus:ring-2 focus:ring-[#0B5D2A]/10"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2 block">
                  Longitude
                </label>
                <input
                  type="text"
                  name="longitude"
                  value={formData.longitude}
                  onChange={handleManualChange}
                  placeholder="121.068783"
                  className="w-full h-[48px] bg-[#F4F7F3] border border-[#D5E4D1] rounded-xl px-4 text-[13px] text-gray-700 outline-none focus:border-[#0B5D2A] focus:ring-2 focus:ring-[#0B5D2A]/10"
                />
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-100 border border-red-400 rounded-lg text-red-700 text-sm whitespace-pre-line">
                {error}
              </div>
            )}
          </section>

          <div className="h-7" />

          {/* SUBMIT BUTTON */}
          <div className="px-1">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitDisabled}
              className={`
                w-full min-h-[56px] px-6 py-4 rounded-2xl font-extrabold text-[14px] shadow-md flex items-center justify-center transition
                ${isSubmitDisabled 
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                  : 'bg-[#0B5D2A] text-white hover:bg-[#084A21] active:scale-[0.98]'
                }
              `}
            >
              {loading ? "Submitting..." : "Submit Report"}
            </button>
            {!hasUserInteracted && !loading && (
              <p className="text-[10px] text-gray-400 text-center mt-2">
                Drag the marker on the map to enable submission
              </p>
            )}
          </div>

          <div className="h-[75px]" />
        </main>

        {/* HOME BAR */}
        <div className="absolute bottom-2 left-0 right-0 flex justify-center pointer-events-none z-30">
          <div className="w-[70px] h-[5px] rounded-full bg-gray-800 opacity-70" />
        </div>
      </div>
    </div>
  );
}