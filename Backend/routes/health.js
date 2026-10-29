const express = require('express');
const router = express.Router();
const healthController = require('../controllers/healthController');
const { authenticate, isStaff } = require('../middleware/auth');

router.get('/info', healthController.getHealthInfo);
router.get('/services', healthController.getHealthServices);
router.get('/staff', healthController.getMedicalStaff);

// Staff service CRUD (admin + barangay_official)
router.post('/services', authenticate, isStaff, healthController.addHealthService);
router.put('/services/:id', authenticate, isStaff, healthController.updateHealthService);
router.delete('/services/:id', authenticate, isStaff, healthController.deleteHealthService);

// Staff medical staff CRUD (admin + barangay_official)
router.post('/staff', authenticate, isStaff, healthController.addMedicalStaff);
router.put('/staff/:id', authenticate, isStaff, healthController.updateMedicalStaff);
router.delete('/staff/:id', authenticate, isStaff, healthController.deleteMedicalStaff);

// Staff health center info update (admin + barangay_official)
router.put('/info', authenticate, isStaff, healthController.updateHealthInfo);

module.exports = router;