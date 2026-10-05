const FINCH_API_BASE = 'https://api.tryfinch.com';
const FINCH_API_VERSION = '2020-09-17';

const crypto = require('crypto');

class FinchError extends Error {
    constructor(status, body) {
        super(body?.message || `Finch API error ${status}`);
        this.status = status;
        this.finchCode = body?.finch_code;
        this.finchName = body?.name;
    }
} 

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
            // The four main products excluding payment endpoints, but including benefits to show 501 errors
            products: ['company', 'directory', 'individual', 'employment', 'benefits'],
            redirect_uri: process.env.REDIRECT_URI,
            sandbox: 'finch',
            integration: {
                provider: providerId,
            },
        }),
    });

    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new FinchError(response.status, errorBody);
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
        const errorBody = await response.json().catch(() => ({}));
        throw new FinchError(response.status, errorBody);
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

    if (res.status === 202) {
        throw new FinchError(202, { message: 'Data is still being synced' });
    }

    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new FinchError(res.status, body);
    }

    return res.json();
}

async function getPayment(accessToken) {
    return finchRequest('/employer/payment?start_date=2024-01-01&end_date=2024-12-31', accessToken);
}

async function listBenefits(accessToken) {
    return finchRequest('/employer/benefits', accessToken);
}

async function getCompany(accessToken) {
    return finchRequest('/employer/company', accessToken);
}

async function getDirectory(accessToken) {
    return finchRequest('/employer/directory?limit=10000', accessToken);
}

async function getIndividual(accessToken, individualId) {
    return finchRequest('/employer/individual', accessToken, {
        method: 'POST',
        body: {
            requests: [{ individual_id: individualId }]
        }
    });
}

async function getEmployment(accessToken, individualId) {
    return finchRequest('/employer/employment', accessToken, {
        method: 'POST',
        body: {
            requests: [{ individual_id: individualId }]
        }
    });
}

module.exports = { 
    createConnectSession, 
    createAccessToken,
    getCompany,
    getDirectory,
    getIndividual,
    getEmployment,
    getPayment,
    listBenefits,
};