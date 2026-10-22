const db = require('../db');
const bcrypt = require('bcrypt');
const notificationController = require('./notificationController');
const { logAudit } = require('../utils/auditLogger');
const { logTimeline } = require('../utils/timelineLogger');

async function generateResidentId() {
    const year = new Date().getFullYear();
    const [rows] = await db.query(
        'SELECT COUNT(*) as total FROM users WHERE YEAR(registered_at) = ?',
        [year]
    );
    const count = rows[0].total + 1;
    return `RES-${year}-${String(count).padStart(4, '0')}`;
}

function generateCaseNumber(prefix) {
    const year = new Date().getFullYear();
    return `${prefix}-${year}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
}

function codeFromId(prefix, id) {
    const year = new Date().getFullYear();
    return `${prefix}-${year}-${String(id).padStart(4, '0')}`;
}

// ============================================================
// DASHBOARD STATS
// ============================================================

exports.getAdminStats = async (req, res) => {
    try {
        const [total] = await db.query('SELECT COUNT(*) as count FROM environmental_reports');
        const [pending] = await db.query('SELECT COUNT(*) as count FROM environmental_reports WHERE status = ?', ['pending']);
        const [ongoing] = await db.query('SELECT COUNT(*) as count FROM environmental_reports WHERE status IN (?, ?)', ['ongoing', 'assigned']);
        const [resolved] = await db.query('SELECT COUNT(*) as count FROM environmental_reports WHERE status = ?', ['resolved']);
        const [rejected] = await db.query('SELECT COUNT(*) as count FROM environmental_reports WHERE status = ?', ['rejected']);
        res.json({
            total: total[0].count,
            pending: pending[0].count,
            ongoing: ongoing[0].count,
            resolved: resolved[0].count,
            rejected: rejected[0].count
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch stats.' });
    }
};

// ============================================================
// REPORTS
// ============================================================

exports.getAllReports = async (req, res) => {
    try {
        const { search, category, status, date_from, date_to } = req.query;
        let sql = `
            SELECT 
                r.*,
                COALESCE(u.first_name, r.guest_name) AS first_name,
                COALESCE(u.last_name, '') AS last_name,
                u.email,
                u.contact_number,
                r.guest_name AS guest_name_original,
                r.guest_mobile
            FROM environmental_reports r
            LEFT JOIN users u ON r.user_id = u.user_id
            WHERE r.status != 'deleted'
        `;
        const params = [];
        if (search) {
            sql += ` AND (
                r.report_id LIKE ? OR 
                COALESCE(u.first_name, r.guest_name) LIKE ? OR 
                r.category LIKE ? OR 
                r.address LIKE ?
            )`;
            const term = `%${search}%`;
            params.push(term, term, term, term);
        }
        if (category && category !== 'All Categories') {
            sql += ' AND r.category = ?';
            params.push(category);
        }
        if (status && status !== 'All Status') {
            sql += ' AND r.status = ?';
            params.push(status.toLowerCase());
        }
        if (date_from) {
            sql += ' AND DATE(r.submitted_at) >= ?';
            params.push(date_from);
        }
        if (date_to) {
            sql += ' AND DATE(r.submitted_at) <= ?';
            params.push(date_to);
        }
        sql += ' ORDER BY r.report_id DESC';
        const [results] = await db.query(sql, params);

        // Attach media arrays to each report
        if (results.length > 0) {
            const reportIds = results.map((r) => r.report_id);
            const [mediaRows] = await db.query(
                'SELECT media_id, report_id, file_url, file_type FROM report_media WHERE report_id IN (?)',
                [reportIds]
            );

            const mediaMap = {};
            mediaRows.forEach((m) => {
                if (!mediaMap[m.report_id]) mediaMap[m.report_id] = [];
                mediaMap[m.report_id].push({
                    media_id: m.media_id,
                    file_url: m.file_url,
                    file_type: m.file_type,
                });
            });

            results.forEach((r) => {
                r.media = mediaMap[r.report_id] || [];
            });
        }

        res.json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch reports.' });
    }
};

exports.getReportDetails = async (req, res) => {
    try {
        const [results] = await db.query(
            `
            SELECT 
                r.*,
                COALESCE(u.first_name, r.guest_name) AS first_name,
                COALESCE(u.last_name, '') AS last_name,
                u.email,
                u.contact_number,
                r.guest_name AS guest_name_original,
                r.guest_mobile
            FROM environmental_reports r
            LEFT JOIN users u ON r.user_id = u.user_id
            WHERE r.report_id = ?
            `,
            [req.params.id]
        );
        if (results.length === 0) return res.status(404).json({ error: 'Report not found.' });

        // Attach media for this report
        const [mediaRows] = await db.query(
            'SELECT media_id, file_url, file_type FROM report_media WHERE report_id = ? ORDER BY media_id ASC',
            [req.params.id]
        );
        results[0].media = mediaRows || [];

        res.json(results[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch report.' });
    }
};

// logs the new status into report_timeline
exports.updateReportStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const allowed = ['pending', 'ongoing', 'resolved', 'rejected', 'assigned'];
        if (!status || !allowed.includes(status)) {
            return res.status(400).json({ error: 'Invalid status.' });
        }

        const [report] = await db.query('SELECT user_id, category FROM environmental_reports WHERE report_id = ?', [req.params.id]);
        if (report.length === 0) {
            return res.status(404).json({ error: 'Report not found.' });
        }

        await db.query('UPDATE environmental_reports SET status = ? WHERE report_id = ?', [status, req.params.id]);

        // SYNC ASSIGNMENT
        let assignmentStatus = null;
        if (status === 'resolved') assignmentStatus = 'Resolved';
        else if (status === 'assigned' || status === 'ongoing') assignmentStatus = 'Assigned';
        else if (status === 'rejected') assignmentStatus = 'Rejected';

        if (assignmentStatus) {
            await db.query(
                'UPDATE assignments SET status = ? WHERE report_id = ?',
                [assignmentStatus, req.params.id]
            );
        }

        await logTimeline(req.params.id, status, 'Status updated by staff');

        if (report[0].user_id) {
            const statusDisplay =
                status === 'assigned' || status === 'ongoing' ? 'Ongoing' :
                status.charAt(0).toUpperCase() + status.slice(1);
            await notificationController.createNotification(
                report[0].user_id,
                'Report Status Updated',
                `Your report "${report[0].category}" is now "${statusDisplay}".`,
                'Report Update',
                req.params.id
            );
        }

        await logAudit(req, `Updated report #${req.params.id} status to ${status}`);

        res.json({ message: 'Report status updated!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update status.' });
    }
};

// TIMELINE - logs the assignment
exports.assignReport = async (req, res) => {
    try {
        const { worker } = req.body;
        if (!worker) return res.status(400).json({ error: 'Worker name required.' });

        const [report] = await db.query('SELECT user_id, category FROM environmental_reports WHERE report_id = ?', [req.params.id]);
        if (report.length === 0) {
            return res.status(404).json({ error: 'Report not found.' });
        }

        await db.query(
            'UPDATE environmental_reports SET status = ?, assigned_to = ? WHERE report_id = ?',
            ['assigned', worker, req.params.id]
        );

    // Insert with a temporary unique placeholder, then update with the real code.
        const tempCode = `TEMP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const [insertResult] = await db.query(
            `INSERT INTO assignments (assignment_code, report_id, worker, assigned_date, status) 
             VALUES (?, ?, ?, CURDATE(), 'Assigned')`,
            [tempCode, req.params.id, worker]
        );
        const assignmentId = insertResult.insertId;
        const assignmentCode = codeFromId('ASG', assignmentId);

        await db.query(
            'UPDATE assignments SET assignment_code = ? WHERE assignment_id = ?',
            [assignmentCode, assignmentId]
        );

        await logTimeline(req.params.id, 'assigned', `Assigned to ${worker}`);

        await logAudit(req, `Assigned report #${req.params.id} to ${worker} (${assignmentCode})`);

        res.json({ message: 'Report assigned!', assignment_code: assignmentCode });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to assign report.' });
    }
};

exports.deleteReport = async (req, res) => {
    try {
        await db.query('UPDATE environmental_reports SET status = ? WHERE report_id = ?', ['deleted', req.params.id]);
        await logAudit(req, `Deleted report #${req.params.id}`);
        res.json({ message: 'Report deleted!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete report.' });
    }
};

// ============================================================
// ASSIGNMENTS
// ============================================================

exports.getAssignments = async (req, res) => {
    try {
        const { status } = req.query;
        let sql = 'SELECT * FROM assignments';
        const params = [];
        if (status && status !== 'All Assignments') {
            sql += ' WHERE status = ?';
            params.push(status);
        }
        sql += ' ORDER BY assignment_id DESC';
        const [results] = await db.query(sql, params);
        res.json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch assignments.' });
    }
};

// TIMELINE - logs "assigned" or "resolved"
exports.createAssignment = async (req, res) => {
    try {
        const { report_id, worker, status } = req.body;
        if (!report_id || !worker) return res.status(400).json({ error: 'Report ID and worker required.' });

        const allowedStatus = ['Assigned', 'Resolved'];
        const finalStatus = (status && allowedStatus.includes(status)) ? status : 'Assigned';

        // Insert with a temporary unique placeholder
        const tempCode = `TEMP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const [result] = await db.query(
            `INSERT INTO assignments (assignment_code, report_id, worker, assigned_date, status) 
             VALUES (?, ?, ?, CURDATE(), ?)`,
            [tempCode, report_id, worker, finalStatus]
        );
        const assignmentId = result.insertId;
        const assignmentCode = codeFromId('ASG', assignmentId);

        await db.query(
            'UPDATE assignments SET assignment_code = ? WHERE assignment_id = ?',
            [assignmentCode, assignmentId]
        );

        let reportStatus = (finalStatus === 'Resolved') ? 'resolved' : 'assigned';
        await db.query('UPDATE environmental_reports SET status = ? WHERE report_id = ?', [reportStatus, report_id]);

        await logTimeline(
            report_id,
            reportStatus,
            finalStatus === 'Resolved' ? `Resolved by ${worker}` : `Assigned to ${worker}`
        );

        const [report] = await db.query('SELECT user_id, category FROM environmental_reports WHERE report_id = ?', [report_id]);
        if (report.length > 0 && report[0].user_id && finalStatus === 'Resolved') {
            await notificationController.createNotification(
                report[0].user_id,
                'Report Status Updated',
                `Your report "${report[0].category}" has been resolved.`,
                'Report Update',
                report_id
            );
        }

        await logAudit(req, `Created assignment ${assignmentCode} (report #${report_id} → ${worker})`);

        res.status(201).json({ message: 'Assignment created!', assignment_id: result.insertId, assignment_code: assignmentCode });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create assignment.' });
    }
};

// TIMELINE - logs status change when assignment is updated
exports.updateAssignment = async (req, res) => {
    try {
        const { worker, status } = req.body;
        const allowedStatus = ['Assigned', 'Resolved'];
        if (!status || !allowedStatus.includes(status)) {
            return res.status(400).json({ error: 'Status must be Assigned or Resolved.' });
        }

        const [assignment] = await db.query(
            'SELECT report_id, assignment_code FROM assignments WHERE assignment_id = ?',
            [req.params.id]
        );
        if (assignment.length === 0) return res.status(404).json({ error: 'Assignment not found.' });

        await db.query('UPDATE assignments SET worker = ?, status = ? WHERE assignment_id = ?', [worker, status, req.params.id]);

        let reportStatus = (status === 'Resolved') ? 'resolved' : 'assigned';
        await db.query('UPDATE environmental_reports SET status = ? WHERE report_id = ?', [reportStatus, assignment[0].report_id]);

        await logTimeline(
            assignment[0].report_id,
            reportStatus,
            status === 'Resolved' ? `Resolved by ${worker}` : `Reassigned to ${worker}`
        );

        const [report] = await db.query('SELECT user_id, category FROM environmental_reports WHERE report_id = ?', [assignment[0].report_id]);
        if (report.length > 0 && report[0].user_id && status === 'Resolved') {
            await notificationController.createNotification(
                report[0].user_id,
                'Report Status Updated',
                `Your report "${report[0].category}" has been resolved.`,
                'Report Update',
                assignment[0].report_id
            );
        }

        await logAudit(req, `Updated assignment ${assignment[0].assignment_code} status to ${status}`);

        res.json({ message: 'Assignment updated!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update assignment.' });
    }
};

exports.deleteAssignment = async (req, res) => {
    try {
        const [existing] = await db.query(
            'SELECT assignment_code FROM assignments WHERE assignment_id = ?',
            [req.params.id]
        );
        const codeLabel = existing.length > 0
            ? existing[0].assignment_code
            : `#${req.params.id}`;

        await db.query('DELETE FROM assignments WHERE assignment_id = ?', [req.params.id]);
        await logAudit(req, `Deleted assignment ${codeLabel}`);
        res.json({ message: 'Assignment deleted!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete assignment.' });
    }
};

// ============================================================
// RESIDENTS
// ============================================================

exports.getAllResidents = async (req, res) => {
    try {
        const { search } = req.query;
        let sql = `
            SELECT 
                user_id, resident_id, first_name, middle_name, last_name, address,
                contact_number, email, is_verified, verification_status,
                valid_id_url, registered_at, last_active_at,
                CASE
                    WHEN status = 'Deactivated' THEN 'Deactivated'
                    WHEN last_active_at IS NOT NULL
                         AND TIMESTAMPDIFF(SECOND, last_active_at, NOW()) <= 300 THEN 'Online'
                    ELSE 'Offline'
                END AS status
            FROM users WHERE role = 'resident'
        `;
        const params = [];
        if (search) {
            sql += ` AND (resident_id LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR address LIKE ?)`;
            const term = `%${search}%`;
            params.push(term, term, term, term, term);
        }
        sql += ' ORDER BY user_id DESC';
        const [results] = await db.query(sql, params);
        res.json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch residents.' });
    }
};

exports.getResidentById = async (req, res) => {
    try {
        const [results] = await db.query(
            `SELECT 
                user_id, resident_id, first_name, middle_name, last_name, house_no, street, address,
                contact_number, email, is_verified, verification_status, valid_id_url, registered_at,
                last_active_at,
                CASE
                    WHEN status = 'Deactivated' THEN 'Deactivated'
                    WHEN last_active_at IS NOT NULL
                         AND TIMESTAMPDIFF(SECOND, last_active_at, NOW()) <= 300 THEN 'Online'
                    ELSE 'Offline'
                END AS status
             FROM users WHERE user_id = ?`,
            [req.params.id]
        );
        if (results.length === 0) return res.status(404).json({ error: 'Resident not found.' });
        res.json(results[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch resident.' });
    }
};

exports.getResidentByResidentId = async (req, res) => {
    try {
        const [results] = await db.query(
            `SELECT user_id, resident_id, first_name, middle_name, last_name, house_no, street, address, 
                    contact_number, email, status, is_verified, verification_status, valid_id_url, registered_at
             FROM users 
             WHERE resident_id = ? AND role = 'resident'`,
            [req.params.residentId]
        );
        if (results.length === 0) {
            return res.status(404).json({ error: 'Resident not found.' });
        }
        res.json(results[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch resident.' });
    }
};

exports.addResident = async (req, res) => {
    try {
        const { first_name, middle_name, last_name, address, contact_number, email, password } = req.body;
        if (!first_name || !last_name || !email || !password)
            return res.status(400).json({ error: 'First name, last name, email, and password required.' });
        const [existing] = await db.query('SELECT user_id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) return res.status(409).json({ error: 'Email already exists.' });
        const password_hash = await bcrypt.hash(password, 10);
        const resident_id = await generateResidentId();
        let fullAddress = address || null;
        if (fullAddress && !fullAddress.includes('P. Sto. Rosario Kanluran')) {
            fullAddress = `${fullAddress}, P. Sto. Rosario Kanluran, Pateros`;
        }
        const [result] = await db.query(
            `INSERT INTO users (resident_id, first_name, middle_name, last_name, address, contact_number, email, password_hash, role, status, is_verified, verification_status, registered_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'resident', 'Online', 0, 'Pending Verification', CURDATE())`,
            [resident_id, first_name, middle_name || null, last_name, fullAddress, contact_number || null, email, password_hash]
        );

        await logAudit(req, `Added resident ${resident_id} (${first_name} ${last_name})`);

        res.status(201).json({ message: 'Resident added!', user_id: result.insertId, resident_id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to add resident.' });
    }
};

exports.updateResident = async (req, res) => {
    try {
        const { first_name, middle_name, last_name, address, contact_number, email, status } = req.body;
        const allowedStatus = ['Online', 'Offline', 'Deactivated'];
        if (status && !allowedStatus.includes(status)) {
            return res.status(400).json({ error: 'Invalid status. Must be Online, Offline, or Deactivated.' });
        }
        let updateEmail = email;
        if (!email) {
            const [user] = await db.query('SELECT email FROM users WHERE user_id = ?', [req.params.id]);
            if (user.length > 0) updateEmail = user[0].email;
        }
        await db.query(
            `UPDATE users SET 
                first_name = ?, 
                middle_name = ?, 
                last_name = ?, 
                address = ?, 
                contact_number = ?, 
                email = ?, 
                status = ? 
             WHERE user_id = ?`,
            [
                first_name,
                middle_name || null,
                last_name,
                address || null,
                contact_number || null,
                updateEmail,
                status || 'Online',
                req.params.id
            ]
        );

        await logAudit(req, `Updated resident #${req.params.id} (${first_name} ${last_name})`);

        res.json({ message: 'Resident updated!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update resident.' });
    }
};

exports.deleteResident = async (req, res) => {
    try {
        const [user] = await db.query('SELECT resident_id, first_name, last_name FROM users WHERE user_id = ?', [req.params.id]);

        await db.query('DELETE FROM users WHERE user_id = ? AND role = ?', [req.params.id, 'resident']);

        if (user.length > 0) {
            await logAudit(req, `Deleted resident ${user[0].resident_id} (${user[0].first_name} ${user[0].last_name})`);
        } else {
            await logAudit(req, `Deleted resident #${req.params.id}`);
        }

        res.json({ message: 'Resident deleted!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete resident.' });
    }
};

exports.verifyResident = async (req, res) => {
    try {
        const residentUserId = req.params.id;
        const [user] = await db.query('SELECT resident_id, first_name, last_name FROM users WHERE user_id = ?', [residentUserId]);

        await db.query(
            "UPDATE users SET is_verified = 1, verification_status = 'Verified Resident' WHERE user_id = ?",
            [residentUserId]
        );

        try {
            await notificationController.createNotification(
                residentUserId,
                'Account Verified',
                'Your resident account has been verified. You now have full access to EcoReport services.',
                'Verification Update'
            );
        } catch (notifErr) {
            console.error('Failed to send verification notification:', notifErr);
        }

        if (user.length > 0) {
            await logAudit(req, `Verification approved for resident ${user[0].resident_id} (${user[0].first_name} ${user[0].last_name})`);
        } else {
            await logAudit(req, `Verification approved for resident #${residentUserId}`);
        }

        res.json({ message: 'Resident verified!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to verify resident.' });
    }
};

exports.rejectResident = async (req, res) => {
    try {
        const residentUserId = req.params.id;
        const [user] = await db.query('SELECT resident_id, first_name, last_name FROM users WHERE user_id = ?', [residentUserId]);

        await db.query(
            "UPDATE users SET is_verified = 0, verification_status = 'Rejected' WHERE user_id = ?",
            [residentUserId]
        );

        try {
            await notificationController.createNotification(
                residentUserId,
                'Verification Rejected',
                'Your resident verification was rejected. Please visit the barangay hall with a valid ID to re-verify your account.',
                'Verification Update'
            );
        } catch (notifErr) {
            console.error('Failed to send rejection notification:', notifErr);
        }

        if (user.length > 0) {
            await logAudit(req, `Verification rejected for resident ${user[0].resident_id} (${user[0].first_name} ${user[0].last_name})`);
        } else {
            await logAudit(req, `Verification rejected for resident #${residentUserId}`);
        }

        res.json({ message: 'Resident verification rejected.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to reject resident.' });
    }
};

// ============================================================
// CERTIFICATES
// ============================================================

exports.getCertificates = async (req, res) => {
    try {
        const { status } = req.query;
        let sql = `SELECT c.*, u.first_name, u.last_name, u.email 
                   FROM certificate_requests c JOIN users u ON c.user_id = u.user_id`;
        const params = [];
        if (status && status !== 'All') { sql += ' WHERE c.status = ?'; params.push(status); }
        sql += ' ORDER BY c.requested_at DESC';
        const [results] = await db.query(sql, params);
        res.json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch certificates.' });
    }
};

exports.updateCertificateStatus = async (req, res) => {
    try {
        const { status } = req.body;
        if (!status || !['Pending', 'Approved', 'Released', 'Rejected'].includes(status))
            return res.status(400).json({ error: 'Invalid status.' });

        const [cert] = await db.query(
            'SELECT user_id, certificate_type, preferred_release_date FROM certificate_requests WHERE certificate_request_id = ?',
            [req.params.id]
        );
        if (cert.length === 0) {
            return res.status(404).json({ error: 'Certificate request not found.' });
        }

        await db.query('UPDATE certificate_requests SET status = ? WHERE certificate_request_id = ?', [status, req.params.id]);

        if (cert[0].user_id && (status === 'Approved' || status === 'Rejected')) {
            let releaseDateStr = "your requested date";
            if (cert[0].preferred_release_date) {
                const ds = String(cert[0].preferred_release_date).split("T")[0].split(" ")[0];
                const [y, m, d] = ds.split("-");
                const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                if (y && m && d) {
                    releaseDateStr = `${months[parseInt(m,10)-1]} ${parseInt(d,10)}, ${y}`;
                }
            }

            const message = status === 'Approved'
                ? `Your ${cert[0].certificate_type} request has been approved. Please visit the barangay hall on or after ${releaseDateStr} to claim it.`
                : `Your ${cert[0].certificate_type} request has been rejected. Please contact the barangay office for more information.`;

            await notificationController.createNotification(
                cert[0].user_id,
                `Certificate ${status}`,
                message,
                'Certificate Update'
            );
        }

        await logAudit(req, `Updated certificate request #${req.params.id} status to ${status}`);

        res.json({ message: 'Certificate status updated!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update certificate.' });
    }
};

exports.deleteCertificate = async (req, res) => {
    try {
        await db.query('DELETE FROM certificate_requests WHERE certificate_request_id = ?', [req.params.id]);
        await logAudit(req, `Deleted certificate request #${req.params.id}`);
        res.json({ message: 'Certificate deleted!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete certificate.' });
    }
};

// ============================================================
// APPOINTMENTS
// ============================================================

exports.getAppointments = async (req, res) => {
    try {
        const [results] = await db.query('SELECT * FROM appointments ORDER BY requested_at DESC');
        res.json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch appointments.' });
    }
};

exports.getAppointmentStats = async (req, res) => {
    try {
        const [today] = await db.query('SELECT COUNT(*) as count FROM appointments WHERE DATE(appointment_date) = CURDATE()');
        const [consultations] = await db.query(
            'SELECT COUNT(*) as count FROM appointments WHERE reason LIKE ? AND DATE(appointment_date) = CURDATE()',
            ['%Consultation%']
        );
        const [vaccinations] = await db.query(
            'SELECT COUNT(*) as count FROM appointments WHERE reason LIKE ? AND DATE(appointment_date) = CURDATE()',
            ['%Vaccination%']
        );
        const [maternal] = await db.query(
            'SELECT COUNT(*) as count FROM appointments WHERE reason LIKE ? AND DATE(appointment_date) = CURDATE()',
            ['%Maternal%']
        );
        const [child] = await db.query(
            'SELECT COUNT(*) as count FROM appointments WHERE reason LIKE ? AND DATE(appointment_date) = CURDATE()',
            ['%Child%']
        );
        const [dental] = await db.query(
            'SELECT COUNT(*) as count FROM appointments WHERE reason LIKE ? AND DATE(appointment_date) = CURDATE()',
            ['%Dental%']
        );
        const [bp] = await db.query(
            'SELECT COUNT(*) as count FROM appointments WHERE reason LIKE ? AND DATE(appointment_date) = CURDATE()',
            ['%Blood Pressure%']
        );

        res.json({
            today: today[0].count,
            consultations: consultations[0].count,
            vaccinations: vaccinations[0].count,
            maternal: maternal[0].count,
            child: child[0].count,
            dental: dental[0].count,
            bp: bp[0].count,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch stats.' });
    }
};

exports.updateAppointment = async (req, res) => {
    try {
        const { status } = req.body;
        if (!status || !['Pending', 'Confirmed', 'Completed', 'Cancelled'].includes(status))
            return res.status(400).json({ error: 'Invalid status.' });

        // Fetch appointment details BEFORE updating
        const [appt] = await db.query(
            'SELECT user_id, full_name, appointment_date, preferred_time, reason FROM appointments WHERE appointment_id = ?',
            [req.params.id]
        );
        if (appt.length === 0) {
            return res.status(404).json({ error: 'Appointment not found.' });
        }

        await db.query('UPDATE appointments SET status = ? WHERE appointment_id = ?', [status, req.params.id]);

        // NOTIFY RESIDENT - only for Confirmed or Cancelled
        if (appt[0].user_id && (status === 'Confirmed' || status === 'Cancelled')) {
            // Format date nicely (YYYY-MM-DD → "May 25, 2026")
            let dateStr = "your scheduled date";
            if (appt[0].appointment_date) {
                const ds = String(appt[0].appointment_date).split('T')[0].split(' ')[0];
                const [y, m, d] = ds.split('-');
                const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                if (y && m && d) {
                    dateStr = `${months[parseInt(m,10)-1]} ${parseInt(d,10)}, ${y}`;
                }
            }

            // Format time (HH:MM:SS → "3:00 PM")
            let timeStr = "";
            if (appt[0].preferred_time) {
                const parts = String(appt[0].preferred_time).split(':');
                if (parts.length >= 2) {
                    const hour24 = parseInt(parts[0], 10);
                    const minute = parts[1];
                    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
                    const ampm = hour24 >= 12 ? 'PM' : 'AM';
                    timeStr = `${hour12}:${minute} ${ampm}`;
                }
            }

            const title = status === 'Confirmed'
                ? 'Appointment Confirmed'
                : 'Appointment Cancelled';

            const message = status === 'Confirmed'
                ? `Your ${appt[0].reason} appointment on ${dateStr}${timeStr ? ` at ${timeStr}` : ''} has been confirmed. Please arrive on time at the Barangay Health Center.`
                : `Your ${appt[0].reason} appointment on ${dateStr}${timeStr ? ` at ${timeStr}` : ''} has been cancelled. Please contact the Barangay Health Center to reschedule.`;

            try {
                await notificationController.createNotification(
                    appt[0].user_id,
                    title,
                    message,
                    'Appointment Update'
                );
            } catch (notifErr) {
                console.error('Failed to send appointment notification:', notifErr);
            }
        }

        await logAudit(req, `Updated appointment #${req.params.id} status to ${status}`);

        res.json({ message: 'Appointment updated!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update appointment.' });
    }
};

exports.deleteAppointment = async (req, res) => {
    try {
        await db.query('DELETE FROM appointments WHERE appointment_id = ?', [req.params.id]);
        await logAudit(req, `Deleted appointment #${req.params.id}`);
        res.json({ message: 'Appointment deleted!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete appointment.' });
    }
};

// ============================================================
// WASTE SCHEDULE
// ============================================================

exports.getWasteSchedule = async (req, res) => {
    try {
        const [results] = await db.query(`
            SELECT * FROM waste_schedule
            ORDER BY FIELD(day,
                'Monday', 'Tuesday', 'Wednesday', 'Thursday',
                'Friday', 'Saturday', 'Sunday'
            )
        `);
        res.json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch schedule.' });
    }
};

exports.addWasteSchedule = async (req, res) => {
    try {
        const { day, type, status } = req.body;
        if (!day || !type) {
            return res.status(400).json({ error: 'Day and type required.' });
        }
        const finalStatus = status || 'Active';
        const [result] = await db.query(
            'INSERT INTO waste_schedule (day, type, status) VALUES (?, ?, ?)',
            [day, type, finalStatus]
        );
        await logAudit(req, `Added waste schedule: ${day} - ${type}`);
        res.status(201).json({ message: 'Schedule added!', schedule_id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to add schedule.' });
    }
};

exports.updateWasteSchedule = async (req, res) => {
    try {
        const { day, type, status } = req.body;
        if (!day || !type) {
            return res.status(400).json({ error: 'Day and type required.' });
        }
        const finalStatus = status || 'Active';
        await db.query(
            'UPDATE waste_schedule SET day = ?, type = ?, status = ? WHERE schedule_id = ?',
            [day, type, finalStatus, req.params.id]
        );
        await logAudit(req, `Updated waste schedule #${req.params.id}: ${day} - ${type}`);
        res.json({ message: 'Schedule updated!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update schedule.' });
    }
};

exports.deleteWasteSchedule = async (req, res) => {
    try {
        await db.query('DELETE FROM waste_schedule WHERE schedule_id = ?', [req.params.id]);
        await logAudit(req, `Deleted waste schedule #${req.params.id}`);
        res.json({ message: 'Schedule deleted!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete schedule.' });
    }
};

// ============================================================
// BUSINESS PERMITS
// ============================================================

exports.getBusinesses = async (req, res) => {
    try {
        const [results] = await db.query(`
            SELECT 
                permit_id, business_name, owner_name, permit_number,
                issued_date, expiry_date, created_at, updated_at,
                CASE
                    WHEN expiry_date IS NOT NULL AND expiry_date < CURDATE() THEN 'Inactive'
                    ELSE status
                END AS status
            FROM business_permits
            ORDER BY permit_id DESC
        `);
        res.json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch businesses.' });
    }
};

exports.addBusiness = async (req, res) => {
    try {
        const { business_name, owner_name, permit_number, status } = req.body;
        if (!business_name || !owner_name || !permit_number) {
            return res.status(400).json({ error: 'Business name, owner, and permit number required.' });
        }
        const issued_date = new Date().toISOString().split('T')[0];
        const currentYear = new Date().getFullYear();
        const expiry_date = `${currentYear}-12-31`;

        const [result] = await db.query(
            `INSERT INTO business_permits (business_name, owner_name, permit_number, issued_date, expiry_date, status) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [business_name, owner_name, permit_number, issued_date, expiry_date, status || 'Active']
        );

        await logAudit(req, `Added business "${business_name}" (${permit_number})`);

        res.status(201).json({ message: 'Business added!', permit_id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to add business.' });
    }
};

exports.updateBusiness = async (req, res) => {
    try {
        const { business_name, owner_name, permit_number, status } = req.body;
        const updates = [];
        const values = [];

        if (business_name !== undefined) { updates.push('business_name = ?'); values.push(business_name); }
        if (owner_name !== undefined) { updates.push('owner_name = ?'); values.push(owner_name); }
        if (permit_number !== undefined) { updates.push('permit_number = ?'); values.push(permit_number); }
        if (status !== undefined) { updates.push('status = ?'); values.push(status); }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update.' });
        }

        values.push(req.params.id);
        await db.query(`UPDATE business_permits SET ${updates.join(', ')} WHERE permit_id = ?`, values);
        await logAudit(req, `Updated business #${req.params.id}${business_name ? ` "${business_name}"` : ''}`);
        res.json({ message: 'Business updated!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update business.' });
    }
};

exports.deleteBusiness = async (req, res) => {
    try {
        await db.query('DELETE FROM business_permits WHERE permit_id = ?', [req.params.id]);
        await logAudit(req, `Deleted business #${req.params.id}`);
        res.json({ message: 'Business deleted!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete business.' });
    }
};

// ============================================================
// INVENTORY
// ============================================================

exports.getInventory = async (req, res) => {
    try {
        const [results] = await db.query('SELECT * FROM inventory_items ORDER BY inventory_id DESC');
        res.json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch inventory.' });
    }
};

exports.addInventoryItem = async (req, res) => {
    try {
        const { item_name, category, quantity, unit, status } = req.body;
        if (!item_name || !category || !unit)
            return res.status(400).json({ error: 'Item name, category, and unit required.' });
        const [result] = await db.query(
            'INSERT INTO inventory_items (item_name, category, quantity, unit, status) VALUES (?, ?, ?, ?, ?)',
            [item_name, category, quantity || 0, unit, status || 'Available']
        );
        await logAudit(req, `Added inventory item "${item_name}"`);
        res.status(201).json({ message: 'Item added!', inventory_id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to add item.' });
    }
};

exports.updateInventoryItem = async (req, res) => {
    try {
        const { item_name, category, quantity, unit, status } = req.body;
        await db.query(
            `UPDATE inventory_items SET item_name = ?, category = ?, quantity = ?, unit = ?, status = ? WHERE inventory_id = ?`,
            [item_name, category, quantity || 0, unit, status || 'Available', req.params.id]
        );
        await logAudit(req, `Updated inventory item #${req.params.id}${item_name ? ` "${item_name}"` : ''}`);
        res.json({ message: 'Item updated!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update item.' });
    }
};

exports.deleteInventoryItem = async (req, res) => {
    try {
        await db.query('DELETE FROM inventory_items WHERE inventory_id = ?', [req.params.id]);
        await logAudit(req, `Deleted inventory item #${req.params.id}`);
        res.json({ message: 'Item deleted!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete item.' });
    }
};

// ============================================================
// BLOTTER
// ============================================================

exports.getBlotterCases = async (req, res) => {
    try {
        const [results] = await db.query('SELECT * FROM blotter_cases ORDER BY blotter_id DESC');
        res.json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch blotter cases.' });
    }
};

exports.addBlotterCase = async (req, res) => {
    try {
        const { incident_type, location, incident_date, description, status } = req.body;
        if (!incident_type || !location || !incident_date)
            return res.status(400).json({ error: 'Incident type, location, and date required.' });
        const case_number = generateCaseNumber('BLT');
        const [result] = await db.query(
            `INSERT INTO blotter_cases (case_number, incident_type, location, incident_date, description, status) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [case_number, incident_type, location, incident_date, description || null, status || 'Open']
        );
        await logAudit(req, `Added blotter case ${case_number}: ${incident_type}`);
        res.status(201).json({ message: 'Blotter case added!', blotter_id: result.insertId, case_number });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to add blotter case.' });
    }
};

exports.updateBlotterCase = async (req, res) => {
    try {
        const { incident_type, location, incident_date, description, status } = req.body;
        await db.query(
            `UPDATE blotter_cases SET incident_type = ?, location = ?, incident_date = ?, description = ?, status = ? WHERE blotter_id = ?`,
            [incident_type, location, incident_date, description || null, status || 'Open', req.params.id]
        );
        await logAudit(req, `Updated blotter case #${req.params.id} status to ${status || 'Open'}`);
        res.json({ message: 'Blotter case updated!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update blotter case.' });
    }
};

exports.deleteBlotterCase = async (req, res) => {
    try {
        await db.query('DELETE FROM blotter_cases WHERE blotter_id = ?', [req.params.id]);
        await logAudit(req, `Deleted blotter case #${req.params.id}`);
        res.json({ message: 'Blotter case deleted!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete blotter case.' });
    }
};

// ============================================================
// DISASTER
// ============================================================

exports.getDisasterAlerts = async (req, res) => {
    try {
        const [results] = await db.query('SELECT * FROM disaster_alerts ORDER BY alert_id DESC');
        res.json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch disaster alerts.' });
    }
};

exports.addDisasterAlert = async (req, res) => {
    try {
        const { title, type, description, status } = req.body;
        if (!title || !type) {
            return res.status(400).json({ error: 'Title and type required.' });
        }
        const finalStatus = status || 'Active';
        const announcementStatus = finalStatus === 'Active' ? 'Published' : 'Draft';

        const [result] = await db.query(
            `INSERT INTO disaster_alerts (title, type, description, status, created_by) 
             VALUES (?, ?, ?, ?, ?)`,
            [title, type, description || null, finalStatus, req.user.id]
        );
        const alertId = result.insertId;

        const [annResult] = await db.query(
            `INSERT INTO announcements (title, content, category, status, posted_at, posted_by) 
             VALUES (?, ?, 'Disaster', ?, NOW(), ?)`,
            [title, description || 'No description provided.', announcementStatus, req.user.id]
        );

        await db.query(
            'UPDATE disaster_alerts SET linked_announcement_id = ? WHERE alert_id = ?',
            [annResult.insertId, alertId]
        );

        await logAudit(req, `Created disaster alert "${title}" (${type})`);

        res.status(201).json({ message: 'Disaster alert created!', alert_id: alertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create disaster alert.' });
    }
};

exports.updateDisasterAlert = async (req, res) => {
    try {
        const { title, type, description, status } = req.body;
        if (!title || !type) {
            return res.status(400).json({ error: 'Title and type required.' });
        }
        const finalStatus = status || 'Active';
        const announcementStatus = finalStatus === 'Active' ? 'Published' : 'Draft';

        const [alert] = await db.query('SELECT linked_announcement_id FROM disaster_alerts WHERE alert_id = ?', [req.params.id]);
        if (alert.length === 0) {
            return res.status(404).json({ error: 'Alert not found.' });
        }

        await db.query(
            `UPDATE disaster_alerts SET title = ?, type = ?, description = ?, status = ? WHERE alert_id = ?`,
            [title, type, description || null, finalStatus, req.params.id]
        );

        let linkedId = alert[0].linked_announcement_id;
        if (linkedId) {
            const [checkAnn] = await db.query(
                'SELECT announcement_id FROM announcements WHERE announcement_id = ?',
                [linkedId]
            );
            if (checkAnn.length === 0) linkedId = null;
        }

        if (linkedId) {
            await db.query(
                `UPDATE announcements SET title = ?, content = ?, status = ? WHERE announcement_id = ?`,
                [title, description || 'No description provided.', announcementStatus, linkedId]
            );
        } else {
            const [annResult] = await db.query(
                `INSERT INTO announcements (title, content, category, status, posted_at, posted_by) 
                 VALUES (?, ?, 'Disaster', ?, NOW(), ?)`,
                [title, description || 'No description provided.', announcementStatus, req.user.id]
            );
            await db.query(
                'UPDATE disaster_alerts SET linked_announcement_id = ? WHERE alert_id = ?',
                [annResult.insertId, req.params.id]
            );
        }

        await logAudit(req, `Updated disaster alert "${title}" (status: ${finalStatus})`);

        res.json({ message: 'Disaster alert updated!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update disaster alert.' });
    }
};

exports.deleteDisasterAlert = async (req, res) => {
    try {
        const [alert] = await db.query('SELECT linked_announcement_id FROM disaster_alerts WHERE alert_id = ?', [req.params.id]);
        if (alert.length === 0) {
            return res.status(404).json({ error: 'Alert not found.' });
        }
        if (alert[0].linked_announcement_id) {
            await db.query('DELETE FROM announcements WHERE announcement_id = ?', [alert[0].linked_announcement_id]);
        }
        await db.query('DELETE FROM disaster_alerts WHERE alert_id = ?', [req.params.id]);
        await logAudit(req, `Deleted disaster alert #${req.params.id}`);
        res.json({ message: 'Disaster alert deleted!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete disaster alert.' });
    }
};

// ============================================================
// ANALYTICS
// ============================================================

exports.getCategoryAnalytics = async (req, res) => {
    try {
        const [results] = await db.query(
            'SELECT category, COUNT(*) as count FROM environmental_reports GROUP BY category ORDER BY count DESC'
        );
        res.json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch category data.' });
    }
};

exports.getMonthlyAnalytics = async (req, res) => {
    try {
        const year = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();
        const [results] = await db.query(
            `SELECT MONTH(submitted_at) as month_num, COUNT(*) as count
             FROM environmental_reports
             WHERE YEAR(submitted_at) = ?
             GROUP BY MONTH(submitted_at)`,
            [year]
        );
        const countsByMonth = {};
        results.forEach((row) => { countsByMonth[row.month_num] = row.count; });
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthlyData = monthNames.map((name, index) => ({
            month: name, count: countsByMonth[index + 1] || 0,
        }));
        res.json(monthlyData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch monthly data.' });
    }
};

exports.getSummaryAnalytics = async (req, res) => {
    try {
        const [total] = await db.query('SELECT COUNT(*) as count FROM environmental_reports');
        const [avgResponse] = await db.query(
            'SELECT AVG(DATEDIFF(updated_at, submitted_at)) as avg_days FROM environmental_reports WHERE status = ?',
            ['resolved']
        );
        const [resolved] = await db.query('SELECT COUNT(*) as count FROM environmental_reports WHERE status = ?', ['resolved']);
        const resolutionRate = total[0].count > 0 ? (resolved[0].count / total[0].count * 100) : 0;
        res.json({
            total_reports: total[0].count,
            avg_response_days: parseFloat(avgResponse[0].avg_days || 0).toFixed(1),
            resolution_rate: parseFloat(resolutionRate.toFixed(0)),
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch summary data.' });
    }
};

// ============================================================
// AUDIT LOGS
// ============================================================

exports.getAuditLogs = async (req, res) => {
    try {
        const {
            filter,
            search,
            date_from,
            date_to,
            page = 1,
            limit = 25,
        } = req.query;

        const whereClauses = [];
        const params = [];

        // Category filter
        if (filter && filter !== 'All Activities') {
            whereClauses.push('action LIKE ?');
            params.push(`%${filter}%`);
        }

        // Free-text search
        if (search && search.trim()) {
            whereClauses.push('(user_name LIKE ? OR action LIKE ? OR ip_address LIKE ?)');
            const term = `%${search.trim()}%`;
            params.push(term, term, term);
        }

        // Date range
        if (date_from) {
            whereClauses.push('DATE(created_at) >= ?');
            params.push(date_from);
        }
        if (date_to) {
            whereClauses.push('DATE(created_at) <= ?');
            params.push(date_to);
        }

        const whereSQL = whereClauses.length > 0
            ? ' WHERE ' + whereClauses.join(' AND ')
            : '';

        // Total count for pagination metadata
        const [countResult] = await db.query(
            `SELECT COUNT(*) as total FROM audit_logs${whereSQL}`,
            params
        );
        const total = countResult[0].total;

        // Pagination bounds
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(10000, Math.max(1, parseInt(limit, 10) || 25));
        const offset = (pageNum - 1) * limitNum;

        const [results] = await db.query(
            `SELECT * FROM audit_logs${whereSQL}
             ORDER BY created_at DESC
             LIMIT ${limitNum} OFFSET ${offset}`,
            params
        );

        res.json({
            logs: results,
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum),
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch audit logs.' });
    }
};

// ============================================================
// NOTIFICATION CENTER
// ============================================================

exports.getNotificationCenter = async (req, res) => {
    try {
        const [results] = await db.query('SELECT * FROM notification_center ORDER BY created_at DESC');
        res.json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch notification center.' });
    }
};

exports.createNotificationCenter = async (req, res) => {
    try {
        const { title, message } = req.body;
        if (!title || !message) {
            return res.status(400).json({ error: 'Title and message are required.' });
        }
        await notificationController.sendNotificationCenter(title, message);
        await logAudit(req, `Sent notification to all residents: "${title}"`);
        res.status(201).json({ message: 'Notification center item sent to all residents!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to send notification center item.' });
    }
};

exports.updateNotificationCenter = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, message } = req.body;
        if (!title || !message) {
            return res.status(400).json({ error: 'Title and message are required.' });
        }
        await notificationController.updateNotificationCenter(id, title, message);
        await logAudit(req, `Updated notification center item #${id}: "${title}"`);
        res.json({ message: 'Notification center item updated!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update notification center item.' });
    }
};

exports.deleteNotificationCenter = async (req, res) => {
    try {
        const { id } = req.params;
        await notificationController.deleteNotificationCenter(id);
        await logAudit(req, `Deleted notification center item #${id}`);
        res.json({ message: 'Notification center item deleted!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete notification center item.' });
    }
};