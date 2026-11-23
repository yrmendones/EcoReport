import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate } from "react-router-dom";
import MaintenanceGate from "../components/MaintenanceGate";
import { LoadingIndicator } from "../components/LoadingIndicator";
import { apiFetch } from "../api";
import { clearResidentSession } from "../utils/authSession";
import { sessionRequestCache } from "../utils/sessionRequestCache";
import {
  RESIDENT_PROFILE_RESOURCE,
  saveResidentProfile,
  SESSION_REVALIDATION_INTERVAL_MS,
} from "../utils/useResidentProfile";

/* Authentication */
import Welcome from "../pages/auth/Welcome";
import ResidentLogin from "../pages/auth/ResidentLogin";
import Register from "../pages/auth/Register";
import ForgotPassword from "../pages/auth/ForgotPassword";

/* Guest */
import GuestHome from "../pages/guest/GuestHome";
import GuestReport from "../pages/guest/GuestReport";
import GuestAnnouncements from "../pages/guest/GuestAnnouncements";
import GuestAnnouncementDetail from "../pages/guest/GuestAnnouncementDetail";
import GuestHotlines from "../pages/guest/GuestHotlines";
import GuestWasteSchedule from "../pages/guest/GuestWasteSchedule";

/* Resident */
import Dashboard from "../pages/resident/Dashboard";
import EnvironmentalMap from "../pages/resident/EnvironmentalMap";
import WasteSchedule from "../pages/resident/WasteSchedule";
import Announcement from "../pages/resident/Announcement";
import AnnouncementDetail from "../pages/resident/AnnouncementDetail";
import HealthCenter from "../pages/resident/HealthCenter";
import EmergencyHotline from "../pages/resident/EmergencyHotline";
import CertificateRequest from "../pages/resident/CertificateRequest";
import Appointment from "../pages/resident/Appointment";
import Notifications from "../pages/resident/Notifications";
import NotificationDetail from "../pages/resident/NotificationDetail";
import Profile from "../pages/resident/Profile";
import QRCodePage from "../pages/resident/QRCodePage";
import EditProfile from "../pages/resident/EditProfile";
import ChangePassword from "../pages/resident/ChangePassword";
import PrivacySettings from "../pages/resident/PrivacySettings";

/* Reports */
import MyReports from "../pages/Reports/MyReports";
import ReportDetails from "../pages/Report/ReportDetails";
import ReportStatus from "../pages/Report/ReportStatus";

/* Report Submission */
import CreateReport from "../pages/Report/CreateReport";
import UploadEvidence from "../pages/Report/UploadEvidence";
import Description from "../pages/Report/Description";
import ReportLocation from "../pages/Report/ReportLocation";
import ReportSuccess from "../pages/Report/SuccessReport";

function getSavedRole() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}").role || null;
  } catch {
    return null;
  }
}

function SessionCheckScreen({ checking, message, onRetry }) {
  return (
    <main
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#F8FAF8] px-6 text-center"
      role={checking ? undefined : "alert"}
      aria-live={checking ? undefined : "polite"}
      aria-busy={checking}
    >
      {checking ? (
        <>
          <LoadingIndicator label="Checking your session" showLabel={false} />
        </>
      ) : (
        <div className="max-w-sm">
          <h1 className="text-xl font-extrabold text-[#075B2A]">
            Unable to verify your session
          </h1>
          <p className="mt-3 text-sm leading-6 text-gray-700">
            {message || "We couldn't verify your account right now. Check your connection and try again."}
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="btn-primary mt-5 min-h-[48px] rounded-xl px-6 font-bold"
          >
            Try again
          </button>
        </div>
      )}
    </main>
  );
}

// Check the stored session before rendering resident-only pages, then recheck
// when the app returns to the foreground or browser history restores a page.
function RequireResident() {
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  const token = localStorage.getItem("token");
  const role = getSavedRole();
  const hasResidentCredentials = Boolean(token && role === "resident");
  const cachedProfile = token
    ? sessionRequestCache.get(RESIDENT_PROFILE_RESOURCE, token)
    : null;
  const hasCachedProfile = cachedProfile?.value?.role === "resident";
  const [sessionStatus, setSessionStatus] = useState(() =>
    hasCachedProfile ? "verified" : "checking"
  );
  const [sessionError, setSessionError] = useState("");
  const [hasValidated, setHasValidated] = useState(hasCachedProfile);
  const hasValidatedRef = useRef(hasCachedProfile);
  const validatedTokenRef = useRef(hasCachedProfile ? token : null);
  const lastValidatedAtRef = useRef(cachedProfile?.fetchedAt ?? 0);
  const requestRef = useRef(null);
  const lastRequestAtRef = useRef(0);
  const validateRef = useRef(null);

  useLayoutEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  useEffect(() => {
    if (!hasResidentCredentials) return undefined;

    let active = true;

    const validateSession = async (force = false, revalidate = false) => {
      const currentToken = localStorage.getItem("token");
      const canReuseValidatedSession =
        hasValidatedRef.current &&
        validatedTokenRef.current === currentToken &&
        Date.now() - lastValidatedAtRef.current < SESSION_REVALIDATION_INTERVAL_MS;

      // Route changes and browser history events can fire the same listeners.
      // Keep a recently verified session active and only recheck after it ages
      // out or when a token change explicitly forces validation.
      if (!force && !revalidate && canReuseValidatedSession) return;

      if (requestRef.current?.token !== currentToken) {
        requestRef.current = null;
      }
      if (!requestRef.current) {
        const now = Date.now();
        if (!force && now - lastRequestAtRef.current < 1500) return;
        lastRequestAtRef.current = now;
        const pendingRequest = apiFetch(
          "/api/users/me",
          {},
          "session verification"
        );
        requestRef.current = { token: currentToken, promise: pendingRequest };
        const finishRequest = () => {
          if (requestRef.current?.promise === pendingRequest) requestRef.current = null;
        };
        pendingRequest.then(finishRequest, finishRequest);
      }

      const tokenAtStart = requestRef.current.token;
      const pendingRequest = requestRef.current.promise;
      const canKeepValidatedPage =
        hasValidatedRef.current && validatedTokenRef.current === tokenAtStart;
      if (!canKeepValidatedPage || force) {
        setSessionStatus("checking");
        setSessionError("");
      }

      try {
        const profile = await pendingRequest;
        if (!active || localStorage.getItem("token") !== tokenAtStart) return;

        if (profile.role !== "resident") {
          clearResidentSession(
            "This account no longer has resident access. Please contact the administrator if you believe this is a mistake."
          );
          return;
        }

        saveResidentProfile(tokenAtStart, profile);
        hasValidatedRef.current = true;
        validatedTokenRef.current = tokenAtStart;
        lastValidatedAtRef.current = Date.now();
        setHasValidated(true);
        setSessionStatus("verified");
        if (tokenAtStart !== token) {
          navigateRef.current("/resident-dashboard", { replace: true });
        }
      } catch {
        if (!active || localStorage.getItem("token") !== tokenAtStart) return;
        setSessionError("We couldn't verify your account right now. Check your connection and try again.");
        setSessionStatus("unavailable");
      }
    };

    validateRef.current = validateSession;
    const currentCachedProfile = token
      ? sessionRequestCache.get(RESIDENT_PROFILE_RESOURCE, token)
      : null;
    const currentProfileIsResident =
      currentCachedProfile?.value?.role === "resident";
    const currentProfileIsFresh = Boolean(
      currentProfileIsResident &&
      sessionRequestCache.isFresh(
        RESIDENT_PROFILE_RESOURCE,
        token,
        SESSION_REVALIDATION_INTERVAL_MS
      )
    );
    if (currentProfileIsFresh) {
      void validateSession(false);
    } else if (currentProfileIsResident) {
      // Reused route guards keep the current page visible while they refresh
      // an older in-memory validation result in the background.
      void validateSession(false, true);
    } else {
      void validateSession(true);
    }

    const revalidateWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void validateSession(false);
      }
    };
    const revalidateAfterHistoryRestore = () => void validateSession(false);
    const handleStorageChange = (event) => {
      if (event.key !== "token") return;
      if (!event.newValue) {
        clearResidentSession("Your session has ended. Please sign in again.");
        return;
      }
      void validateSession(true);
    };

    window.addEventListener("focus", revalidateWhenVisible);
    window.addEventListener("pageshow", revalidateWhenVisible);
    window.addEventListener("popstate", revalidateAfterHistoryRestore);
    window.addEventListener("storage", handleStorageChange);
    document.addEventListener("visibilitychange", revalidateWhenVisible);

    return () => {
      active = false;
      if (validateRef.current === validateSession) validateRef.current = null;
      window.removeEventListener("focus", revalidateWhenVisible);
      window.removeEventListener("pageshow", revalidateWhenVisible);
      window.removeEventListener("popstate", revalidateAfterHistoryRestore);
      window.removeEventListener("storage", handleStorageChange);
      document.removeEventListener("visibilitychange", revalidateWhenVisible);
    };
  }, [hasResidentCredentials, token]);

  if (!hasResidentCredentials) {
    return <Navigate to="/resident-login" replace />;
  }

  const preservePage = hasValidated;
  const blocked = sessionStatus !== "verified";

  if (!preservePage) {
    return (
      <SessionCheckScreen
        checking={sessionStatus === "checking"}
        message={sessionError}
        onRetry={() => validateRef.current?.(true)}
      />
    );
  }

  return (
    <>
      <div
        className={`contents ${blocked ? "pointer-events-none select-none" : ""}`}
        aria-hidden={blocked}
        inert={blocked}
      >
        <Outlet />
      </div>
      {blocked && (
        <SessionCheckScreen
          checking={sessionStatus === "checking"}
          message={sessionError}
          onRetry={() => validateRef.current?.(true)}
        />
      )}
    </>
  );
}

// Reopen a saved resident session directly in the app instead of showing the
// welcome or login screen after the WebView has been closed and relaunched.
function RedirectIfResident({ children }) {
  const token = localStorage.getItem("token");
  const role = getSavedRole();

  if (token && role === "resident") {
    return <Navigate to="/resident-dashboard" replace />;
  }

  return children;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <MaintenanceGate>
        <Routes>
          {/* ================= AUTHENTICATION ================= */}
          <Route
            path="/"
            element={
              <RedirectIfResident>
                <Welcome />
              </RedirectIfResident>
            }
          />
          <Route
            path="/resident-login"
            element={
              <RedirectIfResident>
                <ResidentLogin />
              </RedirectIfResident>
            }
          />
          <Route
            path="/login"
            element={
              <RedirectIfResident>
                <ResidentLogin />
              </RedirectIfResident>
            }
          />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ForgotPassword />} />

          {/* ================= GUEST ================= */}
          <Route path="/guest-home" element={<GuestHome />} />
          <Route path="/guest-report" element={<GuestReport />} />
          <Route path="/guest-announcements" element={<GuestAnnouncements />} />
          <Route path="/guest-announcement-detail/:id" element={<GuestAnnouncementDetail />} />
          <Route path="/guest-hotlines" element={<GuestHotlines />} />
          <Route path="/guest-waste-schedule" element={<GuestWasteSchedule />} />

          {/* ============ RESIDENT-ONLY ROUTES ============ */}
          <Route element={<RequireResident />}>
            <Route path="/resident-dashboard" element={<Dashboard />} />
            <Route path="/create-report" element={<CreateReport />} />
            <Route path="/upload-evidence" element={<UploadEvidence />} />
            <Route path="/description-step" element={<Description />} />
            <Route path="/report-location" element={<ReportLocation />} />
            <Route path="/report-success" element={<ReportSuccess />} />
            <Route path="/my-reports" element={<MyReports />} />
            <Route path="/report-details/:id" element={<ReportDetails />} />
            <Route path="/report-status/:id" element={<ReportStatus />} />
            <Route path="/environment-map" element={<EnvironmentalMap />} />
            <Route path="/waste-schedule" element={<WasteSchedule />} />
            <Route path="/announcements" element={<Announcement />} />
            <Route path="/announcement-detail/:id" element={<AnnouncementDetail />} />
            <Route path="/health-center" element={<HealthCenter />} />
            <Route path="/hotline" element={<EmergencyHotline />} />
            <Route path="/certificate-request" element={<CertificateRequest />} />
            <Route path="/appointment" element={<Appointment />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/notification-detail/:id" element={<NotificationDetail />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/qr-code" element={<QRCodePage />} />
            <Route path="/edit-profile" element={<EditProfile />} />
            <Route path="/change-password" element={<ChangePassword />} />
            <Route path="/privacy-settings" element={<PrivacySettings />} />
          </Route>
        </Routes>
      </MaintenanceGate>
    </BrowserRouter>
  );
}
