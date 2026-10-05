require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');

const { PROVIDERS, providerDisplayName } = require('./providers');
const { createSession, getSession } = require('./sessions');
const { createConnectSession, createAccessToken, getCompany, getDirectory, getIndividual, getEmployment, getPayment, listBenefits } = require('./finch');
const { page, escapeHtml, renderError, renderCompany, renderDirectory, renderIndividual, renderEmployment, renderPayment, renderBenefits } = require('./render');

const app = express();
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Home page - loads hardcoded list of providers
app.get('/', (req, res) => {
    const options = PROVIDERS
        .map(p => `<option value="${p.id}">${p.display_name}</option>`)
        .join('');

    const body = `
        <h1>Connect to your provider</h1>
        <form method="POST" action="/connect">
            <label for="provider">Select your provider</label>
            <select name="provider_id" id="provider">
                ${options}
            </select>
            <button type="submit">Continue</button>
        </form>
        `;

    const html = page('Connect to your provider', body);
    res.send(html);

});

// Receives the selected provider and gets connect_url for redirection
app.post('/connect', async (req, res) => {
    const providerId = req.body.provider_id;

    try {
        const session = await createConnectSession(providerId);
        res.redirect(session.connect_url);
    } catch (error) {
        const detail = error.finchCode === 'unsupported_scopes_for_provider' ? `${providerDisplayName(providerId)} doesn't support all the data types this app requests.` : `Couldn't start a connection with ${providerDisplayName(providerId)}.`;

        res.status(502).send(page('Connection error', `
                <div class="error-box">
                    <p>${escapeHtml(detail)}</p>
                    <p class="error-detail">Try a different provider.</p>
                </div>
                <p><a href="/">Back to providers</a></p>
            `));
    }


});

// Swaps code for access token to create session
app.get('/callback', async (req, res) => {
    const code = req.query.code;

    // No code means the user cancelled, the provider rejected the login,
    // or someone hit /callback directly. Nothing to exchange.
    if (!code) {
        return res.status(400).send(page('Connection not completed', `
                <div class="error-box">
                    <p>The connection wasn't completed.</p>
                    <p class="error-detail">No authorization code was returned. This usually means the login was cancelled.</p>
                </div>
                <p><a href="/">Back to providers</a></p>
            `));
    }

    try {
        const tokenData = await createAccessToken(code);
        const sessionId = createSession({
            accessToken: tokenData.access_token,
            providerId: tokenData.provider_id,
            products: tokenData.products,
        });
        // { secure: true } deliberately omitted as it would require HTTPS, which localhost doesn't use
        // would use in production
        res.cookie('sid', sessionId, { httpOnly: true, sameSite: 'lax' });
        res.redirect('/dashboard');
    } catch (error) {
        const detail = error.status === 400 ? 'The authorization code was invalid or has already been used. Each code can only be exchanged once.' : error.status === 401 ? 'The client credentials in your .env file were rejected.' : 'Finch could not be reached to complete the connection.';

        res.status(502).send(page('Connection error', `
            <div class="error-box">
                <p>Couldn't finish connecting to your provider.</p>
                <p class="error-detail">${escapeHtml(detail)}</p>
            </div>
            <p><a href="/">Back to providers</a></p>
            `));
    }

});

// Main page which shows company and directory data
app.get('/dashboard', async (req, res) => {
    const session = getSession(req.cookies.sid);

    if (!session) {
        return res.redirect('/');
    }

    const [companyResult, directoryResult] = await Promise.allSettled([
        getCompany(session.accessToken),
        getDirectory(session.accessToken),
    ]);

    const companyBody = companyResult.status === 'fulfilled' ? renderCompany(companyResult.value) : renderError('Company', companyResult.reason, providerDisplayName(session.providerId));
    const directoryBody = directoryResult.status === 'fulfilled' ? renderDirectory(directoryResult.value) : renderError('Directory', directoryResult.reason, providerDisplayName(session.providerId));

    const body = `
    <h2>Error-handling Demos</h2>
    <p><a href="/test/payment">Test 403 errors for /payment calls</a></p>
    <p><a href="/test/benefits">Test 501 errors for /benefits calls (provider-dependent)</a></p>
    ${companyBody}
    ${directoryBody}
    `;

    const html = page('Dashboard', body);
    res.send(html);
});

// Page that shows individual and employment data for single individual
app.get('/individual/:id', async (req, res) => {
    const session = getSession(req.cookies.sid);

    if (!session) {
        return res.redirect('/');
    }
    const individualId = req.params.id;

    const [individualResult, employmentResult] = await Promise.allSettled([
        getIndividual(session.accessToken, individualId),
        getEmployment(session.accessToken, individualId),
    ]);

    const individualBody = individualResult.status === 'fulfilled' ? renderIndividual(individualResult.value.responses[0].body) : renderError('Individual', individualResult.reason, providerDisplayName(session.providerId));
    const employmentBody = employmentResult.status === 'fulfilled' ? renderEmployment(employmentResult.value.responses[0].body) : renderError('Employment', employmentResult.reason, providerDisplayName(session.providerId));

    const body = `
    ${individualBody}
    <hr>
    ${employmentBody}
    `;

    const html = page('Individual', body);

    res.send(html);
});

// Route for testing /payment call
app.get('/test/payment', async (req, res) => {
    const session = getSession(req.cookies.sid);

    if (!session) {
        return res.redirect('/');
    }

    let body;

    try {
        const paymentResult = await getPayment(session.accessToken);
        body = renderPayment(paymentResult);
    } catch (error) {
        body = renderError('Payment', error, providerDisplayName(session.providerId));
    }

    res.send(page('Payment', body));
});

// Route for testing /benefits call
app.get('/test/benefits', async (req, res) => {
    const session = getSession(req.cookies.sid);

    if (!session) {
        return res.redirect('/');
    }

    let body;

    try {
        const benefitsResult = await listBenefits(session.accessToken);
        body = renderBenefits(benefitsResult);
    } catch (error) {
        body = renderError('Benefits', error, providerDisplayName(session.providerId));
    }

    res.send(page('Benefits', body));

});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Running on http://localhost:${PORT}`);
});