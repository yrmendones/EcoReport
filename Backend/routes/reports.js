const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate } = require('../middleware/auth');
const { isAdmin, isBarangayOfficial, isResident, isStaff } = require('../middleware/roleAuthorization');

// Public routes
router.get('/nearby', authenticate, reportController.getNearbyReports);

// Authenticated routes
router.get('/',            authenticate, reportController.getReports);
router.get('/:id',         authenticate, reportController.getReportById);
router.get('/:id/media',   authenticate, reportController.getReportMedia);
router.get('/:id/timeline', authenticate, reportController.getReportTimeline);

router.post('/', authenticate, isResident, reportController.createReport);
router.post('/:id/media', authenticate, isStaff, reportController.addReportMedia);
router.delete('/:report_id/media/:media_id', authenticate, isAdmin, reportController.deleteMedia);
router.put('/:id/status', authenticate, isStaff, reportController.updateReportStatus);
router.delete('/:id', authenticate, isBarangayOfficial, reportController.deleteReport);

module.exports = router;
