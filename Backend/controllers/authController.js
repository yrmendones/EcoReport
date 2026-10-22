const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { logAudit } = require('../utils/auditLogger');
const { sendVerificationCodeEmail } = require('../utils/mailer');

async function generateResidentId() {
    const year = new Date().getFullYear();
    const [rows] = await db.query(
        'SELECT COUNT(*) as total FROM users WHERE YEAR(registered_at) = ?',
        [year]
    );
    const count = rows[0].total + 1;
    return `RES-${year}-${String(count).padStart(4, '0')}`;
}

exports.register = async (req, res) => {
    try {
        const {
            first_name, middle_name, last_name, house_no, street,
            contact_number, email, password, confirm_password, valid_id_url
        } = req.body;

        if (!first_name || !last_name || !email || !password)
            return res.status(400).json({ error: 'All fields required.' });
        if (password !== confirm_password)
            return res.status(400).json({ error: 'Passwords do not match.' });
        if (password.length < 8 || password.length > 16)
            return res.status(400).json({ error: 'Password must be between 8 and 16 characters.' });

        if (contact_number) {
            const mobileRegex = /^(09)\d{9}$/;
            if (!mobileRegex.test(contact_number)) {
                return res.status(400).json({ error: 'Contact number must be 11 digits starting with 09 (e.g., 09123456789).' });
            }
        }

        const [existing] = await db.query('SELECT user_id FROM users WHERE email = ?', [email]);
        if (existing.length > 0)
            return res.status(409).json({ error: 'Email already registered.' });

        const password_hash = await bcrypt.hash(password, 10);
        const resident_id = await generateResidentId();

        let fullAddress = null;
        if (house_no || street) {
            fullAddress = `${house_no || ''} ${street || ''}`.trim();
            if (fullAddress) {
                fullAddress = `${fullAddress}, P. Sto. Rosario Kanluran, Pateros`;
            }
        }

        const [result] = await db.query(
            `INSERT INTO users 
            (resident_id, first_name, middle_name, last_name, house_no, street, address, contact_number, email, password_hash, valid_id_url, role, status, is_verified, verification_status, registered_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'resident', 'Online', 0, 'Pending Verification', CURDATE())`,
            [
                resident_id, first_name, middle_name || null, last_name,
                house_no || null, street || null, fullAddress,
                contact_number || null, email, password_hash,
                valid_id_url || null
            ]
        );

        const token = jwt.sign(
            { id: result.insertId, email, resident_id, role: 'resident' },
            process.env.JWT_SECRET || 'fallback',
            { expiresIn: '7d' }
        );
        res.status(201).json({
            message: 'Registration successful!',
            token,
            user: { user_id: result.insertId, resident_id, full_name: `${first_name} ${last_name}`, email, role: 'resident' }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error.' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });

        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(401).json({ error: 'Invalid credentials.' });

        const user = users[0];

        if (user.status === 'Deactivated') {
            return res.status(403).json({ error: 'Account deactivated. Please contact admin.' });
        }

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) return res.status(401).json({ error: 'Invalid credentials.' });

        await db.query(
            'UPDATE users SET status = ?, last_active_at = NOW() WHERE user_id = ?',
            ['Online', user.user_id]
        );

        const token = jwt.sign(
            { id: user.user_id, email: user.email, resident_id: user.resident_id, role: user.role },
            process.env.JWT_SECRET || 'fallback',
            { expiresIn: '7d' }
        );
        res.json({
            message: 'Login successful!',
            token,
            user: {
                user_id: user.user_id,
                resident_id: user.resident_id,
                full_name: `${user.first_name} ${user.last_name}`,
                email: user.email,
                role: user.role,
                status: 'Online'
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error.' });
    }
};

exports.adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });

        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(401).json({ error: 'Invalid credentials.' });

        const user = users[0];
        if (user.status === 'Deactivated') {
            return res.status(403).json({ error: 'Account deactivated. Please contact admin.' });
        }
        if (user.role !== 'admin' && user.role !== 'barangay_official') {
            return res.status(403).json({ error: 'Staff access required.' });
        }

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) return res.status(401).json({ error: 'Invalid credentials.' });

        await db.query(
            'UPDATE users SET status = ?, last_active_at = NOW() WHERE user_id = ?',
            ['Online', user.user_id]
        );

        await logAudit(req, 'Login to staff panel', {
            userId: user.user_id,
            userName: `${user.first_name} ${user.last_name}`.trim(),
        });

        const token = jwt.sign(
            { id: user.user_id, email: user.email, resident_id: user.resident_id, role: user.role },
            process.env.JWT_SECRET || 'fallback',
            { expiresIn: '7d' }
        );
        res.json({
            message: 'Login successful!',
            token,
            user: {
                user_id: user.user_id,
                full_name: `${user.first_name} ${user.last_name}`,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('[Staff Login] Error:', error);
        res.status(500).json({ error: 'Server error.' });
    }
};

exports.logout = async (req, res) => {
    try {
        const userId = req.user.id;

        if (req.user.role === 'admin' || req.user.role === 'barangay_official') {
            await logAudit(req, 'Logged out from staff panel');
        }

        await db.query(
            'UPDATE users SET status = ?, last_active_at = NULL WHERE user_id = ?',
            ['Offline', userId]
        );
        res.json({ message: 'Logged out successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Logout failed.' });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required.' });

        const [users] = await db.query(
            'SELECT user_id, first_name, email FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.json({ message: 'If that email exists, a verification code has been sent.' });
        }

        const user = users[0];

        // Generate a 6-digit code (100000–999999)
        const code = String(Math.floor(100000 + Math.random() * 900000));
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Invalidate any previous unused codes for this user
        await db.query(
            'UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0',
            [user.user_id]
        );

        await db.query(
            'INSERT INTO password_reset_tokens (user_id, code, expires_at) VALUES (?, ?, ?)',
            [user.user_id, code, expiresAt]
        );

        await sendVerificationCodeEmail(user.email, code, user.first_name);

        res.json({ message: 'If that email exists, a verification code has been sent.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to send verification code.' });
    }
};

exports.verifyResetCode = async (req, res) => {
    try {
        const { email, code } = req.body;
        if (!email || !code) return res.json({ valid: false });

        const [rows] = await db.query(
            `SELECT t.token_id
             FROM password_reset_tokens t
             JOIN users u ON t.user_id = u.user_id
             WHERE u.email = ? AND t.code = ? AND t.used = 0 AND t.expires_at > NOW()`,
            [email, code]
        );

        res.json({ valid: rows.length > 0 });
    } catch (error) {
        console.error(error);
        res.status(500).json({ valid: false });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { email, code, new_password, confirm_password } = req.body;
        if (!email || !code || !new_password || !confirm_password)
            return res.status(400).json({ error: 'All fields required.' });
        if (new_password !== confirm_password)
            return res.status(400).json({ error: 'Passwords do not match.' });
        if (new_password.length < 8 || new_password.length > 16)
            return res.status(400).json({ error: 'Password must be between 8 and 16 characters.' });

        const [rows] = await db.query(
            `SELECT t.token_id, t.user_id
             FROM password_reset_tokens t
             JOIN users u ON t.user_id = u.user_id
             WHERE u.email = ? AND t.code = ? AND t.used = 0 AND t.expires_at > NOW()`,
            [email, code]
        );
        if (rows.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired verification code.' });
        }

        const password_hash = await bcrypt.hash(new_password, 10);

        await db.query(
            'UPDATE users SET password_hash = ? WHERE user_id = ?',
            [password_hash, rows[0].user_id]
        );

        await db.query(
            'UPDATE password_reset_tokens SET used = 1 WHERE token_id = ?',
            [rows[0].token_id]
        );

        res.json({ message: 'Password reset successfully!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to reset password.' });
    }
};