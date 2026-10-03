require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');

const { page, display, renderCompany } = require('./render');
const { createConnectSession, createAccessToken, getCompany, getDirectory } = require('./finch');
const { createSession, getSession } = require('./sessions');

const app = express();
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

const PROVIDERS = [
    {
        "id": "adp_workforce_now",
        "display_name": "ADP Workforce Now"
    },
    {
        "id": "bamboo_hr",
        "display_name": "BambooHR"
    },
    {
        "id": "sequoia_one",
        "display_name": "Sequoia One"
    },
    {
        "id": "trinet",
        "display_name": "Trinet PEO"
    }
];

// Route for home page. Loads hardcoded list of providers above, may call /providers later if time permits
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
    // secure: true deliberately omitted as it would require HTTPS, which localhost doesn't use
    // would use in production
    res.cookie('sid', sessionId, { httpOnly: true, sameSite: 'lax' });
    res.redirect('/dashboard');
});


app.get('/dashboard', async (req, res) => {
    const session = getSession(req.cookies.sid);

    if (!session) {
        return res.redirect('/');
    }
    console.log('SESSION: ', session);
    const company = await getCompany(session.accessToken);
    const directory = await getDirectory(session.accessToken)

    console.log('COMPANY: ', company);
    console.log('DIRECTORY: ', directory);

    const companyBody = renderCompany(company)

    const html = page('Dashboard', companyBody);
    res.send(html);
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Running on http://localhost:${PORT}`);
});