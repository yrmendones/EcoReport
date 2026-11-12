import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaEye,
  FaEyeSlash,
  FaUpload,
  FaCheck,
  FaCamera,
  FaChevronDown,
  FaUserCheck,
  FaSpinner,
  FaTimes,
  FaExclamationTriangle,
} from "react-icons/fa";
import { PaddleOCR } from "@paddleocr/paddleocr-js";
import * as faceapi from "face-api.js";
import * as ort from "onnxruntime-web";
import { apiFetch, API_BASE_URL } from "../../api";
import {
  DEFAULT_PASSWORD_POLICY,
  fetchPasswordPolicy,
  validatePassword as validatePasswordPolicy,
} from "../../utils/passwordPolicy";

// ============================================================
// ORT CONFIG - must run before PaddleOCR.create()
// ============================================================
try {
  const cores = navigator.hardwareConcurrency || 4;
  ort.env.wasm.numThreads = Math.min(4, cores);
  ort.env.wasm.simd = true;
  ort.env.wasm.wasmPaths =
    "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/";
} catch (e) {
  console.warn("[ORT] Could not configure WASM:", e);
}

// ============================================================
// CONSTANTS
// ============================================================
const REQUIRE_FACE_VERIFICATION = true;

const STREETS = [
  "A. Mariano Street", "Alagao Street", "Apitong Street", "Banaba Street",
  "C. Lorenzo Street", "Camia Street", "Capitan E. Alvero Street",
  "Capitan S. Cortez Street", "Chico Street", "College Street", "Duhat Street",
  "E. Mendoza Street", "F. C. Tuazon Street", "F. Flores Street", "F. T. Angeles Street",
  "G. Bunyi Street", "G. Conching Street", "Lieutenant J. Tiamsic Street",
  "M. Armada Street", "M. Lozada Street", "M. R. Flores Street", "M. Tanangco Street",
  "Talibong Street", "2nd Avenue", "3rd Avenue", "4th Avenue", "8th Avenue",
  "9th Avenue", "10th Avenue", "12th Avenue", "13th Avenue", "14th Avenue",
  "15th Avenue", "16th Avenue", "17th Avenue", "18th Avenue", "19th Avenue",
  "20th Avenue", "21st Avenue", "22nd Avenue", "23rd Avenue", "Masaya Avenue",
  "Ausmolo Compound", "Austria Compound", "Concepcion Compound",
];

// ── Street matching ────────────────────────────────────────
// Restricts the current-address Street field to the STREETS list,
// tolerating common typos: missing periods, extra spaces, partial names.
//
// normalizeStreet("A. Mariano")  → "a mariano"
// normalizeStreet("a mariano st") → "a mariano st"
//
// findMatchingStreet("mariano")  → "A. Mariano Street"
// findMatchingStreet("A Mariano") → "A. Mariano Street"
// findMatchingStreet("zzz")       → null
const STREET_STOPWORDS = new Set([
  "street", "st", "ave", "avenue", "compound", "comp", "the", "and",
]);

function normalizeStreet(str) {
  return String(str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")   // strip diacritics
    .replace(/[^a-z0-9\s]/g, " ")      // periods/commas/punct → space
    .replace(/\s+/g, " ")
    .trim();
}

function findMatchingStreet(typed) {
  const n = normalizeStreet(typed);
  if (!n) return null;

  // Exact match after normalization
  for (const s of STREETS) {
    if (normalizeStreet(s) === n) return s;
  }

  // Typed value is a substring of a street name
  const contains = STREETS.filter((s) => normalizeStreet(s).includes(n));
  if (contains.length === 1) return contains[0];
  if (contains.length > 1) {
    // Ambiguous - prefer the shortest (most specific to the user's intent)
    return [...contains].sort((a, b) => a.length - b.length)[0];
  }

  // Street name is contained in the typed value (user pasted full address)
  for (const s of STREETS) {
    if (n.includes(normalizeStreet(s))) return s;
  }

  // Token overlap - ignore generic words like "street"
  const typedTokens = n.split(" ").filter((t) => t && !STREET_STOPWORDS.has(t));
  if (typedTokens.length === 0) return null;

  let best = null;
  let bestScore = 0;
  for (const s of STREETS) {
    const stTokens = normalizeStreet(s)
      .split(" ")
      .filter((t) => t && !STREET_STOPWORDS.has(t));
    const matched = typedTokens.filter((t) => stTokens.includes(t)).length;
    const score = matched / typedTokens.length;
    if (score > bestScore) {
      bestScore = score;
      best = s;
    }
  }
  if (bestScore >= 0.5) return best;

  return null;
}

const ID_TYPES = [
  "Barangay ID",
  "Driver's License",
  "ePhilID / Digital National ID",
  "National ID (PhilID)",
  "National Police Clearance",
  "PWD ID",
  "Postal ID",
  "Senior Citizen ID",
  "Unified Multi-purpose ID (UMID)",
];

const ID_TYPE_KEYWORDS = {
  "Barangay ID": ["BARANGAY", "BRGY"],
  "Driver's License": ["DRIVER", "LICENSE", "LTO"],
  "ePhilID / Digital National ID": [
    "EPHILID",
    "PHILID",
    "PHILSYS",
    "PHILIPPINE IDENTIFICATION",
    "PAMBANSANG PAGKAKAKILANLAN",
  ],
  "National ID (PhilID)": [
    "PHILID",
    "PHILSYS",
    "PHILIPPINE IDENTIFICATION",
    "NATIONAL ID",
    "PAMBANSANG PAGKAKAKILANLAN",
  ],
  "National Police Clearance": ["POLICE", "CLEARANCE", "PNP"],
  "PWD ID": ["PWD", "PERSON WITH DISABILITY", "DISABILITY"],
  "Postal ID": ["POSTAL", "PHLPOST"],
  "Senior Citizen ID": ["SENIOR", "OSCA"],
  "Unified Multi-purpose ID (UMID)": [
    "UMID",
    "UNIFIED MULTI-PURPOSE",
    "SSS",
    "GSIS",
  ],
};

const PH_MARKERS = [
  "REPUBLIC OF THE PHILIPPINES",
  "REPUBLIKA NG PILIPINAS",
  "PHILIPPINES",
  "PILIPINAS",
  "PAMBANSANG PAGKAKAKILANLAN",
];

// ============================================================
// HELPERS
// ============================================================
function normalizeText(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function looksLikeValidId(ocrText, idType) {
  const text = normalizeText(ocrText);
  const keywords = (ID_TYPE_KEYWORDS[idType] || []).map(normalizeText);
  const hasIdKeyword = keywords.some((k) => text.includes(k));
  const hasPhMarker = PH_MARKERS.map(normalizeText).some((m) =>
    text.includes(m)
  );
  return hasIdKeyword || hasPhMarker;
}

function matchesName(ocrText, formData) {
  const text = normalizeText(ocrText);
  const first = normalizeText(formData.first_name);
  const last = normalizeText(formData.last_name);
  const middle = normalizeText(formData.middle_name);

  const firstMatch = first ? text.includes(first) : true;
  const lastMatch = last ? text.includes(last) : true;
  const midIsBlank = !middle || middle === "na" || middle === "n/a";
  let middleMatch = true;

  if (!midIsBlank) {
    middleMatch = text.includes(middle) || text.includes(middle.charAt(0));
  }

  const passed = firstMatch && lastMatch && middleMatch;
  const missing = [];
  if (!firstMatch) missing.push("first name");
  if (!lastMatch) missing.push("last name");
  if (!middleMatch) missing.push("middle name");

  return { passed, missing };
}

function preprocessIdImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const maxDim = 960;
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const scale = maxDim / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.85);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

// ============================================================
// CAMERA MODAL — new full-screen UI with optional live face check
// ============================================================
function CameraModal({
  title,
  hint,
  facing,
  onCapture,
  onClose,
  enableLiveFaceCheck = false,
  modelsLoaded = true,
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectionIntervalRef = useRef(null);

  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [camError, setCamError] = useState("");
  const [isFaceDetected, setIsFaceDetected] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCamError("Camera is not supported on this browser (HTTPS is required).");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setReady(true);

        if (enableLiveFaceCheck && modelsLoaded) {
          detectionIntervalRef.current = setInterval(async () => {
            if (cancelled || !videoRef.current || !videoRef.current.videoWidth)
              return;
            try {
              const detection = await faceapi.detectSingleFace(
                videoRef.current,
                new faceapi.TinyFaceDetectorOptions({
                  inputSize: 224,
                  scoreThreshold: 0.5,
                })
              );
              setIsFaceDetected(!!detection);
            } catch {
              /* ignore */
            }
          }, 300);
        }
      } catch (err) {
        console.error("Camera error:", err);
        setCamError(
          "Unable to open the camera. Please allow camera access and try again."
        );
      }
    };

    start();

    return () => {
      cancelled = true;
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [facing, enableLiveFaceCheck, modelsLoaded]);

    const handleCapture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    setBusy(true);
    setCamError("");

    // Cap capture at 1280px on the longest side - 4K phone cameras produce
    // 2-5 MB JPEGs that time out on mobile WiFi and break compression.
    // 1280px is more than enough resolution for a face or an ID card.
    const MAX_DIM = 1280;
    let width = video.videoWidth;
    let height = video.videoHeight;
    if (width > MAX_DIM || height > MAX_DIM) {
      const scale = MAX_DIM / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d").drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setCamError("Capture failed. Please try again.");
          setBusy(false);
          return;
        }
        const file = new File([blob], `${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        // Debug — remove after confirming the fix works
        console.log(`[capture] ${width}x${height} — ${(file.size / 1024).toFixed(0)} KB`);
        onCapture(file);
      },
      "image/jpeg",
      0.85
    );
  };

  // Face-detection fallback — if the models fail to load or the detector
  // doesn't fire within 5 seconds, allow capture anyway. The admin still
  // reviews the selfie manually; blocking the resident forever is worse
  // than a slightly less "verified" capture.
  const [fallbackReady, setFallbackReady] = useState(false);
  useEffect(() => {
    if (!enableLiveFaceCheck) return;
    const t = setTimeout(() => setFallbackReady(true), 5000);
    return () => clearTimeout(t);
  }, [enableLiveFaceCheck]);

  const liveCheckReady =
    !enableLiveFaceCheck ||
    (modelsLoaded && isFaceDetected) ||
    fallbackReady;
  const canCapture = ready && !busy && liveCheckReady;

  return (
    <div
      className="absolute inset-0 z-50 bg-black flex flex-col"
      style={{ padding: "24px", gap: "16px" }}
    >
      <div className="flex items-center justify-between shrink-0">
        <h2 className="text-white text-[20px] font-extrabold leading-7">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close camera"
          className="w-11 h-11 rounded-full bg-white/15 text-white text-[18px] flex items-center justify-center hover:bg-white/25 active:scale-95 transition"
        >
          ✕
        </button>
      </div>

      <div className="relative flex-1 min-h-0 rounded-2xl overflow-hidden bg-black flex items-center justify-center">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="w-full h-full object-cover"
          style={{ transform: facing === "user" ? "scaleX(-1)" : "none" }}
        />
        {!ready && !camError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <FaSpinner className="animate-spin text-white" size={32} />
          </div>
        )}
        {facing === "user" && ready && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="border-4 rounded-full transition-colors duration-200"
              style={{
                width: "62%",
                aspectRatio: "3 / 4",
                borderColor: enableLiveFaceCheck
                  ? isFaceDetected
                    ? "#22c55e"
                    : "#ef4444"
                  : "rgba(255,255,255,0.8)",
              }}
            />
          </div>
        )}
        {enableLiveFaceCheck && ready && (
          <div className="absolute bottom-4 left-4 right-4 text-center pointer-events-none">
            <span
              className="inline-block px-4 py-2 rounded-full text-[13px] font-bold text-white shadow-lg"
              style={{
                backgroundColor: !modelsLoaded
                  ? "#6b7280"
                  : isFaceDetected
                  ? "#22c55e"
                  : "#ef4444",
              }}
            >
              {!modelsLoaded
                ? "Preparing face detection..."
                : isFaceDetected
                ? "Face detected — ready to capture"
                : "Position your face in the oval"}
            </span>
          </div>
        )}
      </div>

      {hint && (
        <p className="text-white/90 text-[14px] leading-6 text-center shrink-0">
          {hint}
        </p>
      )}

      {camError && (
        <div
          className="bg-red-100 border border-red-400 rounded-xl text-red-700 text-[14px] leading-6 break-words shrink-0"
          style={{ padding: "12px 16px" }}
        >
          {camError}
        </div>
      )}

      <button
        type="button"
        onClick={handleCapture}
        disabled={!canCapture}
        className="w-full min-h-[54px] rounded-2xl bg-[#0B5D2A] text-white font-extrabold text-[16px] flex items-center justify-center shadow-md hover:bg-[#084A21] active:scale-[0.98] transition disabled:opacity-50 shrink-0"
        style={{ gap: "12px" }}
      >
        {busy ? <FaSpinner className="animate-spin" /> : <FaCamera />}
        {busy ? "Capturing..." : "Capture"}
      </button>
    </div>
  );
}

// ============================================================
// TERMS & CONDITIONS MODAL
// ============================================================
function TermsModal({ onClose, onAgree }) {
  return (
    <div
      className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-h-[82%] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-[#F8FAF8]">
          <div>
            <h2 className="text-[#0B5D2A] text-base font-extrabold leading-tight">
              Terms and Conditions
            </h2>
            <p className="text-[10px] text-gray-500 mt-0.5">
              Barangay EcoReport System · Last Updated: October 27, 2026
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-200 active:scale-95 transition"
            aria-label="Close"
          >
            <FaTimes />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4 text-xs text-gray-700 leading-relaxed">
          <p>
            Welcome to the Barangay EcoReport System. By accessing or using this
            system, you agree to comply with the following Terms and Conditions.
            Please read them carefully before creating an account or submitting
            any information.
          </p>

          <section>
            <h3 className="font-bold text-[#0B5D2A] text-sm mb-1">
              1. Acceptance of Terms
            </h3>
            <p>
              By registering for or using the Barangay EcoReport System, you
              acknowledge that you have read, understood, and agreed to these
              Terms and Conditions. If you do not agree with these terms, please
              refrain from using the system.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-[#0B5D2A] text-sm mb-1">
              2. Purpose of the System
            </h3>
            <p>
              The Barangay EcoReport System is designed to help residents report
              environmental concerns, monitor the status of submitted reports,
              receive community announcements, access waste collection schedules,
              and use other available barangay services.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-[#0B5D2A] text-sm mb-1">
              3. Account Registration and Responsibilities
            </h3>
            <p>
              Users must provide accurate, complete, and updated information when
              registering. Each user is responsible for maintaining the
              confidentiality of their account credentials and for all activities
              performed through their account. Users must promptly report any
              suspected unauthorized access to their accounts.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-[#0B5D2A] text-sm mb-1">
              4. Submission of Environmental Reports
            </h3>
            <p>
              Users must provide truthful and accurate information when
              submitting environmental reports. Reports may include descriptions,
              locations, photographs, videos, and other supporting evidence
              relevant to the reported concern.
            </p>
            <p className="mt-2">
              Users must not submit false, misleading, malicious, irrelevant, or
              intentionally duplicated reports. The barangay may review, verify,
              reject, or take appropriate action on submitted reports based on
              the information provided and the applicable barangay procedures.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-[#0B5D2A] text-sm mb-1">
              5. Uploaded Photos, Videos, and Other Evidence
            </h3>
            <p>
              Users must ensure that uploaded photos, videos, and other evidence
              are relevant to their reports and do not unlawfully violate the
              rights or privacy of others. Users must not upload illegal, harmful,
              offensive, or unauthorized content.
            </p>
            <p className="mt-2">
              The system may restrict or remove submitted content when necessary,
              subject to applicable rules and procedures.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-[#0B5D2A] text-sm mb-1">
              6. Report Status and Response Time
            </h3>
            <p>
              Users may track the status of their submitted reports through the
              system. Report statuses and updates are provided for information
              and monitoring purposes. Submission of a report does not guarantee
              immediate action, a specific resolution time, or a particular
              outcome. Processing depends on report verification, available
              resources, and the appropriate barangay personnel.
            </p>
            <p className="mt-2">
              For emergencies requiring immediate assistance, users should
              contact the appropriate emergency services or barangay authorities
              directly rather than relying solely on this system.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-[#0B5D2A] text-sm mb-1">
              7. Proper Use of the System
            </h3>
            <p>Users agree not to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Provide false identities or impersonate another person.</li>
              <li>
                Submit fraudulent, abusive, or intentionally misleading reports.
              </li>
              <li>
                Attempt to access another user's account or private information
                without authorization.
              </li>
              <li>
                Interfere with, damage, or disrupt the system or its services.
              </li>
              <li>
                Use the system for unlawful activities or purposes unrelated to
                its intended functions.
              </li>
            </ul>
            <p className="mt-2">
              Violations may result in account restrictions or other appropriate
              action in accordance with applicable policies and laws.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-[#0B5D2A] text-sm mb-1">
              8. Privacy and Personal Information
            </h3>
            <p>
              The system may collect personal information necessary to provide
              its services, verify accounts, process reports, communicate
              updates, and maintain system operations.
            </p>
            <p className="mt-2">
              Personal information shall be handled in accordance with applicable
              data protection laws and the system's Privacy Policy. Access to
              personal information should be limited to authorized personnel with
              a legitimate purpose. Users are encouraged not to include
              unnecessary sensitive personal information in reports or uploaded
              evidence.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-[#0B5D2A] text-sm mb-1">
              9. Data Accuracy and System Availability
            </h3>
            <p>
              Users are responsible for the accuracy of the information they
              submit. The system administrators will take reasonable steps to
              maintain accurate records and reliable services; however, temporary
              interruptions, maintenance, technical errors, or service
              unavailability may occur.
            </p>
            <p className="mt-2">
              The system does not guarantee uninterrupted access or that every
              submitted report will result in a specific action.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-[#0B5D2A] text-sm mb-1">
              10. Third-Party Services and External Links
            </h3>
            <p>
              The system may contain links to external websites or services for
              additional information or assistance. These external services may
              be governed by their own terms and privacy policies. The Barangay
              EcoReport System is not responsible for the content or practices of
              third-party services outside its control.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-[#0B5D2A] text-sm mb-1">
              11. Account Suspension or Restriction
            </h3>
            <p>
              The system administrators may investigate suspected misuse and
              restrict, suspend, or disable accounts when there are reasonable
              grounds to believe that these Terms and Conditions have been
              violated, subject to applicable policies and laws.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-[#0B5D2A] text-sm mb-1">
              12. Changes to These Terms
            </h3>
            <p>
              These Terms and Conditions may be revised when necessary to reflect
              changes in system features, operational procedures, or applicable
              laws. Updated terms will be made available through the system,
              together with the revised effective or update date when
              appropriate. Continued use of the system after updates constitutes
              acceptance of the revised terms where permitted by applicable law.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-[#0B5D2A] text-sm mb-1">
              13. Limitation of Responsibility
            </h3>
            <p>
              The system is provided to support communication between residents
              and barangay personnel. To the extent permitted by applicable law,
              the system administrators are not responsible for losses arising
              from inaccurate information submitted by users, interruptions
              beyond their reasonable control, or actions taken by third parties.
              Nothing in these terms excludes responsibilities that cannot
              legally be excluded.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-[#0B5D2A] text-sm mb-1">
              14. Governing Laws
            </h3>
            <p>
              These Terms and Conditions shall be interpreted in accordance with
              applicable laws and regulations of the Republic of the Philippines.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-[#0B5D2A] text-sm mb-1">
              15. Contact and Assistance
            </h3>
            <p>
              For questions, concerns, or assistance regarding the Barangay
              EcoReport System, users may contact the authorized barangay office
              or the designated system administrator through the official contact
              channels provided by the barangay.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-[#0B5D2A] text-sm mb-1">
              16. Agreement and Consent
            </h3>
            <p>
              By checking the acceptance box or selecting the designated
              agreement button, you confirm that you have read and understood
              these Terms and Conditions and agree to follow them when using the
              Barangay EcoReport System.
            </p>
          </section>
        </div>

        <div className="shrink-0 px-5 py-3 border-t border-gray-200 bg-[#F8FAF8] flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-[40px] rounded-lg font-bold text-sm border border-[#0B5D2A] text-[#0B5D2A] bg-white hover:bg-[#E8F3E5] active:scale-95 transition"
          >
            Close
          </button>
          <button
            type="button"
            onClick={onAgree}
            className="flex-1 h-[40px] rounded-lg font-bold text-sm bg-[#0B5D2A] text-white shadow-md hover:bg-[#094C23] active:scale-95 transition"
          >
            I Agree
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function Register() {
  const navigate = useNavigate();

  // ---------- Form ----------
  const [formData, setFormData] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    house_no: "",
    street: "",
    permanent_house_no: "",
    permanent_street: "",
    permanent_barangay: "",
    permanent_city: "",
    contact_number: "",
    email: "",
    password: "",
    confirm_password: "",
  });

  const [sameAddress, setSameAddress] = useState(false);
  const [idType, setIdType] = useState("");
  const [showStreetDropdown, setShowStreetDropdown] = useState(false);
  const [streetError, setStreetError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // ---------- ID + OCR + face ----------
  const [residentIdFile, setResidentIdFile] = useState(null);
  const [residentIdPreview, setResidentIdPreview] = useState(null);

  const [ocrText, setOcrText] = useState("");
  const [ocrScanStatus, setOcrScanStatus] = useState("idle"); // idle | scanning | done | error
  const [ocrScanError, setOcrScanError] = useState("");
  const [ocrValidation, setOcrValidation] = useState({ passed: false, reason: "" });
  const ocrRunIdRef = useRef(0);
  const ocrEngineRef = useRef(null);

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [idDescriptor, setIdDescriptor] = useState(null);
  const [idFaceFound, setIdFaceFound] = useState(false);
  const [idFaceProcessing, setIdFaceProcessing] = useState(false);
  const [idFaceError, setIdFaceError] = useState("");

  // ---------- Selfie ----------
  const [faceFile, setFaceFile] = useState(null);
  const [facePreview, setFacePreview] = useState(null);

  // ---------- UI ----------
  const [cameraMode, setCameraMode] = useState(null); // null | "id" | "face"
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ============ Load password policy from backend ============
  const [passwordPolicy, setPasswordPolicy] = useState(DEFAULT_PASSWORD_POLICY);

  useEffect(() => {
    let cancelled = false;
    fetchPasswordPolicy(apiFetch).then((policy) => {
      if (!cancelled) setPasswordPolicy(policy);
    });
    return () => { cancelled = true; };
  }, []);

  // ============ Load face-api models once ============
  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL =
          "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights";
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);
      } catch (err) {
        console.error("Failed to load face-api models:", err);
      }
    };
    loadModels();
  }, []);

  // ============ OCR engine (cached across remounts) ============
  const getOcrEngine = async () => {
    if (window.__ecoOcrEngine) {
      ocrEngineRef.current = window.__ecoOcrEngine;
      return window.__ecoOcrEngine;
    }
    if (ocrEngineRef.current) {
      window.__ecoOcrEngine = ocrEngineRef.current;
      return ocrEngineRef.current;
    }

    const originalWarn = console.warn;
    console.warn = (...args) => {
      const msg = args.join(" ");
      if (msg.includes("CleanUnusedInitializersAndNodeArgs")) return;
      originalWarn(...args);
    };

    try {
      const engine = await PaddleOCR.create({
        lang: "en",
        ocrVersion: "PP-OCRv5",
        ortOptions: { backend: "wasm" },
      });
      ocrEngineRef.current = engine;
      window.__ecoOcrEngine = engine;
      return engine;
    } finally {
      console.warn = originalWarn;
    }
  };

  // ============ Face detection on ID ============
  const processIdFace = async (file) => {
    if (!modelsLoaded) return;
    setIdFaceProcessing(true);
    setIdFaceFound(false);
    setIdDescriptor(null);
    setIdFaceError("");
    try {
      const img = await faceapi.bufferToImage(file);
      const detection = await faceapi
        .detectSingleFace(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setIdFaceFound(false);
        setIdFaceError(
          "No face detected on this ID. Please retake the photo in a well-lit area."
        );
        return;
      }

      const box = detection.detection.box;
      if (box.width < 80 || box.height < 80) {
        setIdFaceFound(false);
        setIdFaceError(
          `The face on your ID is too small (${Math.round(box.width)}×${Math.round(
            box.height
          )}px). Please retake the photo closer so the whole ID fills the frame.`
        );
        return;
      }

      // Store descriptor for future use (not compared to the selfie anymore).
      setIdDescriptor(detection.descriptor);
      setIdFaceFound(true);
    } catch (err) {
      console.error("Error processing ID face:", err);
      setIdFaceFound(false);
      setIdFaceError("Couldn't analyze the ID photo. Please try again.");
    } finally {
      setIdFaceProcessing(false);
    }
  };

  // ============ OCR on ID ============
  const runIdOcr = async (file) => {
    if (!file) return;
    const runId = ++ocrRunIdRef.current;
    setOcrScanStatus("scanning");
    setOcrScanError("");
    setOcrText("");
    setOcrValidation({ passed: false, reason: "" });

    try {
      const blob = await preprocessIdImage(file);
      const engine = await getOcrEngine();
      if (runId !== ocrRunIdRef.current) return;

      const result = await engine.predict(blob);
      if (runId !== ocrRunIdRef.current) return;

      const data = Array.isArray(result) ? result[0] : result;
      const items = data?.items || [];
      const text = items.map((i) => i.text || "").join(" ");

      setOcrText(text);
      setOcrScanStatus("done");
    } catch (err) {
      if (runId !== ocrRunIdRef.current) return;
      console.error("[OCR] Error:", err);
      setOcrScanStatus("error");
      setOcrScanError("Couldn't read the ID photo. Please retake it.");
    }
  };

  // ============ OCR validation ============
  useEffect(() => {
    if (ocrScanStatus !== "done" || !ocrText) {
      setOcrValidation({ passed: false, reason: "" });
      return;
    }
    const idOk = looksLikeValidId(ocrText, idType);
    if (!idOk) {
      setOcrValidation({
        passed: false,
        reason: "This doesn't look like a valid ID.",
      });
      return;
    }
    const nameOk = matchesName(ocrText, formData);
    if (!nameOk.passed) {
      setOcrValidation({
        passed: false,
        reason: `Name doesn't match (missing: ${nameOk.missing.join(", ")}).`,
      });
      return;
    }
    setOcrValidation({ passed: true, reason: "" });
  }, [
    ocrText,
    ocrScanStatus,
    formData.first_name,
    formData.middle_name,
    formData.last_name,
    idType,
  ]);

  // ============ Handlers ============
  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "contact_number") {
      const digitsOnly = value.replace(/\D/g, "");
      if (digitsOnly.length >= 1 && digitsOnly[0] !== "0") return;
      if (digitsOnly.length >= 2 && digitsOnly[1] !== "9") return;
      setFormData({ ...formData, contact_number: digitsOnly.slice(0, 11) });
      if (fieldErrors.contact_number) {
        setFieldErrors((prev) => ({ ...prev, contact_number: "" }));
      }
      return;
    }

    setFormData({ ...formData, [name]: value });

    // Clear this field's error as soon as the user edits it
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    }

    // Live re-validate confirm_password when password changes
    if (name === "password" && formData.confirm_password) {
      const mismatch = value !== formData.confirm_password;
      setFieldErrors((prev) => ({
        ...prev,
        confirm_password: mismatch ? "Passwords do not match." : "",
      }));
    }
  };

  const setIdFile = async (file) => {
    setResidentIdFile(file);
    setResidentIdPreview(await fileToDataUrl(file));
  };

  const handleResidentIdUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      alert("Please upload a valid image file (JPG, JPEG, PNG).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be less than 10MB.");
      return;
    }

    setIdFile(file);
    runIdOcr(file);
    processIdFace(file);
  };

  const removeResidentId = () => {
    ocrRunIdRef.current += 1;
    setResidentIdFile(null);
    setResidentIdPreview(null);
    setIdDescriptor(null);
    setIdFaceFound(false);
    setIdFaceError("");
    setOcrText("");
    setOcrScanStatus("idle");
    setOcrScanError("");
    setOcrValidation({ passed: false, reason: "" });
    const fileInput = document.getElementById("resident-id-input");
    if (fileInput) fileInput.value = "";
  };

  const handleStreetSelect = (street) => {
    setFormData({ ...formData, street });
    setShowStreetDropdown(false);
    setStreetError("");
  };

    const handleStreetBlur = () => {
    // Delay so a dropdown item click can register first. If the user picked
    // from the list, formData.street will already be canonical by the time
    // this runs — no-op.
    setTimeout(() => {
      setShowStreetDropdown(false);
      const typed = formData.street.trim();
      if (!typed) {
        setStreetError("");
        return;
      }
      const resolved = findMatchingStreet(typed);
      if (resolved) {
        setFormData((prev) => ({ ...prev, street: resolved }));
        setStreetError("");
      } else {
        setStreetError("Please select a street from the Sto. Rosario list.");
      }
    }, 180);
  };

  // ── Inline field validators ───
  // One validator per field. Returns the error string (empty = valid).
  // Used by handleFieldBlur (on blur), handleChange (to clear on edit),
  // and validateAllFields (on submit + scroll-to-first-error).
  const validateFieldValue = (name, value) => {
    const v = typeof value === "string" ? value.trim() : value;

    switch (name) {
      case "first_name":
      case "last_name":
      case "house_no":
        return v === "" ? "This field is required." : "";

      case "middle_name":
        return v === "" ? "This field is required. Type N/A if none." : "";

      case "permanent_house_no":
      case "permanent_street":
      case "permanent_barangay":
      case "permanent_city":
        if (sameAddress) return "";
        return v === "" ? "This field is required." : "";

      case "contact_number":
        if (v === "") return "Contact number is required.";
        if (!/^09\d{9}$/.test(v)) return "Must be 11 digits starting with 09.";
        return "";

      case "email":
        if (v === "") return "Email is required.";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
          return "Enter a valid email address.";
        return "";

      case "password":
        if (!v) return "Password is required.";
        if (v.length < passwordPolicy.min || v.length > passwordPolicy.max)
          return `Password must be ${passwordPolicy.min}-${passwordPolicy.max} characters.`;
        if (passwordPolicy.requireStrong) {
          const hasLetter = /[A-Za-z]/.test(v);
          const hasDigit = /\d/.test(v);
          if (!hasLetter || !hasDigit)
            return "Password must contain letters and numbers.";
        }
        return "";

      case "confirm_password":
        if (!v) return "Please confirm your password.";
        if (v !== formData.password) return "Passwords do not match.";
        return "";

      default:
        return "";
    }
  };

  const handleFieldBlur = (name) => {
    const err = validateFieldValue(name, formData[name]);
    setFieldErrors((prev) => ({ ...prev, [name]: err }));
  };

  const getMissingFields = () => {
    const missing = [];
    if (!formData.first_name.trim()) missing.push("First Name");
    if (!formData.middle_name.trim()) missing.push("Middle Name");
    if (!formData.last_name.trim()) missing.push("Last Name");
    if (!formData.house_no.trim()) missing.push("House Number");
    if (!findMatchingStreet(formData.street)) missing.push("Street");
    if (!permanentComplete) missing.push("Permanent Address");
    if (validateFieldValue("contact_number", formData.contact_number))
      missing.push("Valid Contact Number");
    if (validateFieldValue("email", formData.email))
      missing.push("Valid Email Address");
    if (validateFieldValue("password", formData.password))
      missing.push("Valid Password");
    if (validateFieldValue("confirm_password", formData.confirm_password))
      missing.push("Matching Confirm Password");
    if (!idType) missing.push("Type of Resident ID");
    if (!residentIdFile) missing.push("Resident ID Photo");
    if (ocrValidation.passed !== true) missing.push("ID Verification");
    if (REQUIRE_FACE_VERIFICATION && !idFaceFound)
      missing.push("Clear Face on ID");
    if (REQUIRE_FACE_VERIFICATION && !faceFile)
      missing.push("Face Verification Selfie");
    if (!agreedToTerms) missing.push("Terms & Conditions");
    return missing;
  };

  const filteredStreets = STREETS.filter((s) =>
    s.toLowerCase().includes(formData.street.toLowerCase())
  );

  const handleCameraCapture = async (file) => {
    if (cameraMode === "id") {
      await setIdFile(file);
      runIdOcr(file);
      processIdFace(file);
    } else if (cameraMode === "face") {
      setFaceFile(file);
      setFacePreview(await fileToDataUrl(file));
    }
    setCameraMode(null);
  };

  // Fault-tolerant compression: never rejects. If any step fails, the
  // original file is uploaded as-is.
  // Files under 1 MB are skipped entirely
  const compressImage = (file, maxDim = 1600, quality = 0.82) => {
    return new Promise((resolve) => {
      if (!file || !file.type.startsWith("image/")) return resolve(file);
      if (file.size < 1024 * 1024) return resolve(file); // < 1 MB → skip

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          try {
            let { width, height } = img;
            if (width > maxDim || height > maxDim) {
              const scale = maxDim / Math.max(width, height);
              width = Math.round(width * scale);
              height = Math.round(height * scale);
            }
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            canvas.getContext("2d").drawImage(img, 0, 0, width, height);
            canvas.toBlob(
              (blob) => {
                if (!blob) return resolve(file);
                const safeName =
                  (file.name || "image").replace(/\.\w+$/, "") + ".jpg";
                resolve(new File([blob], safeName, { type: "image/jpeg" }));
              },
              "image/jpeg",
              quality
            );
          } catch {
            resolve(file);
          }
        };
        img.onerror = () => resolve(file);
        img.src = e.target.result;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  };

  // ============ Upload to Cloudinary ============
  const uploadFile = async (file) => {
    if (!file) return null;

    // Compress first — dramatically reduces upload time on mobile.
    const compressed = await compressImage(file);

    const fd = new FormData();
    fd.append("files", compressed);
    const response = await fetch(`${API_BASE_URL}/api/guest/upload`, {
      method: "POST",
      body: fd,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Upload failed.");
    return data.files?.[0]?.url || null;
  };

  // ============ Form completion ============
  const permanentComplete = sameAddress
    ? true
    : formData.permanent_house_no.trim() !== "" &&
      formData.permanent_street.trim() !== "" &&
      formData.permanent_barangay.trim() !== "" &&
      formData.permanent_city.trim() !== "";

  const isFormComplete =
    formData.first_name.trim() !== "" &&
    formData.middle_name.trim() !== "" &&
    formData.last_name.trim() !== "" &&
    formData.house_no.trim() !== "" &&
    findMatchingStreet(formData.street) !== null &&
    permanentComplete &&
    formData.contact_number.trim() !== "" &&
    formData.email.trim() !== "" &&
    formData.password !== "" &&
    formData.confirm_password !== "" &&
    idType !== "" &&
    residentIdFile !== null &&
    ocrValidation.passed === true &&
    idFaceFound === true &&
    faceFile !== null &&
    agreedToTerms === true;

  // ============ Submit ============
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Resolve the typed street to the canonical STREETS entry. Handles
    // the case where the user typed a partial / misspelled value without blurring the field first.
    const resolvedStreet = findMatchingStreet(formData.street);
    if (!resolvedStreet) {
      setError("Please select a valid street from the Sto. Rosario list.");
      setStreetError("Please select a street from the Sto. Rosario list.");
      setLoading(false);
      return;
    }

    const missing = getMissingFields();
    if (missing.length > 0) {
      setError(`Please complete: ${missing.join(", ")}.`);
      setLoading(false);
      return;
    }

    // Non-field checks (file / OCR / face / terms) — scroll to their
    // respective sections if they fail.
    if (!ocrValidation.passed) {
      setError(ocrValidation.reason || "Please wait for ID verification.");
      setLoading(false);
      setTimeout(() => {
        document
          .getElementById("resident-id-input")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 80);
      return;
    }
    if (REQUIRE_FACE_VERIFICATION) {
      if (!idFaceFound) {
        setError("Please upload a clear ID with a visible face.");
        setLoading(false);
        return;
      }
      if (!faceFile) {
        setError("Please complete the face verification.");
        setLoading(false);
        return;
      }
    }

    try {
      // Upload sequentially
      const valid_id_url = await uploadFile(residentIdFile, "ID photo");
      const selfie_image = await uploadFile(faceFile, "Selfie");

      const permanent = sameAddress
        ? {
            permanent_house_no: formData.house_no,
            permanent_street: resolvedStreet, // canonical name
            permanent_barangay: "Sto. Rosario Kanluran",
            permanent_city: "Pateros",
          }
        : {
            permanent_house_no: formData.permanent_house_no,
            permanent_street: formData.permanent_street, // free-text, no restriction
            permanent_barangay: formData.permanent_barangay,
            permanent_city: formData.permanent_city,
          };

      const payload = {
        ...formData,
        street: resolvedStreet, // canonical name, not what user typed
        ...permanent,
        permanent_same_as_current: sameAddress,
        id_type: idType,
        valid_id_url,
        selfie_image,
      };

      const data = await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      navigate("/resident-dashboard");
        } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ============ Reusable field ============
  const field = (name, label, placeholder, extra = {}) => {
    const err = fieldErrors[name];
    return (
      <div id={`field-${name}`} className="flex flex-col" style={{ gap: "8px" }}>
        <label className="block text-[#0B5D2A] text-[14px] font-extrabold">
          {label} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name={name}
          value={formData[name]}
          onChange={handleChange}
          onBlur={() => handleFieldBlur(name)}
          placeholder={placeholder}
          className={`block w-full min-w-0 box-border min-h-[52px] rounded-2xl border ${
            err ? "border-red-500" : "border-[#8BB37A]"
          } bg-white text-[16px] text-gray-800 placeholder:text-gray-400 placeholder:text-[14px] outline-none transition focus:border-[#0B5D2A] focus:ring-2 focus:ring-[#0B5D2A]/20`}
          style={{ padding: "0 16px" }}
          {...extra}
        />
        {err && (
          <p
            className="text-[12px] text-red-500 leading-5 field-error-message"
            data-error-for={name}
          >
            {err}
          </p>
        )}
      </div>
    );
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="min-h-[100dvh] bg-[#E5E7EB] flex justify-center items-center sm:py-6 sm:px-3">
      <div className="relative w-full h-[100dvh] sm:w-[390px] sm:h-[844px] bg-[#F8FAF8] sm:rounded-[40px] sm:shadow-2xl overflow-hidden sm:border-[5px] sm:border-white flex flex-col">
        {/* HEADER */}
        <header
          className="relative h-[82px] bg-[#F8FAF8] flex items-center justify-center shrink-0"
          style={{ padding: "0 64px" }}
        >
          <button
            type="button"
            onClick={() => navigate("/resident-login")}
            className="absolute left-5 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full text-[#0B5D2A] text-[20px] hover:bg-[#E8F3E5] active:scale-95 transition"
            aria-label="Back"
          >
            <FaArrowLeft />
          </button>
          <h1 className="text-[#0B5D2A] text-[22px] font-extrabold leading-tight text-center">
            Resident Registration
          </h1>
        </header>

        <main
          className="flex-1 overflow-y-auto no-scrollbar"
          style={{
            padding: "12px 24px max(48px, calc(env(safe-area-inset-bottom) + 32px))",
          }}
        >
          <form
            onSubmit={handleRegister}
            className="flex flex-col"
            style={{ gap: "24px" }}
          >
            {field("first_name", "First Name", "Enter first name")}
            {field("middle_name", "Middle Name", "Middle name (or N/A if none)")}
            {field("last_name", "Last Name", "Enter last name")}

            {field("house_no", "House Number", "Enter house number")}

            {/* STREET - searchable dropdown */}
            <div id="field-street" className="flex flex-col" style={{ gap: "8px" }}>
              <label className="block text-[#0B5D2A] text-[14px] font-extrabold">
                Street <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="street"
                  value={formData.street}
                  onChange={(e) => {
                    setFormData({ ...formData, street: e.target.value });
                    setShowStreetDropdown(true);
                    if (streetError) setStreetError("");
                  }}
                  onFocus={() => setShowStreetDropdown(true)}
                  onBlur={handleStreetBlur}
                  placeholder="Search or select street..."
                  className={`block w-full min-w-0 box-border min-h-[52px] rounded-2xl border ${
                    streetError ? "border-red-500" : "border-[#8BB37A]"
                  } bg-white text-[16px] text-gray-800 placeholder:text-gray-400 placeholder:text-[14px] outline-none transition focus:border-[#0B5D2A] focus:ring-2 focus:ring-[#0B5D2A]/20`}
                  style={{ padding: "0 16px" }}
                  required
                />
                {showStreetDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowStreetDropdown(false)}
                    />
                    <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-2xl shadow-lg max-h-48 overflow-y-auto">
                      {filteredStreets.length > 0 ? (
                        filteredStreets.map((s) => (
                          <div
                            key={s}
                            onClick={() => handleStreetSelect(s)}
                            className="px-4 py-3 text-[14px] text-gray-700 hover:bg-[#F3F8F1] cursor-pointer active:bg-[#E8F3E5]"
                          >
                            {s}
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-[14px] text-gray-500">
                          No streets found.
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
              {streetError && (
                <p
                  className="text-[12px] text-red-500 leading-5 field-error-message"
                  data-error-for="street"
                >
                  {streetError}
                </p>
              )}
            </div>

            {/* PERMANENT ADDRESS */}
            <div className="flex flex-col shrink-0" style={{ gap: "16px" }}>
              <h2 className="text-[18px] font-extrabold text-[#0B5D2A] leading-7">
                Permanent Address
              </h2>

              <label
                htmlFor="same-address"
                className="flex items-center cursor-pointer min-h-[44px] text-[14px] leading-6 text-gray-700"
                style={{ gap: "12px" }}
              >
                <input
                  id="same-address"
                  type="checkbox"
                  checked={sameAddress}
                  onChange={(e) => setSameAddress(e.target.checked)}
                  className="w-5 h-5 shrink-0 accent-[#0B5D2A] cursor-pointer"
                />
                <span>Same as the address above</span>
              </label>

              {sameAddress ? (
                <div
                  className="bg-[#EFFAF2] border border-[#BFE3C8] rounded-2xl text-[14px] text-gray-700 leading-6 break-words"
                  style={{ padding: "16px" }}
                >
                  {formData.house_no || formData.street
                    ? `${formData.house_no} ${formData.street}, Sto. Rosario Kanluran, Pateros`
                        .replace(/\s+/g, " ")
                        .trim()
                    : "Your permanent address will be the same as your address above."}
                </div>
              ) : (
                <div className="flex flex-col" style={{ gap: "24px" }}>
                  {field("permanent_house_no", "House Number", "Enter house number")}
                  {field("permanent_street", "Street", "Enter street")}
                  {field("permanent_barangay", "Barangay", "Enter barangay")}
                  {field(
                    "permanent_city",
                    "City / Municipality",
                    "Enter city or municipality"
                  )}
                </div>
              )}
            </div>

            {/* CONTACT */}
            <div id="field-contact_number" className="flex flex-col" style={{ gap: "8px" }}>
              <label className="block text-[#0B5D2A] text-[14px] font-extrabold">
                Contact Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="contact_number"
                value={formData.contact_number}
                onChange={handleChange}
                onBlur={() => handleFieldBlur("contact_number")}
                placeholder="Enter Phone Number"
                maxLength={11}
                inputMode="numeric"
                className={`block w-full min-w-0 box-border min-h-[52px] rounded-2xl border ${
                  fieldErrors.contact_number ? "border-red-500" : "border-[#8BB37A]"
                } bg-white text-[16px] text-gray-800 placeholder:text-gray-400 outline-none transition focus:border-[#0B5D2A] focus:ring-2 focus:ring-[#0B5D2A]/20`}
                style={{ padding: "0 16px" }}
              />
              {fieldErrors.contact_number && (
                <p
                  className="text-[12px] text-red-500 leading-5 field-error-message"
                  data-error-for="contact_number"
                >
                  {fieldErrors.contact_number}
                </p>
              )}
            </div>

            {/* EMAIL */}
            <div id="field-email" className="flex flex-col" style={{ gap: "8px" }}>
              <label className="block text-[#0B5D2A] text-[14px] font-extrabold">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={() => handleFieldBlur("email")}
                placeholder="Enter email address"
                autoComplete="email"
                className={`block w-full min-w-0 box-border min-h-[52px] rounded-2xl border ${
                  fieldErrors.email ? "border-red-500" : "border-[#8BB37A]"
                } bg-white text-[16px] text-gray-800 placeholder:text-gray-400 outline-none transition focus:border-[#0B5D2A] focus:ring-2 focus:ring-[#0B5D2A]/20`}
                style={{ padding: "0 16px" }}
              />
              {fieldErrors.email && (
                <p
                  className="text-[12px] text-red-500 leading-5 field-error-message"
                  data-error-for="email"
                >
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* PASSWORDS */}
            <div id="field-password" className="flex flex-col" style={{ gap: "8px" }}>
              <label className="block text-[#0B5D2A] text-[14px] font-extrabold">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={() => handleFieldBlur("password")}
                  placeholder={`Enter password (${passwordPolicy.min}-${passwordPolicy.max} characters)`}
                  maxLength={16}
                  autoComplete="new-password"
                  className={`block w-full min-w-0 box-border min-h-[52px] rounded-2xl border ${
                    fieldErrors.password ? "border-red-500" : "border-[#8BB37A]"
                  } bg-white text-[16px] text-gray-800 placeholder:text-gray-400 outline-none transition focus:border-[#0B5D2A] focus:ring-2 focus:ring-[#0B5D2A]/20`}
                  style={{ padding: "0 56px 0 16px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-[#0B5D2A] text-[18px]"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FaEye /> : <FaEyeSlash />}
                </button>
              </div>
              {fieldErrors.password && (
                <p
                  className="text-[12px] text-red-500 leading-5 field-error-message"
                  data-error-for="password"
                >
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <div id="field-confirm_password" className="flex flex-col" style={{ gap: "8px" }}>
              <label className="block text-[#0B5D2A] text-[14px] font-extrabold">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirm_password"
                  value={formData.confirm_password}
                  onChange={handleChange}
                  onBlur={() => handleFieldBlur("confirm_password")}
                  placeholder="Confirm password"
                  maxLength={16}
                  autoComplete="new-password"
                  className={`block w-full min-w-0 box-border min-h-[52px] rounded-2xl border ${
                    fieldErrors.confirm_password ? "border-red-500" : "border-[#8BB37A]"
                  } bg-white text-[16px] text-gray-800 placeholder:text-gray-400 outline-none transition focus:border-[#0B5D2A] focus:ring-2 focus:ring-[#0B5D2A]/20`}
                  style={{ padding: "0 56px 0 16px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-[#0B5D2A] text-[18px]"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <FaEye /> : <FaEyeSlash />}
                </button>
              </div>
              {fieldErrors.confirm_password && (
                <p
                  className="text-[12px] text-red-500 leading-5 field-error-message"
                  data-error-for="confirm_password"
                >
                  {fieldErrors.confirm_password}
                </p>
              )}
            </div>

            {/* ID TYPE */}
            <div className="flex flex-col" style={{ gap: "8px" }}>
              <label className="block text-[#0B5D2A] text-[14px] font-extrabold">
                Type of Resident ID <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={idType}
                  onChange={(e) => setIdType(e.target.value)}
                  className={`block w-full min-w-0 box-border min-h-[52px] rounded-2xl border border-[#8BB37A] bg-white text-[16px] outline-none transition focus:border-[#0B5D2A] focus:ring-2 focus:ring-[#0B5D2A]/20 appearance-none ${
                    idType ? "text-gray-800" : "text-gray-400"
                  }`}
                  style={{ padding: "0 48px 0 16px" }}
                  required
                >
                  <option value="">Select ID type</option>
                  {ID_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <FaChevronDown
                  size={14}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#0B5D2A] pointer-events-none"
                />
              </div>
            </div>

            {/* ID UPLOAD */}
            <div className="flex flex-col shrink-0" style={{ gap: "12px" }}>
              <label className="block text-[#0B5D2A] text-[14px] font-extrabold">
                Resident ID Photo <span className="text-red-500">*</span>
              </label>

              <input
                id="resident-id-input"
                type="file"
                accept="image/jpeg,image/png,image/jpg"
                onChange={handleResidentIdUpload}
                className="hidden"
              />

              {residentIdPreview ? (
                <div className="flex flex-col" style={{ gap: "12px" }}>
                  <div className="relative">
                    <img
                      src={residentIdPreview}
                      alt="Resident ID Preview"
                      className="w-full h-[180px] rounded-2xl border border-[#8BB37A] object-cover bg-white"
                    />
                    <button
                      type="button"
                      onClick={removeResidentId}
                      aria-label="Remove ID"
                      className="absolute top-2 right-2 w-9 h-9 rounded-full bg-red-500 text-white font-bold text-sm flex items-center justify-center hover:bg-red-600 transition"
                    >
                      ✕
                    </button>
                  </div>

                  {idFaceProcessing && (
                    <p className="text-[13px] text-blue-600 leading-5">Analyzing ID face...</p>
                  )}

                  {!idFaceProcessing && !idFaceFound && residentIdPreview && (
                    <div
                      className="flex items-start bg-red-50 border border-red-300 rounded-xl text-red-700 text-[13px] leading-5"
                      style={{ padding: "10px 12px", gap: "8px" }}
                    >
                      <FaExclamationTriangle className="mt-0.5 shrink-0" size={12} />
                      <span className="break-words">
                        {idFaceError || "No face detected on this ID. Please upload a clearer photo."}
                      </span>
                    </div>
                  )}

                  {!idFaceProcessing && idFaceFound && (
                    <div className="flex items-center text-green-600 text-[13px]" style={{ gap: "8px" }}>
                      <FaCheck size={12} />
                      <span>Face found on ID.</span>
                    </div>
                  )}

                  {ocrScanStatus === "scanning" && (
                    <div
                      className="bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-[13px]"
                      style={{ padding: "10px 12px" }}
                    >
                      Reading ID text...
                    </div>
                  )}
                  {ocrScanStatus === "error" && (
                    <div
                      className="bg-red-50 border border-red-300 rounded-xl text-red-700 text-[13px] break-words"
                      style={{ padding: "10px 12px" }}
                    >
                      {ocrScanError}
                    </div>
                  )}
                  {ocrScanStatus === "done" && ocrValidation.passed && (
                    <div className="flex items-center text-green-600 text-[13px]" style={{ gap: "8px" }}>
                      <FaCheck size={12} />
                      <span>ID text verified.</span>
                    </div>
                  )}
                  {ocrScanStatus === "done" && !ocrValidation.passed && (
                    <div
                      className="bg-red-50 border border-red-300 rounded-xl text-red-700 text-[13px] break-words"
                      style={{ padding: "10px 12px" }}
                    >
                      {ocrValidation.reason}
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2" style={{ gap: "12px" }}>
                  <label
                    htmlFor="resident-id-input"
                    className="min-h-[110px] rounded-2xl border border-[#8BB37A] bg-white flex flex-col items-center justify-center text-center text-[#0B5D2A] hover:bg-[#F3F8F1] transition cursor-pointer"
                    style={{ padding: "12px 8px", gap: "6px" }}
                  >
                    <FaUpload size={24} />
                    <span className="font-extrabold text-[13px] leading-5">UPLOAD FILE</span>
                    <span className="text-[12px] text-gray-500 leading-4">JPG, PNG (10MB)</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setCameraMode("id")}
                    className="min-h-[110px] rounded-2xl border border-[#8BB37A] bg-white flex flex-col items-center justify-center text-center text-[#0B5D2A] hover:bg-[#F3F8F1] active:scale-[0.98] transition"
                    style={{ padding: "12px 8px", gap: "6px" }}
                  >
                    <FaCamera size={24} />
                    <span className="font-extrabold text-[13px] leading-5">TAKE PHOTO</span>
                    <span className="text-[12px] text-gray-500 leading-4">Use camera</span>
                  </button>
                </div>
              )}

              <p className="text-[13px] leading-5 text-gray-500 break-words">
                Use a clear photo of a valid ID. It is used by the barangay admin
                for verification.
              </p>
            </div>

            {/* FACE VERIFICATION — hidden when the toggle is off */}
            {REQUIRE_FACE_VERIFICATION && (
            <div className="flex flex-col shrink-0" style={{ gap: "12px" }}>
              <label className="block text-[#0B5D2A] text-[14px] font-extrabold">
                Face Verification <span className="text-red-500">*</span>
              </label>

              {facePreview ? (
                <div className="flex flex-col" style={{ gap: "12px" }}>
                  <div className="relative">
                    <img
                      src={facePreview}
                      alt="Face verification"
                      className="w-full h-[180px] rounded-2xl border border-[#8BB37A] object-cover bg-white"
                      style={{ transform: "scaleX(-1)" }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setFaceFile(null);
                        setFacePreview(null);
                      }}
                      aria-label="Remove face photo"
                      className="absolute top-2 right-2 w-9 h-9 rounded-full bg-red-500 text-white font-bold text-sm flex items-center justify-center hover:bg-red-600 transition"
                    >
                      ✕
                    </button>
                  </div>
                  <div
                    className="flex items-center text-green-600 text-[13px]"
                    style={{ gap: "8px" }}
                  >
                    <FaCheck size={12} />
                    <span>Face captured</span>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setCameraMode("face")}
                  className="w-full min-h-[110px] rounded-2xl border border-[#8BB37A] bg-white flex flex-col items-center justify-center text-center text-[#0B5D2A] hover:bg-[#F3F8F1] active:scale-[0.98] transition"
                  style={{ padding: "12px 16px", gap: "6px" }}
                >
                  <FaUserCheck size={26} />
                  <span className="font-extrabold text-[13px] leading-5">
                    START FACE VERIFICATION
                  </span>
                  <span className="text-[12px] text-gray-500 leading-4">
                    Take a live selfie. It will be checked by the barangay.
                  </span>
                </button>
              )}
            </div>
            )}

            {/* TERMS */}
            <div id="field-agreedToTerms" className="flex flex-col shrink-0" style={{ gap: "6px" }}>
            <div className="flex items-start" style={{ gap: "12px" }}>
              <input
                id="terms-checkbox"
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => {
                  setAgreedToTerms(e.target.checked);
                  if (fieldErrors.agreedToTerms) {
                    setFieldErrors((prev) => ({ ...prev, agreedToTerms: "" }));
                  }
                }}
                className="w-5 h-5 shrink-0 accent-[#0B5D2A] cursor-pointer"
                style={{ marginTop: "2px" }}
              />
              <label
                htmlFor="terms-checkbox"
                className="min-w-0 text-[14px] leading-6 text-gray-700 cursor-pointer break-words"
              >
                I agree to the{" "}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowTermsModal(true);
                  }}
                  className="font-extrabold text-[#0B5D2A] underline"
                >
                  Terms &amp; Conditions
                </button>{" "}
                and confirm that all information provided is accurate.
              </label>
            </div>
            {fieldErrors.agreedToTerms && (
              <p
                className="text-[12px] text-red-500 leading-5 field-error-message pl-8"
                data-error-for="agreedToTerms"
              >
                {fieldErrors.agreedToTerms}
              </p>
            )}
            </div>

            {/* SUBMIT */}
            <div className="flex flex-col items-center shrink-0" style={{ gap: "12px" }}>
              {/* Backend errors */}
              {error && (
                <div
                  className="w-full bg-red-100 border border-red-400 rounded-xl text-red-700 text-sm leading-6 break-words"
                  style={{ padding: "14px 16px" }}
                >
                  {error}
                </div>
              )}

              {(() => {
                const missingCount = getMissingFields().length;
                const buttonDisabled = loading || missingCount > 0;
                return (
                  <button
                    type="submit"
                    disabled={buttonDisabled}
                    className={`w-full min-h-[54px] rounded-2xl font-extrabold text-[16px] shadow-md transition ${
                      buttonDisabled
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "btn-primary active:scale-[0.98]"
                    }`}
                  >
                    {loading ? "Registering..." : "Register"}
                  </button>
                );
              })()}

            </div>
          </form>
        </main>

        {/* CAMERA MODALS */}
        {cameraMode === "id" && (
          <CameraModal
            title="Take Photo of ID"
            hint="Place your ID inside the frame. Make sure the text is clear and not blurry."
            facing="environment"
            modelsLoaded={modelsLoaded}
            onCapture={handleCameraCapture}
            onClose={() => setCameraMode(null)}
          />
        )}

        {cameraMode === "face" && (
          <CameraModal
            title="Face Verification"
            hint="Center your face in the oval, remove glasses or a mask, and look straight at the camera."
            facing="user"
            enableLiveFaceCheck={true}
            modelsLoaded={modelsLoaded}
            onCapture={handleCameraCapture}
            onClose={() => setCameraMode(null)}
          />
        )}

        {/* TERMS MODAL */}
        {showTermsModal && (
          <TermsModal
            onClose={() => setShowTermsModal(false)}
            onAgree={() => {
              setAgreedToTerms(true);
              setShowTermsModal(false);
            }}
          />
        )}
      </div>
    </div>
  );
}