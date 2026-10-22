const db = require('../db');
const { logAudit } = require('../utils/auditLogger');

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
        res.json(results);
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
        res.json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch announcements.' });
    }
};

exports.getAnnouncementById = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM announcements WHERE announcement_id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Announcement not found.' });
        res.json(rows[0]);
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
        const [result] = await db.query(
            'INSERT INTO announcements (title, content, category, posted_by, posted_at, status) VALUES (?, ?, ?, ?, NOW(), ?)',
            [title, content, category, req.user.id, finalStatus]
        );

        // Audit
        await logAudit(req, `Created announcement "${title}" (category: ${category}, status: ${finalStatus})`);

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

        // Fetch existing to detect status change
        const [existing] = await db.query(
            'SELECT title, status FROM announcements WHERE announcement_id = ?',
            [req.params.id]
        );
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Announcement not found.' });
        }

        await db.query(
            'UPDATE announcements SET title = ?, content = ?, category = ?, status = ? WHERE announcement_id = ?',
            [title, content, category, status, req.params.id]
        );

        // Audit — note status change if it happened
        const statusChanged = existing[0].status !== status;
        const auditMsg = statusChanged
            ? `Updated announcement "${title}" status from ${existing[0].status} to ${status}`
            : `Updated announcement "${title}" (category: ${category})`;

        await logAudit(req, auditMsg);

        res.json({ message: 'Announcement updated!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update announcement.' });
    }
};

exports.deleteAnnouncement = async (req, res) => {
    try {
        const [existing] = await db.query(
            'SELECT title FROM announcements WHERE announcement_id = ?',
            [req.params.id]
        );
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Announcement not found.' });
        }

        await db.query('DELETE FROM announcements WHERE announcement_id = ?', [req.params.id]);

        // Audit
        await logAudit(req, `Deleted announcement "${existing[0].title}"`);

        res.json({ message: 'Announcement deleted!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete announcement.' });
    }
};