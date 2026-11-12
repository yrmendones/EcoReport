import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaCalendarCheck,
  FaCalendarAlt,
  FaChevronLeft,
  FaChevronRight,
  FaChevronDown,
  FaSpinner,
  FaCheckCircle,
  FaExclamationTriangle,
} from "react-icons/fa";
import { apiFetch } from "../../api";

/* ---------- Barangay schedule (edit these) ---------- */

const CLOSED_WEEKDAYS = [0]; // 0 = Sunday, 6 = Saturday
const CLOSED_DATES = []; // Holidays, e.g. ["2026-12-25", "2026-12-30"]

const WEEKDAY_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const WEEKDAY_FULL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const REASONS = [
  "General Consultation",
  "Fever / Cough / Flu",
  "Vaccination",
  "Blood Pressure Check",
  "Dental Check-up",
  "Maternal Care",
  "Child Immunization",
  "Prenatal Check-up",
  "Other",
];

// Local date -> "YYYY-MM-DD" (avoids timezone shifts)
const toISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

const isClosedDay = (d) =>
  CLOSED_WEEKDAYS.includes(d.getDay()) || CLOSED_DATES.includes(toISO(d));

const closedDaysText = CLOSED_WEEKDAYS.map((i) => `${WEEKDAY_FULL[i]}s`).join(
  " and "
);

const formatLongDate = (iso) =>
  iso
    ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

// "14:30" -> "2:30 PM"
const formatTime12 = (value) => {
  if (!value) return "";
  const [hh, mm] = value.split(":");
  const hour = parseInt(hh, 10);
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${mm} ${hour >= 12 ? "PM" : "AM"}`;
};

const emptyForm = {
  full_name: "",
  age: "",
  contact_number: "",
  reason: "",
  symptoms: "",
  appointment_date: "",
  preferred_time: "",
};

/* ---------- Shared layout pieces ---------- */

// Full screen on phones, phone frame only on sm and up
function PhoneFrame({ children }) {
  return (
    <div className="min-h-[100dvh] bg-[#E5E7EB] flex justify-center items-center sm:py-6 sm:px-3">
      <div className="relative w-full h-[100dvh] sm:w-[390px] sm:h-[844px] bg-[#F8FAF8] sm:rounded-[40px] sm:border-[5px] sm:border-white sm:shadow-2xl overflow-hidden flex flex-col">
        {children}
      </div>
    </div>
  );
}

function PageHeader({ title, onBack }) {
  return (
    <header
      className="relative h-[82px] bg-[#0B5D2A] flex items-center justify-center shrink-0"
      style={{ padding: "0 64px" }}
    >
      <button
        type="button"
        onClick={onBack}
        aria-label="Back"
        className="absolute left-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center text-white text-[20px] bg-white/10 hover:bg-white/20 active:scale-95 transition"
      >
        <FaArrowLeft />
      </button>
      <h1 className="text-white text-[22px] font-extrabold text-center">{title}</h1>
    </header>
  );
}

/* ---------- Date picker with available / closed days ---------- */

function DatePicker({ value, onChange, disabled }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = toISO(today);

  const initial = value ? new Date(`${value}T00:00:00`) : today;
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  const isCurrentMonth =
    viewYear === today.getFullYear() && viewMonth === today.getMonth();

  const goPrev = () => {
    if (isCurrentMonth) return;
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const goNext = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(new Date(viewYear, viewMonth, day));
  }

  const selectedLabel = formatLongDate(value);

  return (
    <div className="flex flex-col" style={{ gap: "12px" }}>
      {/* Field that opens the calendar */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={disabled}
        aria-expanded={open}
        className="block w-full min-w-0 min-h-[52px] border border-[#C8DCC3] rounded-2xl bg-white text-left outline-none focus:border-[#0B5D2A] focus:ring-2 focus:ring-[#0B5D2A]/10 disabled:opacity-60"
        style={{ padding: "8px 16px", boxSizing: "border-box" }}
      >
        <span className="flex items-center justify-between" style={{ gap: "12px" }}>
          <span
            className={`min-w-0 text-[15px] leading-5 break-words ${
              value ? "text-gray-800" : "text-gray-400"
            }`}
          >
            {selectedLabel || "Select a date"}
          </span>
          <FaCalendarAlt className="text-[#0B5D2A] shrink-0" size={18} />
        </span>
      </button>

      {open && (
        <div
          className="border border-[#D5E4D1] rounded-2xl bg-[#FBFDFB] flex flex-col"
          style={{ padding: "12px", gap: "12px" }}
        >
          {/* Month navigation */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={goPrev}
              disabled={isCurrentMonth}
              aria-label="Previous month"
              className="w-11 h-11 rounded-full flex items-center justify-center text-[#0B5D2A] hover:bg-[#E8F5E3] active:scale-95 transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <FaChevronLeft />
            </button>
            <p className="text-[16px] font-extrabold text-[#0B5D2A]">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </p>
            <button
              type="button"
              onClick={goNext}
              aria-label="Next month"
              className="w-11 h-11 rounded-full flex items-center justify-center text-[#0B5D2A] hover:bg-[#E8F5E3] active:scale-95 transition"
            >
              <FaChevronRight />
            </button>
          </div>

          {/* Weekday names */}
          <div className="grid grid-cols-7 text-center" style={{ gap: "4px" }}>
            {WEEKDAY_SHORT.map((label, i) => (
              <p
                key={label}
                className={`text-[12px] font-bold ${
                  CLOSED_WEEKDAYS.includes(i) ? "text-red-400" : "text-gray-500"
                }`}
              >
                {label}
              </p>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7" style={{ gap: "4px" }}>
            {cells.map((cellDate, index) => {
              if (!cellDate) return <div key={`empty-${index}`} />;

              const iso = toISO(cellDate);
              const isPast = iso < todayISO;
              const closed = isClosedDay(cellDate);
              const isSelected = iso === value;
              const isToday = iso === todayISO;
              const unavailable = isPast || closed;

              let stateClass =
                "bg-[#E8F5E3] text-[#0B5D2A] border border-[#B9DDB0] hover:bg-[#D5ECCB] active:scale-95";
              if (isPast) {
                stateClass = "bg-transparent text-gray-300 cursor-not-allowed";
              } else if (closed) {
                stateClass =
                  "bg-gray-100 text-gray-400 line-through cursor-not-allowed";
              }
              if (isSelected) {
                stateClass = "bg-[#0B5D2A] text-white border border-[#0B5D2A]";
              }

              return (
                <button
                  key={iso}
                  type="button"
                  disabled={unavailable}
                  onClick={() => {
                    onChange(iso);
                    setOpen(false);
                  }}
                  aria-label={`${cellDate.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}${closed ? ", closed" : isPast ? ", unavailable" : ", available"}`}
                  className={`h-[42px] rounded-lg text-[15px] font-bold flex items-center justify-center transition ${stateClass} ${
                    isToday && !isSelected ? "ring-2 ring-[#0B5D2A]/50" : ""
                  }`}
                >
                  {cellDate.getDate()}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div
            className="flex flex-wrap"
            style={{ columnGap: "16px", rowGap: "8px", paddingTop: "4px" }}
          >
            <div className="flex items-center" style={{ gap: "8px" }}>
              <span className="w-4 h-4 rounded bg-[#E8F5E3] border border-[#B9DDB0]" />
              <span className="text-[13px] text-gray-600">Available</span>
            </div>
            <div className="flex items-center" style={{ gap: "8px" }}>
              <span className="w-4 h-4 rounded bg-gray-100 border border-gray-200" />
              <span className="text-[13px] text-gray-600">Closed</span>
            </div>
            <div className="flex items-center" style={{ gap: "8px" }}>
              <span className="w-4 h-4 rounded bg-[#0B5D2A]" />
              <span className="text-[13px] text-gray-600">Selected</span>
            </div>
          </div>

          <p className="text-[13px] leading-5 text-gray-500">
            The barangay is closed on {closedDaysText}
            {CLOSED_DATES.length > 0 ? " and on holidays" : ""}. Closed days
            cannot be selected.
          </p>
        </div>
      )}
    </div>
  );
}

export default function Appointment() {
  const navigate = useNavigate();

  const [verificationLoading, setVerificationLoading] = useState(true);
  const [userStatus, setUserStatus] = useState({
    is_verified: 0,
    verification_status: "Pending Verification",
  });

  const [formData, setFormData] = useState(emptyForm);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Holds the summary of the submitted appointment (null = form is shown)
  const [submitted, setSubmitted] = useState(null);

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
        setError("Please fill in all required fields.");
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

    if (isClosedDay(new Date(`${formData.appointment_date}T00:00:00`))) {
      setError("The barangay is closed on the selected date. Please choose another day.");
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
          full_name: formData.full_name,
          age: parseInt(formData.age),
          contact_number: formData.contact_number,
          reason: formData.reason,
          symptoms: formData.symptoms || null,
          appointment_date: formData.appointment_date,
          preferred_time: formData.preferred_time,
        }),
      });

      // Save a summary for the success screen, then clear the form
      setSubmitted({
        date: formData.appointment_date,
        time: formData.preferred_time,
        reason: formData.reason,
        name: formData.full_name,
      });
      setFormData(emptyForm);
    } catch (err) {
      console.error("Error submitting appointment:", err);
      setError(err.message || "Failed to submit appointment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fieldClass =
    "block w-full min-w-0 min-h-[52px] border border-[#C8DCC3] rounded-2xl text-[16px] text-gray-700 bg-white outline-none focus:border-[#0B5D2A] focus:ring-2 focus:ring-[#0B5D2A]/10";
  const fieldStyle = { padding: "0 16px", boxSizing: "border-box" };
  const labelClass = "block text-[14px] font-extrabold text-gray-900";

  const mainStyle = {
    padding: "28px 24px max(48px, calc(env(safe-area-inset-bottom) + 32px))",
  };

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
          className="flex-1 overflow-y-auto no-scrollbar flex flex-col items-center justify-center text-center"
          style={{ ...mainStyle, gap: "24px" }}
        >
          <div className="w-[90px] h-[90px] rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
            <FaExclamationTriangle size={40} className="text-yellow-600" />
          </div>

          <div className="flex flex-col shrink-0" style={{ gap: "8px" }}>
            <h2 className="text-[22px] font-extrabold text-gray-900 leading-tight">
              Verification Required
            </h2>

            <p className="text-[14px] text-gray-600 leading-6">
              Your account is still pending verification. Please wait for the
              barangay to verify your account before requesting an appointment.
            </p>
          </div>

          <div className="w-full flex flex-col shrink-0" style={{ gap: "16px" }}>
            <button
              type="button"
              onClick={() => navigate("/qr-code")}
              className="btn-primary w-full min-h-[54px] rounded-2xl font-extrabold text-[16px] shadow-md transition"
            >
              View My QR Code
            </button>

            <button
              type="button"
              onClick={() => navigate("/health-center")}
              className="btn-secondary w-full min-h-[54px] rounded-2xl font-extrabold text-[16px] shadow-sm transition"
            >
              Back to Health Center
            </button>
          </div>
        </main>
      </PhoneFrame>
    );
  }

  // Success screen
  if (submitted) {
    return (
      <PhoneFrame>
        <PageHeader title="Appointment" onBack={() => navigate("/health-center")} />

        <main
          className="flex-1 overflow-y-auto no-scrollbar flex flex-col items-center text-center"
          style={{ ...mainStyle, gap: "24px" }}
        >
          <div className="w-[100px] h-[100px] rounded-full bg-[#E8F5E3] flex items-center justify-center shrink-0">
            <FaCheckCircle size={72} className="text-[#0B5D2A]" />
          </div>

          <div className="flex flex-col shrink-0" style={{ gap: "8px" }}>
            <h2 className="text-[26px] font-extrabold text-[#0B5D2A] leading-tight">
              Appointment Requested!
            </h2>
            <p className="text-[14px] text-gray-600 leading-6">
              Your request was sent to the barangay health center. They will
              confirm your schedule.
            </p>
          </div>

          {/* Summary card: never shrinks, so all rows stay visible */}
          <div className="w-full min-w-0 box-border shrink-0 bg-white rounded-2xl border border-[#D5E4D1] shadow-sm text-left flex flex-col overflow-hidden">
            <SummaryRow label="Name" value={submitted.name} />
            <SummaryRow label="Date" value={formatLongDate(submitted.date)} />
            <SummaryRow label="Time" value={formatTime12(submitted.time)} />
            <SummaryRow label="Reason" value={submitted.reason} last />
          </div>

          <div className="w-full flex flex-col shrink-0" style={{ gap: "16px" }}>
            <button
              type="button"
              onClick={() => navigate("/health-center")}
              className="btn-primary w-full min-h-[54px] rounded-2xl font-extrabold text-[16px] shadow-md transition"
            >
              Back to Health Center
            </button>

            <button
              type="button"
              onClick={() => setSubmitted(null)}
              className="btn-secondary w-full min-h-[54px] rounded-2xl font-extrabold text-[16px] shadow-sm transition"
            >
              Make Another Appointment
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

      <main className="flex-1 overflow-y-auto no-scrollbar" style={mainStyle}>
        <div
          className="bg-white rounded-2xl border border-[#D5E4D1] shadow-sm flex flex-col"
          style={{ padding: "20px", gap: "24px", boxSizing: "border-box" }}
        >
          {/* ICON */}
          <div className="flex flex-col items-center text-center" style={{ gap: "12px" }}>
            <div className="w-[78px] h-[78px] rounded-full bg-[#E8F5E3] flex items-center justify-center">
              <FaCalendarCheck size={38} className="text-[#0B5D2A]" />
            </div>
            <p className="text-[14px] text-gray-600 leading-6">
              Fields marked with <span className="text-red-500 font-bold">*</span>{" "}
              are required.
            </p>
          </div>

          {/* FORM */}
          <form
            onSubmit={handleSubmit}
            className="flex flex-col"
            style={{ gap: "24px" }}
          >
            <div className="flex flex-col" style={{ gap: "8px" }}>
              <label htmlFor="full_name" className={labelClass}>
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="full_name"
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                placeholder="Enter your full name"
                autoComplete="name"
                className={fieldClass}
                style={fieldStyle}
                required
              />
            </div>

            <div className="flex flex-col" style={{ gap: "8px" }}>
              <label htmlFor="age" className={labelClass}>
                Age <span className="text-red-500">*</span>
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

            <div className="flex flex-col" style={{ gap: "8px" }}>
              <label htmlFor="contact_number" className={labelClass}>
                Contact Number <span className="text-red-500">*</span>
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

            <div className="flex flex-col" style={{ gap: "8px" }}>
              <label htmlFor="reason" className={labelClass}>
                Reason for Check-up <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  id="reason"
                  name="reason"
                  value={formData.reason}
                  onChange={handleChange}
                  className={`${fieldClass} appearance-none ${
                    formData.reason ? "text-gray-800" : "text-gray-400"
                  }`}
                  style={{ ...fieldStyle, padding: "0 48px 0 16px" }}
                  required
                >
                  <option value="">Select a Service</option>
                  {REASONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                <FaChevronDown
                  size={14}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#0B5D2A] pointer-events-none"
                />
              </div>
            </div>

            <div className="flex flex-col" style={{ gap: "8px" }}>
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
                className="block w-full border border-[#C8DCC3] rounded-2xl text-[16px] text-gray-700 leading-6 resize-none outline-none focus:border-[#0B5D2A] focus:ring-2 focus:ring-[#0B5D2A]/10"
                style={{ padding: "14px 16px", boxSizing: "border-box" }}
              />
            </div>

            <div className="flex flex-col" style={{ gap: "8px" }}>
              <p className={labelClass}>
                Appointment Date <span className="text-red-500">*</span>
              </p>
              <DatePicker
                value={formData.appointment_date}
                onChange={(iso) =>
                  setFormData((prev) => ({ ...prev, appointment_date: iso }))
                }
                disabled={loading}
              />
            </div>

            <div className="flex flex-col" style={{ gap: "8px" }}>
              <label htmlFor="preferred_time" className={labelClass}>
                Preferred Time <span className="text-red-500">*</span>
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
            <div className="flex flex-col" style={{ gap: "16px" }}>
              {/* Error is shown right above the button so it is always seen */}
              {error && (
                <div
                  role="alert"
                  className="bg-red-100 border border-red-400 rounded-xl text-red-700 text-sm leading-6 break-words"
                  style={{ padding: "14px 16px" }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-success w-full min-h-[54px] rounded-2xl font-extrabold text-[16px] flex items-center justify-center shadow-md transition disabled:opacity-50"
                style={{ gap: "12px" }}
              >
                {loading ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Appointment"
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </PhoneFrame>
  );
}

/* ---------- Success summary row ---------- */
function SummaryRow({ label, value, last = false }) {
  return (
    <div
      className={`min-w-0 flex flex-col ${!last ? "border-b border-gray-200" : ""}`}
      style={{ padding: "20px", gap: "8px" }}
    >
      <p className="text-[13px] font-extrabold text-gray-500 uppercase tracking-wide leading-5">
        {label}
      </p>
      <p className="text-[16px] leading-6 font-extrabold text-gray-900 break-words [overflow-wrap:anywhere]">
        {value}
      </p>
    </div>
  );
}