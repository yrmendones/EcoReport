const db = require('../db');

/**
 * Validate a password against the current system_settings policy.
 * Called from register, resetPassword, and changePassword
 *
 * @param {string} password
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
async function validatePassword(password) {
    if (!password || typeof password !== 'string') {
        return { ok: false, error: 'Password is required.' };
    }

    // Read the current policy (single-row table, id = 1).
    // Fall back to defaults if the DB is unreachable so sign-ups aren't blocked.
    let minLen = 8;
    let requireStrong = true;
    try {
        const [rows] = await db.query(
            'SELECT min_password_length, require_strong_password FROM system_settings WHERE id = 1'
        );
        if (rows.length > 0) {
            minLen = Number(rows[0].min_password_length) || 8;
            requireStrong = rows[0].require_strong_password !== 0;
        }
    } catch (err) {
        console.error('Failed to read password policy settings:', err);
    }

    // Upper bound stays fixed at 16 to match the frontend maxLength
    if (password.length < minLen || password.length > 16) {
        return {
            ok: false,
            error: `Password must be between ${minLen} and 16 characters.`,
        };
    }

    if (requireStrong) {
        const hasLetter = /[A-Za-z]/.test(password);
        const hasDigit = /\d/.test(password);
        if (!hasLetter || !hasDigit) {
            return {
                ok: false,
                error: 'Password must contain both letters and numbers.',
            };
        }
    }

    return { ok: true };
}

module.exports = { validatePassword };