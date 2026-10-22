const db = require('../db');

/**
 * Log an admin action to the audit_logs table.
 * 
 * @param {object} req - Express request (used for req.user and IP)
 * @param {string} action - Human-readable action text (e.g., "Updated report #12 status to resolved")
 * @param {object} [userOverride] - Optional { userId, userName } to log a specific user (used during login before req.user exists)
 */
async function logAudit(req, action, userOverride = null) {
    try {
        const userId = userOverride?.userId ?? req.user?.id ?? null;
        let userName = userOverride?.userName ?? null;

        // Auto-resolve user name if not provided
        if (!userName && userId) {
            const [user] = await db.query(
                'SELECT first_name, last_name FROM users WHERE user_id = ?',
                [userId]
            );
            userName = user.length > 0
                ? `${user[0].first_name} ${user[0].last_name}`.trim()
                : 'Unknown';
        }
        if (!userName) userName = 'System';

        // Behind a proxy (nginx/Cloudflare/ngrok), remoteAddress is the proxy's IP.
        // x-forwarded-for holds the real client IP as the FIRST entry in a comma list.
        const forwarded = req.headers?.['x-forwarded-for'];
        let ip = forwarded
            ? String(forwarded).split(',')[0].trim()
            : (req.socket?.remoteAddress || req.connection?.remoteAddress || '');
        ip = ip.replace(/^::ffff:/, '').replace(/^::1$/, '127.0.0.1') || null;

        await db.query(
            'INSERT INTO audit_logs (user_id, user_name, action, ip_address) VALUES (?, ?, ?, ?)',
            [userId, userName, action, ip]
        );
    } catch (err) {
        // Never let audit logging break a request
        console.error('Audit log error:', err);
    }
}

module.exports = { logAudit };