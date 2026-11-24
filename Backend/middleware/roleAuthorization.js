// Role checks use req.user populated by authenticate from the current users row.
exports.isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
    }
    next();
};

exports.isBarangayOfficial = (req, res, next) => {
    if (req.user.role !== 'barangay_official') {
        return res.status(403).json({ error: 'Barangay Official access required.' });
    }
    next();
};

exports.isResident = (req, res, next) => {
    if (req.user.role !== 'resident') {
        return res.status(403).json({ error: 'Resident access required.' });
    }
    next();
};

// Staff = Admin OR Barangay Official.
exports.isStaff = (req, res, next) => {
    if (req.user.role !== 'admin' && req.user.role !== 'barangay_official') {
        return res.status(403).json({ error: 'Staff access required.' });
    }
    next();
};

// Admins always allowed. Barangay officials need the current DB permission.
exports.requireAssignPermission = (req, res, next) => {
    if (req.user.role === 'admin') return next();
    if (req.user.role === 'barangay_official' && req.user.can_assign_worker) return next();
    return res.status(403).json({
        error: 'You do not have permission to assign workers. Please contact the system administrator.',
    });
};
