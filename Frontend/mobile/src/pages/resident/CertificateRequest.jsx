import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaFileAlt,
  FaCheckCircle,
  FaSpinner,
  FaExclamationTriangle,
  FaCalendarAlt,
  FaChevronLeft,
  FaChevronRight,
  FaChevronDown,
  FaMoneyBillWave,
} from "react-icons/fa";
import { apiFetch } from "../../api";

/* ---------- Certificates and fees ---------- */
const CERTIFICATES = [
  { name: "Barangay Clearance", fee: null },
  { name: "Barangay ID", fee: 100 },
  { name: "Cedula", fee: 20 },
  { name: "School Requirement", fee: 100 },
  { name: "Proof of Residency", fee: 100 },
  { name: "Senior Citizen ID Requirement", fee: 100 },
];

const formatFee = (fee) => `₱${Number(fee).toFixed(2)}`;

const formatLongDate = (iso) =>
  iso
    ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

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

const toISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

const isClosedDay = (d) =>
  CLOSED_WEEKDAYS.includes(d.getDay()) || CLOSED_DATES.includes(toISO(d));

const closedDaysText = CLOSED_WEEKDAYS.map((i) => `${WEEKDAY_FULL[i]}s`).join(
  " and "
);

/* ---------- Shared layout pieces ---------- */

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

  const selectedLabel = value
    ? new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  return (
    <div className="flex flex-col" style={{ gap: "12px" }}>
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

export default function CertificateRequest() {
  const navigate = useNavigate();

  const [verificationLoading, setVerificationLoading] = useState(true);
  const [userStatus, setUserStatus] = useState({
    is_verified: 0,
    verification_status: "Pending Verification",
  });

  const [certificate, setCertificate] = useState("");
  const [purpose, setPurpose] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Snapshot of the submitted request — drives the success screen.
  // null = form is shown; object = success screen.
  const [submitted, setSubmitted] = useState(null);

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

  const selectedCertificate = CERTIFICATES.find((c) => c.name === certificate);

  const handleSubmit = async () => {
    if (!certificate || !purpose || !date) {
      alert("Please complete all required fields.");
      return;
    }

    if (isClosedDay(new Date(`${date}T00:00:00`))) {
      setError("The barangay is closed on the selected date. Please choose another day.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (!user || !user.user_id) {
        alert("You must be logged in to request a certificate.");
        navigate("/resident-login");
        return;
      }

      const data = await apiFetch("/api/certificates", {
        method: "POST",
        body: JSON.stringify({
          certificate_type: certificate,
          purpose: purpose,
          preferred_release_date: date,
          fee: selectedCertificate?.fee ?? null,
          notes: notes || null,
        }),
      });

      // Snapshot the submitted values BEFORE clearing the form so the
      // success screen has them. The form is cleared right after, so
      // "Make Another Certificate Request" opens a fresh, empty form.
      setSubmitted({
        reference: `ER-${new Date().getFullYear()}-${String(
          data.certificate_request_id || 0
        ).padStart(4, "0")}`,
        certificate: certificate,
        purpose: purpose,
        date: date,
        notes: notes,
        fee: selectedCertificate?.fee ?? null,
      });

      setCertificate("");
      setPurpose("");
      setDate("");
      setNotes("");
    } catch (err) {
      console.error("Error submitting certificate request:", err);
      setError(err.message || "Failed to submit request. Please try again.");
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

  if (!isVerified) {
    return (
      <PhoneFrame>
        <PageHeader
          title="Certificate Request"
          onBack={() => navigate("/resident-dashboard")}
        />

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
              barangay to verify your account before requesting certificates.
            </p>
          </div>

          <div className="w-full flex flex-col shrink-0" style={{ gap: "16px" }}>
            <button
              type="button"
              onClick={() => navigate("/qr-code")}
              className="w-full min-h-[54px] bg-[#0B5D2A] text-white rounded-2xl font-extrabold text-[16px] shadow-md hover:bg-[#084A21] active:scale-[0.98] transition"
            >
              View My QR Code
            </button>
            <button
              type="button"
              onClick={() => navigate("/resident-dashboard")}
              className="w-full min-h-[54px] border border-[#0B5D2A] text-[#0B5D2A] rounded-2xl font-extrabold text-[16px] hover:bg-[#F0F8ED] active:scale-[0.98] transition"
            >
              Back to Dashboard
            </button>
          </div>
        </main>
      </PhoneFrame>
    );
  }

  // ───────── SUCCESS SCREEN ─────────
  // Shown after a successful submission. Mirrors the Appointment success
  // screen — same phone frame, summary card, and two-action layout.
  if (submitted) {
    return (
      <PhoneFrame>
        <PageHeader
          title="Certificate Request"
          onBack={() => navigate("/resident-dashboard")}
        />

        <main
          className="flex-1 overflow-y-auto no-scrollbar flex flex-col items-center text-center"
          style={{ ...mainStyle, gap: "24px" }}
        >
          <div className="w-[100px] h-[100px] rounded-full bg-[#E8F5E3] flex items-center justify-center shrink-0">
            <FaCheckCircle size={72} className="text-[#0B5D2A]" />
          </div>

          <div className="flex flex-col shrink-0" style={{ gap: "8px" }}>
            <h2 className="text-[26px] font-extrabold text-[#0B5D2A] leading-tight">
              Certificate Requested!
            </h2>
            <p className="text-[14px] text-gray-600 leading-6">
              Your request was sent to the barangay. Wait for approval and
              we'll notify you once it's ready for pick up.
            </p>
          </div>

          {/* Summary card — never shrinks so all rows stay visible */}
          <div className="w-full min-w-0 box-border shrink-0 bg-white rounded-2xl border border-[#D5E4D1] shadow-sm text-left flex flex-col overflow-hidden">
            <SummaryRow label="Reference" value={submitted.reference} />
            <SummaryRow label="Certificate Type" value={submitted.certificate} />
            <SummaryRow label="Purpose" value={submitted.purpose} />
            <SummaryRow
              label="Preferred Release Date"
              value={formatLongDate(submitted.date)}
            />
            <SummaryRow
              label="Fee"
              value={
                submitted.fee == null
                  ? "Ask the barangay"
                  : formatFee(submitted.fee)
              }
              last={!submitted.notes}
            />
            {submitted.notes && (
              <SummaryRow label="Notes" value={submitted.notes} last />
            )}
          </div>

          <div className="w-full flex flex-col shrink-0" style={{ gap: "16px" }}>
            <button
              type="button"
              onClick={() => navigate("/resident-dashboard")}
              className="w-full min-h-[54px] bg-[#0B5D2A] text-white rounded-2xl font-extrabold text-[16px] shadow-md hover:bg-[#084A21] active:scale-[0.98] transition"
            >
              Back to Dashboard
            </button>
            <button
              type="button"
              onClick={() => setSubmitted(null)}
              className="w-full min-h-[54px] border border-[#0B5D2A] text-[#0B5D2A] rounded-2xl font-extrabold text-[16px] hover:bg-[#F0F8ED] active:scale-[0.98] transition"
            >
              Make Another Certificate Request
            </button>
          </div>
        </main>
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame>
      <PageHeader
        title="Certificate Request"
        onBack={() => navigate("/resident-dashboard")}
      />

      <main className="flex-1 overflow-y-auto no-scrollbar" style={mainStyle}>
        <div
          className="bg-white rounded-2xl border border-[#D5E4D1] shadow-sm flex flex-col"
          style={{ padding: "20px", gap: "24px", boxSizing: "border-box" }}
        >
          <div className="flex flex-col items-center text-center" style={{ gap: "16px" }}>
            <div className="w-[78px] h-[78px] rounded-full bg-[#E8F5E3] flex items-center justify-center">
              <FaFileAlt size={38} className="text-[#0B5D2A]" />
            </div>
            <div className="flex flex-col" style={{ gap: "8px" }}>
              <h2 className="text-[22px] font-extrabold text-[#0B5D2A] leading-tight">
                Request Certificate
              </h2>
              <p className="text-[14px] text-gray-600 leading-6">
                Fill out the form below to request a certificate. Fields marked
                with <span className="text-red-500 font-bold">*</span> are
                required.
              </p>
            </div>
          </div>

          {error && (
            <div
              className="bg-red-100 border border-red-400 rounded-xl text-red-700 text-sm leading-6 break-words"
              style={{ padding: "14px 16px" }}
            >
              {error}
            </div>
          )}

          {/* CERTIFICATE TYPE */}
          <div className="flex flex-col" style={{ gap: "8px" }}>
            <label htmlFor="certificate" className={labelClass}>
              Certificate Type <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                id="certificate"
                value={certificate}
                onChange={(e) => setCertificate(e.target.value)}
                className={`${fieldClass} appearance-none ${
                  certificate ? "text-gray-800" : "text-gray-400"
                }`}
                style={{ ...fieldStyle, padding: "0 48px 0 16px" }}
                disabled={loading}
              >
                <option value="">Select Certificate</option>
                {CERTIFICATES.map((item) => (
                  <option key={item.name} value={item.name}>
                    {item.fee == null
                      ? item.name
                      : `${item.name} - ${formatFee(item.fee)}`}
                  </option>
                ))}
              </select>
              <FaChevronDown
                size={14}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#0B5D2A] pointer-events-none"
              />
            </div>

            {selectedCertificate && (
              <div
                className="bg-[#EFFAF2] border border-[#BFE3C8] rounded-2xl flex items-center justify-between"
                style={{ padding: "14px 16px", gap: "12px", marginTop: "4px" }}
              >
                <div className="flex items-center min-w-0" style={{ gap: "12px" }}>
                  <FaMoneyBillWave size={20} className="text-[#0B5D2A] shrink-0" />
                  <p className="text-[14px] font-extrabold text-gray-900 leading-5">
                    Fee
                  </p>
                </div>
                <p className="text-[16px] font-extrabold text-[#0B5D2A] leading-6 text-right">
                  {selectedCertificate.fee == null
                    ? "Ask the barangay"
                    : formatFee(selectedCertificate.fee)}
                </p>
              </div>
            )}
          </div>

          {/* PURPOSE */}
          <div className="flex flex-col" style={{ gap: "8px" }}>
            <label htmlFor="purpose" className={labelClass}>
              Purpose <span className="text-red-500">*</span>
            </label>
            <input
              id="purpose"
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Enter purpose"
              className={fieldClass}
              style={fieldStyle}
              disabled={loading}
            />
          </div>

          {/* RELEASE DATE */}
          <div className="flex flex-col" style={{ gap: "8px" }}>
            <p className={labelClass}>
              Preferred Release Date <span className="text-red-500">*</span>
            </p>
            <DatePicker value={date} onChange={setDate} disabled={loading} />
          </div>

          {/* NOTES */}
          <div className="flex flex-col" style={{ gap: "8px" }}>
            <label htmlFor="notes" className={labelClass}>
              Additional Notes
            </label>
            <textarea
              id="notes"
              rows="4"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional..."
              className="block w-full border border-[#C8DCC3] rounded-2xl text-[16px] text-gray-700 leading-6 resize-none outline-none focus:border-[#0B5D2A] focus:ring-2 focus:ring-[#0B5D2A]/10"
              style={{ padding: "14px 16px", boxSizing: "border-box" }}
              disabled={loading}
            />
          </div>

          {/* SUBMIT */}
          <div className="flex flex-col" style={{ gap: "16px" }}>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="w-full min-h-[54px] rounded-2xl bg-[#0B5D2A] text-white font-extrabold text-[16px] flex items-center justify-center shadow-md hover:bg-[#084A21] active:scale-[0.98] transition disabled:opacity-50"
            >
              {loading ? "Submitting..." : "Submit Request"}
            </button>
          </div>
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
        {value || "—"}
      </p>
    </div>
  );
}