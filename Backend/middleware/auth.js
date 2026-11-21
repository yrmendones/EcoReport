const jwt = require('jsonwebtoken');
const db = require('../db');
const createAuthenticate = require('../utils/createAuthenticate');

exports.authenticate = createAuthenticate({ tokenService: jwt, database: db });

// Admin only
exports.isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
    }
    next();
};

// Barangay Official only
exports.isBarangayOfficial = (req, res, next) => {
    if (req.user.role !== 'barangay_official') {
        return res.status(403).json({ error: 'Barangay Official access required.' });
    }
    next();
};

// Staff = Admin OR Barangay Official
exports.isStaff = (req, res, next) => {
    if (req.user.role !== 'admin' && req.user.role !== 'barangay_official') {
        return res.status(403).json({ error: 'Staff access required.' });
    }
    next();
};

// Assign Worker permission.
// Admins always allowed. Barangay officials must have can_assign_worker = 1.
exports.requireAssignPermission = (req, res, next) => {
    if (req.user.role === 'admin') return next();
    if (req.user.role === 'barangay_official' && req.user.can_assign_worker) return next();
    return res.status(403).json({
        error: 'You do not have permission to assign workers. Please contact the system administrator.',
    });
};
