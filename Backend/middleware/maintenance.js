const db = require('../db');
const jwt = require('jsonwebtoken');

// 5-second cache so admins can flip maintenance on/off and see effect
let cached = { enabled: false, message: '', at: 0 };
const CACHE_MS = 5000;

async function getState() {
    if (Date.now() - cached.at < CACHE_MS) return cached;
    try {
        const [rows] = await db.query(
            'SELECT maintenance_mode, maintenance_message FROM system_settings WHERE id = 1'
        );
        const s = rows[0] || {};
        cached = {
            enabled: !!s.maintenance_mode,
            message: s.maintenance_message || 'The app is under maintenance. Please try again later.',
            at: Date.now(),
        };
    } catch (err) {
        console.error('Maintenance check failed:', err);
        // Fail-open — a DB hiccup must not lock everyone out
        cached = { enabled: false, message: '', at: Date.now() };
    }
    return cached;
}

function isStaff(req) {
    // If authenticate() already ran (protected routes), use it
    if (req.user && (req.user.role === 'admin' || req.user.role === 'barangay_official')) {
        return true;
    }
    // Otherwise decode inline
    const header = req.headers['authorization'];
    const token = header && header.split(' ')[1];
    if (!token) return false;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback');
        return decoded.role === 'admin' || decoded.role === 'barangay_official';
    } catch {
        return false;
    }
}

/**
 * Reject resident/guest requests when maintenance mode is on.
 * Staff (admin / barangay_official) are always allowed through so they
 * can turn maintenance off again.
 *
 * Mounted only on resident-facing routes
 */
exports.maintenanceGuard = async (req, res, next) => {
    const state = await getState();
    if (!state.enabled) return next();
    if (isStaff(req)) return next();
    return res.status(503).json({
        error: 'maintenance',
        message: state.message,
    });
};

/** Clear the cache so a settings save takes effect immediately. */
exports.invalidateMaintenanceCache = () => {
    cached.at = 0;
};