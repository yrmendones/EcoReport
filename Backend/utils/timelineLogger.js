const db = require('../db');

/**
 * Log a status change for a report into report_timeline.
 * @param {number} reportId
 * @param {string} status - pending | ongoing | assigned | resolved | rejected
 * @param {string} [note] - optional human-readable note
 */
async function logTimeline(reportId, status, note = null) {
    try {
        await db.query(
            'INSERT INTO report_timeline (report_id, status, note) VALUES (?, ?, ?)',
            [reportId, status, note]
        );
    } catch (err) {
        // Never break the parent request if timeline logging fails
        console.error('Timeline log error:', err);
    }
}

module.exports = { logTimeline };