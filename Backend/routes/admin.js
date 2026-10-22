const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const announcementController = require('../controllers/announcementController');
const { authenticate, isAdmin, isStaff } = require('../middleware/auth');

// All staff routes require authentication + a staff role (admin OR barangay_official)
router.use(authenticate, isStaff);

// Dashboard
router.get('/stats', adminController.getAdminStats);

// Reports (shared)
router.get('/reports', adminController.getAllReports);
router.get('/reports/:id', adminController.getReportDetails);
router.put('/reports/:id/status', adminController.updateReportStatus);
router.put('/reports/:id/assign', adminController.assignReport);
router.delete('/reports/:id', adminController.deleteReport);

// Assignments (shared)
router.get('/assignments', adminController.getAssignments);
router.post('/assignments', adminController.createAssignment);
router.put('/assignments/:id', adminController.updateAssignment);
router.delete('/assignments/:id', adminController.deleteAssignment);

// Residents — ADMIN ONLY (user account management)
router.get('/residents', isAdmin, adminController.getAllResidents);
router.get('/residents/verify/:residentId', isAdmin, adminController.getResidentByResidentId);
router.get('/residents/:id', isAdmin, adminController.getResidentById);
router.post('/residents', isAdmin, adminController.addResident);
router.put('/residents/:id', isAdmin, adminController.updateResident);
router.delete('/residents/:id', isAdmin, adminController.deleteResident);
router.put('/residents/:id/verify', isAdmin, adminController.verifyResident);
router.put('/residents/:id/reject', isAdmin, adminController.rejectResident);

// Certificates (shared)
router.get('/certificates', adminController.getCertificates);
router.put('/certificates/:id', adminController.updateCertificateStatus);
router.delete('/certificates/:id', adminController.deleteCertificate);

// Appointments (shared)
router.get('/appointments', adminController.getAppointments);
router.get('/appointments/stats', adminController.getAppointmentStats);
router.put('/appointments/:id', adminController.updateAppointment);
router.delete('/appointments/:id', adminController.deleteAppointment);

// Waste Schedule (shared)
router.get('/waste-schedule', adminController.getWasteSchedule);
router.post('/waste-schedule', adminController.addWasteSchedule);
router.put('/waste-schedule/:id', adminController.updateWasteSchedule);
router.delete('/waste-schedule/:id', adminController.deleteWasteSchedule);

// Business (shared)
router.get('/business', adminController.getBusinesses);
router.post('/business', adminController.addBusiness);
router.put('/business/:id', adminController.updateBusiness);
router.delete('/business/:id', adminController.deleteBusiness);

// Inventory (shared)
router.get('/inventory', adminController.getInventory);
router.post('/inventory', adminController.addInventoryItem);
router.put('/inventory/:id', adminController.updateInventoryItem);
router.delete('/inventory/:id', adminController.deleteInventoryItem);

// Blotter (shared)
router.get('/blotter', adminController.getBlotterCases);
router.post('/blotter', adminController.addBlotterCase);
router.put('/blotter/:id', adminController.updateBlotterCase);
router.delete('/blotter/:id', adminController.deleteBlotterCase);

// Disaster (shared)
router.get('/disaster', adminController.getDisasterAlerts);
router.post('/disaster', adminController.addDisasterAlert);
router.put('/disaster/:id', adminController.updateDisasterAlert);
router.delete('/disaster/:id', adminController.deleteDisasterAlert);

// Analytics (shared)
router.get('/analytics/categories', adminController.getCategoryAnalytics);
router.get('/analytics/monthly', adminController.getMonthlyAnalytics);
router.get('/analytics/summary', adminController.getSummaryAnalytics);

// Audit logs — ADMIN ONLY
router.get('/audit-logs', isAdmin, adminController.getAuditLogs);

// Notification Center (shared)
router.get('/notification-center', adminController.getNotificationCenter);
router.post('/notification-center', adminController.createNotificationCenter);
router.put('/notification-center/:id', adminController.updateNotificationCenter);
router.delete('/notification-center/:id', adminController.deleteNotificationCenter);

// Announcements (shared)
router.get('/announcements', announcementController.getAllAnnouncements);
router.post('/announcements', announcementController.createAnnouncement);
router.put('/announcements/:id', announcementController.updateAnnouncement);
router.delete('/announcements/:id', announcementController.deleteAnnouncement);

module.exports = router;