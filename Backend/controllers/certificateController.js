const db = require('../db');

exports.createCertificateRequest = async (req, res) => {
    try {
        // user_id is derived from the verified JWT cannot be spoofed
        const user_id = req.user.id;
        const { certificate_type, purpose, preferred_release_date, notes, fee } = req.body;
        if (!certificate_type || !purpose || !preferred_release_date)
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

        const parsedFee =
            fee !== undefined && fee !== null && fee !== ""
                ? Number(fee)
                : null;
        const safeFee = Number.isFinite(parsedFee) ? parsedFee : null;

        const [result] = await db.query(
            `INSERT INTO certificate_requests 
            (user_id, certificate_type, purpose, preferred_release_date, fee, notes, status, requested_at) 
            VALUES (?, ?, ?, ?, ?, ?, 'Pending', NOW())`,
            [user_id, certificate_type, purpose, preferred_release_date, safeFee, notes || null]
        );
        res.status(201).json({ message: 'Certificate requested!', certificate_request_id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to request certificate.' });
    }
};