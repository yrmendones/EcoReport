const test = require('node:test');
const assert = require('node:assert/strict');
const registrationFlowDebugEnabled = require('../utils/registrationFlowDebug');
const logRegistrationError = require('../utils/logRegistrationError');

const originalValue = process.env.REGISTRATION_FLOW_DEBUG;

test('registration tracing is disabled when the environment variable is unset', () => {
    delete process.env.REGISTRATION_FLOW_DEBUG;
    assert.equal(registrationFlowDebugEnabled(), false);
});

test('registration tracing can be enabled explicitly', () => {
    process.env.REGISTRATION_FLOW_DEBUG = 'true';
    assert.equal(registrationFlowDebugEnabled(), true);

    process.env.REGISTRATION_FLOW_DEBUG = '1';
    assert.equal(registrationFlowDebugEnabled(), true);
});

test('other values keep registration tracing disabled', () => {
    process.env.REGISTRATION_FLOW_DEBUG = 'false';
    assert.equal(registrationFlowDebugEnabled(), false);

    process.env.REGISTRATION_FLOW_DEBUG = 'yes';
    assert.equal(registrationFlowDebugEnabled(), false);
});

test('registration failure logs include safe error codes without raw personal data', () => {
    const originalConsoleError = console.error;
    const logged = [];
    console.error = (...args) => logged.push(args);
    try {
        const error = Object.assign(new Error('failed for resident@example.com at 123 Main Street'), {
            code: 'ER_DUP_ENTRY',
            sqlState: '23000',
            sql: 'INSERT INTO users (email) VALUES (resident@example.com)',
        });
        logRegistrationError('resident registration', error);
    } finally {
        console.error = originalConsoleError;
    }

    const output = JSON.stringify(logged);
    assert.match(output, /ER_DUP_ENTRY/);
    assert.match(output, /23000/);
    assert.doesNotMatch(output, /resident@example\.com|123 Main Street|INSERT INTO users/);
});

test.after(() => {
    if (originalValue === undefined) delete process.env.REGISTRATION_FLOW_DEBUG;
    else process.env.REGISTRATION_FLOW_DEBUG = originalValue;
});
