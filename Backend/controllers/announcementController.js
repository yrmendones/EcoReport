const db = require('../db');
const { logAudit } = require('../utils/auditLogger');
const { formatRow, formatRows } = require('../utils/dateFormatter');
const notificationController = require('./notificationController');
const { sanitizeDescription } = require('../utils/sanitizeHtml');
const withTransaction = require('../utils/withTransaction');

exports.getPublishedAnnouncements = async (req, res) => {
    try {
        const [results] = await db.query(
            `SELECT announcement_id, title, content, category, 
                    DATE_FORMAT(posted_at, '%M %d, %Y') AS date,
                    posted_at,
                    status
             FROM announcements 
             WHERE status = 'Published'
             ORDER BY posted_at DESC`
        );
        res.json(formatRows(results, ["posted_at"]));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch announcements.' });
    }
};

exports.getAllAnnouncements = async (req, res) => {
    try {
        const [results] = await db.query(
            `SELECT announcement_id, title, content, category, 
                    DATE_FORMAT(posted_at, '%M %d, %Y') AS date,
                    posted_at,
                    status
             FROM announcements 
             ORDER BY posted_at DESC`
        );
        res.json(formatRows(results, ["posted_at"]));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch announcements.' });
    }
};

exports.getAnnouncementById = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM announcements WHERE announcement_id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Announcement not found.' });
        res.json(formatRow(rows[0], ["posted_at"]));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch announcement.' });
    }
};

exports.createAnnouncement = async (req, res) => {
    try {
        const { title, content, category, status } = req.body;
        if (!title || !content || !category)
            return res.status(400).json({ error: 'Title, content, and category required.' });
        const finalStatus = status || 'Draft';
        const cleanContent = sanitizeDescription(content);
        const [result] = await db.query(
            'INSERT INTO announcements (title, content, category, posted_by, posted_at, status) VALUES (?, ?, ?, ?, NOW(), ?)',
            [title, cleanContent, category, req.user.id, finalStatus]
        );

        // Audit
        await logAudit(req, `Created announcement "${title}" (category: ${category}, status: ${finalStatus})`);

        // Broadcast to residents only if published AND announcement_alerts is enabled
        if (finalStatus === 'Published') {
            const broadcastType =
                category === 'Health'   ? 'Health Announcement' :
                category === 'Disaster' ? 'Disaster Alert' :
                                          'Announcement';

            // Check the system-wide switch
            const [settingsRows] = await db.query(
                'SELECT announcement_alerts FROM system_settings WHERE id = 1'
            );
            const alertsEnabled = settingsRows[0]?.announcement_alerts !== 0;

            if (alertsEnabled) {
                try {
                    await notificationController.broadcastToResidents(
                        `New ${broadcastType}: ${title}`,
                        cleanContent,
                        broadcastType,
                        result.insertId
                    );
                } catch (notifErr) {
                    console.error('Failed to broadcast announcement:', notifErr);
                }
            } else {
                console.log('⏭️ Announcement alerts disabled in system settings — skipping broadcast.');
            }
        }

        res.status(201).json({ message: 'Announcement created!', announcement_id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create announcement.' });
    }
};

exports.updateAnnouncement = async (req, res) => {
    try {
        const { title, content, category, status } = req.body;
        if (!title || !content || !category || !status)
            return res.status(400).json({ error: 'Title, content, category, and status required.' });

        const cleanContent = sanitizeDescription(content);
        const updateResult = await withTransaction(db, async (connection) => {
            // Lock linked alert rows before the announcement row, matching the
            // alert update/delete transaction order.
            const [linkedAlerts] = await connection.query(
                'SELECT alert_id FROM disaster_alerts WHERE linked_announcement_id = ? FOR UPDATE',
                [req.params.id]
            );
            const [existing] = await connection.query(
                'SELECT title, status FROM announcements WHERE announcement_id = ? FOR UPDATE',
                [req.params.id]
            );
            if (existing.length === 0) return null;

            const finalCategory = linkedAlerts.length > 0 ? 'Disaster' : category;
            await connection.query(
                'UPDATE announcements SET title = ?, content = ?, category = ?, status = ? WHERE announcement_id = ?',
                [title, cleanContent, finalCategory, status, req.params.id]
            );

            if (linkedAlerts.length > 0) {
                await connection.query(
                    `UPDATE disaster_alerts
                     SET title = ?, description = ?, status = ?
                     WHERE linked_announcement_id = ?`,
                    [title, cleanContent || null, status === 'Published' ? 'Active' : 'Inactive', req.params.id]
                );
            }

            return { existing: existing[0], category: finalCategory };
        });
        if (!updateResult) {
            return res.status(404).json({ error: 'Announcement not found.' });
        }

        // Audit
        const statusChanged = updateResult.existing.status !== status;
        const auditMsg = statusChanged
            ? `Updated announcement "${title}" status from ${updateResult.existing.status} to ${status}`
            : `Updated announcement "${title}" (category: ${updateResult.category})`;

        await logAudit(req, auditMsg);

        // Broadcast only on Draft → Published transition
        // Broadcast to residents only if published AND announcement_alerts is enabled
        if (statusChanged && status === 'Published') {
            const broadcastType =
                updateResult.category === 'Health'   ? 'Health Announcement' :
                updateResult.category === 'Disaster' ? 'Disaster Alert' :
                                          'Announcement';

            // Check the system-wide switch
            const [settingsRows] = await db.query(
                'SELECT announcement_alerts FROM system_settings WHERE id = 1'
            );
            const alertsEnabled = settingsRows[0]?.announcement_alerts !== 0;

            if (alertsEnabled) {
                try {
                    await notificationController.broadcastToResidents(
                        `New ${broadcastType}: ${title}`,
                        cleanContent,
                        broadcastType,
                        req.params.id
                    );
                } catch (notifErr) {
                    console.error('Failed to broadcast announcement:', notifErr);
                }
            } else {
                console.log('⏭️ Announcement alerts disabled in system settings — skipping broadcast.');
            }
        }

        res.json({ message: 'Announcement updated!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update announcement.' });
    }
};

exports.deleteAnnouncement = async (req, res) => {
    try {
        const deletedTitle = await withTransaction(db, async (connection) => {
            // Lock linked alerts before the announcement to match disaster
            // alert update/delete transactions.
            await connection.query(
                'SELECT alert_id FROM disaster_alerts WHERE linked_announcement_id = ? FOR UPDATE',
                [req.params.id]
            );
            const [existing] = await connection.query(
                'SELECT title FROM announcements WHERE announcement_id = ? FOR UPDATE',
                [req.params.id]
            );
            if (existing.length === 0) return null;

            // Null the optional link explicitly so behavior is consistent
            // even where the database FK has not been installed.
            await connection.query(
                'UPDATE disaster_alerts SET linked_announcement_id = NULL WHERE linked_announcement_id = ?',
                [req.params.id]
            );
            await connection.query('DELETE FROM announcements WHERE announcement_id = ?', [req.params.id]);
            return existing[0].title;
        });
        if (deletedTitle === null) {
            return res.status(404).json({ error: 'Announcement not found.' });
        }

        // Audit
        await logAudit(req, `Deleted announcement "${deletedTitle}"`);

        res.json({ message: 'Announcement deleted!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete announcement.' });
    }
};
