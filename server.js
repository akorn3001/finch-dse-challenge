require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');

const { PROVIDERS, providerDisplayName } = require('./providers');
const { createSession, getSession } = require('./sessions');
const { createConnectSession, createAccessToken, getCompany, getDirectory, getIndividual, getEmployment, getPayment, listBenefits } = require('./finch');
const { page, renderError, renderCompany, renderDirectory, renderIndividual, renderEmployment, renderPayment, renderBenefits } = require('./render');

const app = express();
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Route for home page. Loads hardcoded list of providers
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

//Route which receives the selected provider
app.post('/connect', async (req, res) => {
    const providerId = req.body.provider_id;
    const session = await createConnectSession(providerId);
    res.redirect(session.connect_url);
});

app.get('/callback', async (req, res) => {
    const code = req.query.code;
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
});


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

app.get('/individual/:id', async(req,res) => {
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