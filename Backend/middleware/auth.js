const jwt = require('jsonwebtoken');
const db = require('../db');

exports.authenticate = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access denied.' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback');

        const [users] = await db.query(
            'SELECT status, role, can_assign_worker FROM users WHERE user_id = ?',
            [decoded.id]
        );
        if (users.length === 0) return res.status(403).json({ error: 'User not found.' });
        if (users[0].status === 'Deactivated') {
            return res.status(403).json({ error: 'Account deactivated. Please contact admin.' });
        }

        // Heartbeat: every authenticated request refreshes last_active_at.
        // The Resident Management page uses this timestamp to compute Online/Offline status dynamically
        await db.query(
            'UPDATE users SET last_active_at = NOW() WHERE user_id = ?',
            [decoded.id]
        );

        // Role + permission are read fresh from the DB on every request
        // admin changes take effect immediately without requiring a re-login.
        req.user = {
            ...decoded,
            role: users[0].role,
            can_assign_worker: !!users[0].can_assign_worker,
        };
        next();
    } catch (err) {
        res.status(403).json({ error: 'Invalid token.' });
    }
};

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