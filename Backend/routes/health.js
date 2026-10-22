const express = require('express');
const router = express.Router();
const healthController = require('../controllers/healthController');
const { authenticate, isAdmin } = require('../middleware/auth');

router.get('/info', healthController.getHealthInfo);
router.get('/services', healthController.getHealthServices);
router.get('/staff', healthController.getMedicalStaff);

// Admin-only service CRUD
router.post('/services', authenticate, isAdmin, healthController.addHealthService);
router.put('/services/:id', authenticate, isAdmin, healthController.updateHealthService);
router.delete('/services/:id', authenticate, isAdmin, healthController.deleteHealthService);

// Admin-only medical staff CRUD
router.post('/staff', authenticate, isAdmin, healthController.addMedicalStaff);
router.put('/staff/:id', authenticate, isAdmin, healthController.updateMedicalStaff);
router.delete('/staff/:id', authenticate, isAdmin, healthController.deleteMedicalStaff);

// Admin-only health center info update
router.put('/info', authenticate, isAdmin, healthController.updateHealthInfo);

module.exports = router;