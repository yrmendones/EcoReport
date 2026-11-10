const db = require('../db');
const { sanitizeText } = require('../utils/sanitizeHtml');

// ─────────────────────────────────────────────────────────────
// IP extraction
// ─────────────────────────────────────────────────────────────
function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        // Comma-separated chain, first entry = client
        const first = String(forwarded).split(',')[0].trim();
        if (first) return first;
    }
    if (req.ip) return req.ip;
    if (req.socket?.remoteAddress) return req.socket.remoteAddress;
    if (req.connection?.remoteAddress) return req.connection.remoteAddress;
    return 'unknown';
}

function cleanIp(ip) {
    return String(ip || 'unknown')
        .replace(/^::ffff:/, '')   // IPv4-mapped IPv6 → plain IPv4
        .replace(/^::1$/, '127.0.0.1')
        .slice(0, 45);             // VARCHAR(45) safety for IPv6
}

// ─────────────────────────────────────────────────────────────
// Manila-day boundaries, expressed as UTC DATETIME strings.
// Assumes `submitted_at` is stored in UTC (Railway MySQL default). reset at 12:00 AM Manila
// ─────────────────────────────────────────────────────────────
function getManilaDayRangeUtc() {
    const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;
    const manilaNow = new Date(Date.now() + MANILA_OFFSET_MS);
    const y = manilaNow.getUTCFullYear();
    const m = manilaNow.getUTCMonth();
    const d = manilaNow.getUTCDate();
    const startUtc = new Date(Date.UTC(y, m, d) - MANILA_OFFSET_MS);
    const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000);
    return { startUtc, endUtc };
}

function toMysqlDateTime(date) {
    return date.toISOString().slice(0, 19).replace('T', ' ');
}

exports.submitGuestReport = async (req, res) => {
    try {
        const {
            guest_name, guest_mobile, category, description,
            latitude, longitude, image_url, media
        } = req.body;

        if (!guest_name || !guest_mobile || !category)
            return res.status(400).json({ error: 'Guest name, mobile, and category required.' });

        if (!sanitizeText(guest_name, 100) || !sanitizeText(category, 100))
            return res.status(400).json({ error: 'Invalid name or category.' });

        const mobileRegex = /^(09)\d{9}$/;
        if (!mobileRegex.test(guest_mobile)) {
            return res.status(400).json({ error: 'Mobile number must be 11 digits starting with 09 (e.g., 09123456789).' });
        }

        const rawIp = getClientIp(req);
        const ip = cleanIp(rawIp);

        // The day boundary uses Asia/Manila (UTC+8), NOT the MySQL server timezone. 
        // So the limit resets at 12:00 AM Manila even if the DB is in UTC
        const { startUtc, endUtc } = getManilaDayRangeUtc();
        const [existing] = await db.query(
            `SELECT COUNT(*) as count FROM environmental_reports 
             WHERE guest_ip = ? 
               AND submitted_at >= ? 
               AND submitted_at < ?
               AND status != 'deleted'`,
            [ip, toMysqlDateTime(startUtc), toMysqlDateTime(endUtc)]
        );
        if (existing[0].count > 0) {
            return res.status(429).json({
                error: 'You have already submitted a report today. Guest users are limited to 1 report per day'
            });
        }

        const safeName = sanitizeText(guest_name, 100);
        const safeMobile = sanitizeText(guest_mobile, 20);
        const safeCategory = sanitizeText(category, 100);
        const safeDescription = description
            ? sanitizeText(description, 5000)
            : null;

        const [result] = await db.query(
            `INSERT INTO environmental_reports 
            (user_id, guest_name, guest_mobile, category, description, latitude, longitude, guest_ip, status, submitted_at) 
            VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
            [safeName, safeMobile, safeCategory, safeDescription, latitude || null, longitude || null, ip]
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