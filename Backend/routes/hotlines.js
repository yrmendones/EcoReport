const express = require('express');
const router = express.Router();
const hotlineController = require('../controllers/hotlineController');
const { authenticate, isStaff } = require('../middleware/auth');

router.get('/', hotlineController.getHotlines);

// Staff hotline CRUD (admin + barangay_official)
router.post('/', authenticate, isStaff, hotlineController.addHotline);
router.put('/:id', authenticate, isStaff, hotlineController.updateHotline);
router.delete('/:id', authenticate, isStaff, hotlineController.deleteHotline);

module.exports = router;