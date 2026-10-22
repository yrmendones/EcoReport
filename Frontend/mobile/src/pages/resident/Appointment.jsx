import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaCalendarCheck,
  FaSpinner,
  FaCheckCircle,
  FaExclamationTriangle,
} from "react-icons/fa";
import { apiFetch } from "../../api";

/* ---------- Shared layout pieces ---------- */

// Full screen on phones, phone frame only on sm and up
function PhoneFrame({ children }) {
  return (
    <div className="min-h-[100dvh] bg-[#E5E7EB] flex justify-center items-center sm:py-6 sm:px-3">
      <div className="relative w-full h-[100dvh] sm:w-[390px] sm:h-[844px] bg-[#F8FAF8] sm:rounded-[40px] sm:border-[5px] sm:border-white sm:shadow-2xl overflow-hidden flex flex-col">
        {children}

        {/* Fake home bar, desktop frame only */}
        <div className="hidden sm:flex absolute bottom-3 left-0 right-0 justify-center pointer-events-none z-30">
          <div className="w-[70px] h-[5px] rounded-full bg-gray-800 opacity-70" />
        </div>
      </div>
    </div>
  );
}

function PageHeader({ title, onBack }) {
  return (
    <header className="relative h-[82px] bg-[#0B5D2A] flex items-center justify-center shrink-0 px-6">
      <button
        type="button"
        onClick={onBack}
        aria-label="Back"
        className="absolute left-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 flex items-center justify-center text-white text-[20px] hover:bg-white/20 active:scale-95 transition"
      >
        <FaArrowLeft />
      </button>
      <h1 className="text-white text-[21px] font-extrabold">{title}</h1>
    </header>
  );
}

export default function Appointment() {
  const navigate = useNavigate();

  const [verificationLoading, setVerificationLoading] = useState(true);
  const [userStatus, setUserStatus] = useState({
    is_verified: 0,
    verification_status: "Pending Verification",
  });

  const [formData, setFormData] = useState({
    full_name: "",
    age: "",
    contact_number: "",
    reason: "",
    symptoms: "",
    appointment_date: "",
    preferred_time: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Fetch verification status on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await apiFetch("/api/users/me");
        setUserStatus({
          is_verified: data.is_verified || 0,
          verification_status: data.verification_status || "Pending Verification",
        });
      } catch (err) {
        console.error("Failed to load verification status:", err);
      } finally {
        setVerificationLoading(false);
      }
    };
    fetchUser();
  }, []);

  const isVerified =
    userStatus.is_verified === 1 &&
    userStatus.verification_status === "Verified Resident";

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "contact_number") {
      let digitsOnly = value.replace(/\D/g, "");
      if (digitsOnly.length >= 1 && digitsOnly[0] !== "0") return;
      if (digitsOnly.length >= 2 && digitsOnly[1] !== "9") return;
      digitsOnly = digitsOnly.slice(0, 11);
      setFormData((prev) => ({ ...prev, contact_number: digitsOnly }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!isVerified) {
      setError("Your account is pending verification. Please wait for approval.");
      return;
    }

    const required = [
      "full_name",
      "age",
      "contact_number",
      "reason",
      "appointment_date",
      "preferred_time",
    ];
    for (const field of required) {
      if (!formData[field]) {
        setError(`Please fill in all required fields.`);
        return;
      }
    }

    if (parseInt(formData.age) < 0 || parseInt(formData.age) > 120) {
      setError("Please enter a valid age.");
      return;
    }

    const mobileRegex = /^(09)\d{9}$/;
    if (!mobileRegex.test(formData.contact_number)) {
      setError(
        "Contact number must be 11 digits starting with 09 (e.g., 09123456789)."
      );
      return;
    }

    setLoading(true);

    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (!user || !user.user_id) {
        setError("You must be logged in to request an appointment.");
        navigate("/resident-login");
        return;
      }

      await apiFetch("/api/appointments", {
        method: "POST",
        body: JSON.stringify({
          user_id: user.user_id,
          full_name: formData.full_name,
          age: parseInt(formData.age),
          contact_number: formData.contact_number,
          reason: formData.reason,
          symptoms: formData.symptoms || null,
          appointment_date: formData.appointment_date,
          preferred_time: formData.preferred_time,
        }),
      });

      setSuccess(true);
      setFormData({
        full_name: "",
        age: "",
        contact_number: "",
        reason: "",
        symptoms: "",
        appointment_date: "",
        preferred_time: "",
      });

      setTimeout(() => navigate("/health-center"), 2000);
    } catch (err) {
      console.error("Error submitting appointment:", err);
      setError(err.message || "Failed to submit appointment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fieldClass =
    "block w-full min-w-0 h-[52px] border border-[#C8DCC3] rounded-xl text-[16px] text-gray-700 bg-white outline-none focus:border-[#0B5D2A] focus:ring-2 focus:ring-[#0B5D2A]/10";
  const fieldStyle = { padding: "0 16px", boxSizing: "border-box" };
  const labelClass = "block text-[14px] font-bold text-gray-800";

  // Loading state
  if (verificationLoading) {
    return (
      <div className="min-h-[100dvh] bg-[#E5E7EB] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <FaSpinner className="animate-spin text-[#0B5D2A]" size={40} />
          <p className="text-[#0B5D2A] font-bold">Checking account status...</p>
        </div>
      </div>
    );
  }

  // Block pending/rejected residents
  if (!isVerified) {
    return (
      <PhoneFrame>
        <PageHeader title="Appointment" onBack={() => navigate("/health-center")} />

        <main
          className="flex-1 overflow-y-auto no-scrollbar flex flex-col items-center justify-center gap-6 text-center"
          style={{ padding: "24px 32px" }}
        >
          <div className="w-[90px] h-[90px] rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
            <FaExclamationTriangle size={40} className="text-yellow-600" />
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-[20px] font-extrabold text-gray-900">
              Verification Required
            </h2>

            <p className="text-[13px] text-gray-600 leading-6">
              Your account is still pending verification. Please wait for the
              barangay to verify your account before requesting an appointment.
            </p>
          </div>

          <div className="w-full flex flex-col gap-3">
            <button
              onClick={() => navigate("/qr-code")}
              className="w-full h-[52px] bg-[#0B5D2A] text-white rounded-2xl font-extrabold text-[14px] shadow-md hover:bg-[#084A21] active:scale-[0.98] transition"
            >
              View My QR Code
            </button>

            <button
              onClick={() => navigate("/health-center")}
              className="w-full h-[52px] border border-[#0B5D2A] text-[#0B5D2A] rounded-2xl font-extrabold text-[14px] hover:bg-[#F0F8ED] active:scale-[0.98] transition"
            >
              Back to Health Center
            </button>
          </div>
        </main>
      </PhoneFrame>
    );
  }

  // Normal form
  return (
    <PhoneFrame>
      <PageHeader title="Appointment" onBack={() => navigate("/health-center")} />

      <main
        className="flex-1 overflow-y-auto no-scrollbar"
        style={{ padding: "24px 20px 40px" }}
      >
        <div
          className="bg-white rounded-2xl border border-[#D5E4D1] shadow-sm flex flex-col gap-5"
          style={{ padding: "24px 20px", boxSizing: "border-box" }}
        >
          {/* ICON */}
          <div className="flex justify-center">
            <div className="w-[76px] h-[76px] rounded-full bg-[#E8F5E3] flex items-center justify-center">
              <FaCalendarCheck size={40} className="text-[#0B5D2A]" />
            </div>
          </div>

          {/* MESSAGES */}
          {success && (
            <div className="p-4 bg-green-100 border border-green-400 rounded-xl flex items-center gap-3 text-green-700 text-sm">
              <FaCheckCircle size={20} className="shrink-0" />
              <span>Appointment requested successfully!</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-100 border border-red-400 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* FORM */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="full_name" className={labelClass}>
                Full Name
              </label>
              <input
                id="full_name"
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                placeholder="Enter your full name"
                className={fieldClass}
                style={fieldStyle}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="age" className={labelClass}>
                Age
              </label>
              <input
                id="age"
                type="number"
                name="age"
                value={formData.age}
                onChange={handleChange}
                placeholder="Enter your age"
                className={fieldClass}
                style={fieldStyle}
                required
                min="0"
                max="120"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="contact_number" className={labelClass}>
                Contact Number
              </label>
              <input
                id="contact_number"
                type="tel"
                name="contact_number"
                value={formData.contact_number}
                onChange={handleChange}
                placeholder="Enter Phone Number"
                maxLength={11}
                inputMode="numeric"
                pattern="[0-9]*"
                className={fieldClass}
                style={fieldStyle}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="reason" className={labelClass}>
                Reason for Check-up
              </label>
              <select
                id="reason"
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                className={fieldClass}
                style={fieldStyle}
                required
              >
                <option value="">Select a Service</option>
                <option value="General Consultation">General Consultation</option>
                <option value="Fever / Cough / Flu">Fever / Cough / Flu</option>
                <option value="Vaccination">Vaccination</option>
                <option value="Blood Pressure Check">Blood Pressure Check</option>
                <option value="Dental Check-up">Dental Check-up</option>
                <option value="Maternal Care">Maternal Care</option>
                <option value="Child Immunization">Child Immunization</option>
                <option value="Prenatal Check-up">Prenatal Check-up</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="symptoms" className={labelClass}>
                Symptoms / Concern
              </label>
              <textarea
                id="symptoms"
                name="symptoms"
                value={formData.symptoms}
                onChange={handleChange}
                rows="3"
                placeholder="Describe your symptoms or concern..."
                className="block w-full border border-[#C8DCC3] rounded-xl text-[16px] text-gray-700 resize-none outline-none focus:border-[#0B5D2A] focus:ring-2 focus:ring-[#0B5D2A]/10"
                style={{ padding: "14px 16px", boxSizing: "border-box" }}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="appointment_date" className={labelClass}>
                Appointment Date
              </label>
              <input
                id="appointment_date"
                type="date"
                name="appointment_date"
                value={formData.appointment_date}
                onChange={handleChange}
                className={fieldClass}
                style={fieldStyle}
                required
                min={new Date().toISOString().split("T")[0]}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="preferred_time" className={labelClass}>
                Preferred Time
              </label>
              <input
                id="preferred_time"
                type="time"
                name="preferred_time"
                value={formData.preferred_time}
                onChange={handleChange}
                className={fieldClass}
                style={fieldStyle}
                required
              />
            </div>

            {/* SUBMIT */}
            <div className="flex flex-col gap-4 pt-2">
              <button
                type="submit"
                disabled={loading || success}
                className="w-full h-[54px] rounded-2xl bg-[#0B5D2A] text-white font-extrabold text-[15px] flex items-center justify-center gap-2 shadow-md hover:bg-[#084A21] active:scale-[0.98] transition disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    Submitting...
                  </>
                ) : success ? (
                  "Submitted!"
                ) : (
                  "Request Appointment"
                )}
              </button>

              {success && (
                <p className="text-center text-sm text-green-600">
                  Redirecting to Health Center...
                </p>
              )}
            </div>
          </form>
        </div>
      </main>
    </PhoneFrame>
  );
}