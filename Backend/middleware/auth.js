const jwt = require('jsonwebtoken');
const db = require('../db');
const createAuthenticate = require('../utils/createAuthenticate');
const roleAuthorization = require('./roleAuthorization');

exports.authenticate = createAuthenticate({ tokenService: jwt, database: db });
Object.assign(exports, roleAuthorization);
