import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaHospital,
  FaUserMd,
  FaPhoneAlt,
  FaClock,
  FaMapMarkerAlt,
  FaSpinner,
  FaStethoscope,
  FaSyringe,
  FaBaby,
  FaChild,
  FaTooth,
  FaHeartbeat,
} from "react-icons/fa";
import { apiFetch } from "../../api";

export default function HealthCenter() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState(null);
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);

  useEffect(() => {
    const fetchHealthCenterData = async () => {
      try {
        setLoading(true);

        // Fetch all three endpoints in parallel
        const [infoData, servicesData, staffData] = await Promise.all([
          apiFetch("/api/health-center/info"),
          apiFetch("/api/health-center/services"),
          apiFetch("/api/health-center/staff"),
        ]);

        setInfo(infoData);
        setServices(servicesData);
        setStaff(staffData);
      } catch (err) {
        console.error("Error fetching health center data:", err);
        setError("Failed to load health center information.");
      } finally {
        setLoading(false);
      }
    };

    fetchHealthCenterData();
  }, []);

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
          className="bg-white rounded-3xl border border-red-300 text-center flex flex-col items-center gap-3"
          style={{ padding: "32px 24px" }}
        >
          <p className="text-[15px] font-bold text-red-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-[#0B5D2A] font-bold underline"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Map service names to icons (each service gets its own icon)
  const getServiceIcon = (name) => {
    const icons = {
      "General Consultation": <FaStethoscope size={20} />,
      "Vaccination": <FaSyringe size={20} />,
      "Maternal Care": <FaBaby size={20} />,
      "Child Immunization": <FaChild size={20} />,
      "Dental Services": <FaTooth size={20} />,
      "Blood Pressure Check": <FaHeartbeat size={20} />,
    };
    return icons[name] || <FaHospital size={20} />;
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
            className="absolute left-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 flex items-center justify-center text-white text-[20px] hover:bg-white/20 active:scale-95 transition"
          >
            <FaArrowLeft />
          </button>
          <h1 className="text-white text-[21px] font-extrabold">
            Health Center
          </h1>
        </header>

        {/* CONTENT */}
        <main
          className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-8"
          style={{ padding: "24px 20px 40px" }}
        >
          {/* CONTACT INFORMATION */}
          <section className="flex flex-col gap-4">
            <h2 className="text-[19px] font-bold text-gray-800">
              Contact Information
            </h2>

            <div className="bg-white rounded-[22px] border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-200">
              <ContactRow icon={<FaMapMarkerAlt size={18} />} label="Location">
                <p className="text-[14px] font-bold text-gray-800">
                  {info?.location || "Barangay Hall Compound, Pateros"}
                </p>
              </ContactRow>

              <ContactRow icon={<FaPhoneAlt size={17} />} label="Contact Number">
                <p className="text-[14px] font-bold text-gray-800">
                  {info?.contact_number || "(02) 8888-1234"}
                </p>
              </ContactRow>

              <ContactRow icon={<FaClock size={18} />} label="Operating Hours">
                <p className="text-[14px] font-bold text-gray-800">
                  {info?.operating_days || "Monday - Friday"}
                </p>
                <p className="text-[12px] text-gray-500">
                  {info?.operating_hours || "8:00 AM - 5:00 PM"}
                </p>
              </ContactRow>
            </div>
          </section>

          {/* SERVICES */}
          <section className="flex flex-col gap-4">
            <h2 className="text-[19px] font-bold text-gray-800">Services</h2>

            <div className="grid grid-cols-2 gap-3">
              {services.length > 0 ? (
                services.map((service, index) => (
                  <div
                    key={index}
                    className="min-h-[124px] bg-white rounded-[20px] border border-gray-200 shadow-sm flex flex-col items-center justify-center gap-3 text-center"
                    style={{ padding: "20px 12px", boxSizing: "border-box" }}
                  >
                    <div className="w-[46px] h-[46px] rounded-full bg-[#E8F5E3] text-[#0B5D2A] flex items-center justify-center shrink-0">
                      {getServiceIcon(service.service_name)}
                    </div>

                    <p className="text-[12px] font-bold text-gray-800 leading-4">
                      {service.service_name}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 col-span-2 text-center py-4">
                  No services available.
                </p>
              )}
            </div>
          </section>

          {/* MEDICAL STAFF */}
          <section className="flex flex-col gap-4">
            <h2 className="text-[19px] font-bold text-gray-800">
              Medical Staff
            </h2>

            <div className="flex flex-col gap-3">
              {staff.length > 0 ? (
                staff.map((person, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-[20px] border border-gray-200 shadow-sm flex items-center gap-4"
                    style={{ padding: "16px 20px", boxSizing: "border-box" }}
                  >
                    <div className="w-[50px] h-[50px] rounded-full bg-[#0B5D2A] flex items-center justify-center text-white shrink-0">
                      <FaUserMd size={22} />
                    </div>

                    <div className="min-w-0 flex flex-col gap-1">
                      <h3 className="text-[14px] font-bold text-gray-800">
                        {person.staff_name}
                      </h3>
                      <p className="text-[12px] text-gray-500">{person.role}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">
                  No staff information available.
                </p>
              )}
            </div>
          </section>

          {/* APPOINTMENT BUTTON */}
          <button
            type="button"
            onClick={() => navigate("/appointment")}
            className="w-full h-[54px] shrink-0 bg-[#0B5D2A] text-white rounded-[16px] font-bold text-[15px] flex items-center justify-center shadow-sm hover:bg-[#084A21] active:scale-[0.98] transition"
          >
            Request Appointment
          </button>
        </main>

        {/* Fake home bar, desktop frame only */}
        <div className="hidden sm:flex absolute bottom-2 left-0 right-0 justify-center pointer-events-none z-50">
          <div className="w-[60px] h-[5px] rounded-full bg-gray-700 opacity-80" />
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   CONTACT ROW
========================================================= */
function ContactRow({ icon, label, children }) {
  return (
    <div style={{ padding: "18px 20px", boxSizing: "border-box" }}>
      <div className="flex items-center gap-4">
        <div className="w-[44px] h-[44px] rounded-full bg-[#E8F5E3] text-[#0B5D2A] flex items-center justify-center shrink-0">
          {icon}
        </div>

        <div className="min-w-0 flex flex-col gap-1">
          <p className="text-[12px] text-gray-500">{label}</p>
          {children}
        </div>
      </div>
    </div>
  );
}