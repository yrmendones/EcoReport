const db = require('../db');

exports.submitGuestReport = async (req, res) => {
    try {
        const {
            guest_name, guest_mobile, category, description,
            latitude, longitude, image_url, media
        } = req.body;

        if (!guest_name || !guest_mobile || !category)
            return res.status(400).json({ error: 'Guest name, mobile, and category required.' });

        const mobileRegex = /^(09)\d{9}$/;
        if (!mobileRegex.test(guest_mobile)) {
            return res.status(400).json({ error: 'Mobile number must be 11 digits starting with 09 (e.g., 09123456789).' });
        }

        const guest_ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
        const cleanIp = guest_ip.replace(/^::ffff:/, '').replace(/^::1$/, '127.0.0.1');

        // Limit 1 guest report per IP per calendar day
        // Ignore deleted reports so guests can re-report
        const [existing] = await db.query(
            `SELECT COUNT(*) as count FROM environmental_reports 
             WHERE guest_ip = ? 
               AND DATE(submitted_at) = CURDATE()
               AND status != 'deleted'`,
            [cleanIp]
        );
        if (existing[0].count > 0) {
            return res.status(429).json({
                error: 'You have already submitted an active report today. Guest users are limited to 1 report per day.'
            });
        }

        const [result] = await db.query(
            `INSERT INTO environmental_reports 
            (user_id, guest_name, guest_mobile, category, description, latitude, longitude, guest_ip, status, submitted_at) 
            VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
            [guest_name, guest_mobile, category, description || null, latitude || null, longitude || null, cleanIp]
        );
        const reportId = result.insertId;

        // Multi-media support: array of { url, type: 'image'|'video' }
        if (Array.isArray(media) && media.length > 0) {
            for (const item of media) {
                const fileType = item.type === 'video' ? 'video' : 'image';
                if (item.url) {
                    await db.query(
                        'INSERT INTO report_media (report_id, file_url, file_type) VALUES (?, ?, ?)',
                        [reportId, item.url, fileType]
                    );
                }
            }
        } else if (image_url) {
            // Backward compatibility single image URL
            await db.query(
                'INSERT INTO report_media (report_id, file_url, file_type) VALUES (?, ?, ?)',
                [reportId, image_url, 'image']
            );
        }

        // Return reference number for the success screen
        const year = new Date().getFullYear();
        const ref = `ER-${year}-${String(reportId).padStart(4, '0')}`;

        res.status(201).json({
            message: 'Guest report submitted!',
            report_id: reportId,
            reference: ref,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to submit guest report.' });
    }
};