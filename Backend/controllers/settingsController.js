const db = require('../db');
const { logAudit } = require('../utils/auditLogger');

// ─────────────────────────────────────────────
// GET settings (admin)
// ─────────────────────────────────────────────
exports.getSettings = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM system_settings WHERE id = 1');
        const [categories] = await db.query(
            'SELECT name FROM report_categories WHERE is_active = 1 ORDER BY display_order ASC'
        );
        const settings = rows[0] || {};

        res.json({
            ...settings,
            require_strong_password: !!settings.require_strong_password,
            email_notifications: !!settings.email_notifications,
            announcement_alerts: !!settings.announcement_alerts,
            maintenance_mode: !!settings.maintenance_mode,
            categories: categories.map((c) => c.name),
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch settings.' });
    }
};

// ─────────────────────────────────────────────
// PUT settings (admin)
// ─────────────────────────────────────────────
exports.updateSettings = async (req, res) => {
    try {
        await db.query('INSERT IGNORE INTO system_settings (id) VALUES (1)');

        const {
            barangay_name, contact_email, contact_number, address,
            pending_flag_days, required_id_type, covered_zones,
            min_password_length, max_login_attempts, web_session_timeout,
            lockout_duration, require_strong_password,
            email_notifications, announcement_alerts,
            maintenance_mode, maintenance_message,
            categories,
        } = req.body;

        // Validation
        if (min_password_length !== undefined) {
            const n = parseInt(min_password_length, 10);
            if (isNaN(n) || n < 6 || n > 30) {
                return res.status(400).json({ error: 'Min password length must be between 6 and 30.' });
            }
        }
        if (max_login_attempts !== undefined) {
            const n = parseInt(max_login_attempts, 10);
            if (isNaN(n) || n < 1 || n > 20) {
                return res.status(400).json({ error: 'Max login attempts must be between 1 and 20.' });
            }
        }
        if (web_session_timeout !== undefined) {
            const n = parseInt(web_session_timeout, 10);
            if (isNaN(n) || n < 5 || n > 1440) {
                return res.status(400).json({ error: 'Session timeout must be between 5 and 1440 minutes.' });
            }
        }

        await db.query(
            `UPDATE system_settings SET
                barangay_name = COALESCE(?, barangay_name),
                contact_email = ?,
                contact_number = ?,
                address = ?,
                pending_flag_days = COALESCE(?, pending_flag_days),
                required_id_type = COALESCE(?, required_id_type),
                covered_zones = ?,
                min_password_length = COALESCE(?, min_password_length),
                max_login_attempts = COALESCE(?, max_login_attempts),
                web_session_timeout = COALESCE(?, web_session_timeout),
                lockout_duration = COALESCE(?, lockout_duration),
                require_strong_password = COALESCE(?, require_strong_password),
                email_notifications = COALESCE(?, email_notifications),
                announcement_alerts = COALESCE(?, announcement_alerts),
                maintenance_mode = COALESCE(?, maintenance_mode),
                maintenance_message = ?,
                updated_at = NOW()
             WHERE id = 1`,
            [
                barangay_name ?? null,
                contact_email ?? null,
                contact_number ?? null,
                address ?? null,
                pending_flag_days !== undefined ? parseInt(pending_flag_days, 10) : null,
                required_id_type ?? null,
                covered_zones ?? null,
                min_password_length !== undefined ? parseInt(min_password_length, 10) : null,
                max_login_attempts !== undefined ? parseInt(max_login_attempts, 10) : null,
                web_session_timeout !== undefined ? parseInt(web_session_timeout, 10) : null,
                lockout_duration !== undefined ? parseInt(lockout_duration, 10) : null,
                require_strong_password !== undefined ? (require_strong_password ? 1 : 0) : null,
                email_notifications !== undefined ? (email_notifications ? 1 : 0) : null,
                announcement_alerts !== undefined ? (announcement_alerts ? 1 : 0) : null,
                maintenance_mode !== undefined ? (maintenance_mode ? 1 : 0) : null,
                maintenance_message ?? null,
            ]
        );

        // Categories: deactivate all, then reactivate/insert the submitted ones
        if (Array.isArray(categories)) {
            const cleaned = [
                ...new Set(
                    categories.map((c) => String(c).trim()).filter(Boolean)
                ),
            ];

            await db.query('UPDATE report_categories SET is_active = 0');

            for (let i = 0; i < cleaned.length; i++) {
                await db.query(
                    `INSERT INTO report_categories (name, display_order, is_active)
                     VALUES (?, ?, 1)
                     ON DUPLICATE KEY UPDATE display_order = ?, is_active = 1`,
                    [cleaned[i], i + 1, i + 1]
                );
            }
        }

        await logAudit(req, 'Updated system settings');
        res.json({ message: 'Settings saved successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to save settings.' });
    }
};

// ─────────────────────────────────────────────
// GET public categories
// ─────────────────────────────────────────────
exports.getPublicCategories = async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT name FROM report_categories WHERE is_active = 1 ORDER BY display_order ASC'
        );
        res.json(rows.map((r) => r.name));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch categories.' });
    }
};

// ─────────────────────────────────────────────
// GET public system status (used by mobile app on launch)
// ─────────────────────────────────────────────
exports.getPublicStatus = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT maintenance_mode, maintenance_message,
                    min_password_length, require_strong_password
             FROM system_settings WHERE id = 1`
        );
        const s = rows[0] || {};
        res.json({
            maintenance_mode: !!s.maintenance_mode,
            maintenance_message: s.maintenance_message || 'The app is under maintenance. Please try again later.',
            min_password_length: Number(s.min_password_length) || 8,
            require_strong_password: s.require_strong_password !== 0,
        });
    } catch (error) {
        console.error(error);
        // Fail-open so a DB hiccup never locks everyone out
        res.json({
            maintenance_mode: false,
            maintenance_message: '',
            min_password_length: 8,
            require_strong_password: true,
        });
    }
};