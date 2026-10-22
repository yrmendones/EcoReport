const express = require('express');
const router = express.Router();
const certificateController = require('../controllers/certificateController');
const { authenticate } = require('../middleware/auth');

router.post('/', authenticate, certificateController.createCertificateRequest);

module.exports = router;