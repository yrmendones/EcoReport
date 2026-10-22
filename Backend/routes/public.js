const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');
const { authenticate } = require('../middleware/auth');

// Generate token (Requires Resident to be logged in)
router.post('/generate-qr-token', authenticate, publicController.generateQRToken);

// Verify token
router.get('/verify-token/:token', publicController.verifyQRToken);

module.exports = router;