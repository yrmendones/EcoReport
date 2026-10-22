const db = require('../db');
const { logTimeline } = require('../utils/timelineLogger');

function parseSettings(raw) {
    if (!raw) return {};
    if (typeof raw === 'string') {
        try { return JSON.parse(raw); } catch { return {}; }
    }
    return raw;
}

exports.createReport = async (req, res) => {
    try {
        const { user_id, category, description, address, latitude, longitude } = req.body;
        if (!user_id || !category) return res.status(400).json({ error: 'User ID and category required.' });

        const [result] = await db.query(
            `INSERT INTO environmental_reports 
            (user_id, category, description, address, latitude, longitude, status, submitted_at) 
            VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())`,
            [
                user_id,
                category,
                description || null,
                address || null,
                latitude || null,
                longitude || null,
            ]
        );

        // Log the initial "submitted" step in the timeline
        await logTimeline(result.insertId, 'pending', 'Report submitted');

        res.status(201).json({ message: 'Report submitted!', report_id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to submit report.' });
    }
};

exports.getReports = async (req, res) => {
    try {
        const { user_id } = req.query;
        const isStaff = req.user.role === 'admin' || req.user.role === 'barangay_official';

        // Determine which user's reports to fetch
        let targetUserId;
        if (user_id) {
            targetUserId = parseInt(user_id, 10);
            if (!isStaff && targetUserId !== req.user.id) {
                return res.status(403).json({
                    error: 'Access denied. You can only view your own reports.'
                });
            }
        } else {
            targetUserId = isStaff ? null : req.user.id;
        }

        let sql = `
            SELECT r.*, u.first_name, u.last_name, u.profile_picture, u.settings
            FROM environmental_reports r
            JOIN users u ON r.user_id = u.user_id
            WHERE r.status != 'deleted'
        `;
        const params = [];
        if (targetUserId !== null) {
            sql += ' AND r.user_id = ?';
            params.push(targetUserId);
        }
        sql += ' ORDER BY r.report_id DESC';
        const [results] = await db.query(sql, params);
        const processed = results.map((report) => {
            const settings = parseSettings(report.settings);
            if (settings.publicProfile === false) {
                report.first_name = null;
                report.last_name = null;
            }
            delete report.settings;
            return report;
        });
        res.json(processed);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch reports.' });
    }
};

exports.getReportById = async (req, res) => {
    try {
        const [results] = await db.query(
            `SELECT r.*, u.first_name, u.last_name 
             FROM environmental_reports r 
             LEFT JOIN users u ON r.user_id = u.user_id 
             WHERE r.report_id = ?`,
            [req.params.id]
        );
        if (results.length === 0) return res.status(404).json({ error: 'Report not found.' });

        const report = results[0];
        const isStaff = req.user.role === 'admin' || req.user.role === 'barangay_official';
        if (!isStaff && report.user_id !== req.user.id) {
            return res.status(403).json({
                error: 'Access denied. You can only view your own reports.'
            });
        }

        res.json(report);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch report.' });
    }
};

exports.getNearbyReports = async (req, res) => {
    try {
        const { lat, lng } = req.query;

        let sql = `
            SELECT 
                r.*,
                u.first_name,
                u.last_name,
                u.profile_picture,
                u.settings,
                COALESCE(u.first_name, r.guest_name) AS reporter_name
        `;

        const params = [];

        // Distance in km using the Haversine formula. Computes the great-circle distance between the client's coordinates (?, ?, ?)
        // each report's (r.latitude, r.longitude) using 6371 km as the Earth's mean radius. ACOS can produce values slightly outside [-1, 1] 
        // due to floating-point rounding, so LEAST(1.0, ...) clamps the result to avoid a NaN error for identical coordinates.
        if (lat && lng && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng))) {
            const latNum = parseFloat(lat);
            const lngNum = parseFloat(lng);
            sql += `,
                (6371 * ACOS(
                    LEAST(1.0,
                        COS(RADIANS(?)) * COS(RADIANS(r.latitude)) *
                        COS(RADIANS(r.longitude) - RADIANS(?)) +
                        SIN(RADIANS(?)) * SIN(RADIANS(r.latitude))
                    )
                )) AS distance_km
            `;
            params.push(latNum, lngNum, latNum);
        }

        sql += `
            FROM environmental_reports r
            LEFT JOIN users u ON r.user_id = u.user_id
            WHERE r.latitude IS NOT NULL 
              AND r.longitude IS NOT NULL
              AND r.status != 'deleted'
        `;

        if (params.length > 0) {
            sql += ` ORDER BY distance_km ASC`;
        } else {
            sql += ` ORDER BY r.report_id DESC`;
        }
        sql += ` LIMIT 100`;

        const [results] = await db.query(sql, params);

        const shareable = results.filter((report) => {
            if (!report.user_id) return true;
            const settings = parseSettings(report.settings);
            return settings.shareLocation !== false;
        });

        const processed = shareable.map((report) => {
            const settings = report.user_id ? parseSettings(report.settings) : {};
            if (report.user_id) {
                if (settings.publicProfile === false) {
                    report.first_name = null;
                    report.last_name = null;
                }
            } else {
                report.first_name = report.guest_name;
                report.last_name = null;
            }
            delete report.settings;
            return report;
        });

        res.json(processed);
    } catch (error) {
        console.error("Error fetching nearby reports:", error);
        res.status(500).json({ error: 'Failed to fetch nearby reports.' });
    }
};

exports.getReportMedia = async (req, res) => {
    try {
        const isStaff = req.user.role === 'admin' || req.user.role === 'barangay_official';

        // Ownership check only if not staff
        if (!isStaff) {
            const [report] = await db.query(
                'SELECT user_id FROM environmental_reports WHERE report_id = ?',
                [req.params.id]
            );
            if (report.length === 0) {
                return res.status(404).json({ error: 'Report not found.' });
            }
            if (report[0].user_id !== req.user.id) {
                return res.status(403).json({
                    error: 'Access denied. You can only view your own reports.'
                });
            }
        }

        const [results] = await db.query(
            'SELECT * FROM report_media WHERE report_id = ? ORDER BY created_at ASC',
            [req.params.id]
        );
        res.json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch media.' });
    }
};

// fetch the status timeline for a report
exports.getReportTimeline = async (req, res) => {
    try {
        const isStaff = req.user.role === 'admin' || req.user.role === 'barangay_official';

        // Ownership check only if not staff
        if (!isStaff) {
            const [report] = await db.query(
                'SELECT user_id FROM environmental_reports WHERE report_id = ?',
                [req.params.id]
            );
            if (report.length === 0) {
                return res.status(404).json({ error: 'Report not found.' });
            }
            if (report[0].user_id !== req.user.id) {
                return res.status(403).json({
                    error: 'Access denied. You can only view your own reports.'
                });
            }
        }

        const [results] = await db.query(
            `SELECT timeline_id, status, note, created_at 
             FROM report_timeline 
             WHERE report_id = ? 
             ORDER BY created_at ASC, timeline_id ASC`,
            [req.params.id]
        );
        res.json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch timeline.' });
    }
};

exports.addReportMedia = async (req, res) => {
    try {
        const { file_url, file_type } = req.body;
        if (!file_url || !file_type) return res.status(400).json({ error: 'file_url and file_type required.' });
        if (!['image', 'video'].includes(file_type)) return res.status(400).json({ error: "file_type must be 'image' or 'video'." });
        const [result] = await db.query(
            'INSERT INTO report_media (report_id, file_url, file_type) VALUES (?, ?, ?)',
            [req.params.id, file_url, file_type]
        );
        res.status(201).json({ message: 'Media saved!', media_id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to save media.' });
    }
};

exports.deleteMedia = async (req, res) => {
    try {
        const { report_id, media_id } = req.params;
        const [media] = await db.query('SELECT file_url FROM report_media WHERE media_id = ? AND report_id = ?', [media_id, report_id]);
        if (media.length === 0) return res.status(404).json({ error: 'Media not found.' });
        await db.query('DELETE FROM report_media WHERE media_id = ? AND report_id = ?', [media_id, report_id]);
        res.json({ message: 'Media deleted!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete media.' });
    }
};

exports.updateReportStatus = async (req, res) => {
    try {
        const { status } = req.body;
        if (!status || !['pending', 'ongoing', 'resolved', 'rejected', 'assigned'].includes(status))
            return res.status(400).json({ error: 'Invalid status.' });
        await db.query('UPDATE environmental_reports SET status = ? WHERE report_id = ?', [status, req.params.id]);
        await logTimeline(req.params.id, status, 'Status updated');
        res.json({ message: 'Status updated!' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update status.' });
    }
};

exports.deleteReport = async (req, res) => {
    try {
        await db.query('DELETE FROM environmental_reports WHERE report_id = ?', [req.params.id]);
        res.json({ message: 'Report deleted!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete report.' });
    }
};