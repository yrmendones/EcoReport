const db = require('../db');
const { sendAdminAlertEmail } = require('./mailer');

const ADMIN_PANEL_URL =
    process.env.ADMIN_APP_URL ||
    process.env.WEB_APP_URL ||
    'http://localhost:5174';

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

async function isEmailNotificationsEnabled() {
    try {
        const [rows] = await db.query(
            'SELECT email_notifications FROM system_settings WHERE id = 1'
        );
        return rows[0]?.email_notifications !== 0 && rows[0]?.email_notifications !== false;
    } catch (err) {
        console.error('Failed to read email_notifications setting:', err);
        return false;
    }
}

async function getAlertRecipients() {
    const emails = new Set();

    // Barangay's public contact email
    try {
        const [settings] = await db.query(
            'SELECT contact_email FROM system_settings WHERE id = 1'
        );
        const ce = settings[0]?.contact_email;
        if (ce && String(ce).trim()) emails.add(String(ce).trim());
    } catch (err) {
        console.error('Failed to read contact_email:', err);
    }

    // Admins only
    try {
        const [staff] = await db.query(
            `SELECT email FROM users 
             WHERE role = 'admin' 
               AND email IS NOT NULL 
               AND status != 'Deactivated'`
        );
        staff.forEach((s) => {
            if (s.email && String(s.email).trim()) emails.add(String(s.email).trim());
        });
    } catch (err) {
        console.error('Failed to read admin emails:', err);
    }

    return Array.from(emails);
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ─────────────────────────────────────────────
// TRIGGER A - STAFF LOCKOUT
// ─────────────────────────────────────────────

exports.sendLockoutAlert = async (lockedEmail, isPermanent, minutesLeft) => {
    if (!(await isEmailNotificationsEnabled())) return;

    // Only alert on staff lockouts — resident lockouts aren't admin's concern
    try {
        const [rows] = await db.query(
            'SELECT first_name, last_name, role FROM users WHERE email = ?',
            [lockedEmail]
        );
        const user = rows[0];
        if (!user) return; // unknown email — no alert
        if (user.role !== 'admin' && user.role !== 'barangay_official') return;

        const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || lockedEmail;
        const when = new Date().toLocaleString('en-US', {
            timeZone: 'Asia/Manila',
            dateStyle: 'medium',
            timeStyle: 'short',
        });
        const duration = isPermanent
            ? 'until an administrator unlocks it'
            : `${minutesLeft} minute${minutesLeft === 1 ? '' : 's'}`;

        const body = `
            <div style="background: #FEE2E2; border: 1px solid #FCA5A5; border-radius: 12px; padding: 20px 22px; margin-bottom: 20px;">
                <p style="margin: 0 0 6px 0; color: #991B1B; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px;">
                    Account Locked
                </p>
                <h2 style="color: #991B1B; font-size: 18px; margin: 0 0 12px 0;">
                    Staff login attempt limit exceeded
                </h2>
                <table style="width: 100%; font-size: 13px; color: #333; border-collapse: collapse;">
                    <tr><td style="padding: 4px 0; font-weight: 700; width: 110px;">Account:</td><td>${escapeHtml(name)} &lt;${escapeHtml(lockedEmail)}&gt;</td></tr>
                    <tr><td style="padding: 4px 0; font-weight: 700;">Role:</td><td>${escapeHtml(user.role === 'admin' ? 'System Administrator' : 'Barangay Official')}</td></tr>
                    <tr><td style="padding: 4px 0; font-weight: 700;">Time:</td><td>${escapeHtml(when)}</td></tr>
                    <tr><td style="padding: 4px 0; font-weight: 700;">Locked:</td><td>${escapeHtml(duration)}</td></tr>
                </table>
            </div>
            <p style="font-size: 13px; line-height: 1.6;">
                This account has been locked due to too many failed login attempts. 
                If this was not expected, verify the account security and consider changing the password.
            </p>
            <p style="font-size: 13px; line-height: 1.6; margin-top: 8px;">
                <strong>To unlock manually:</strong> open User Management, click <em>Manage</em> on the affected row, 
                then choose <em>Reset failed logins</em>.
            </p>
            <div style="text-align: center; margin: 24px 0 8px 0;">
                <a href="${ADMIN_PANEL_URL}/usermanagement" style="display: inline-block; background: #0B5D2A; color: #fff; text-decoration: none; padding: 12px 32px; border-radius: 10px; font-size: 14px; font-weight: 700;">
                    Open User Management
                </a>
            </div>
        `;

        const recipients = await getAlertRecipients();
        if (recipients.length === 0) {
            console.warn('Lockout alert: no recipients configured.');
            return;
        }

        const subject = `Staff account locked: ${lockedEmail}`;
        await Promise.all(
            recipients.map((to) => sendAdminAlertEmail(to, subject, body))
        );
    } catch (err) {
        console.error('sendLockoutAlert failed:', err);
    }
};

// ─────────────────────────────────────────────
// TRIGGER B — PENDING ACCOUNTS OVERDUE
// ─────────────────────────────────────────────

async function hasRecentPendingAlert() {
    try {
        const [rows] = await db.query(
            `SELECT log_id FROM audit_logs 
             WHERE action LIKE 'Pending alert email sent%' 
               AND created_at > NOW() - INTERVAL 24 HOUR
             LIMIT 1`
        );
        return rows.length > 0;
    } catch (err) {
        console.error('hasRecentPendingAlert failed:', err);
        return false;
    }
}

/**
 * Returns { overdue_count, overdue_residents, locked_staff_count, alert_sent }.
 * Called from the dashboard on mount — also sends the digest email if the
 * 24h dedup window has expired and there are overdue residents.
 */
exports.checkAndSendPendingAlerts = async () => {
    const result = {
        overdue_count: 0,
        overdue_residents: [],
        locked_staff_count: 0,
        alert_sent: false,
    };

    try {
        // Fetch threshold
        const [settingsRows] = await db.query(
            'SELECT pending_flag_days FROM system_settings WHERE id = 1'
        );
        const threshold = Number(settingsRows[0]?.pending_flag_days) || 3;

        // Overdue pending residents
        const [overdue] = await db.query(
            `SELECT 
                user_id, resident_id, first_name, last_name,
                GREATEST(0, DATEDIFF(CURDATE(), registered_at)) AS days_pending
             FROM users 
             WHERE role = 'resident'
               AND verification_status = 'Pending Verification'
               AND registered_at IS NOT NULL
               AND DATEDIFF(CURDATE(), registered_at) >= ?
             ORDER BY days_pending DESC
             LIMIT 50`,
            [threshold]
        );
        result.overdue_count = overdue.length;
        result.overdue_residents = overdue;

        // Currently locked staff
        const [locked] = await db.query(
            `SELECT COUNT(*) AS n FROM login_attempts la
             JOIN users u 
                ON u.email COLLATE utf8mb4_unicode_ci = la.email COLLATE utf8mb4_unicode_ci
             WHERE la.locked_until IS NOT NULL 
               AND la.locked_until > NOW()
               AND u.role IN ('admin', 'barangay_official')`
        );
        result.locked_staff_count = locked[0]?.n || 0;

        // Email the summary if there's something to say + dedup window expired
        if (result.overdue_count > 0 && (await isEmailNotificationsEnabled())) {
            if (!(await hasRecentPendingAlert())) {
                const sent = await sendPendingSummary(overdue, threshold);
                result.alert_sent = sent;
            }
        }
    } catch (err) {
        console.error('checkAndSendPendingAlerts failed:', err);
    }

    return result;
};

async function sendPendingSummary(overdue, threshold) {
    const recipients = await getAlertRecipients();
    if (recipients.length === 0) return false;

    const plural = (n) => (n === 1 ? '' : 's');
    const subject = `${overdue.length} pending resident account${plural(overdue.length)} need review`;

    // Table of the 10 oldest, then "and N more"
    const show = overdue.slice(0, 10);
    const rowsHtml = show
        .map(
            (r) => `
        <tr>
            <td style="padding: 8px 10px; border-bottom: 1px solid #E5E7EB; font-size: 12px; color: #0B5D2A; font-family: monospace;">
                ${escapeHtml(r.resident_id || `#${r.user_id}`)}
            </td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #E5E7EB; font-size: 13px;">
                ${escapeHtml(`${r.first_name} ${r.last_name}`.trim())}
            </td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #E5E7EB; font-size: 12px; color: #92400E; font-weight: 700; text-align: right;">
                ${r.days_pending} day${plural(r.days_pending)}
            </td>
        </tr>`
        )
        .join('');

    const moreHtml =
        overdue.length > show.length
            ? `<p style="font-size: 12px; color: #666; margin: 8px 0 0 0;">
                   …and ${overdue.length - show.length} more.
               </p>`
            : '';

    const body = `
        <div style="background: #FEF3C7; border: 1px solid #FCD34D; border-radius: 12px; padding: 20px 22px; margin-bottom: 20px;">
            <p style="margin: 0 0 6px 0; color: #92400E; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px;">
                Pending Account Reminder
            </p>
            <h2 style="color: #92400E; font-size: 18px; margin: 0 0 12px 0;">
                ${overdue.length} resident account${plural(overdue.length)} pending for over ${threshold} day${plural(threshold)}
            </h2>
            <table style="width: 100%; border-collapse: collapse; margin-top: 8px; background: #fff; border-radius: 6px; overflow: hidden;">
                <thead>
                    <tr style="background: #FEF3C7;">
                        <th style="padding: 8px 10px; text-align: left; font-size: 10px; color: #92400E;">Resident ID</th>
                        <th style="padding: 8px 10px; text-align: left; font-size: 10px; color: #92400E;">Name</th>
                        <th style="padding: 8px 10px; text-align: right; font-size: 10px; color: #92400E;">Pending</th>
                    </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
            </table>
            ${moreHtml}
        </div>
        <p style="font-size: 13px; line-height: 1.6;">
            These residents have been waiting for verification longer than your 
            <strong>${threshold}-day</strong> threshold. Reviewing them keeps onboarding 
            fast and prevents support requests.
        </p>
        <div style="text-align: center; margin: 24px 0 8px 0;">
            <a href="${ADMIN_PANEL_URL}/account-verification" style="display: inline-block; background: #0B5D2A; color: #fff; text-decoration: none; padding: 12px 32px; border-radius: 10px; font-size: 14px; font-weight: 700;">
                Review Pending Accounts
            </a>
        </div>
        <p style="font-size: 11px; color: #888; line-height: 1.6; text-align: center; margin-top: 16px;">
            This reminder is sent at most once every 24 hours while overdue accounts exist.
            Adjust the threshold in System Settings → Verification.
        </p>
    `;

    // Fire all sends, then record the audit log so dedup works next time
    await Promise.all(
        recipients.map((to) => sendAdminAlertEmail(to, subject, body))
    );

    try {
        const { logAudit } = require('./auditLogger');
        await logAudit(
            { user: null, headers: {}, socket: {}, connection: {} },
            `Pending alert email sent — ${overdue.length} overdue account${plural(overdue.length)} (threshold ${threshold}d)`
        );
    } catch (err) {
        console.error('Failed to record pending alert in audit log:', err);
    }

    return true;
}