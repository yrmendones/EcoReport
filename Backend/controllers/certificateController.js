const db = require('../db');

exports.createCertificateRequest = async (req, res) => {
    try {
        const { user_id, certificate_type, purpose, preferred_release_date, notes } = req.body;
        if (!user_id || !certificate_type || !purpose || !preferred_release_date)
            return res.status(400).json({ error: 'Missing required fields.' });

        // Only Verified Residents can request certificates
        const [users] = await db.query(
            'SELECT is_verified, verification_status FROM users WHERE user_id = ?',
            [user_id]
        );
        if (users.length === 0) return res.status(404).json({ error: 'User not found.' });
        if (!users[0].is_verified || users[0].verification_status !== 'Verified Resident') {
            return res.status(403).json({
                error: 'Your account is still pending verification. Please wait for barangay approval before requesting certificates.'
            });
        }

        const [result] = await db.query(
            `INSERT INTO certificate_requests 
            (user_id, certificate_type, purpose, preferred_release_date, notes, status, requested_at) 
            VALUES (?, ?, ?, ?, ?, 'Pending', NOW())`,
            [user_id, certificate_type, purpose, preferred_release_date, notes || null]
        );
        res.status(201).json({ message: 'Certificate requested!', certificate_request_id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to request certificate.' });
    }
};