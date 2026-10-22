const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');

router.get('/me', authenticate, userController.getProfile);
router.put('/me', authenticate, userController.updateProfile);
router.put('/me/password', authenticate, userController.changePassword);
router.get('/me/stats', authenticate, userController.getStats);
router.get('/me/settings', authenticate, userController.getSettings);
router.put('/me/settings', authenticate, userController.updateSettings);

module.exports = router;