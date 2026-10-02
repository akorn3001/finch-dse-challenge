require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');

const { page } = require('./render');
const { createConnectSession, createAccessToken } = require('./finch');

const app = express();
app.use(cookieParser());
app.use(express.urlencoded({ extended: true}));
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

    const body =
        `<h1>Connect to your provider</h1>
        <form method="POST" action="/connect">
            <label for="provider">Select your provider</label>
            <select name="provider_id" id="provider">
                ${options}
            </select>
            <button type="submit">Continue</button>
        </form>`
        ;

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
    console.log(tokenData);
    res.send('Check your terminal');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Running on http://localhost:${PORT}`);
});