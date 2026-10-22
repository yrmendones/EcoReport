const db = require('../db');

exports.createAppointment = async (req, res) => {
    try {
        const { user_id, full_name, age, contact_number, reason, symptoms, appointment_date, preferred_time } = req.body;
        if (!user_id || !full_name || !age || !contact_number || !reason || !appointment_date || !preferred_time)
            return res.status(400).json({ error: 'Missing required fields.' });

        // Only Verified Residents can request appointments
        const [users] = await db.query(
            'SELECT is_verified, verification_status FROM users WHERE user_id = ?',
            [user_id]
        );
        if (users.length === 0) return res.status(404).json({ error: 'User not found.' });
        if (!users[0].is_verified || users[0].verification_status !== 'Verified Resident') {
            return res.status(403).json({
                error: 'Your account is still pending verification. Please wait for barangay approval before requesting appointments.'
            });
        }

        const [result] = await db.query(
            `INSERT INTO appointments 
            (user_id, full_name, age, contact_number, reason, symptoms, appointment_date, preferred_time, status, requested_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending', NOW())`,
            [user_id, full_name, age, contact_number, reason, symptoms || null, appointment_date, preferred_time]
        );
        res.status(201).json({ message: 'Appointment requested!', appointment_id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to request appointment.' });
    }
};