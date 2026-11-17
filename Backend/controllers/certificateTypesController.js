const db = require('../db');

// ─── PUBLIC (mobile) ─────────────────────────────────────────
exports.getPublicCertificateTypes = async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT id, name, fee FROM certificate_types WHERE is_active = 1 ORDER BY display_order ASC'
        );
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch certificate types.' });
    }
};

// ─── STAFF (web) ─────────────────────────────────────────────
exports.getAllCertificateTypes = async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT id, name, fee, display_order, is_active FROM certificate_types ORDER BY display_order ASC, id ASC'
        );
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch certificate types.' });
    }
};

exports.createCertificateType = async (req, res) => {
    try {
        const { name, fee } = req.body;
        if (!name || typeof name !== 'string' || !name.trim()) {
            return res.status(400).json({ error: 'Certificate name is required.' });
        }

        const parsedFee = fee === null || fee === undefined || fee === '' ? null : Number(fee);
        if (parsedFee !== null && (isNaN(parsedFee) || parsedFee < 0)) {
            return res.status(400).json({
                error: 'Fee must be a non-negative number, or leave blank for variable pricing.',
            });
        }

        const [existing] = await db.query(
            'SELECT id FROM certificate_types WHERE name = ? LIMIT 1',
            [name.trim()]
        );
        if (existing.length > 0) {
            return res.status(409).json({ error: 'A certificate type with that name already exists.' });
        }

        const [maxRow] = await db.query('SELECT MAX(display_order) as max_order FROM certificate_types');
        const nextOrder = (maxRow[0]?.max_order || 0) + 1;

        const [result] = await db.query(
            'INSERT INTO certificate_types (name, fee, display_order, is_active) VALUES (?, ?, ?, 1)',
            [name.trim(), parsedFee, nextOrder]
        );

        res.status(201).json({ message: 'Certificate type added!', id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to add certificate type.' });
    }
};

exports.updateCertificateType = async (req, res) => {
    try {
        const { name, fee, is_active } = req.body;
        if (!name || typeof name !== 'string' || !name.trim()) {
            return res.status(400).json({ error: 'Certificate name is required.' });
        }

        const parsedFee = fee === null || fee === undefined || fee === '' ? null : Number(fee);
        if (parsedFee !== null && (isNaN(parsedFee) || parsedFee < 0)) {
            return res.status(400).json({
                error: 'Fee must be a non-negative number, or leave blank for variable pricing.',
            });
        }

        const [existing] = await db.query(
            'SELECT id FROM certificate_types WHERE name = ? AND id != ? LIMIT 1',
            [name.trim(), req.params.id]
        );
        if (existing.length > 0) {
            return res.status(409).json({ error: 'Another certificate type already uses that name.' });
        }

        const [current] = await db.query(
            'SELECT id FROM certificate_types WHERE id = ? LIMIT 1',
            [req.params.id]
        );
        if (current.length === 0) {
            return res.status(404).json({ error: 'Certificate type not found.' });
        }

        await db.query(
            'UPDATE certificate_types SET name = ?, fee = ?, is_active = ? WHERE id = ?',
            [name.trim(), parsedFee, is_active !== false ? 1 : 0, req.params.id]
        );

        res.json({ message: 'Certificate type updated.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update certificate type.' });
    }
};

exports.deleteCertificateType = async (req, res) => {
    try {
        const [existing] = await db.query(
            'SELECT name FROM certificate_types WHERE id = ? LIMIT 1',
            [req.params.id]
        );
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Certificate type not found.' });
        }

        await db.query('DELETE FROM certificate_types WHERE id = ?', [req.params.id]);
        res.json({ message: 'Certificate type deleted.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete certificate type.' });
    }
};