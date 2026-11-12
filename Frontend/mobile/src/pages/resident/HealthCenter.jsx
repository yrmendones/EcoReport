import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaHospital,
  FaUserMd,
  FaClock,
  FaMapMarkerAlt,
  FaTooth,
  FaBaby,
  FaChild,
  FaHeartbeat,
  FaBullhorn,
  FaChevronDown,
  FaTimes,
  FaSpinner,
} from "react-icons/fa";
import { apiFetch } from "../../api";

/* =========================================================
   GLOSSARY
========================================================= */
const GLOSSARY = {
  BHW: {
    full: "Barangay Health Worker",
    meaning:
      "A trained volunteer from your barangay who helps with basic health care, visits families, and refers you to the health center or a doctor when needed.",
  },
  BNS: {
    full: "Barangay Nutrition Scholar",
    meaning:
      "A trained barangay volunteer who helps monitor children's weight and nutrition and teaches families about healthy eating.",
  },
  "Operation Timbang Plus": {
    full: "Operation Timbang Plus",
    meaning:
      "A program where children are weighed and measured, usually house to house, to find out if they are underweight or need nutrition help.",
  },
  "Purong Kalusugan": {
    full: "Purong Kalusugan",
    meaning:
      "A barangay health activity where residents can get health services and information close to home.",
  },
  "medical missions": {
    full: "Medical Mission",
    meaning:
      "A special event where doctors, nurses, and volunteers give free check-ups, medicines, and other health services to residents.",
  },
};

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const TERM_REGEX = new RegExp(
  `\\b(${Object.keys(GLOSSARY).map(escapeRegex).join("|")})\\b`
);

/* Pick an icon based on keywords in the service name — flexible if
   the admin renames a service later. */
const getServiceIcon = (name) => {
  const n = String(name || "").toLowerCase();
  if (n.includes("dental") || n.includes("tooth")) return <FaTooth size={18} />;
  if (n.includes("prenatal") || n.includes("maternal") || n.includes("baby"))
    return <FaBaby size={18} />;
  if (n.includes("monitor") || n.includes("pressure") || n.includes("heart"))
    return <FaHeartbeat size={18} />;
  if (n.includes("child") || n.includes("immun") || n.includes("timbang"))
    return <FaChild size={18} />;
  if (n.includes("event") || n.includes("mission") || n.includes("announc"))
    return <FaBullhorn size={18} />;
  return <FaHospital size={18} />;
};

/* Hinahanap ang mga termino sa text at ginagawang pindutin */
function TermText({ text, onTermClick }) {
  if (!text) return null;
  const parts = String(text).split(TERM_REGEX);
  return (
    <>
      {parts.map((part, i) =>
        GLOSSARY[part] ? (
          <button
            key={i}
            type="button"
            onClick={() => onTermClick(part)}
            className="inline underline decoration-dotted decoration-2 underline-offset-2 text-[#0B5D2A] font-bold active:opacity-70"
            aria-label={`${part} means ${GLOSSARY[part].full}. Tap for explanation.`}
          >
            {part}
          </button>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export default function HealthCenter() {
  const navigate = useNavigate();

  const [info, setInfo] = useState(null);
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [openService, setOpenService] = useState(null);
  const [activeTerm, setActiveTerm] = useState(null);

  // Fetch info + services + staff in parallel
  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        setError("");
        const [infoData, servicesData, staffData] = await Promise.all([
          apiFetch("/api/health-center/info").catch(() => null),
          apiFetch("/api/health-center/services").catch(() => []),
          apiFetch("/api/health-center/staff").catch(() => []),
        ]);
        setInfo(infoData || null);
        setServices(Array.isArray(servicesData) ? servicesData : []);
        setStaff(Array.isArray(staffData) ? staffData : []);
      } catch (err) {
        console.error("Error fetching health center data:", err);
        setError("Failed to load health center information.");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // Close explanation with Escape key
  useEffect(() => {
    if (!activeTerm) return;
    const onKey = (e) => e.key === "Escape" && setActiveTerm(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeTerm]);

  const operatingDays = info?.operating_days || "Monday - Friday";
  const operatingHours = info?.operating_hours || "8:00 AM - 5:00 PM";
  // Split multi-line location into separate paragraphs
  const locationLines = String(info?.location || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const term = activeTerm ? GLOSSARY[activeTerm] : null;

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#E5E7EB] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <FaSpinner className="animate-spin text-[#0B5D2A]" size={40} />
          <p className="text-[#0B5D2A] font-bold">Loading health center...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="min-h-[100dvh] bg-[#E5E7EB] flex items-center justify-center"
        style={{ padding: "0 24px" }}
      >
        <div
          className="bg-white rounded-3xl border border-red-300 text-center flex flex-col items-center"
          style={{ padding: "32px 24px", gap: "16px" }}
        >
          <p className="text-[15px] font-bold text-red-600 leading-6">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="min-h-[44px] text-[#0B5D2A] font-bold underline"
            style={{ padding: "0 16px" }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#E5E7EB] flex justify-center items-center sm:py-6 sm:px-3">
      {/* Full screen on phones, phone frame only on sm and up */}
      <div className="relative w-full h-[100dvh] sm:w-[390px] sm:h-[844px] bg-[#F8FAF8] sm:rounded-[40px] sm:border-[5px] sm:border-white sm:shadow-2xl overflow-hidden flex flex-col">
        {/* HEADER */}
        <header
          className="relative h-[82px] bg-[#0B5D2A] flex items-center justify-center shrink-0"
          style={{ padding: "0 64px" }}
        >
          <button
            type="button"
            onClick={() => navigate("/resident-dashboard")}
            aria-label="Back"
            className="absolute left-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 flex items-center justify-center text-white text-[20px] hover:bg-white/20 active:scale-95 transition"
          >
            <FaArrowLeft />
          </button>
          <h1 className="text-white text-[22px] font-extrabold text-center">
            Health Center
          </h1>
        </header>

        {/* CONTENT */}
        <main
          className="flex-1 overflow-y-auto no-scrollbar flex flex-col"
          style={{
            padding:
              "28px 24px max(48px, calc(env(safe-area-inset-bottom) + 32px))",
            gap: "36px",
          }}
        >
          {/* CONTACT INFORMATION (location and operating hours only — no contact number) */}
          <section className="shrink-0 flex flex-col" style={{ gap: "16px" }}>
            <h2 className="text-[22px] font-bold text-gray-800">
              Contact Information
            </h2>

            <div className="bg-white rounded-[22px] border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-200">
              <ContactRow icon={<FaMapMarkerAlt size={18} />} label="Location">
                {locationLines.length > 0 ? (
                  locationLines.map((line, i) => (
                    <p
                      key={i}
                      className={
                        i === 0
                          ? "text-[16px] font-bold text-gray-800 leading-6"
                          : "text-[14px] text-gray-600 leading-5"
                      }
                    >
                      {line}
                    </p>
                  ))
                ) : (
                  <p className="text-[14px] text-gray-400 leading-5">Not set</p>
                )}
              </ContactRow>

              <ContactRow icon={<FaClock size={18} />} label="Operating Hours">
                <p className="text-[16px] font-bold text-gray-800 leading-6">
                  {operatingDays}
                </p>
                <p className="text-[14px] text-gray-600 leading-5">
                  {operatingHours}
                </p>
              </ContactRow>
            </div>
          </section>

          {/* SERVICES: accordion, description shown only if present */}
          <section className="shrink-0 flex flex-col" style={{ gap: "16px" }}>
            <div className="flex flex-col" style={{ gap: "6px" }}>
              <h2 className="text-[22px] font-bold text-gray-800">Services</h2>
              <p className="text-[14px] text-gray-600 leading-6">
                Tap a service to see more details.
              </p>
            </div>

            <div className="bg-white rounded-[22px] border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-200">
              {services.length === 0 ? (
                <div
                  className="text-center text-gray-500"
                  style={{ padding: "32px 24px" }}
                >
                  <p className="text-[14px] font-semibold leading-6">
                    No services available.
                  </p>
                </div>
              ) : (
                services.map((service, index) => {
                  const hasDescription = !!service.description;
                  const isOpen = openService === index;

                  return (
                    <div key={service.service_id ?? index}>
                      <button
                        type="button"
                        onClick={() =>
                          hasDescription &&
                          setOpenService(isOpen ? null : index)
                        }
                        disabled={!hasDescription}
                        aria-expanded={hasDescription ? isOpen : undefined}
                        className={`w-full flex items-center text-left transition ${
                          hasDescription
                            ? "active:bg-gray-50 cursor-pointer"
                            : "cursor-default"
                        }`}
                        style={{
                          padding: "18px 20px",
                          gap: "16px",
                          boxSizing: "border-box",
                        }}
                      >
                        <div className="w-[44px] h-[44px] rounded-full bg-[#E8F5E3] text-[#0B5D2A] flex items-center justify-center shrink-0">
                          {getServiceIcon(service.service_name)}
                        </div>

                        <p className="flex-1 min-w-0 text-[16px] font-bold text-gray-800 leading-6">
                          {service.service_name}
                        </p>

                        {hasDescription && (
                          <FaChevronDown
                            size={14}
                            className={`text-gray-400 shrink-0 transition-transform ${
                              isOpen ? "rotate-180" : ""
                            }`}
                          />
                        )}
                      </button>

                      {isOpen && hasDescription && (
                        <div
                          className="bg-[#F8FAF8]"
                          style={{ padding: "4px 20px 20px 80px" }}
                        >
                          <p className="text-[15px] text-gray-700 leading-7">
                            <TermText
                              text={service.description}
                              onTermClick={setActiveTerm}
                            />
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* MEDICAL STAFF */}
          <section className="shrink-0 flex flex-col" style={{ gap: "16px" }}>
            <div className="flex flex-col" style={{ gap: "6px" }}>
              <h2 className="text-[22px] font-bold text-gray-800">
                Medical Staff
              </h2>
              <p className="text-[14px] text-gray-600 leading-6">
                Tap an underlined word to see what it means.
              </p>
            </div>

            {staff.length === 0 ? (
              <div className="bg-white rounded-[20px] border border-gray-200 shadow-sm text-center"
                style={{ padding: "32px 24px" }}
              >
                <p className="text-[14px] font-semibold text-gray-500 leading-6">
                  No staff information available.
                </p>
              </div>
            ) : (
              <div className="flex flex-col" style={{ gap: "14px" }}>
                {staff.map((person, index) => (
                  <div
                    key={person.staff_id ?? index}
                    className="bg-white rounded-[20px] border border-gray-200 shadow-sm flex items-center"
                    style={{
                      padding: "18px 20px",
                      gap: "16px",
                      boxSizing: "border-box",
                    }}
                  >
                    <div className="w-[52px] h-[52px] rounded-full bg-[#0B5D2A] flex items-center justify-center text-white shrink-0">
                      <FaUserMd size={22} />
                    </div>

                    <div className="min-w-0 flex flex-col" style={{ gap: "4px" }}>
                      <h3 className="text-[16px] font-bold text-gray-800 leading-6">
                        {person.staff_name}
                      </h3>
                      <p className="text-[14px] text-gray-600 leading-5">
                        <TermText
                          text={person.role}
                          onTermClick={setActiveTerm}
                        />
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* APPOINTMENT BUTTON */}
          <button
            type="button"
            onClick={() => navigate("/appointment")}
            className="btn-primary w-full h-[58px] shrink-0 rounded-[16px] font-bold text-[16px] flex items-center justify-center shadow-sm transition"
          >
            Request Appointment
          </button>
        </main>

        {/* TERM EXPLANATION (bottom sheet) */}
        {term && (
          <div
            className="absolute inset-0 z-50 flex items-end bg-black/40"
            onClick={() => setActiveTerm(null)}
            role="dialog"
            aria-modal="true"
            aria-label={`${activeTerm} explanation`}
          >
            <div
              className="w-full bg-white rounded-t-[28px] flex flex-col shadow-2xl"
              style={{
                padding:
                  "24px 24px max(32px, calc(env(safe-area-inset-bottom) + 24px))",
                gap: "16px",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="flex items-start justify-between"
                style={{ gap: "16px" }}
              >
                <div className="flex flex-col" style={{ gap: "4px" }}>
                  <p className="text-[14px] text-gray-600">
                    What does {activeTerm} mean?
                  </p>
                  <h3 className="text-[22px] font-extrabold text-[#0B5D2A] leading-snug">
                    {term.full}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTerm(null)}
                  aria-label="Close explanation"
                  className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 shrink-0 active:scale-95 transition"
                >
                  <FaTimes size={16} />
                </button>
              </div>

              <p className="text-[16px] text-gray-700 leading-7">
                {term.meaning}
              </p>

              <button
                type="button"
                onClick={() => setActiveTerm(null)}
                className="w-full h-[52px] bg-[#0B5D2A] text-white rounded-[14px] font-bold text-[16px] active:scale-[0.98] transition"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   CONTACT ROW
========================================================= */
function ContactRow({ icon, label, children }) {
  return (
    <div style={{ padding: "20px", boxSizing: "border-box" }}>
      <div className="flex items-center" style={{ gap: "16px" }}>
        <div className="w-[48px] h-[48px] rounded-full bg-[#E8F5E3] text-[#0B5D2A] flex items-center justify-center shrink-0">
          {icon}
        </div>

        <div className="min-w-0 flex flex-col" style={{ gap: "4px" }}>
          <p className="text-[14px] text-gray-600">{label}</p>
          {children}
        </div>
      </div>
    </div>
  );
}