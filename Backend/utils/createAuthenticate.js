function sendAuthError(res, status, code, error) {
    return res.status(status).json({ code, error });
}

module.exports = function createAuthenticate({ tokenService, database, logger = console }) {
    return async (req, res, next) => {
        const authHeader = req.headers['authorization'];
        const bearer = typeof authHeader === 'string'
            ? authHeader.match(/^Bearer\s+(.+)$/i)
            : null;
        const token = bearer?.[1];

        if (!token) {
            return sendAuthError(res, 401, 'AUTHENTICATION_REQUIRED', 'Access denied.');
        }

        let decoded;
        try {
            decoded = tokenService.verify(token, process.env.JWT_SECRET || 'fallback');
        } catch (err) {
            if (err?.name === 'TokenExpiredError') {
                return sendAuthError(res, 401, 'TOKEN_EXPIRED', 'Session expired. Please sign in again.');
            }
            if (['JsonWebTokenError', 'NotBeforeError'].includes(err?.name)) {
                return sendAuthError(res, 401, 'INVALID_TOKEN', 'Invalid session. Please sign in again.');
            }

            logger.error('[auth] Token verification failed:', err);
            return sendAuthError(
                res,
                503,
                'AUTH_CHECK_UNAVAILABLE',
                'Unable to verify your session right now. Please try again.'
            );
        }

        let users;
        try {
            [users] = await database.query(
                'SELECT status, role, can_assign_worker FROM users WHERE user_id = ?',
                [decoded.id]
            );
        } catch (err) {
            logger.error('[auth] Account lookup failed:', err);
            return sendAuthError(
                res,
                503,
                'AUTH_CHECK_UNAVAILABLE',
                'Unable to verify your session right now. Please try again.'
            );
        }

        if (users.length === 0) {
            return sendAuthError(
                res,
                401,
                'ACCOUNT_DELETED',
                'Your account was deleted or is no longer available.'
            );
        }

        if (users[0].status === 'Deactivated') {
            return sendAuthError(
                res,
                403,
                'ACCOUNT_DEACTIVATED',
                'Account deactivated. Please contact admin.'
            );
        }

        // Activity tracking is best-effort. A write hiccup must not invalidate
        // a session after the account was successfully found and verified.
        try {
            await database.query(
                'UPDATE users SET last_active_at = NOW() WHERE user_id = ?',
                [decoded.id]
            );
        } catch (err) {
            logger.warn('[auth] Activity update failed:', err.message);
        }

        // Role + permission are read fresh from the DB on every request, so
        // administrator changes take effect immediately without re-login.
        req.user = {
            ...decoded,
            role: users[0].role,
            can_assign_worker: !!users[0].can_assign_worker,
        };
        return next();
    };
};
