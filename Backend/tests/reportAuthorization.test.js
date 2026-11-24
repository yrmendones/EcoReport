const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const roles = require('../middleware/roleAuthorization');

function installModuleMock(modulePath, exports) {
    const resolved = require.resolve(modulePath);
    const original = require.cache[resolved];
    require.cache[resolved] = {
        id: resolved,
        filename: resolved,
        loaded: true,
        exports,
    };
    return () => {
        if (original) require.cache[resolved] = original;
        else delete require.cache[resolved];
    };
}

function makeTestAuthenticate() {
    return (req, res, next) => {
        const match = /^Bearer test:(resident|barangay_official|admin):(yes|no)$/.exec(
            req.get('authorization') || ''
        );
        if (!match) return res.status(401).json({ error: 'Authentication required.' });
        req.user = {
            id: 7,
            role: match[1],
            can_assign_worker: match[2] === 'yes',
        };
        next();
    };
}

function makeStubController() {
    return new Proxy({}, {
        get: () => (req, res) => res.status(204).end(),
    });
}

function loadRouter(routePath, mocks) {
    const restorers = Object.entries(mocks).map(([modulePath, exports]) =>
        installModuleMock(modulePath, exports)
    );
    const resolvedRoute = require.resolve(routePath);
    const originalRoute = require.cache[resolvedRoute];
    delete require.cache[resolvedRoute];

    try {
        return require(resolvedRoute);
    } finally {
        if (originalRoute) require.cache[resolvedRoute] = originalRoute;
        else delete require.cache[resolvedRoute];
        for (const restore of restorers.reverse()) restore();
    }
}

async function withServer(app, callback) {
    const server = app.listen(0, '127.0.0.1');
    await new Promise((resolve, reject) => {
        server.once('listening', resolve);
        server.once('error', reject);
    });
    const address = server.address();
    try {
        await callback(`http://127.0.0.1:${address.port}`);
    } finally {
        await new Promise((resolve, reject) => {
            server.close((error) => error ? reject(error) : resolve());
        });
    }
}

async function callApi(baseUrl, role, method, path, canAssign = false, body = {}) {
    return fetch(`${baseUrl}${path}`, {
        method,
        headers: {
            Authorization: `Bearer test:${role}:${canAssign ? 'yes' : 'no'}`,
            'Content-Type': 'application/json',
        },
        body: ['GET', 'HEAD'].includes(method) ? undefined : JSON.stringify(body),
    });
}

test('report routes enforce resident, staff, and admin roles on direct API requests', async () => {
    const auth = {
        authenticate: makeTestAuthenticate(),
        ...roles,
    };
    const reports = loadRouter('../routes/reports', {
        '../middleware/auth': auth,
        '../controllers/reportController': makeStubController(),
    });
    const admin = loadRouter('../routes/admin', {
        '../middleware/auth': auth,
        '../controllers/adminController': makeStubController(),
        '../controllers/settingsController': makeStubController(),
        '../controllers/announcementController': makeStubController(),
        '../controllers/certificateTypesController': makeStubController(),
    });

    const app = express();
    app.use(express.json());
    app.use('/api/reports', reports);
    app.use('/api/admin', admin);

    await withServer(app, async (baseUrl) => {
        assert.equal((await callApi(baseUrl, 'resident', 'POST', '/api/reports')).status, 204);
        assert.equal((await callApi(baseUrl, 'barangay_official', 'POST', '/api/reports')).status, 403);
        assert.equal((await callApi(baseUrl, 'admin', 'POST', '/api/reports')).status, 403);
        assert.equal((await callApi(baseUrl, 'barangay_official', 'POST', '/api/reports', false, { role: 'resident' })).status, 403);

        assert.equal((await callApi(baseUrl, 'resident', 'POST', '/api/reports/42/media')).status, 403);
        assert.equal((await callApi(baseUrl, 'barangay_official', 'POST', '/api/reports/42/media')).status, 204);
        assert.equal((await callApi(baseUrl, 'barangay_official', 'PUT', '/api/reports/42/status')).status, 204);
        assert.equal((await callApi(baseUrl, 'resident', 'PUT', '/api/reports/42/status')).status, 403);

        assert.equal((await callApi(baseUrl, 'resident', 'DELETE', '/api/reports/42/media/9')).status, 403);
        assert.equal((await callApi(baseUrl, 'barangay_official', 'DELETE', '/api/reports/42/media/9')).status, 403);
        assert.equal((await callApi(baseUrl, 'admin', 'DELETE', '/api/reports/42/media/9')).status, 204);

        assert.equal((await callApi(baseUrl, 'resident', 'DELETE', '/api/reports/42')).status, 403);
        assert.equal((await callApi(baseUrl, 'barangay_official', 'DELETE', '/api/reports/42')).status, 204);
        assert.equal((await callApi(baseUrl, 'admin', 'DELETE', '/api/reports/42')).status, 403);

        assert.equal((await callApi(baseUrl, 'resident', 'DELETE', '/api/admin/reports/42')).status, 403);
        assert.equal((await callApi(baseUrl, 'barangay_official', 'DELETE', '/api/admin/reports/42')).status, 204);
        assert.equal((await callApi(baseUrl, 'admin', 'DELETE', '/api/admin/reports/42')).status, 403);

        assert.equal((await callApi(baseUrl, 'barangay_official', 'PUT', '/api/admin/reports/42/assign', false)).status, 403);
        assert.equal((await callApi(baseUrl, 'barangay_official', 'PUT', '/api/admin/reports/42/assign', true)).status, 204);
        assert.equal((await callApi(baseUrl, 'barangay_official', 'PUT', '/api/admin/reports/42/status', false)).status, 204);
    });
});

test('assignment permission remains required for officials and is not needed for report status', () => {
    function runMiddleware(middleware, user) {
        const res = {
            statusCode: null,
            status(code) { this.statusCode = code; return this; },
            json(body) { this.body = body; return this; },
        };
        let nextCalled = false;
        middleware({ user }, res, () => { nextCalled = true; });
        return { res, nextCalled };
    }

    assert.equal(runMiddleware(roles.requireAssignPermission, {
        role: 'barangay_official', can_assign_worker: false,
    }).res.statusCode, 403);
    assert.equal(runMiddleware(roles.requireAssignPermission, {
        role: 'barangay_official', can_assign_worker: true,
    }).nextCalled, true);
    assert.equal(runMiddleware(roles.requireAssignPermission, { role: 'admin' }).nextCalled, true);
});

function makeTransactionalDb() {
    const statements = [];
    const events = [];
    const connection = {
        async beginTransaction() { events.push('begin'); },
        async commit() { events.push('commit'); },
        async rollback() { events.push('rollback'); },
        release() { events.push('release'); },
        async query(sql, params) {
            statements.push({ sql, params });
            if (sql.includes('INSERT INTO environmental_reports')) return [{ insertId: 42 }];
            return [{ insertId: statements.length }];
        },
    };
    return {
        statements,
        events,
        async query(sql, params) {
            statements.push({ sql, params });
            if (sql.includes('FROM report_categories')) return [[{ category_id: 3 }]];
            throw new Error(`Unexpected pool query: ${sql}`);
        },
        async getConnection() { return connection; },
    };
}

function loadReportControllerWithDb(fakeDb) {
    const restoreDb = installModuleMock('../db', fakeDb);
    const controllerPath = require.resolve('../controllers/reportController');
    const timelinePath = require.resolve('../utils/timelineLogger');
    const originalController = require.cache[controllerPath];
    const originalTimeline = require.cache[timelinePath];
    delete require.cache[controllerPath];
    delete require.cache[timelinePath];
    try {
        return require(controllerPath);
    } finally {
        delete require.cache[controllerPath];
        if (originalController) require.cache[controllerPath] = originalController;
        if (originalTimeline) require.cache[timelinePath] = originalTimeline;
        else delete require.cache[timelinePath];
        restoreDb();
    }
}

async function submitReportWithMedia(media) {
    const fakeDb = makeTransactionalDb();
    const controller = loadReportControllerWithDb(fakeDb);
    const res = {
        statusCode: null,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; },
    };
    await controller.createReport({
        user: { id: 9, role: 'resident' },
        body: { category: 'Flooding', media },
    }, res);
    return { fakeDb, res };
}

test('report creation commits without evidence', async () => {
    const { fakeDb, res } = await submitReportWithMedia(undefined);
    assert.equal(res.statusCode, 201);
    assert.equal(fakeDb.events.includes('commit'), true);
    assert.equal(fakeDb.events.includes('rollback'), false);
    assert.equal(fakeDb.statements.some(({ sql }) => sql.includes('INSERT INTO report_media')), false);
});

test('report creation saves initial images and videos in the same transaction', async () => {
    const media = [
        { file_url: 'https://res.cloudinary.com/example/image.jpg', file_type: 'image' },
        { file_url: 'https://res.cloudinary.com/example/video.mp4', file_type: 'video' },
    ];
    const { fakeDb, res } = await submitReportWithMedia(media);
    const insertedMedia = fakeDb.statements.filter(({ sql }) => sql.includes('INSERT INTO report_media'));

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.report_id, 42);
    assert.equal(insertedMedia.length, 2);
    assert.deepEqual(insertedMedia.map(({ params }) => params), [
        [42, media[0].file_url, 'image'],
        [42, media[1].file_url, 'video'],
    ]);
    assert.equal(fakeDb.events.includes('commit'), true);
    assert.equal(fakeDb.events.includes('rollback'), false);
});

test('report creation saves an image-only submission in the same transaction', async () => {
    const media = [{ file_url: 'https://res.cloudinary.com/example/image.jpg', file_type: 'image' }];
    const { fakeDb, res } = await submitReportWithMedia(media);
    const insertedMedia = fakeDb.statements.filter(({ sql }) => sql.includes('INSERT INTO report_media'));

    assert.equal(res.statusCode, 201);
    assert.deepEqual(insertedMedia.map(({ params }) => params), [[42, media[0].file_url, 'image']]);
    assert.equal(fakeDb.events.includes('commit'), true);
    assert.equal(fakeDb.events.includes('rollback'), false);
});

test('report creation saves a video-only submission in the same transaction', async () => {
    const media = [{ file_url: 'https://res.cloudinary.com/example/video.mp4', file_type: 'video' }];
    const { fakeDb, res } = await submitReportWithMedia(media);
    const insertedMedia = fakeDb.statements.filter(({ sql }) => sql.includes('INSERT INTO report_media'));

    assert.equal(res.statusCode, 201);
    assert.deepEqual(insertedMedia.map(({ params }) => params), [[42, media[0].file_url, 'video']]);
    assert.equal(fakeDb.events.includes('commit'), true);
    assert.equal(fakeDb.events.includes('rollback'), false);
});

test('report creation rejects malformed initial media before opening a transaction', async () => {
    const { fakeDb, res } = await submitReportWithMedia([{ file_url: 'https://example.test/file', file_type: 'audio' }]);
    assert.equal(res.statusCode, 400);
    assert.equal(fakeDb.events.includes('begin'), false);
});
