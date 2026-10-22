const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate } = require('../middleware/auth');

// Public routes
router.get('/nearby', reportController.getNearbyReports);

// Authenticated routes
router.get('/',            authenticate, reportController.getReports);
router.get('/:id',         authenticate, reportController.getReportById);
router.get('/:id/media',   authenticate, reportController.getReportMedia);
router.get('/:id/timeline', authenticate, reportController.getReportTimeline);

router.post('/', authenticate, reportController.createReport);
router.post('/:id/media', authenticate, reportController.addReportMedia);
router.delete('/:report_id/media/:media_id', authenticate, reportController.deleteMedia);
router.put('/:id/status', authenticate, reportController.updateReportStatus);
router.delete('/:id', authenticate, reportController.deleteReport);

module.exports = router;