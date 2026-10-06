const crypto = require('crypto');
const userSessions = new Map();

function createUserSession(data) {
    const userSessionId = crypto.randomUUID();
    userSessions.set(userSessionId, data);
    return userSessionId;
}

function getUserSession(userSessionId) {
    return userSessions.get(userSessionId);
}

module.exports = { createUserSession, getUserSession };