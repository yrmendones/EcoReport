import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
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
import * as faceapi from "face-api.js";
import { apiFetch, API_BASE_URL } from "../../api";
import {
  DEFAULT_PASSWORD_POLICY,
  fetchPasswordPolicy,
} from "../../utils/passwordPolicy";
import {
  checkCameraPermission,
  isAndroidApp,
  openCameraAppSettings,
  requestCameraPermission,
} from "../../utils/cameraPermission";
import {
  getLiveFaceYaw,
  isUsableLiveFace,
} from "../../utils/residentRegistrationValidation";
import {
  extractResidentIdFields,
  isIdOcrReadInsufficient,
  matchResidentName,
  suggestIdImageRotation,
} from "../../utils/residentIdProcessing";

// ============================================================
// FACE VERIFICATION TOGGLE
// ============================================================
// `true`  = require ID face detection + live selfie capture during
//           registration. The admin still reviews manually.
// `false` = skip face section entirely (temporary bypass).
const REQUIRE_FACE_VERIFICATION = true;

// ============================================================
// CONSTANTS
// ============================================================
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
// tolerating typos: missing periods, extra spaces, partial keywords.
const STREET_STOPWORDS = new Set([
  "street", "st", "ave", "avenue", "compound", "comp", "the", "and",
]);

function normalizeStreet(str) {
  return String(str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findMatchingStreet(typed) {
  const n = normalizeStreet(typed);
  if (!n) return null;

  for (const s of STREETS) {
    if (normalizeStreet(s) === n) return s;
  }

  const contains = STREETS.filter((s) => normalizeStreet(s).includes(n));
  if (contains.length === 1) return contains[0];
  if (contains.length > 1) {
    return [...contains].sort((a, b) => a.length - b.length)[0];
  }

  for (const s of STREETS) {
    if (n.includes(normalizeStreet(s))) return s;
  }

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
  "Passport",
  "Postal ID",
  "Senior Citizen ID",
  "Tin ID",
  "Unified Multi-purpose ID (UMID)",
];

const ID_TYPE_KEYWORDS = {
  "Barangay ID": ["BARANGAY", "BRGY"],
  "Driver's License": ["DRIVER", "LICENSE", "LTO"],
  "ePhilID / Digital National ID": [
    "EPHILID", "PHILID", "PHILSYS", "PHILIPPINE IDENTIFICATION",
    "PAMBANSANG PAGKAKAKILANLAN",
  ],
  "National ID (PhilID)": [
    "PHILID", "PHILSYS", "PHILIPPINE IDENTIFICATION", "NATIONAL ID",
    "PAMBANSANG PAGKAKAKILANLAN",
  ],
  "National Police Clearance": ["POLICE", "CLEARANCE", "PNP"],
  "PWD ID": ["PWD", "PERSON WITH DISABILITY", "DISABILITY"],
  "Postal ID": ["POSTAL", "PHLPOST"],
  "Senior Citizen ID": ["SENIOR", "OSCA"],
  "Unified Multi-purpose ID (UMID)": [
    "UMID", "UNIFIED MULTI-PURPOSE", "SSS", "GSIS",
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
  const hasPhMarker = PH_MARKERS.map(normalizeText).some((m) => text.includes(m));
  return hasIdKeyword || hasPhMarker;
}

async function loadIdImageSource(file) {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, {
        imageOrientation: "from-image",
        resizeWidth: 2400,
        resizeQuality: "high",
      });
    } catch {
      try {
        return await createImageBitmap(file, { imageOrientation: "from-image" });
      } catch {
        // Fall through to the browser image decoder for older WebViews.
      }
    }
  }
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = reject;
      element.src = objectUrl;
    });
    return {
      image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      close: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

const nowMs = () => globalThis.performance?.now?.() ?? Date.now();
const ID_OCR_TIMEOUT_MS = 60000;
const ID_FACE_DETECTION_TIMEOUT_MS = 30000;

function withTimeout(promise, timeoutMs, message) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

function renderOcrImage(bitmap, { enhance = false, rotation = 0 } = {}) {
  const startedAt = nowMs();
  const imageSource = bitmap.image || bitmap;

  // The uploaded original is kept untouched. This OCR-only derivative is capped
  // at 2400px to keep WASM memory use predictable while retaining ID text detail.
  const maxSide = 2400;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const sourceWidth = Math.max(1, Math.round(bitmap.width * scale));
  const sourceHeight = Math.max(1, Math.round(bitmap.height * scale));
  const normalizedRotation = ((rotation % 360) + 360) % 360;
  const swapDimensions = normalizedRotation === 90 || normalizedRotation === 270;
  const canvas = document.createElement("canvas");
  canvas.width = swapDimensions ? sourceHeight : sourceWidth;
  canvas.height = swapDimensions ? sourceWidth : sourceHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Image processing is unavailable.");
  }
  if (normalizedRotation === 90) {
    ctx.translate(canvas.width, 0);
    ctx.rotate(Math.PI / 2);
  } else if (normalizedRotation === 180) {
    ctx.translate(canvas.width, canvas.height);
    ctx.rotate(Math.PI);
  } else if (normalizedRotation === 270) {
    ctx.translate(0, canvas.height);
    ctx.rotate(-Math.PI / 2);
  }
  if (enhance && "filter" in ctx) ctx.filter = "grayscale(1) contrast(118%)";
  ctx.drawImage(imageSource, 0, 0, sourceWidth, sourceHeight);
  ctx.filter = "none";

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob
        ? resolve({ blob, preprocessingMs: nowMs() - startedAt })
        : reject(new Error("Could not prepare the ID image.")),
      "image/jpeg",
      0.96
    );
  });
}

async function createFocusedTextCrop(sourceBlob, nameLines) {
  const bounds = (nameLines || []).map(({ bounds: lineBounds }) => lineBounds).filter(Boolean);
  if (!sourceBlob || !bounds.length) return null;

  let image;
  let objectUrl = null;
  try {
    if (typeof createImageBitmap === "function") {
      image = await createImageBitmap(sourceBlob);
    } else {
      objectUrl = URL.createObjectURL(sourceBlob);
      image = await new Promise((resolve, reject) => {
        const element = new Image();
        element.onload = () => resolve(element);
        element.onerror = reject;
        element.src = objectUrl;
      });
    }

    const imageWidth = image.width || image.naturalWidth;
    const imageHeight = image.height || image.naturalHeight;
    const textLeft = Math.min(...bounds.map(({ left }) => left));
    const textTop = Math.min(...bounds.map(({ top }) => top));
    const textRight = Math.max(...bounds.map(({ right }) => right));
    const textBottom = Math.max(...bounds.map(({ bottom }) => bottom));
    const textWidth = textRight - textLeft;
    const textHeight = textBottom - textTop;
    if (!imageWidth || !imageHeight || textWidth < 1 || textHeight < 1) return null;

    const paddingX = Math.max(20, textWidth * 0.06);
    const paddingY = Math.max(16, textHeight * 0.35);
    const left = Math.max(0, Math.floor(textLeft - paddingX));
    const top = Math.max(0, Math.floor(textTop - paddingY));
    const right = Math.min(imageWidth, Math.ceil(textRight + paddingX));
    const bottom = Math.min(imageHeight, Math.ceil(textBottom + paddingY));
    const cropWidth = right - left;
    const cropHeight = bottom - top;
    if (cropWidth < 1 || cropHeight < 1 || cropWidth * cropHeight > imageWidth * imageHeight * 0.72) {
      return null;
    }

    const scale = Math.min(3, 1920 / Math.max(cropWidth, cropHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(cropWidth * scale));
    canvas.height = Math.max(1, Math.round(cropHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    const startedAt = nowMs();
    context.drawImage(image, left, top, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.97));
    return blob ? { blob, left, top, scale, preprocessingMs: nowMs() - startedAt } : null;
  } catch {
    return null;
  } finally {
    image?.close?.();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

function mapFocusedTextItems(items, crop) {
  return (items || []).map((item) => {
    if (!Array.isArray(item?.poly)) return item;
    const poly = item.poly.map((point) => {
      const x = Number(Array.isArray(point) ? point[0] : point?.x);
      const y = Number(Array.isArray(point) ? point[1] : point?.y);
      return [crop.left + x / crop.scale, crop.top + y / crop.scale];
    });
    return { ...item, poly };
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
// CAMERA MODAL
// ============================================================
function CameraModal({
  title,
  hint,
  facing,
  captureType = "selfie",
  onCapture,
  onClose,
  enableLiveFaceCheck = false,
  modelsLoaded = true,
  modelsLoadError = false,
  onRetryModels,
  onPermissionLost,
}) {
  const videoRef = useRef(null);
  const previewRef = useRef(null);
  const streamRef = useRef(null);
  const capturedUrlRef = useRef(null);
  const detectionIntervalRef = useRef(null);
  const detectingRef = useRef(false);
  const onPermissionLostRef = useRef(onPermissionLost);
  const livenessRef = useRef({
    step: "position",
    stableFrames: 0,
    yawSamples: [],
    turnFrames: 0,
    baselineYaw: 0,
    challengeStartedAt: 0,
    completedAt: 0,
  });

  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [camError, setCamError] = useState("");
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [liveStep, setLiveStep] = useState("position");
  const [liveError, setLiveError] = useState("");
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [videoAspectRatio, setVideoAspectRatio] = useState(null);
  const [isLandscape, setIsLandscape] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(orientation: landscape)").matches
  );
  const [guideSize, setGuideSize] = useState(null);

  useEffect(() => {
    onPermissionLostRef.current = onPermissionLost;
  }, [onPermissionLost]);

  useEffect(() => {
    if (captureType !== "id") return undefined;
    const bodyOverflow = document.body.style.overflow;
    const pageOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = pageOverflow;
    };
  }, [captureType]);

  const restartLiveness = (message = "") => {
    livenessRef.current = {
      step: "position",
      stableFrames: 0,
      yawSamples: [],
      turnFrames: 0,
      baselineYaw: 0,
      challengeStartedAt: 0,
      completedAt: 0,
    };
    setLiveStep("position");
    setLiveError(message);
    setIsFaceDetected(false);
  };

  useEffect(() => {
    if (captureType !== "id") return undefined;
    const mediaQuery = window.matchMedia("(orientation: landscape)");
    const updateOrientation = () => setIsLandscape(mediaQuery.matches);
    updateOrientation();
    if (mediaQuery.addEventListener) mediaQuery.addEventListener("change", updateOrientation);
    else mediaQuery.addListener?.(updateOrientation);
    window.addEventListener("resize", updateOrientation);
    return () => {
      if (mediaQuery.removeEventListener) mediaQuery.removeEventListener("change", updateOrientation);
      else mediaQuery.removeListener?.(updateOrientation);
      window.removeEventListener("resize", updateOrientation);
    };
  }, [captureType]);

  useEffect(() => {
    if (captureType !== "id") return undefined;
    const preview = previewRef.current;
    if (!preview) return undefined;
    const measureGuide = () => {
      const { width, height } = preview.getBoundingClientRect();
      if (!width || !height) return;
      let videoWidth = width;
      let videoHeight = height;
      if (videoAspectRatio > 0) {
        if (width / height > videoAspectRatio) {
          videoWidth = height * videoAspectRatio;
        } else {
          videoHeight = width / videoAspectRatio;
        }
      }
      const frameWidth = Math.min(videoWidth * 0.95, videoHeight * 0.95 * 1.586);
      const next = { width: frameWidth, height: frameWidth / 1.586 };
      setGuideSize((current) => current &&
        Math.abs(current.width - next.width) < 0.5 &&
        Math.abs(current.height - next.height) < 0.5
        ? current
        : next);
    };
    measureGuide();
    const observer = typeof ResizeObserver === "function"
      ? new ResizeObserver(measureGuide)
      : null;
    observer?.observe(preview);
    window.addEventListener("resize", measureGuide);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measureGuide);
    };
  }, [captureType, isLandscape, videoAspectRatio]);

  useEffect(() => {
    if (captureType === "id" && capturedPhoto) return undefined;
    let cancelled = false;
    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCamError("Camera is not supported on this browser (HTTPS is required).");
        return;
      }
      try {
        setCamError("");
        setReady(false);
        const idLandscape = captureType === "id" && isLandscape;
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facing },
            width: { ideal: captureType === "id" ? (idLandscape ? 1920 : 1080) : 1280 },
            height: { ideal: captureType === "id" ? (idLandscape ? 1080 : 1920) : 720 },
            aspectRatio: {
              ideal: captureType === "id" ? (idLandscape ? 16 / 9 : 9 / 16) : 4 / 3,
            },
          },
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
      } catch (err) {
        console.error("Camera error:", err);
        if (
          (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") &&
          onPermissionLostRef.current
        ) {
          onPermissionLostRef.current();
          return;
        }
        setCamError(
          "Unable to open the camera. Please allow camera access and try again."
        );
      }
    };

    start();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [facing, captureType, isLandscape, capturedPhoto]);

  useEffect(() => () => {
    if (capturedUrlRef.current) URL.revokeObjectURL(capturedUrlRef.current);
  }, []);

  useEffect(() => {
    if (!enableLiveFaceCheck) return undefined;
    let checkingPermission = false;
    const recheckPermission = async () => {
      if (document.visibilityState === "hidden" || checkingPermission) return;
      checkingPermission = true;
      try {
        const permission = await checkCameraPermission();
        if (!permission.granted) {
          streamRef.current?.getTracks().forEach((track) => track.stop());
          onPermissionLostRef.current?.();
        }
      } catch (error) {
        console.warn("Unable to recheck Android camera permission:", error);
      } finally {
        checkingPermission = false;
      }
    };

    document.addEventListener("visibilitychange", recheckPermission);
    window.addEventListener("focus", recheckPermission);
    return () => {
      document.removeEventListener("visibilitychange", recheckPermission);
      window.removeEventListener("focus", recheckPermission);
    };
  }, [enableLiveFaceCheck]);

  useEffect(() => {
    if (!enableLiveFaceCheck || !modelsLoaded) return undefined;
    let cancelled = false;

    const completeTurnCheck = (state) => {
      state.step = "complete";
      state.completedAt = Date.now();
      setLiveStep("complete");
      setLiveError("");
    };

    const detect = async () => {
      if (cancelled) return;
      const video = videoRef.current;
      if (!video || video.readyState < 2 || !video.videoWidth || detectingRef.current) return;
      detectingRef.current = true;
      try {
        const faces = await faceapi
          .detectAllFaces(
            video,
            new faceapi.SsdMobilenetv1Options({ minConfidence: 0.72 })
          )
          .withFaceLandmarks();
        if (cancelled) return;
        if (faces.length !== 1 || !isUsableLiveFace(faces[0], video.videoWidth, video.videoHeight)) {
          setIsFaceDetected(false);
          const state = livenessRef.current;
          restartLiveness(state.step === "position"
            ? ""
            : "The face left the frame or could not be checked. Start the live selfie check again.");
          return;
        }

        const yaw = getLiveFaceYaw(faces[0].landmarks);
        if (!Number.isFinite(yaw)) {
          setIsFaceDetected(false);
          restartLiveness("We couldn't clearly see your face. Adjust the lighting and try again.");
          return;
        }
        setIsFaceDetected(true);
        const state = livenessRef.current;
        if (state.step === "complete") return;

        if (state.step !== "position" && Date.now() - state.challengeStartedAt > 30000) {
          restartLiveness("The liveness check timed out. Try the selfie check again.");
          return;
        }

        if (state.step === "position") {
          state.stableFrames += 1;
          state.yawSamples.push(yaw);
          if (state.stableFrames >= 5) {
            state.baselineYaw = state.yawSamples.reduce((sum, value) => sum + value, 0) / state.yawSamples.length;
            state.step = "turn";
            state.challengeStartedAt = Date.now();
            setLiveStep("turn");
            setLiveError("");
          }
        } else if (state.step === "turn") {
          if (Math.abs(yaw - state.baselineYaw) >= 0.12) {
            state.turnFrames += 1;
            if (state.turnFrames >= 2) completeTurnCheck(state);
          } else {
            state.turnFrames = 0;
          }
        }
      } catch (err) {
        console.warn("Live selfie face check failed:", err);
      } finally {
        detectingRef.current = false;
      }
    };

    detectionIntervalRef.current = setInterval(detect, 180);
    return () => {
      cancelled = true;
      if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
      detectingRef.current = false;
    };
  }, [enableLiveFaceCheck, modelsLoaded]);

  const handleCapture = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    if (enableLiveFaceCheck) {
      const state = livenessRef.current;
      if (state.step !== "complete" || Date.now() - state.completedAt > 5000) {
        restartLiveness("Complete the live face and movement checks before capturing.");
        return;
      }
      try {
        const faces = await faceapi
          .detectAllFaces(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.72 }))
          .withFaceLandmarks();
        if (
          faces.length !== 1 ||
          !isUsableLiveFace(faces[0], video.videoWidth, video.videoHeight)
        ) throw new Error("A clear single live face was not visible.");
      } catch {
        restartLiveness("We couldn't verify a clear live face in the camera. Try the selfie check again.");
        return;
      }
    }
    setBusy(true);
    setCamError("");

    // Bound canvas memory while retaining enough pixels for ID text and portrait review.
    const MAX_DIM = captureType === "id" ? 2400 : 1280;
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
        if (captureType === "id") {
          const previewUrl = URL.createObjectURL(blob);
          capturedUrlRef.current = previewUrl;
          streamRef.current?.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
          setReady(false);
          setCapturedPhoto({
            file,
            previewUrl,
          });
          setBusy(false);
          return;
        }
        onCapture(file);
      },
      "image/jpeg",
      captureType === "id" ? 0.96 : 0.85
    );
  };

  const retakeCapturedPhoto = () => {
    if (capturedUrlRef.current) URL.revokeObjectURL(capturedUrlRef.current);
    capturedUrlRef.current = null;
    setCapturedPhoto(null);
  };

  const useCapturedPhoto = () => {
    if (!capturedPhoto) return;
    const { file } = capturedPhoto;
    if (capturedUrlRef.current) URL.revokeObjectURL(capturedUrlRef.current);
    capturedUrlRef.current = null;
    setCapturedPhoto(null);
    onCapture(file);
  };

  const liveCheckReady = !enableLiveFaceCheck || (modelsLoaded && liveStep === "complete");
  const canCapture = ready && !busy && liveCheckReady;
  const statusMessage = !modelsLoaded
    ? modelsLoadError
      ? "Live selfie checks could not load. Retry to continue."
      : "Loading live selfie checks..."
    : liveStep === "position"
      ? "Center one face in the oval and hold still..."
      : liveStep === "turn"
        ? "Turn your head slightly to either side to confirm liveness."
        : "Live selfie verified. Capture now.";

  if (captureType === "id") {
    return createPortal(
      <div
        className="resident-id-camera-overlay"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className={`resident-id-camera-layout ${isLandscape ? "is-landscape" : "is-portrait"}`}>
            <div className="resident-id-camera-preview" ref={previewRef}>
              <video
                ref={videoRef}
                onLoadedMetadata={(event) => {
                  const { videoWidth, videoHeight } = event.currentTarget;
                  if (videoWidth > 0 && videoHeight > 0) {
                    setVideoAspectRatio(videoWidth / videoHeight);
                  }
                }}
                playsInline
                muted
                autoPlay
                aria-label="Live resident ID camera preview"
              />
              {capturedPhoto && (
                <img
                  src={capturedPhoto.previewUrl}
                  alt="Captured resident ID photo"
                  className="resident-id-camera-captured"
                />
              )}
              {!ready && !camError && !capturedPhoto && (
                <div className="resident-id-camera-spinner">
                  <FaSpinner className="animate-spin" size={32} />
                </div>
              )}
              {ready && !capturedPhoto && (
                <div className="resident-id-camera-guide-wrap" aria-hidden="true">
                  <div
                    className="resident-id-camera-guide"
                    style={guideSize ? { width: `${guideSize.width}px`, height: `${guideSize.height}px` } : undefined}
                  />
                </div>
              )}
            </div>

            <aside className="resident-id-camera-panel">
              <header className="resident-id-camera-header">
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close camera"
                  className="resident-id-camera-close"
                >
                  <FaTimes />
                </button>
              </header>
              <div className="resident-id-camera-guidance">
                <h2>{title}</h2>
                <p>Keep your entire ID inside the frame. Make sure the text is visible and avoid glare or shadows.</p>
              </div>

              <div className="resident-id-camera-messages" aria-live="polite">
                {camError && <p className="resident-id-camera-error">{camError}</p>}
                {busy && !capturedPhoto && (
                  <p className="resident-id-camera-scan-status">
                    Capturing the full-resolution ID photo...
                  </p>
                )}
              </div>

              <div className={`resident-id-camera-actions ${capturedPhoto ? "is-review" : "is-capture"}`}>
                {capturedPhoto ? (
                  <>
                    <button
                      type="button"
                      onClick={retakeCapturedPhoto}
                      className="resident-id-camera-retake"
                    >
                      Retake
                    </button>
                    <button
                      type="button"
                      onClick={useCapturedPhoto}
                      className="resident-id-camera-confirm"
                    >
                      Use this photo
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleCapture}
                    disabled={!ready || busy}
                    className="resident-id-camera-capture"
                  >
                    {busy ? <FaSpinner className="animate-spin" /> : <FaCamera />}
                    {busy ? "Capturing…" : "Capture ID"}
                  </button>
                )}
              </div>
            </aside>
        </div>
      </div>,
      document.body
    );
  }

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
          className={`w-full h-full ${captureType === "id" ? "object-contain" : "object-cover"}`}
          style={{ transform: facing === "user" ? "scaleX(-1)" : "none" }}
        />
        {capturedPhoto && (
          <img
            src={capturedPhoto.previewUrl}
            alt="Captured resident ID preview"
            className="absolute inset-0 w-full h-full object-contain bg-black"
          />
        )}
        {!ready && !camError && !capturedPhoto && (
          <div className="absolute inset-0 flex items-center justify-center">
            <FaSpinner className="animate-spin text-white" size={32} />
          </div>
        )}
        {captureType === "id" && ready && !capturedPhoto && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="rounded-xl border-[3px] border-white"
              style={{ width: "90%", aspectRatio: "1.586 / 1", boxShadow: "0 0 0 999px rgba(0,0,0,0.34)" }}
            />
            <span className="absolute top-4 left-4 right-4 text-center text-white text-[13px] font-bold drop-shadow-lg">
              Fit the entire ID inside the rectangle
            </span>
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
                  : liveStep === "complete"
                  ? "#22c55e"
                  : isFaceDetected
                    ? "#eab308"
                    : "#ef4444",
              }}
            >
              {statusMessage}
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

      {liveError && enableLiveFaceCheck && (
        <div className="bg-red-100 border border-red-300 rounded-xl text-red-700 text-[13px] leading-5 p-3 shrink-0">
          <p>{liveError}</p>
          <button
            type="button"
            onClick={() => restartLiveness("")}
            className="underline font-bold mt-1"
          >
            Try the live selfie check again
          </button>
        </div>
      )}

      {enableLiveFaceCheck && !modelsLoaded && modelsLoadError && (
        <button
          type="button"
          onClick={onRetryModels}
          className="text-white underline text-sm font-bold"
        >
          Retry loading face checks
        </button>
      )}

      {capturedPhoto ? (
        <>
          <div className="grid grid-cols-2 gap-3 shrink-0">
            <button
              type="button"
              onClick={retakeCapturedPhoto}
              className="min-h-[54px] rounded-2xl border border-white/60 text-white font-extrabold text-[15px]"
            >
              Retake
            </button>
            <button
              type="button"
              onClick={useCapturedPhoto}
              className="min-h-[54px] rounded-2xl bg-[#0B5D2A] text-white font-extrabold text-[15px]"
            >
              Use this photo
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={handleCapture}
          disabled={!canCapture}
          className="w-full min-h-[54px] rounded-2xl bg-[#0B5D2A] text-white font-extrabold text-[16px] flex items-center justify-center shadow-md hover:bg-[#084A21] active:scale-[0.98] transition disabled:opacity-50 shrink-0"
          style={{ gap: "12px" }}
        >
          {busy ? <FaSpinner className="animate-spin" /> : <FaCamera />}
          {busy ? "Capturing..." : enableLiveFaceCheck ? "Capture Live Selfie" : "Capture"}
        </button>
      )}
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
            <h3 className="font-bold text-[#0B5D2A] text-sm mb-1">1. Acceptance of Terms</h3>
            <p>
              By registering for or using the Barangay EcoReport System, you
              acknowledge that you have read, understood, and agreed to these
              Terms and Conditions. If you do not agree with these terms, please
              refrain from using the system.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-[#0B5D2A] text-sm mb-1">2. Purpose of the System</h3>
            <p>
              The Barangay EcoReport System is designed to help residents report
              environmental concerns, monitor the status of submitted reports,
              receive community announcements, access waste collection schedules,
              and use other available barangay services.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-[#0B5D2A] text-sm mb-1">3. Account Registration and Responsibilities</h3>
            <p>
              Users must provide accurate, complete, and updated information when
              registering. Each user is responsible for maintaining the
              confidentiality of their account credentials and for all activities
              performed through their account. Users must promptly report any
              suspected unauthorized access to their accounts.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-[#0B5D2A] text-sm mb-1">4. Submission of Environmental Reports</h3>
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
            <h3 className="font-bold text-[#0B5D2A] text-sm mb-1">5. Uploaded Photos, Videos, and Other Evidence</h3>
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
            <h3 className="font-bold text-[#0B5D2A] text-sm mb-1">6. Report Status and Response Time</h3>
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
            <h3 className="font-bold text-[#0B5D2A] text-sm mb-1">7. Proper Use of the System</h3>
            <p>Users agree not to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Provide false identities or impersonate another person.</li>
              <li>Submit fraudulent, abusive, or intentionally misleading reports.</li>
              <li>Attempt to access another user's account or private information without authorization.</li>
              <li>Interfere with, damage, or disrupt the system or its services.</li>
              <li>Use the system for unlawful activities or purposes unrelated to its intended functions.</li>
            </ul>
            <p className="mt-2">
              Violations may result in account restrictions or other appropriate
              action in accordance with applicable policies and laws.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-[#0B5D2A] text-sm mb-1">8. Privacy and Personal Information</h3>
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
            <h3 className="font-bold text-[#0B5D2A] text-sm mb-1">9. Data Accuracy and System Availability</h3>
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
            <h3 className="font-bold text-[#0B5D2A] text-sm mb-1">10. Third-Party Services and External Links</h3>
            <p>
              The system may contain links to external websites or services for
              additional information or assistance. These external services may
              be governed by their own terms and privacy policies. The Barangay
              EcoReport System is not responsible for the content or practices of
              third-party services outside its control.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-[#0B5D2A] text-sm mb-1">11. Account Suspension or Restriction</h3>
            <p>
              The system administrators may investigate suspected misuse and
              restrict, suspend, or disable accounts when there are reasonable
              grounds to believe that these Terms and Conditions have been
              violated, subject to applicable policies and laws.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-[#0B5D2A] text-sm mb-1">12. Changes to These Terms</h3>
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
            <h3 className="font-bold text-[#0B5D2A] text-sm mb-1">13. Limitation of Responsibility</h3>
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
            <h3 className="font-bold text-[#0B5D2A] text-sm mb-1">14. Governing Laws</h3>
            <p>
              These Terms and Conditions shall be interpreted in accordance with
              applicable laws and regulations of the Republic of the Philippines.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-[#0B5D2A] text-sm mb-1">15. Contact and Assistance</h3>
            <p>
              For questions, concerns, or assistance regarding the Barangay
              EcoReport System, users may contact the authorized barangay office
              or the designated system administrator through the official contact
              channels provided by the barangay.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-[#0B5D2A] text-sm mb-1">16. Agreement and Consent</h3>
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

  // ---------- Password policy ----------
  const [passwordPolicy, setPasswordPolicy] = useState(DEFAULT_PASSWORD_POLICY);
  useEffect(() => {
    let cancelled = false;
    fetchPasswordPolicy(apiFetch).then((policy) => {
      if (!cancelled) setPasswordPolicy(policy);
    });
    return () => { cancelled = true; };
  }, []);

  // ---------- ID + OCR + face ----------
  const [residentIdFile, setResidentIdFile] = useState(null);
  const [residentIdPreview, setResidentIdPreview] = useState(null);
  const residentIdPreviewUrlRef = useRef(null);
  useEffect(() => () => {
    if (residentIdPreviewUrlRef.current) URL.revokeObjectURL(residentIdPreviewUrlRef.current);
  }, []);

  const [ocrText, setOcrText] = useState("");
  const [ocrItems, setOcrItems] = useState([]);
  const [ocrConfidence, setOcrConfidence] = useState(null);
  const [ocrScanStatus, setOcrScanStatus] = useState("idle");
  const [ocrStage, setOcrStage] = useState("");
  const ocrRunIdRef = useRef(0);
  const ocrEngineRef = useRef(null);
  const ocrPerformanceRef = useRef(null);
  const ocrPerformanceLoggedRunRef = useRef(0);

  const extractedIdFields = useMemo(
    () => extractResidentIdFields(ocrItems, {
      first_name: formData.first_name,
      last_name: formData.last_name,
    }),
    [ocrItems, formData.first_name, formData.last_name]
  );

  const ocrValidation = useMemo(() => {
    const startedAt = nowMs();
    let result;
    if (ocrScanStatus === "idle" || ocrScanStatus === "scanning") {
      result = { passed: false, requiresManualReview: false, reason: "", confidence: null };
    } else if (ocrScanStatus === "error") {
      result = {
        passed: false,
        requiresManualReview: true,
        reason: "The ID name is missing or unclear. Retake the photo.",
        confidence: null,
      };
    } else {
      const idLooksReadable = looksLikeValidId(ocrText, idType);
      const nameOk = matchResidentName(ocrItems, formData, extractedIdFields);
      const confidence = nameOk.confidence ?? extractedIdFields.nameConfidence ?? ocrConfidence;
      const hasRegistrationFirstName = Boolean(String(formData.first_name || "").trim());
      const hasRegistrationLastName = Boolean(String(formData.last_name || "").trim());

      if (!hasRegistrationFirstName || !hasRegistrationLastName) {
        result = { passed: false, requiresManualReview: false, reason: "", confidence, nameOk };
      } else {
        const uncertain =
          !idLooksReadable ||
          !extractedIdFields.nameLines.length ||
          (!nameOk.passed && (!extractedIdFields.firstName || !extractedIdFields.lastName)) ||
          nameOk.confidence == null ||
          nameOk.confidence < 0.5;

        if (idLooksReadable && nameOk.passed && !uncertain) {
          result = { passed: true, requiresManualReview: false, reason: "", confidence, nameOk };
        } else if (uncertain) {
          result = {
            passed: false,
            requiresManualReview: true,
            reason: "The ID name is missing or unclear. Retake the photo.",
            confidence,
            nameOk,
          };
        } else {
          result = {
            passed: false,
            requiresManualReview: false,
            reason: `The readable name does not match (missing: ${nameOk.missing.join(", ")}). Check the form or retake the ID.`,
            confidence,
            nameOk,
          };
        }
      }
    }
    return { ...result, finalRegistrationMatchingMs: nowMs() - startedAt };
  }, [ocrScanStatus, ocrText, ocrItems, ocrConfidence, idType, formData, extractedIdFields]);

  useEffect(() => {
    const runId = ocrRunIdRef.current;
    const timings = ocrPerformanceRef.current;
    if (
      !residentIdFile ||
      !["done", "error"].includes(ocrScanStatus) ||
      !runId ||
      ocrPerformanceLoggedRunRef.current === runId ||
      timings?.runId !== runId
    ) return;
    ocrPerformanceLoggedRunRef.current = runId;
    console.info("[ID OCR performance]", {
      ...timings,
      finalRegistrationMatchingMs: ocrValidation.finalRegistrationMatchingMs,
      endToEndThroughMatchingMs: nowMs() - timings.startedAt,
    });
  }, [ocrScanStatus, ocrValidation, residentIdFile]);

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [modelsLoadError, setModelsLoadError] = useState(false);
  const [modelLoadAttempt, setModelLoadAttempt] = useState(0);
  const [idFaceFound, setIdFaceFound] = useState(false);
  const [idFaceProcessing, setIdFaceProcessing] = useState(false);
  const [idFaceChecked, setIdFaceChecked] = useState(false);
  const [idFaceError, setIdFaceError] = useState("");
  const idFaceRunIdRef = useRef(0);

  // ---------- Selfie ----------
  const [faceFile, setFaceFile] = useState(null);
  const [facePreview, setFacePreview] = useState(null);

  // ---------- UI ----------
  const [cameraMode, setCameraMode] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cameraPermissionFeedback, setCameraPermissionFeedback] = useState(null);
  const [cameraPermissionLoading, setCameraPermissionLoading] = useState(false);

  // ============ Load face-api models ============
  useEffect(() => {
    let cancelled = false;
    const loadModels = async () => {
      setModelsLoadError(false);
      try {
        const MODEL_URL =
          "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights";
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        ]);
        if (!cancelled) setModelsLoaded(true);
      } catch (err) {
        console.error("Failed to load face-api models:", err);
        if (!cancelled) setModelsLoadError(true);
      }
    };
    loadModels();
    return () => { cancelled = true; };
  }, [modelLoadAttempt]);

  // ============ OCR engine ============
  const getOcrEngine = async () => {
    if (window.__ecoOcrEngine?.failed) {
      window.__ecoOcrEngine.terminate();
      delete window.__ecoOcrEngine;
    }
    if (ocrEngineRef.current?.failed) ocrEngineRef.current = null;
    if (window.__ecoOcrEngine) {
      ocrEngineRef.current = window.__ecoOcrEngine;
      return window.__ecoOcrEngine;
    }
    if (ocrEngineRef.current) {
      window.__ecoOcrEngine = ocrEngineRef.current;
      return ocrEngineRef.current;
    }

    if (window.__ecoOcrEnginePromise) {
      const engine = await window.__ecoOcrEnginePromise;
      ocrEngineRef.current = engine;
      return engine;
    }

    const enginePromise = (async () => {
      const { PaddleOCR } = await import("@paddleocr/paddleocr-js");
      const cores = navigator.hardwareConcurrency || 4;
      const paddleEngine = await PaddleOCR.create({
        lang: "en",
        ocrVersion: "PP-OCRv5",
        // PaddleOCR owns the worker, so image conversion and inference stay off
        // the UI thread without creating a worker inside another worker.
        worker: true,
        ortOptions: {
          backend: "wasm",
          wasmPaths: "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.1/dist/",
          numThreads: Math.max(1, Math.min(2, cores - 1)),
          simd: true,
        },
      });
      let failed = false;
      const terminate = () => {
        if (failed) return;
        failed = true;
        void paddleEngine.dispose().catch(() => {});
      };
      const engine = {
        get failed() {
          return failed;
        },
        terminate,
        async predict(blob, params = {}) {
          if (failed) throw new Error("Background OCR worker is unavailable.");
          try {
            return await paddleEngine.predict(blob, params);
          } catch (error) {
            terminate();
            throw error;
          }
        },
      };
      window.__ecoOcrWorkerMode = true;
      return engine;
    })();
    window.__ecoOcrEnginePromise = enginePromise;
    try {
      const engine = await enginePromise;
      ocrEngineRef.current = engine;
      window.__ecoOcrEngine = engine;
      return engine;
    } catch (error) {
      if (window.__ecoOcrEnginePromise === enginePromise) {
        delete window.__ecoOcrEnginePromise;
      }
      throw error;
    } finally {
      if (window.__ecoOcrEnginePromise === enginePromise) {
        delete window.__ecoOcrEnginePromise;
      }
    }
  };

  useEffect(() => {
    let cancelled = false;
    let idleHandle = null;
    let timeoutHandle = null;
    const warmUpOcr = () => {
      if (cancelled || document.visibilityState === "hidden") return;
      getOcrEngine().catch((error) => {
        console.info("[ID OCR] Engine will initialize again when an ID is selected.", error);
      });
    };

    if (typeof window.requestIdleCallback === "function") {
      idleHandle = window.requestIdleCallback(warmUpOcr, { timeout: 2500 });
    } else {
      timeoutHandle = window.setTimeout(warmUpOcr, 1200);
    }

    return () => {
      cancelled = true;
      if (idleHandle != null) window.cancelIdleCallback?.(idleHandle);
      if (timeoutHandle != null) window.clearTimeout(timeoutHandle);
    };
    // The OCR engine uses window-level caching and does not depend on form state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============ Face detection on ID ============
  const processIdFace = async (file) => {
    const runId = ++idFaceRunIdRef.current;
    if (!modelsLoaded) {
      setIdFaceChecked(false);
      return;
    }
    setIdFaceProcessing(true);
    setIdFaceChecked(false);
    setIdFaceFound(false);
    setIdFaceError("");
    try {
      const result = await withTimeout((async () => {
        let img;
        if (typeof createImageBitmap === "function") {
          try {
            img = await createImageBitmap(file, {
              imageOrientation: "from-image",
              resizeWidth: 1600,
              resizeQuality: "high",
            });
          } catch {
            img = await faceapi.bufferToImage(file);
          }
        } else {
          img = await faceapi.bufferToImage(file);
        }
        if (runId !== idFaceRunIdRef.current) {
          img.close?.();
          return null;
        }
        const imageWidth = img.width || img.naturalWidth;
        const imageHeight = img.height || img.naturalHeight;
        const scale = Math.min(1, 1600 / Math.max(imageWidth, imageHeight));
        const detectionImage = document.createElement("canvas");
        detectionImage.width = Math.max(1, Math.round(imageWidth * scale));
        detectionImage.height = Math.max(1, Math.round(imageHeight * scale));
        detectionImage.getContext("2d")?.drawImage(
          img,
          0,
          0,
          detectionImage.width,
          detectionImage.height
        );
        img.close?.();
        const detection = await faceapi
          .detectSingleFace(detectionImage, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.35 }))
          .withFaceLandmarks();
        return detection;
      })(), ID_FACE_DETECTION_TIMEOUT_MS, "ID portrait detection timed out.");
      if (runId !== idFaceRunIdRef.current) return;
      if (!result) return;
      const detection = result;

      if (!detection) {
        setIdFaceFound(false);
        setIdFaceError(
          "No face detected on this ID. Please upload a clear photo."
        );
        return;
      }

      const box = detection.detection.box;
      if (box.width < 48 || box.height < 48) {
        setIdFaceFound(false);
        setIdFaceError(
          `The face on your ID is too small (${Math.round(box.width)}×${Math.round(
            box.height
          )}px). Please retake the photo closer so the whole ID fills the frame.`
        );
        return;
      }

      setIdFaceFound(true);
    } catch (err) {
      if (runId !== idFaceRunIdRef.current) return;
      console.error("Error processing ID face:", err);
      setIdFaceFound(false);
      setIdFaceError(err?.message === "ID portrait detection timed out."
        ? "Portrait detection is taking too long. Please retake the ID so we can check the portrait."
        : "Couldn't analyze the ID photo. Please try again.");
    } finally {
      if (runId === idFaceRunIdRef.current) {
        setIdFaceProcessing(false);
        setIdFaceChecked(true);
      }
    }
  };

  // ============ OCR on ID ============
  const runIdOcr = async (file, source = "gallery") => {
    if (!file) return;
    const runId = ++ocrRunIdRef.current;
    const startedAt = nowMs();
    const timings = {
      runId,
      source,
      startedAt,
      workerMode: null,
      modelCacheHit: Boolean(window.__ecoOcrEngine || ocrEngineRef.current),
      imageDecodeMs: 0,
      modelInitializationMs: 0,
      preprocessingMs: 0,
      predictionMs: 0,
      detectorMs: 0,
      recognizerMs: 0,
      fieldExtractionMs: 0,
      retryPasses: 0,
      recognizedRegions: 0,
    };
    setOcrScanStatus("scanning");
    setOcrStage("Waiting for text recognition…");
    setOcrText("");
    setOcrItems([]);
    setOcrConfidence(null);

    const previousJob = window.__ecoOcrQueue || Promise.resolve();
    const job = previousJob.catch(() => {}).then(async () => {
      if (runId !== ocrRunIdRef.current) return;
      let bitmap;
      try {
        setOcrStage("Preparing ID image…");
        const decodeStartedAt = nowMs();
        const modelStartedAt = nowMs();
        const [imageResult, engineResult] = await Promise.allSettled([
          loadIdImageSource(file).finally(() => {
            timings.imageDecodeMs = nowMs() - decodeStartedAt;
          }),
          getOcrEngine().finally(() => {
            timings.modelInitializationMs = nowMs() - modelStartedAt;
          }),
        ]);
        if (imageResult.status === "fulfilled") bitmap = imageResult.value;
        if (engineResult.status === "rejected") throw engineResult.reason;
        if (imageResult.status === "rejected") throw imageResult.reason;
        const engine = engineResult.value;
        timings.workerMode = Boolean(window.__ecoOcrWorkerMode);
        if (runId !== ocrRunIdRef.current) return;
        const registrationNamesComplete = Boolean(
          String(formData.first_name || "").trim() && String(formData.last_name || "").trim()
        );

        const readCandidate = async ({ enhance = false, rotation = 0, label }) => {
          if (runId !== ocrRunIdRef.current) return null;
          setOcrStage(label);
          const prepared = await renderOcrImage(bitmap, { enhance, rotation });
          timings.preprocessingMs += prepared.preprocessingMs;
          const predictionStartedAt = nowMs();
          const results = await engine.predict(prepared.blob);
          timings.predictionMs += nowMs() - predictionStartedAt;
          if (runId !== ocrRunIdRef.current) return null;
          const data = Array.isArray(results) ? results[0] : results;
          const items = data?.items || [];
          timings.detectorMs += Number(data?.metrics?.detMs) || 0;
          timings.recognizerMs += Number(data?.metrics?.recMs) || 0;
          timings.recognizedRegions = Math.max(timings.recognizedRegions, items.length);

          const extractionStartedAt = nowMs();
          const text = items.map((item) => item.text || "").join("\n");
          const confidenceScores = items
            .filter((item) => item.score != null)
            .map((item) => Number(item.score))
            .filter(Number.isFinite);
          const confidence = confidenceScores.length
            ? confidenceScores.reduce((sum, value) => sum + value, 0) / confidenceScores.length
            : null;
          const fields = extractResidentIdFields(items, formData);
          const idLooksReadable = looksLikeValidId(text, idType);
          const nameMatch = matchResidentName(items, formData, fields);
          const nameConfidence = nameMatch.confidence ?? fields.nameConfidence;
          const verifiedNameAndId = registrationNamesComplete &&
            idLooksReadable &&
            nameMatch.passed &&
            nameConfidence != null &&
            nameConfidence >= 0.5;
          const score = (registrationNamesComplete && nameMatch.passed ? 0.75 : 0) +
            (confidence ?? 0) * 0.6 +
            (fields.nameText ? 0.15 : 0) +
            (idLooksReadable ? 0.25 : 0);
          timings.fieldExtractionMs += nowMs() - extractionStartedAt;
          const insufficient = isIdOcrReadInsufficient({
            itemCount: items.length,
            text,
            confidence,
          });
          return {
            items,
            text,
            confidence,
            fields,
            nameMatch,
            nameConfidence,
            score,
            insufficient,
            verifiedNameAndId,
            sourceBlob: prepared.blob,
          };
        };

        let best = await readCandidate({ label: "Reading ID text…" });
        if (!best || runId !== ocrRunIdRef.current) return;
        const needsFullImageRetry = (candidate) => candidate.insufficient && !candidate.verifiedNameAndId;
        if (needsFullImageRetry(best)) {
          // Use detected text direction only. The photo itself may be portrait
          // while the ID inside it is correctly horizontal.
          const firstRotation = suggestIdImageRotation(best.items, 0, 0);
          timings.retryPasses += 1;
          const enhanced = await readCandidate({
            enhance: true,
            rotation: firstRotation ?? 0,
            label: firstRotation == null
              ? "Improving text contrast…"
              : "Correcting ID orientation…",
          });
          if (!enhanced || runId !== ocrRunIdRef.current) return;
          if (!needsFullImageRetry(enhanced) || enhanced.score > best.score) best = enhanced;

          // A clearer retry can expose sideways text the first pass couldn't
          // orient. Only pay for one more full-card pass when OCR shows that.
          const retryRotation = suggestIdImageRotation(enhanced.items, 0, 0);
          if (
            needsFullImageRetry(best) &&
            retryRotation != null &&
            retryRotation !== firstRotation
          ) {
            timings.retryPasses += 1;
            const corrected = await readCandidate({
              enhance: true,
              rotation: retryRotation,
              label: "Correcting ID orientation…",
            });
            if (!corrected || runId !== ocrRunIdRef.current) return;
            if (!needsFullImageRetry(corrected) || corrected.score > best.score) best = corrected;
          }
        }
        if (runId !== ocrRunIdRef.current) return;

        const retryFocusedRegion = async (candidateLines, label, isUseful) => {
          if (!candidateLines?.length || runId !== ocrRunIdRef.current) return;
          const focusedCrop = await createFocusedTextCrop(best.sourceBlob, candidateLines);
          if (!focusedCrop || runId !== ocrRunIdRef.current) return;
          try {
            setOcrStage(`Zooming in on the ID ${label} text…`);
            timings.preprocessingMs += focusedCrop.preprocessingMs;
            timings.retryPasses += 1;
            const predictionStartedAt = nowMs();
            // Name text is a small part of the full ID. Spend more detector
            // resolution on this small crop instead of slowing every full-card pass.
            const focusedResults = await engine.predict(focusedCrop.blob, {
              textDetLimitSideLen: 1280,
            });
            timings.predictionMs += nowMs() - predictionStartedAt;
            if (runId !== ocrRunIdRef.current) return;

            const focusedData = Array.isArray(focusedResults) ? focusedResults[0] : focusedResults;
            const focusedItems = focusedData?.items || [];
            const focusedText = focusedItems.map((item) => item.text || "").join("\n");
            const focusedItemsInOriginalCoordinates = mapFocusedTextItems(focusedItems, focusedCrop);
            const focusedFields = extractResidentIdFields(focusedItems, formData);
            const focusedConfidence = isUseful(focusedFields, focusedItems);

            timings.detectorMs += Number(focusedData?.metrics?.detMs) || 0;
            timings.recognizerMs += Number(focusedData?.metrics?.recMs) || 0;
            timings.recognizedRegions += focusedItems.length;

            if (focusedConfidence && focusedItemsInOriginalCoordinates.length) {
              const mergedItems = [...best.items, ...focusedItemsInOriginalCoordinates];
              best = {
                ...best,
                items: mergedItems,
                text: [best.text, focusedText].filter(Boolean).join("\n"),
                fields: extractResidentIdFields(mergedItems, formData),
              };
            }
          } catch (error) {
            console.warn(`[OCR] Focused ${label} read failed; keeping the full ID read.`, error);
          }
        };

        const fullImageNameMatch = matchResidentName(best.items, formData, best.fields);
        const fullImageNameConfidence = fullImageNameMatch.confidence ?? best.fields.nameConfidence;
        const shouldRetryNameRegion = Boolean(
          best.fields.nameCandidateLines?.length &&
          (!best.fields.nameLines.length ||
            (registrationNamesComplete && !fullImageNameMatch.passed) ||
            fullImageNameConfidence == null ||
            fullImageNameConfidence < 0.78)
        );
        if (shouldRetryNameRegion) {
          await retryFocusedRegion(best.fields.nameCandidateLines, "name", (fields, items) => {
            const match = matchResidentName(items, formData, fields);
            const confidence = match.confidence ?? fields.nameConfidence;
            const hasName = Boolean(fields.firstName || fields.lastName || fields.nameText);
            return confidence != null && confidence >= 0.65 && (
              registrationNamesComplete ? match.passed : hasName
            );
          });
        }

        if (runId !== ocrRunIdRef.current) return;

        ocrPerformanceRef.current = { ...timings };
        setOcrItems(best.items);
        setOcrText(best.text);
        setOcrConfidence(best.confidence);
        setOcrStage("");
        setOcrScanStatus("done");
      } catch (err) {
        if (runId !== ocrRunIdRef.current) return;
        console.error("[OCR] Error:", err);
        ocrPerformanceRef.current = { ...timings };
        setOcrStage("");
        setOcrScanStatus("error");
      } finally {
        bitmap?.close?.();
      }
    });
    let timeoutId;
    const timeout = new Promise((resolve) => {
      timeoutId = setTimeout(() => {
        if (runId === ocrRunIdRef.current) {
          ocrRunIdRef.current += 1;
          const engine = window.__ecoOcrEngine || ocrEngineRef.current;
          engine?.terminate?.();
          if (window.__ecoOcrEngine === engine) delete window.__ecoOcrEngine;
          if (ocrEngineRef.current === engine) ocrEngineRef.current = null;
          delete window.__ecoOcrEnginePromise;
          ocrPerformanceRef.current = { ...timings };
          setOcrStage("");
          setOcrScanStatus("error");
        }
        resolve();
      }, ID_OCR_TIMEOUT_MS);
    });
    const monitoredJob = Promise.race([job, timeout]).finally(() => clearTimeout(timeoutId));
    window.__ecoOcrQueue = monitoredJob.catch(() => {});
    await monitoredJob;
  };

  // ============ Field validators ============
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
        if (name === "permanent_house_no") return "";
        return v === "" ? "This field is required." : "";

      case "contact_number":
        if (v === "") return "Contact number is required.";
        if (!/^09\d{9}$/.test(v)) return "Must be 11 digits starting with 09.";
        return "";

      case "email":
        if (v === "") return "Email is required.";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Enter a valid email address.";
        return "";

      case "password":
        if (!v) return "Password is required.";
        if (v.length < passwordPolicy.min || v.length > passwordPolicy.max)
          return `Password must be ${passwordPolicy.min}-${passwordPolicy.max} characters.`;
        if (passwordPolicy.requireStrong) {
          const hasLetter = /[A-Za-z]/.test(v);
          const hasDigit = /\d/.test(v);
          if (!hasLetter || !hasDigit) return "Password must contain letters and numbers.";
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

  // ============ Combined completeness check ============
  const permanentComplete = sameAddress
    ? true
    : formData.permanent_street.trim() !== "" &&
      formData.permanent_barangay.trim() !== "" &&
      formData.permanent_city.trim() !== "";

  // Returns a human-readable list of everything still missing/invalid.
  // Drives both the button's disabled state and the submit safety check.
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
    if (!ocrValidation.passed && !ocrValidation.requiresManualReview) missing.push("ID Verification");
    if (REQUIRE_FACE_VERIFICATION && !idFaceFound) missing.push("Clear Face on ID");
    if (REQUIRE_FACE_VERIFICATION && !faceFile) missing.push("Live Selfie");
    if (!agreedToTerms) missing.push("Terms & Conditions");
    return missing;
  };

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

    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    }

    if (name === "password" && formData.confirm_password) {
      const mismatch = value !== formData.confirm_password;
      setFieldErrors((prev) => ({
        ...prev,
        confirm_password: mismatch ? "Passwords do not match." : "",
      }));
    }
  };

  const processResidentIdFile = (file, source) => {
    ocrRunIdRef.current += 1;
    idFaceRunIdRef.current += 1;
    setResidentIdFile(file);
    if (residentIdPreviewUrlRef.current) URL.revokeObjectURL(residentIdPreviewUrlRef.current);
    residentIdPreviewUrlRef.current = URL.createObjectURL(file);
    setResidentIdPreview(residentIdPreviewUrlRef.current);
    setIdFaceProcessing(false);
    setIdFaceChecked(false);
    setIdFaceFound(false);
    setIdFaceError("");
    setOcrItems([]);
    setOcrText("");
    setOcrConfidence(null);
    setOcrScanStatus("scanning");
    setOcrStage("Reading text from the original ID image...");
    void runIdOcr(file, source);
    void processIdFace(file);
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

    void processResidentIdFile(file, "gallery");
  };

  const removeResidentId = () => {
    ocrRunIdRef.current += 1;
    idFaceRunIdRef.current += 1;
    if (residentIdPreviewUrlRef.current) URL.revokeObjectURL(residentIdPreviewUrlRef.current);
    residentIdPreviewUrlRef.current = null;
    setResidentIdFile(null);
    setResidentIdPreview(null);
    setIdFaceProcessing(false);
    setIdFaceChecked(false);
    setIdFaceFound(false);
    setIdFaceError("");
    setOcrText("");
    setOcrItems([]);
    setOcrConfidence(null);
    setOcrScanStatus("idle");
    setOcrStage("");
    const fileInput = document.getElementById("resident-id-input");
    if (fileInput) fileInput.value = "";
  };

  const handleStreetSelect = (street) => {
    setFormData({ ...formData, street });
    setShowStreetDropdown(false);
    setStreetError("");
  };

  const handleStreetBlur = () => {
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

  const filteredStreets = STREETS.filter((s) =>
    s.toLowerCase().includes(formData.street.toLowerCase())
  );

  const handleCameraCapture = async (file) => {
    if (cameraMode === "id") {
      setCameraMode(null);
      processResidentIdFile(file, "camera");
      return;
    } else if (cameraMode === "face") {
      setFaceFile(file);
      setFacePreview(await fileToDataUrl(file));
    }
    setCameraMode(null);
  };

  const handleOpenLiveSelfie = async () => {
    setCameraPermissionLoading(true);
    setCameraPermissionFeedback(null);
    try {
      const permission = await requestCameraPermission();
      if (!permission.granted) {
        setCameraPermissionFeedback({
          message: permission.canAskAgain
            ? "Camera permission was denied. Allow camera access to take your Live Selfie, then try again."
            : "Camera access is blocked. Enable Camera permission in Android Settings, then try again.",
          canOpenSettings: !permission.canAskAgain && isAndroidApp(),
        });
        return;
      }
      setCameraMode("face");
    } catch (permissionError) {
      console.error("Unable to request camera permission:", permissionError);
      setCameraPermissionFeedback({
        message: "We couldn't check camera permission. Please try again.",
        canOpenSettings: false,
      });
    } finally {
      setCameraPermissionLoading(false);
    }
  };

  const handleCameraPermissionLost = useCallback(() => {
    setCameraMode(null);
    setCameraPermissionFeedback({
      message: isAndroidApp()
        ? "Camera permission is no longer available. Grant it in Android Settings, then try again."
        : "Camera access is no longer available. Check your browser's camera permission, then try again.",
      canOpenSettings: isAndroidApp(),
    });
  }, []);

  const handleOpenCameraSettings = async () => {
    setCameraPermissionLoading(true);
    try {
      const permission = await openCameraAppSettings();
      if (permission.granted) {
        setCameraPermissionFeedback(null);
        setCameraMode("face");
      } else {
        setCameraPermissionFeedback({
          message: "Camera permission is still off. Enable Camera in app settings and try again.",
          canOpenSettings: true,
        });
      }
    } catch (settingsError) {
      console.error("Unable to open camera settings:", settingsError);
      setCameraPermissionFeedback({
        message: "We couldn't open Android settings. Open EcoReport's App permissions and allow Camera, then retry.",
        canOpenSettings: true,
      });
    } finally {
      setCameraPermissionLoading(false);
    }
  };

  // ============ Image compression (fault-tolerant) ============
  // Resizes to max 1600px and re-encodes as JPEG. Skips files under 1 MB.
  // NEVER rejects — falls back to the original file on any error, so
  // compression can never block registration.
  const compressImage = (file, maxDim = 1600, quality = 0.82) => {
    return new Promise((resolve) => {
      if (!file || !file.type.startsWith("image/")) return resolve(file);
      if (file.size < 1024 * 1024) return resolve(file);

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
                const safeName = (file.name || "image").replace(/\.\w+$/, "") + ".jpg";
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
  const uploadFile = async (file, label = "file", traceId, { preserveOriginal = false } = {}) => {
    if (!file) return null;
    const uploadImage = preserveOriginal ? file : await compressImage(file);
    const fd = new FormData();
    fd.append("files", uploadImage);
    const uploadStage = label === "ID photo" ? "id_upload" : "selfie_upload";
    const traceQuery = new URLSearchParams({
      registration_trace: "1",
      trace_id: traceId,
      stage: uploadStage,
    });
    const response = await fetch(`${API_BASE_URL}/api/guest/upload?${traceQuery}`, {
      method: "POST",
      body: fd,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `${label} upload failed.`);
    return data.files?.[0]?.url || null;
  };

  // ============ Submit ============
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Safety check — the button is disabled when incomplete, but a
    // JS-dispatched submit or stale state could slip through.
    const missing = getMissingFields();
    if (missing.length > 0) {
      setError(`Please complete: ${missing.join(", ")}.`);
      setLoading(false);
      return;
    }

    const registrationTraceId = `reg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    let failedStage = "id_upload";

    try {
      // Upload sequentially, not in parallel — avoids splitting limited
      // mobile upload bandwidth across two simultaneous requests.
      const valid_id_url = await uploadFile(
        residentIdFile,
        "ID photo",
        registrationTraceId,
        { preserveOriginal: true }
      );
      failedStage = REQUIRE_FACE_VERIFICATION ? "selfie_upload" : "register";
      const selfie_image = REQUIRE_FACE_VERIFICATION
        ? await uploadFile(faceFile, "Selfie", registrationTraceId)
        : null;

      const resolvedStreet = findMatchingStreet(formData.street) || formData.street;

      const permanent = sameAddress
        ? {
            permanent_house_no: formData.house_no,
            permanent_street: resolvedStreet,
            permanent_barangay: "Sto. Rosario Kanluran",
            permanent_city: "Pateros",
          }
        : {
            permanent_house_no: formData.permanent_house_no,
            permanent_street: formData.permanent_street,
            permanent_barangay: formData.permanent_barangay,
            permanent_city: formData.permanent_city,
          };

      const payload = {
        ...formData,
        street: resolvedStreet,
        ...permanent,
        permanent_same_as_current: sameAddress,
        id_type: idType,
        valid_id_url,
        selfie_image,
      };

      failedStage = "register";
      const data = await apiFetch(`/api/auth/register?registration_trace=1&trace_id=${encodeURIComponent(registrationTraceId)}`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate("/resident-dashboard");
    } catch (err) {
      const message = err.message || "Registration failed. Please try again.";
      setError(`${message} (stage: ${failedStage}; reference: ${registrationTraceId})`);
    } finally {
      setLoading(false);
    }
  };

  // ============ Reusable field ============
  const field = (name, label, placeholder, extra = {}) => {
    const err = fieldErrors[name];
    const { optional = false, ...inputProps } = extra;
    return (
      <div className="flex flex-col" style={{ gap: "8px" }}>
        <label className="block text-[#0B5D2A] text-[14px] font-extrabold">
          {label}{optional ? <span className="ml-1 text-gray-500 font-normal">(Optional)</span> : <span className="text-red-500"> *</span>}
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
          {...inputProps}
        />
        {err && (
          <p className="text-[12px] text-red-500 leading-5 field-error-message">
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
            <div className="flex flex-col" style={{ gap: "8px" }}>
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
                <p className="text-[12px] text-red-500 leading-5 field-error-message">
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
                  {field("permanent_city", "City / Municipality", "Enter city or municipality")}
                </div>
              )}
            </div>

            {/* CONTACT */}
            <div className="flex flex-col" style={{ gap: "8px" }}>
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
                <p className="text-[12px] text-red-500 leading-5 field-error-message">
                  {fieldErrors.contact_number}
                </p>
              )}
            </div>

            {/* EMAIL */}
            <div className="flex flex-col" style={{ gap: "8px" }}>
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
                <p className="text-[12px] text-red-500 leading-5 field-error-message">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* PASSWORDS */}
            <div className="flex flex-col" style={{ gap: "8px" }}>
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
                <p className="text-[12px] text-red-500 leading-5 field-error-message">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <div className="flex flex-col" style={{ gap: "8px" }}>
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
                <p className="text-[12px] text-red-500 leading-5 field-error-message">
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
                    <option key={type} value={type}>{type}</option>
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

              {residentIdFile ? (
                <div className="flex flex-col" style={{ gap: "12px" }}>
                  <div className="relative">
                    {residentIdPreview ? (
                      <img
                        src={residentIdPreview}
                        alt="Original resident ID photo"
                        className="w-full h-[180px] rounded-2xl border border-[#8BB37A] object-contain bg-gray-100"
                      />
                    ) : (
                      <div className="w-full h-[180px] rounded-2xl border border-[#8BB37A] flex items-center justify-center gap-2 bg-gray-100 text-gray-600 text-sm">
                        <FaSpinner className="animate-spin" /> Checking the ID image...
                      </div>
                    )}
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

                  {idFaceChecked && !idFaceProcessing && !idFaceFound && residentIdPreview && (
                    <div
                      className="flex items-start bg-red-50 border border-red-300 rounded-xl text-red-700 text-[13px] leading-5"
                      style={{ padding: "10px 12px", gap: "8px" }}
                    >
                      <FaExclamationTriangle className="mt-0.5 shrink-0" size={12} />
                      <span className="break-words">
                        {idFaceError || "No face detected on this ID. Please upload a clear photo."}
                      </span>
                    </div>
                  )}

                  {!idFaceProcessing && idFaceFound && (
                    <div className="flex items-center text-green-700 text-[13px]" style={{ gap: "8px" }}>
                      <div className="flex items-center" style={{ gap: "8px" }}>
                        <FaCheck size={12} />
                        <span>Portrait found.</span>
                      </div>
                    </div>
                  )}

                  {ocrScanStatus === "scanning" && (
                    <div
                      className="bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-[13px]"
                      style={{ padding: "10px 12px" }}
                    >
                      {ocrStage || "Reading ID text…"}
                    </div>
                  )}
                  {ocrScanStatus === "done" && ocrValidation.reason === "The ID name is missing or unclear. Retake the photo." && (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl text-gray-800 text-[12px] leading-5 space-y-2 p-3">
                      <div>
                        <span className="font-bold">First name match: </span>
                        {extractedIdFields.firstName || "Not clearly identified"}
                      </div>
                      <div>
                        <span className="font-bold">Last name match: </span>
                        {extractedIdFields.lastName || "Not clearly identified"}
                      </div>
                    </div>
                  )}
                  {ocrScanStatus === "error" && (
                    <div
                      className="bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-[13px] break-words"
                      style={{ padding: "10px 12px" }}
                    >
                      {ocrValidation.reason}
                    </div>
                  )}
                  {ocrScanStatus === "done" && ocrValidation.passed && (
                    <div className="flex items-center text-green-600 text-[13px]" style={{ gap: "8px" }}>
                      <FaCheck size={12} />
                      <span>ID name verified</span>
                    </div>
                  )}
                  {ocrScanStatus === "done" && !ocrValidation.passed && ocrValidation.reason && (
                    <div
                      className={`${ocrValidation.requiresManualReview ? "bg-amber-50 border-amber-300 text-amber-900" : "bg-red-50 border-red-300 text-red-700"} border rounded-xl text-[13px] break-words`}
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

            {/* LIVE SELFIE — hidden when the toggle is off */}
            {REQUIRE_FACE_VERIFICATION && (
            <div className="flex flex-col shrink-0" style={{ gap: "12px" }}>
              <label className="block text-[#0B5D2A] text-[14px] font-extrabold">
                Live Selfie <span className="text-red-500">*</span>
              </label>

              {facePreview ? (
                <div className="flex flex-col" style={{ gap: "12px" }}>
                  <div className="relative">
                    <img
                      src={facePreview}
                      alt="Live selfie"
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
                    <span>Live selfie captured</span>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleOpenLiveSelfie}
                  disabled={cameraPermissionLoading}
                  className="w-full min-h-[110px] rounded-2xl border border-[#8BB37A] bg-white flex flex-col items-center justify-center text-center text-[#0B5D2A] hover:bg-[#F3F8F1] active:scale-[0.98] transition disabled:opacity-60"
                  style={{ padding: "12px 16px", gap: "6px" }}
                >
                  {cameraPermissionLoading ? <FaSpinner className="animate-spin" size={26} /> : <FaUserCheck size={26} />}
                  <span className="font-extrabold text-[13px] leading-5">
                    {cameraPermissionLoading ? "CHECKING CAMERA PERMISSION..." : "START LIVE SELFIE"}
                  </span>
                  <span className="text-[12px] text-gray-500 leading-4">
                    Take a live selfie. It will be checked by the barangay.
                  </span>
                </button>
              )}
              {cameraPermissionFeedback && !facePreview && (
                <div
                  role="alert"
                  className="bg-red-50 border border-red-300 rounded-xl text-red-700 text-[13px] leading-5 break-words"
                  style={{ padding: "12px" }}
                >
                  <p>{cameraPermissionFeedback.message}</p>
                  <div className="flex flex-wrap mt-2" style={{ gap: "12px" }}>
                    <button
                      type="button"
                      onClick={handleOpenLiveSelfie}
                      disabled={cameraPermissionLoading}
                      className="underline font-bold"
                    >
                      Try again
                    </button>
                    {cameraPermissionFeedback.canOpenSettings && (
                      <button
                        type="button"
                        onClick={handleOpenCameraSettings}
                        disabled={cameraPermissionLoading}
                        className="underline font-bold"
                      >
                        Open Android Settings
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
            )}

            {/* TERMS */}
            <div className="flex flex-col shrink-0" style={{ gap: "6px" }}>
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
                <p className="text-[12px] text-red-500 leading-5 field-error-message pl-8">
                  {fieldErrors.agreedToTerms}
                </p>
              )}
            </div>

            {/* SUBMIT */}
            <div className="flex flex-col items-center shrink-0" style={{ gap: "12px" }}>
              {error && (
                <div
                  className="w-full bg-red-100 border border-red-400 rounded-xl text-red-700 text-sm leading-6 break-words"
                  style={{ padding: "14px 16px" }}
                >
                  {error}
                </div>
              )}

              {(() => {
                const buttonDisabled = loading || getMissingFields().length > 0;
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
            title="Capture Resident ID"
            hint="Keep your entire ID inside the frame. Make sure the text is visible and avoid glare or shadows."
            facing="environment"
            captureType="id"
            modelsLoaded={modelsLoaded}
            onCapture={handleCameraCapture}
            onClose={() => setCameraMode(null)}
          />
        )}

        {cameraMode === "face" && (
          <CameraModal
            title="Live Selfie"
            hint="Center your face in the oval, hold still briefly, then turn your head slightly as prompted."
            facing="user"
            enableLiveFaceCheck={true}
            modelsLoaded={modelsLoaded}
            modelsLoadError={modelsLoadError}
            onRetryModels={() => {
              setModelsLoaded(false);
              setModelLoadAttempt((attempt) => attempt + 1);
            }}
            onPermissionLost={handleCameraPermissionLost}
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
