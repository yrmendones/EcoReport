const ERROR_NAMES = new Set([
    'Error',
    'TypeError',
    'RangeError',
    'SyntaxError',
    'ReferenceError',
    'URIError',
    'AggregateError',
]);

function safeCode(value) {
    return typeof value === 'string' && /^[A-Z0-9_]{1,40}$/.test(value)
        ? value
        : undefined;
}

module.exports = function logRegistrationError(stage, error) {
    const details = {
        name: ERROR_NAMES.has(error?.name) ? error.name : 'Error',
        code: safeCode(error?.code),
        sql_state: typeof error?.sqlState === 'string' && /^[A-Z0-9]{5}$/.test(error.sqlState)
            ? error.sqlState
            : undefined,
    };
    const status = Number.isInteger(error?.statusCode)
        ? error.statusCode
        : Number.isInteger(error?.http_code)
            ? error.http_code
            : null;
    if (status !== null) details.status = status;

    // Do not emit raw messages, stacks, query text, or uploaded-file details.
    console.error(`[registration] ${stage} failed`, details);
};
