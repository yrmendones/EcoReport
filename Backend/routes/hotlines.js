const express = require('express');
const router = express.Router();
const hotlineController = require('../controllers/hotlineController');
const { authenticate, isAdmin } = require('../middleware/auth');

router.get('/', hotlineController.getHotlines);

// Admin-only hotline CRUD
router.post('/', authenticate, isAdmin, hotlineController.addHotline);
router.put('/:id', authenticate, isAdmin, hotlineController.updateHotline);
router.delete('/:id', authenticate, isAdmin, hotlineController.deleteHotline);

module.exports = router;