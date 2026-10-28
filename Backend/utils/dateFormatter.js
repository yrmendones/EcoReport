/* Convert a MySQL DATETIME string ("YYYY-MM-DD HH:MM:SS", assumed UTC) into a proper ISO-8601 UTC string ("YYYY-MM-DDTHH:MM:SS.sssZ").
 * JS `new Date(iso)` on the frontend then correctly interprets it as UTC and displays it in the user's local time (Philippine Time). */
const toISOUTC = (value) => {
    if (value === null || value === undefined || value === "") return value;
    const str = String(value);

    // Already has timezone info → leave alone
    if (/Z$|[+-]\d{2}:\d{2}$/.test(str)) return str;

    // MySQL DATETIME format → treat as UTC
    if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/.test(str)) {
        return new Date(str.replace(" ", "T") + "Z").toISOString();
    }

    // DATE only ("YYYY-MM-DD") or anything else → leave alone
    return str;
};

const formatRow = (row, fields) => {
    if (!row) return row;
    const copy = { ...row };
    for (const f of fields) {
        if (copy[f] !== undefined && copy[f] !== null) {
            copy[f] = toISOUTC(copy[f]);
        }
    }
    return copy;
};

const formatRows = (rows, fields) => {
    if (!Array.isArray(rows)) return rows;
    return rows.map((r) => formatRow(r, fields));
};

module.exports = { toISOUTC, formatRow, formatRows };