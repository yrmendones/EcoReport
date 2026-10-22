const db = require('../db');

exports.getHealthInfo = async (req, res) => {
    try {
        const [results] = await db.query('SELECT * FROM health_center_info LIMIT 1');
        res.json(results[0] || {});
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch health center info.' });
    }
};

// Only return Active services by default (for residents/mobile)
// Admin web can pass ?all=true to see all (including Inactive)
exports.getHealthServices = async (req, res) => {
    try {
        const showAll = req.query.all === 'true';
        let sql = 'SELECT * FROM health_services';
        if (!showAll) {
            sql += " WHERE status = 'Active'";
        }
        sql += ' ORDER BY display_order ASC';
        const [results] = await db.query(sql);
        res.json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch health services.' });
    }
};

// ============================================================
// HEALTH SERVICES CRUD
// ============================================================

exports.addHealthService = async (req, res) => {
    try {
        const { service_name, status } = req.body;
        if (!service_name) {
            return res.status(400).json({ error: 'Service name is required.' });
        }
        const finalStatus = status || 'Active';

        const [rows] = await db.query('SELECT MAX(display_order) as max_order FROM health_services');
        const nextOrder = (rows[0]?.max_order || 0) + 1;

        const [result] = await db.query(
            'INSERT INTO health_services (service_name, status, display_order) VALUES (?, ?, ?)',
            [service_name, finalStatus, nextOrder]
        );
        res.status(201).json({ message: 'Service added!', service_id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to add service.' });
    }
};

exports.updateHealthService = async (req, res) => {
    try {
        const { service_name, status } = req.body;
        if (!service_name) {
            return res.status(400).json({ error: 'Service name is required.' });
        }
        await db.query(
            'UPDATE health_services SET service_name = ?, status = ? WHERE service_id = ?',
            [service_name, status || 'Active', req.params.id]
        );
        res.json({ message: 'Service updated!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update service.' });
    }
};

exports.deleteHealthService = async (req, res) => {
    try {
        await db.query('DELETE FROM health_services WHERE service_id = ?', [req.params.id]);
        res.json({ message: 'Service deleted!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete service.' });
    }
};

// ============================================================
// MEDICAL STAFF CRUD
// ============================================================

exports.getMedicalStaff = async (req, res) => {
    try {
        const [results] = await db.query('SELECT * FROM medical_staff ORDER BY display_order ASC, staff_id ASC');
        res.json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch medical staff.' });
    }
};

exports.addMedicalStaff = async (req, res) => {
    try {
        const { staff_name, role } = req.body;
        if (!staff_name || !role) {
            return res.status(400).json({ error: 'Staff name and role are required.' });
        }
        const [rows] = await db.query('SELECT MAX(display_order) as max_order FROM medical_staff');
        const nextOrder = (rows[0]?.max_order || 0) + 1;

        const [result] = await db.query(
            'INSERT INTO medical_staff (staff_name, role, display_order) VALUES (?, ?, ?)',
            [staff_name, role, nextOrder]
        );
        res.status(201).json({ message: 'Staff added!', staff_id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to add staff.' });
    }
};

exports.updateMedicalStaff = async (req, res) => {
    try {
        const { staff_name, role } = req.body;
        if (!staff_name || !role) {
            return res.status(400).json({ error: 'Staff name and role are required.' });
        }
        await db.query(
            'UPDATE medical_staff SET staff_name = ?, role = ? WHERE staff_id = ?',
            [staff_name, role, req.params.id]
        );
        res.json({ message: 'Staff updated!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update staff.' });
    }
};

exports.deleteMedicalStaff = async (req, res) => {
    try {
        await db.query('DELETE FROM medical_staff WHERE staff_id = ?', [req.params.id]);
        res.json({ message: 'Staff deleted!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete staff.' });
    }
};

// ============================================================
// HEALTH CENTER INFO
// ============================================================

exports.updateHealthInfo = async (req, res) => {
    try {
        const { location, contact_number, operating_days, operating_hours } = req.body;
        if (!location || !contact_number || !operating_days || !operating_hours) {
            return res.status(400).json({ error: 'All fields are required.' });
        }

        const [rows] = await db.query('SELECT info_id FROM health_center_info ORDER BY info_id LIMIT 1');

        if (rows.length === 0) {
            await db.query(
                'INSERT INTO health_center_info (location, contact_number, operating_days, operating_hours) VALUES (?, ?, ?, ?)',
                [location, contact_number, operating_days, operating_hours]
            );
        } else {
            await db.query(
                'UPDATE health_center_info SET location = ?, contact_number = ?, operating_days = ?, operating_hours = ? WHERE info_id = ?',
                [location, contact_number, operating_days, operating_hours, rows[0].info_id]
            );
        }
        res.json({ message: 'Health center info updated!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update health center info.' });
    }
};

// ============================================================
// APPOINTMENT STATS
// ============================================================

exports.getAppointmentStats = async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        const [total] = await db.query(
            'SELECT COUNT(*) as count FROM appointments WHERE appointment_date = ?',
            [today]
        );

        const [consultations] = await db.query(
            'SELECT COUNT(*) as count FROM appointments WHERE appointment_date = ? AND reason LIKE ?',
            [today, '%Consultation%']
        );
        const [vaccinations] = await db.query(
            'SELECT COUNT(*) as count FROM appointments WHERE appointment_date = ? AND reason LIKE ?',
            [today, '%Vaccination%']
        );
        const [maternal] = await db.query(
            'SELECT COUNT(*) as count FROM appointments WHERE appointment_date = ? AND reason LIKE ?',
            [today, '%Maternal%']
        );
        const [child] = await db.query(
            'SELECT COUNT(*) as count FROM appointments WHERE appointment_date = ? AND reason LIKE ?',
            [today, '%Child%']
        );
        const [dental] = await db.query(
            'SELECT COUNT(*) as count FROM appointments WHERE appointment_date = ? AND reason LIKE ?',
            [today, '%Dental%']
        );
        const [bp] = await db.query(
            'SELECT COUNT(*) as count FROM appointments WHERE appointment_date = ? AND reason LIKE ?',
            [today, '%Blood Pressure%']
        );

        res.json({
            today: total[0].count,
            consultations: consultations[0].count,
            vaccinations: vaccinations[0].count,
            maternal: maternal[0].count,
            child: child[0].count,
            dental: dental[0].count,
            bp: bp[0].count,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch appointment stats.' });
    }
};