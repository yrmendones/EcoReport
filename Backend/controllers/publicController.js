const db = require('../db');
const crypto = require('crypto');

// Generate a secure, 10-minute token
exports.generateQRToken = async (req, res) => {
    try {
        const userId = req.user.id;

        // Generate a 32-byte random hex string (64 characters)
        const token = crypto.randomBytes(32).toString('hex');

        // Clean up old tokens for this user to prevent DB bloat
        await db.query('DELETE FROM qr_tokens WHERE user_id = ?', [userId]);

        // Use MySQL's NOW() function to prevent timezone mismatch between Node and MySQL
        await db.query(
            'INSERT INTO qr_tokens (user_id, token, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))',
            [userId, token]
        );

        res.json({ 
            token, 
            // Send the exact expiration time in milliseconds to sync with the phone
            expires_at: Date.now() + 10 * 60 * 1000 
        });
    } catch (error) {
        console.error("Error generating QR token:", error);
        res.status(500).json({ error: 'Failed to generate QR token.' });
    }
};

// Verify token and get resident info
exports.verifyQRToken = async (req, res) => {
    try {
        let { token } = req.params;

        // Sanitize (strip brackets, quotes, whitespace)
        if (token) {
            token = token.replace(/[<>"'\s]/g, '').trim();
        }

        if (!token) return res.status(400).json({ error: 'Token required.' });

        const [rows] = await db.query(
            `SELECT 
                u.resident_id, u.first_name, u.middle_name, u.last_name,
                u.address, u.contact_number,
                u.is_verified, u.verification_status, u.registered_at
             FROM users u
             JOIN qr_tokens q ON u.user_id = q.user_id
             WHERE q.token = ?
               AND q.expires_at > NOW()`,
            [token]
        );

        if (rows.length === 0) {
            return res.status(404).json({ 
                error: 'QR Code is invalid or has expired. Please ask the resident to refresh their QR code.'
            });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error("Error verifying QR token:", error);
        res.status(500).json({ error: 'Failed to verify QR token.' });
    }
};