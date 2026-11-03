const db = require('../db');
const { sendNotificationEmail } = require('../utils/mailer');
const { formatRows } = require('../utils/dateFormatter');

// ============================================================
// RESIDENT FUNCTIONS (Mobile)
// ============================================================

exports.getUserNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const [results] = await db.query(
            `SELECT notification_id, title, message, type, is_read, created_at, reference_id
             FROM notifications 
             WHERE user_id = ?
             ORDER BY created_at DESC`,
            [userId]
        );
        res.json(formatRows(results, ["created_at"]));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch notifications.' });
    }
};

exports.getUnreadCount = async (req, res) => {
    try {
        const userId = req.user.id;
        const [result] = await db.query(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
            [userId]
        );
        res.json({ count: result[0].count });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to get unread count.' });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query(
            'UPDATE notifications SET is_read = 1 WHERE notification_id = ? AND user_id = ?',
            [id, req.user.id]
        );
        res.json({ message: 'Marked as read.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update.' });
    }
};

exports.markAllAsRead = async (req, res) => {
    try {
        await db.query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
        res.json({ message: 'All notifications marked as read.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update.' });
    }
};

// ============================================================
// INTERNAL HELPERS
// ============================================================

// parse user settings JSON safely Convert sanitized announcement HTML into readable plain text for notifications.
function stripHtmlToPlainText(html) {
  if (!html) return "";
  return String(html)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/blockquote>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// parse user settings JSON safely
function parseSettings(raw) {
    if (!raw) return {};

    if (Buffer.isBuffer(raw) || raw instanceof Uint8Array) {
        try {
            return JSON.parse(Buffer.from(raw).toString("utf8"));
        } catch {
            return {};
        }
    }
    if (typeof raw === "string") {
        try { return JSON.parse(raw); } catch { return {}; }
    }
    if (typeof raw === "object") return raw;

    return {};
}

function toBool(v, defaultValue) {
    if (v === undefined || v === null) return defaultValue;
    if (v === true || v === 1 || v === 1.0 || v === "true" || v === "1" || v === "TRUE") return true;
    if (v === false || v === 0 || v === "false" || v === "0" || v === "FALSE") return false;
    return defaultValue;
}

// Create individual notification for a user
exports.createNotification = async (userId, title, message, type = 'Report Update', referenceId = null) => {
    try {
        const [users] = await db.query(
            'SELECT email, settings FROM users WHERE user_id = ?',
            [userId]
        );
        if (users.length === 0) return;

        const settings = parseSettings(users[0].settings);
        const userEmail = users[0].email;

        const plainMessage = stripHtmlToPlainText(message);

        if (toBool(settings.pushNotifications, true)) {
            await db.query(
                'INSERT INTO notifications (user_id, title, message, type, is_read, created_at, reference_id) VALUES (?, ?, ?, ?, 0, NOW(), ?)',
                [userId, title, plainMessage, type, referenceId]
            );
        } else {
            console.log(`⏭️ Push notifications OFF for user ${userId} — skipping in-app.`);
        }

        if (toBool(settings.emailNotifications, false) && userEmail) {
            sendNotificationEmail(userEmail, title, plainMessage, type).catch((emailErr) => {
                console.error('⚠️ Email notification failed:', emailErr.message);
            });
        }
    } catch (error) {
        console.error('Error creating notification:', error);
    }
};

exports.broadcastToResidents = async (title, message, type = 'Announcement', referenceId = null) => {
    try {
        const [residents] = await db.query(
            'SELECT user_id, email, settings FROM users WHERE role = "resident"'
        );
        if (residents.length === 0) return { inApp: 0, email: 0, total: 0 };

        const inAppRows = [];
        const emailTargets = [];

        const plainMessage = stripHtmlToPlainText(message);

        // Temporary debug — reveals what mysql2 actually returns for `settings`
        if (residents.length > 0) {
            const sample = residents[0];
            console.log(
                `[BCAST DEBUG] total=${residents.length} ` +
                `sample_user=${sample.user_id} ` +
                `raw_type=${typeof sample.settings} ` +
                `isBuffer=${Buffer.isBuffer(sample.settings)} ` +
                `parsed=${JSON.stringify(parseSettings(sample.settings))}`
            );
        }

        for (const resident of residents) {
            const settings = parseSettings(resident.settings);

            const pushOn = toBool(settings.pushNotifications, true);
            const emailOn = toBool(settings.emailNotifications, false);

            if (pushOn) {
                inAppRows.push([resident.user_id, title, plainMessage, type, 0, referenceId]);
            }
            if (emailOn && resident.email) {
                emailTargets.push(resident.email);
            }
        }

        if (inAppRows.length > 0) {
            const placeholders = inAppRows.map(() => '(?, ?, ?, ?, ?, ?, NOW())').join(', ');
            await db.query(
                `INSERT INTO notifications (user_id, title, message, type, is_read, reference_id, created_at) VALUES ${placeholders}`,
                inAppRows.flat()
            );
        }

        for (const email of emailTargets) {
            sendNotificationEmail(email, title, plainMessage, type).catch((err) => {
                console.error(`⚠️ Email to ${email} failed:`, err.message);
            });
        }

        console.log(
            `📢 Broadcast "${title}" [${type}] — ` +
            `in-app: ${inAppRows.length}, email: ${emailTargets.length}, total residents: ${residents.length}`
        );

        return { inApp: inAppRows.length, email: emailTargets.length, total: residents.length };
    } catch (err) {
        console.error('Error broadcasting to residents:', err);
        throw err;
    }
};

// Send a notification center item to all residents
exports.sendNotificationCenter = async (title, message) => {
    try {
        const [result] = await db.query(
            'INSERT INTO notification_center (title, message, created_at) VALUES (?, ?, NOW())',
            [title, message]
        );
        const notificationId = result.insertId;

        const [residents] = await db.query(
            'SELECT user_id, email, settings FROM users WHERE role = "resident"'
        );

        const plainMessage = stripHtmlToPlainText(message);
        let inAppCount = 0;
        let emailCount = 0;

        for (const resident of residents) {
            const settings = parseSettings(resident.settings);

            const pushOn = toBool(settings.pushNotifications, true);
            const emailOn = toBool(settings.emailNotifications, false);

            if (pushOn) {
                await db.query(
                    'INSERT INTO notifications (user_id, title, message, type, is_read, created_at) VALUES (?, ?, ?, "Notification Center", 0, NOW())',
                    [resident.user_id, title, plainMessage]
                );
                inAppCount++;
            }

            if (emailOn && resident.email) {
                sendNotificationEmail(resident.email, title, plainMessage, 'Notification Center').catch((emailErr) => {
                    console.error(`⚠️ Email to ${resident.email} failed:`, emailErr.message);
                });
                emailCount++;
            }
        }

        console.log(
            `✅ Notification Center delivered — in-app: ${inAppCount}, email: ${emailCount}, total residents: ${residents.length}`
        );
        return notificationId;
    } catch (error) {
        console.error('Error sending notification center item:', error);
        throw error;
    }
};

exports.updateNotificationCenter = async (notificationId, title, message) => {
    try {
        await db.query(
            'UPDATE notification_center SET title = ?, message = ?, updated_at = NOW() WHERE notification_id = ?',
            [title, message, notificationId]
        );
        await db.query(
            'UPDATE notifications SET title = ?, message = ? WHERE type = "Notification Center" AND created_at = (SELECT created_at FROM notification_center WHERE notification_id = ?)',
            [title, message, notificationId]
        );
    } catch (error) {
        console.error('Error updating notification center item:', error);
        throw error;
    }
};

exports.deleteNotificationCenter = async (notificationId) => {
    try {
        const [item] = await db.query('SELECT title, message FROM notification_center WHERE notification_id = ?', [notificationId]);
        if (item.length > 0) {
            await db.query(
                'DELETE FROM notifications WHERE type = "Notification Center" AND title = ? AND message = ?',
                [item[0].title, item[0].message]
            );
        }
        await db.query('DELETE FROM notification_center WHERE notification_id = ?', [notificationId]);
    } catch (error) {
        console.error('Error deleting notification center item:', error);
        throw error;
    }
};