const db = require('../db');

// Auto-generate a digits-only phone number for tel: links
function cleanPhoneNumber(number) {
    if (!number) return null;
    return String(number).replace(/[^0-9]/g, '');
}

exports.getHotlines = async (req, res) => {
    try {
        const [results] = await db.query('SELECT * FROM hotlines ORDER BY hotline_id ASC');
        res.json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch hotlines.' });
    }
};

exports.addHotline = async (req, res) => {
    try {
        const { title, number, description, color_class } = req.body;
        if (!title || !number) {
            return res.status(400).json({ error: 'Title and number are required.' });
        }

        const finalColor = color_class || 'bg-gray-100 text-gray-700';
        const clean_number = cleanPhoneNumber(number);

        const [result] = await db.query(
            `INSERT INTO hotlines (title, number, description, color_class, clean_number) 
             VALUES (?, ?, ?, ?, ?)`,
            [title, number, description || null, finalColor, clean_number]
        );
        res.status(201).json({ message: 'Hotline added!', hotline_id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to add hotline.' });
    }
};

exports.updateHotline = async (req, res) => {
    try {
        const { title, number, description, color_class } = req.body;
        if (!title || !number) {
            return res.status(400).json({ error: 'Title and number are required.' });
        }

        const finalColor = color_class || 'bg-gray-100 text-gray-700';
        const clean_number = cleanPhoneNumber(number);

        await db.query(
            `UPDATE hotlines SET title = ?, number = ?, description = ?, color_class = ?, clean_number = ? 
             WHERE hotline_id = ?`,
            [title, number, description || null, finalColor, clean_number, req.params.id]
        );
        res.json({ message: 'Hotline updated!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update hotline.' });
    }
};

exports.deleteHotline = async (req, res) => {
    try {
        await db.query('DELETE FROM hotlines WHERE hotline_id = ?', [req.params.id]);
        res.json({ message: 'Hotline deleted!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete hotline.' });
    }
};