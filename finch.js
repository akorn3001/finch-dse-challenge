const FINCH_API_BASE = 'https://api.tryfinch.com';

function getBasicAuthHeader() {
    const credentials = `${process.env.FINCH_CLIENT_ID}:${process.env.FINCH_CLIENT_SECRET}`;
    return `Basic ${Buffer.from(credentials).toString('base64')}`;
}

async function createConnectSession(providerId) {
    const response = await fetch(`${FINCH_API_BASE}/connect/sessions`, {
        method: 'POST',
        headers: {
            'Authorization': getBasicAuthHeader(),
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            customer_id: 'alex-demo-customer',
            customer_name: 'Alex Demo Co',
            //Only the four products needed. This scopes the token so it cannot call /payment or /pay-statement
            products: ['company', 'directory', 'individual', 'employment'],
            redirect_uri: process.env.REDIRECT_URI,
            sandbox: 'finch',
        }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Finch returned ${response.status}: ${errorBody}`);
    }

    return response.json();
}

module.exports = { createConnectSession };