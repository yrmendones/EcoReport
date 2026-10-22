import { BrowserRouter, Routes, Route } from "react-router-dom";

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

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ================= AUTHENTICATION ================= */}
        <Route path="/" element={<Welcome />} />
        <Route path="/resident-login" element={<ResidentLogin />} />
        <Route path="/login" element={<ResidentLogin />} />
        <Route path="/register" element={<Register />} />

        {/* ================= Forgot Password =================*/}
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ForgotPassword />} />

        {/* ================= GUEST ================= */}
        <Route path="/guest-home" element={<GuestHome />} />
        <Route path="/guest-report" element={<GuestReport />} />
        <Route path="/guest-announcements" element={<GuestAnnouncements />} />
        <Route path="/guest-announcement-detail/:id" element={<GuestAnnouncementDetail />} />
        <Route path="/guest-hotlines" element={<GuestHotlines />} />
        <Route path="/guest-waste-schedule" element={<GuestWasteSchedule />} />

        {/* ================= DASHBOARD ================= */}
        <Route path="/resident-dashboard" element={<Dashboard />} />

        {/* ================= REPORT SUBMISSION ================= */}
        <Route path="/create-report" element={<CreateReport />} />
        <Route path="/upload-evidence" element={<UploadEvidence />} />
        <Route path="/description-step" element={<Description />} />
        <Route path="/report-location" element={<ReportLocation />} />
        <Route path="/report-success" element={<ReportSuccess />} />

        {/* ================= REPORTS ================= */}
        <Route path="/my-reports" element={<MyReports />} />
        <Route path="/report-details/:id" element={<ReportDetails />} />
        <Route path="/report-status/:id" element={<ReportStatus />} />

        {/* ================= RESIDENT FEATURES ================= */}
        <Route path="/environment-map" element={<EnvironmentalMap />} />
        <Route path="/waste-schedule" element={<WasteSchedule />} />
        <Route path="/announcements" element={<Announcement />} />
        <Route path="/announcement-detail/:id" element={<AnnouncementDetail />} />
        <Route path="/health-center" element={<HealthCenter />} />
        <Route path="/hotline" element={<EmergencyHotline />} />
        <Route path="/certificate-request" element={<CertificateRequest />} />
        <Route path="/appointment" element={<Appointment />} />

        {/* ================= NOTIFICATIONS ================= */}
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/notification-detail/:id" element={<NotificationDetail />} />

        {/* ================= PROFILE ================= */}
        <Route path="/profile" element={<Profile />} />
        <Route path="/qr-code" element={<QRCodePage />} />
        <Route path="/edit-profile" element={<EditProfile />} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/privacy-settings" element={<PrivacySettings />} />
      </Routes>
    </BrowserRouter>
  );
}