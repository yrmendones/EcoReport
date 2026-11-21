const test = require('node:test');
const assert = require('node:assert/strict');
const registrationFlowDebugEnabled = require('../utils/registrationFlowDebug');

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

test.after(() => {
    if (originalValue === undefined) delete process.env.REGISTRATION_FLOW_DEBUG;
    else process.env.REGISTRATION_FLOW_DEBUG = originalValue;
});
