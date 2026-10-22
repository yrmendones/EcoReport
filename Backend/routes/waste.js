const express = require('express');
const router = express.Router();
const wasteController = require('../controllers/wasteController');

router.get('/', wasteController.getWasteSchedule);

module.exports = router;