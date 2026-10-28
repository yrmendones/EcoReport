const db = require('../db');
const { formatRows } = require('../utils/dateFormatter');

exports.getWasteSchedule = async (req, res) => {
    try {
        const [results] = await db.query(`
            SELECT * FROM waste_schedule 
            WHERE status = 'Active'
            ORDER BY FIELD(day,
                'Monday', 'Tuesday', 'Wednesday', 'Thursday',
                'Friday', 'Saturday', 'Sunday'
            )
        `);
        res.json(formatRows(results, ["created_at"]));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch schedule.' });
    }
};