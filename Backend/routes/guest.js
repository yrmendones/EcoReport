const express = require('express');
const router = express.Router();
const guestController = require('../controllers/guestController');
const uploadController = require('../controllers/uploadController');
const { guestUpload } = require('../middleware/upload');

// Guest upload - uses uploadController
router.post('/upload', guestUpload.array('files', 10), uploadController.guestUploadFiles);

// Guest report submission - uses guestController
router.post('/reports', guestController.submitGuestReport);

module.exports = router;