require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');

const app = express();
app.use(cookieParser());
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.send('<h1>Finch DSE Challenge</h1><p>Server is running!</p>')
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Running on http://localhost:${PORT}`);
});