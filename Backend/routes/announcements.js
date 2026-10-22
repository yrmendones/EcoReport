const express = require('express');
const router = express.Router();
const announcementController = require('../controllers/announcementController');
const { authenticate, isAdmin } = require('../middleware/auth');

router.get('/', announcementController.getPublishedAnnouncements);

// Admin routes
router.get('/admin', authenticate, isAdmin, announcementController.getAllAnnouncements);
router.post('/', authenticate, isAdmin, announcementController.createAnnouncement);
router.put('/:id', authenticate, isAdmin, announcementController.updateAnnouncement);
router.delete('/:id', authenticate, isAdmin, announcementController.deleteAnnouncement);

module.exports = router;