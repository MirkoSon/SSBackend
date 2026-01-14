const express = require('express');
const router = express.Router();
const achievements = require('./achievements');
const users = require('./users');

module.exports = (db) => {
    router.use('/achievements', achievements(db));
    router.use('/users', users(db));
    return router;
};
