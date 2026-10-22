const db = require('../db');
const bcrypt = require('bcrypt');

exports.getProfile = async (req, res) => {
    try {
        const [users] = await db.query(
            `SELECT user_id, resident_id, first_name, middle_name, last_name, 
                    house_no, street, contact_number, address, email, role, status, 
                    is_verified, verification_status, valid_id_url,
                    settings, profile_picture, registered_at
             FROM users WHERE user_id = ?`,
            [req.user.id]
        );
        if (users.length === 0) return res.status(404).json({ error: 'User not found.' });
        res.json(users[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error.' });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { first_name, middle_name, last_name, contact_number, address, street, profile_picture } = req.body;
        const updates = [];
        const values = [];
        if (first_name !== undefined) { updates.push('first_name = ?'); values.push(first_name); }
        if (middle_name !== undefined) { updates.push('middle_name = ?'); values.push(middle_name || null); }
        if (last_name !== undefined) { updates.push('last_name = ?'); values.push(last_name); }
        if (contact_number !== undefined) { updates.push('contact_number = ?'); values.push(contact_number || null); }
        if (address !== undefined) { updates.push('address = ?'); values.push(address || null); }
        if (street !== undefined) { updates.push('street = ?'); values.push(street || null); }
        if (profile_picture !== undefined) { updates.push('profile_picture = ?'); values.push(profile_picture || null); }
        if (updates.length === 0) return res.status(400).json({ error: 'No fields to update.' });
        values.push(req.user.id);
        await db.query(`UPDATE users SET ${updates.join(', ')} WHERE user_id = ?`, values);
        res.json({ message: 'Profile updated successfully!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update profile.', details: error.message });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const { current_password, new_password, confirm_password } = req.body;
        if (!current_password || !new_password || !confirm_password)
            return res.status(400).json({ error: 'All fields required.' });
        if (new_password !== confirm_password)
            return res.status(400).json({ error: 'New passwords do not match.' });
        if (new_password.length < 8 || new_password.length > 16)
            return res.status(400).json({ error: 'Password must be between 8 and 16 characters.' });
        const [users] = await db.query('SELECT password_hash FROM users WHERE user_id = ?', [req.user.id]);
        const match = await bcrypt.compare(current_password, users[0].password_hash);
        if (!match) return res.status(401).json({ error: 'Current password is incorrect.' });
        const newHash = await bcrypt.hash(new_password, 10);
        await db.query('UPDATE users SET password_hash = ? WHERE user_id = ?', [newHash, req.user.id]);
        res.json({ message: 'Password updated successfully!' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update password.' });
    }
};

exports.getStats = async (req, res) => {
    try {
        const [total] = await db.query('SELECT COUNT(*) as count FROM environmental_reports WHERE user_id = ?', [req.user.id]);
        const [pending] = await db.query('SELECT COUNT(*) as count FROM environmental_reports WHERE user_id = ? AND status = ?', [req.user.id, 'pending']);
        const [resolved] = await db.query('SELECT COUNT(*) as count FROM environmental_reports WHERE user_id = ? AND status = ?', [req.user.id, 'resolved']);
        res.json({ total: total[0].count, pending: pending[0].count, resolved: resolved[0].count });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch stats.' });
    }
};

exports.getSettings = async (req, res) => {
    try {
        const [users] = await db.query('SELECT settings FROM users WHERE user_id = ?', [req.user.id]);
        if (users.length === 0) return res.status(404).json({ error: 'User not found.' });
        let settings = users[0].settings;
        if (typeof settings === 'string') {
            try { settings = JSON.parse(settings); } catch { settings = {}; }
        } else if (!settings) settings = {};
        const defaultSettings = { publicProfile: false, shareLocation: true, pushNotifications: true, emailNotifications: false };
        res.json({ ...defaultSettings, ...settings });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch settings.' });
    }
};

exports.updateSettings = async (req, res) => {
    try {
        const settings = req.body;
        if (typeof settings !== 'object' || Array.isArray(settings))
            return res.status(400).json({ error: 'Invalid settings format.' });
        const validKeys = ['publicProfile', 'shareLocation', 'pushNotifications', 'emailNotifications'];
        for (const key of validKeys) {
            if (settings[key] !== undefined && typeof settings[key] !== 'boolean')
                return res.status(400).json({ error: `Setting '${key}' must be a boolean.` });
        }
        await db.query('UPDATE users SET settings = ? WHERE user_id = ?', [JSON.stringify(settings), req.user.id]);
        res.json({ message: 'Settings updated successfully!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to save settings.' });
    }
};