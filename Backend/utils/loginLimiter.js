const db = require('../db');

// Sentinel for "permanently locked until admin unlocks" - matches the
// lockout_duration = 0 option ("Until an admin unlocks it") in System Settings.
const PERMANENT_LOCK_SENTINEL = '9999-12-31 23:59:59';

/**
 * Read the current login policy from system_settings.
 * Falls back to safe defaults if the DB is unreachable.
 */
async function getSettings() {
    try {
        const [rows] = await db.query(
            'SELECT max_login_attempts, lockout_duration FROM system_settings WHERE id = 1'
        );
        const s = rows[0] || {};
        return {
            maxAttempts: Math.max(1, Number(s.max_login_attempts) || 5),
            lockoutMinutes: Math.max(0, Number(s.lockout_duration) || 15),
        };
    } catch (err) {
        console.error('Failed to read login policy settings:', err);
        return { maxAttempts: 5, lockoutMinutes: 15 };
    }
}

/**
 * Check whether an email is currently locked.
 * Auto-clears an expired temporary lock so the user can try again.
 *
 * Returns:
 *   { locked: false }
 *   { locked: true, isPermanent: true }               → "Contact admin"
 *   { locked: true, isPermanent: false, minutesLeft } → "Try again in N min"
 */
async function checkLock(email) {
    const [rows] = await db.query(
        'SELECT attempts, locked_until FROM login_attempts WHERE email = ?',
        [email]
    );
    if (rows.length === 0) return { locked: false };

    const r = rows[0];
    if (!r.locked_until) return { locked: false };

    const lockedUntil = new Date(r.locked_until);
    if (lockedUntil <= new Date()) {
        // Temporary lock has expired - reset so the next attempt gets a clean slate
        await db.query(
            'UPDATE login_attempts SET attempts = 0, locked_until = NULL WHERE email = ?',
            [email]
        );
        return { locked: false };
    }

    const isPermanent = lockedUntil.getFullYear() >= 9999;
    const minutesLeft = isPermanent
        ? null
        : Math.max(1, Math.ceil((lockedUntil - Date.now()) / 60000));

    return { locked: true, minutesLeft, isPermanent };
}

/**
 * Record a failed login attempt.
 * Increments the counter and, when it hits maxAttempts, sets locked_until.
 *
 * Returns one of:
 *   { justLocked: true, isPermanent: true }               → this attempt triggered a permanent lock
 *   { justLocked: true, isPermanent: false, minutesLeft } → this attempt triggered a temporary lock
 *   { justLocked: false, attemptsLeft }                   → not yet locked
 */
async function recordFailure(email) {
    const { maxAttempts, lockoutMinutes } = await getSettings();

    await db.query(
        `INSERT INTO login_attempts (email, attempts, last_attempt_at)
         VALUES (?, 1, NOW())
         ON DUPLICATE KEY UPDATE attempts = attempts + 1, last_attempt_at = NOW()`,
        [email]
    );

    const [rows] = await db.query(
        'SELECT attempts FROM login_attempts WHERE email = ?',
        [email]
    );
    const attempts = rows[0]?.attempts || 0;

    if (attempts >= maxAttempts) {
        const lockedUntil = lockoutMinutes === 0
            ? PERMANENT_LOCK_SENTINEL
            : new Date(Date.now() + lockoutMinutes * 60000);
        await db.query(
            'UPDATE login_attempts SET locked_until = ? WHERE email = ?',
            [lockedUntil, email]
        );

        // Fire-and-forget alert - don't block the login response on Resend
        const isPermanent = lockoutMinutes === 0;
        try {
            const adminAlerts = require('./adminAlerts');
            adminAlerts
                .sendLockoutAlert(email, isPermanent, lockoutMinutes)
                .catch((err) => console.error('sendLockoutAlert error:', err));
        } catch (err) {
            console.error('Failed to load adminAlerts:', err);
        }

        return {
            justLocked: true,
            minutesLeft: isPermanent ? null : lockoutMinutes,
            isPermanent,
        };
    }

    return { justLocked: false, attemptsLeft: maxAttempts - attempts };
}

/**
 * Clear all failure records for an email.
 * Called on successful login AND when an admin manually unlocks.
 */
async function clearFailures(email) {
    await db.query('DELETE FROM login_attempts WHERE email = ?', [email]);
}

module.exports = { getSettings, checkLock, recordFailure, clearFailures };