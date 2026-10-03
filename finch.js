const FINCH_API_BASE = 'https://api.tryfinch.com';
const FINCH_API_VERSION = '2020-09-17';

const crypto = require('crypto');

// Base64 encodes client credentials
function getBasicAuthHeader() {
    const credentials = `${process.env.FINCH_CLIENT_ID}:${process.env.FINCH_CLIENT_SECRET}`;
    return `Basic ${Buffer.from(credentials).toString('base64')}`;
}
async function createConnectSession(providerId) {
    // Generate a random ID to use for customer ID instead of hardcoding
    const customerId = crypto.randomUUID();
    const response = await fetch(`${FINCH_API_BASE}/connect/sessions`, {
        method: 'POST',
        headers: {
            'Authorization': getBasicAuthHeader(),
            'Content-Type': 'application/json',
            'Finch-API-Version': FINCH_API_VERSION,
        },
        body: JSON.stringify({
            customer_id: customerId,
            customer_name: 'Demo Employer',
            //Only the four products needed. This scopes the token so it cannot call /payment or /pay-statement
            products: ['company', 'directory', 'individual', 'employment'],
            redirect_uri: process.env.REDIRECT_URI,
            sandbox: 'finch',
            integration: {
                provider: providerId,
            },
        }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Finch returned ${response.status}: ${errorBody}`);
    }

    return response.json();
}

async function createAccessToken(code) {
    const response = await fetch(`${FINCH_API_BASE}/auth/token`, {
        method: 'POST',
        headers: {
            'Finch-API-Version': FINCH_API_VERSION,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            client_id: process.env.FINCH_CLIENT_ID,
            client_secret: process.env.FINCH_CLIENT_SECRET,
            redirect_uri: process.env.REDIRECT_URI,
            code,
        }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Finch returned ${response.status}: ${errorBody}`);
    }

    return response.json();
}

// Helper function for the four data calls
async function finchRequest(path, accessToken, options = {}) {
    const res = await fetch(`${FINCH_API_BASE}${path}`, {
        method: options.method || 'GET',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Finch-API-Version': FINCH_API_VERSION,
        },
        body: options.body ? JSON.stringify(options.body) : undefined
    });

    return res.json();
}

async function getCompany(accessToken) {
    return finchRequest('/employer/company', accessToken)
}

async function getDirectory(accessToken) {
    return finchRequest('/employer/directory?limit=100', accessToken)
}

module.exports = { 
    createConnectSession, 
    createAccessToken,
    getCompany,
    getDirectory 
};