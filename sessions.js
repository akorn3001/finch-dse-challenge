const crypto = require('crypto');
const sessions = new Map();

function createSession(data) {
    const sessionId = crypto.randomUUID();
    sessions.set(sessionId, data);
    return sessionId;
}

function getSession(sessionId) {
    return sessions.get(sessionId);
}

module.exports = { createSession, getSession };