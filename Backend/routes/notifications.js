const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, notificationController.getUserNotifications);
router.get('/unread-count', authenticate, notificationController.getUnreadCount); // NEW
router.put('/:id/read', authenticate, notificationController.markAsRead);
router.put('/read-all', authenticate, notificationController.markAllAsRead);

module.exports = router;