const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');
const settingsController = require('../controllers/settingsController');
const { authenticate } = require('../middleware/auth');

// Generate token (Requires Resident to be logged in)
router.post('/generate-qr-token', authenticate, publicController.generateQRToken);

// Verify token
router.get('/verify-token/:token', publicController.verifyQRToken);

// Report categories for the mobile app dropdown
router.get('/status', settingsController.getPublicStatus);

module.exports = router;