const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { authenticate } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

router.post('/', authenticate, upload.array('files', 10), uploadController.uploadFiles);

module.exports = router;