const express = require('express');
const router = express.Router();
const announcementController = require('../controllers/announcementController');
const { authenticate, isStaff } = require('../middleware/auth');

router.get('/', announcementController.getPublishedAnnouncements);

// Admin routes
router.get('/admin', authenticate, isStaff, announcementController.getAllAnnouncements);
router.post('/', authenticate, isStaff, announcementController.createAnnouncement);
router.put('/:id', authenticate, isStaff, announcementController.updateAnnouncement);
router.delete('/:id', authenticate, isStaff, announcementController.deleteAnnouncement);

module.exports = router;