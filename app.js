const express = require('express');
const fs = require('fs');

const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();
app.use(cors());
app.use(bodyParser.json());
const pg = require('pg');
const { PORT } = process.env;
const { DB_HOST } = process.env;
const { DB_USER } = process.env;
const { DB_PASS } = process.env;
const { DB_NAME } = process.env;
const { DB_PORT } = process.env;
const pgcon = new pg.Client({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASS,
    database: DB_NAME,
    port: DB_PORT
});

app.get('/data', (req, response) => {
    if (req.query.path) {
        const dataBuffer = fs.readFileSync(req.query.path);
        const dataString = dataBuffer.toString();
        if (req.query.path.includes('.json')) {
            response.send(dataString);
        } else {
            const parseString = require('xml2js').parseString;
            parseString(dataString, function (err, result) {
                const dataJSON = JSON.stringify(result);
                response.send(dataJSON);
            });
        }
    }
});

app.listen(PORT);