const test = require('node:test');
const assert = require('node:assert/strict');
const createAuthenticate = require('../utils/createAuthenticate');

function makeResponse() {
    return {
        statusCode: null,
        body: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        },
    };
}

async function runAuth({ token = 'valid', decoded = { id: 24, role: 'resident' }, users = [], queryError, heartbeatError } = {}) {
    const calls = [];
    const database = {
        async query(sql, params) {
            calls.push({ sql, params });
            if (queryError && calls.length === 1) throw queryError;
            if (sql.startsWith('SELECT')) return [users];
            if (heartbeatError) throw heartbeatError;
            return [{}];
        },
    };
    const tokenService = {
        verify(value) {
            if (value !== token) throw new Error('Unexpected test token');
            if (decoded instanceof Error) throw decoded;
            return decoded;
        },
    };
    const logger = { error() {}, warn() {} };
    const middleware = createAuthenticate({ tokenService, database, logger });
    const req = { headers: token ? { authorization: `Bearer ${token}` } : {} };
    const res = makeResponse();
    let nextCalled = false;
    await middleware(req, res, () => { nextCalled = true; });
    return { req, res, nextCalled, calls };
}

test('missing token is reported as an authentication-required result', async () => {
    const { res, nextCalled, calls } = await runAuth({ token: null });
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.code, 'AUTHENTICATION_REQUIRED');
    assert.equal(nextCalled, false);
    assert.equal(calls.length, 0);
});

test('expired and malformed JWTs have distinct session error codes', async () => {
    const expired = new Error('expired');
    expired.name = 'TokenExpiredError';
    const expiredResult = await runAuth({ decoded: expired });
    assert.equal(expiredResult.res.body.code, 'TOKEN_EXPIRED');
    assert.equal(expiredResult.res.statusCode, 401);

    const invalid = new Error('invalid');
    invalid.name = 'JsonWebTokenError';
    const invalidResult = await runAuth({ decoded: invalid });
    assert.equal(invalidResult.res.body.code, 'INVALID_TOKEN');
    assert.equal(invalidResult.res.statusCode, 401);
});

test('a missing user row is explicitly identified as a deleted account', async () => {
    const { res, nextCalled } = await runAuth({ users: [] });
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.code, 'ACCOUNT_DELETED');
    assert.equal(nextCalled, false);
});

test('deactivated accounts remain distinct from deleted accounts', async () => {
    const { res, nextCalled } = await runAuth({ users: [{ status: 'Deactivated', role: 'resident' }] });
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.code, 'ACCOUNT_DEACTIVATED');
    assert.equal(nextCalled, false);
});

test('database lookup failures remain retryable and do not masquerade as invalid tokens', async () => {
    const { res, nextCalled, calls } = await runAuth({ queryError: new Error('database unavailable') });
    assert.equal(res.statusCode, 503);
    assert.equal(res.body.code, 'AUTH_CHECK_UNAVAILABLE');
    assert.equal(nextCalled, false);
    assert.equal(calls.length, 1);
});

test('an activity heartbeat failure does not invalidate an account that was verified', async () => {
    const { req, nextCalled, calls } = await runAuth({
        users: [{ status: 'Online', role: 'resident', can_assign_worker: 1 }],
        heartbeatError: new Error('write unavailable'),
    });
    assert.equal(nextCalled, true);
    assert.equal(req.user.role, 'resident');
    assert.equal(req.user.can_assign_worker, true);
    assert.equal(calls.length, 2);
});

test('a different active resident can authenticate with their own token', async () => {
    const { req, res, nextCalled, calls } = await runAuth({
        decoded: { id: 87, role: 'resident' },
        users: [{ status: 'Online', role: 'resident', can_assign_worker: 0 }],
    });
    assert.equal(res.body, null);
    assert.equal(nextCalled, true);
    assert.equal(req.user.id, 87);
    assert.equal(calls[0].params[0], 87);
});
