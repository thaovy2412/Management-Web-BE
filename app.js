const express = require('express');
const fs = require('fs');

const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();
app.use(cors());
app.use(bodyParser.json());
const pg = require('pg');
const { request } = require('http');
const { response } = require('express');
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

app.get('/api/commit', (request, response) => {
    if (request.query.check) {
        if (request.query.check === 'start') {
            pgcon.connect(error => {
                pgcon.query(`INSERT INTO datareporting (commitid,status,zap_baseline,zap_quickscan,sonarqube,trivy,gitleaks) VALUES ('${request.query.id}','running','running','running','running','running','running')`, (err, res) => {
                    if (err) {
                        response.send(err.message);
                    } else {
                        response.send('Started');
                    }
                });
            })
        } else {
            pgcon.connect(error => {
                pgcon.query(`SELECT * FROM datareporting WHERE commitid='${request.query.id}'`, (err, res) => {
                    if (err) {
                        response.send(err.message);
                    } else {
                        const data = res.rows[0];
                        if (data.zap_baseline === 'fail' | data.zap_quickscan === 'fail' | data.sonarqube === 'fail' | data.trivy === 'fail' | data.gitleaks === 'fail') {
                            pgcon.query(`UPDATE datareporting SET status='fail' WHERE commitid = '${request.query.id}'`, (err, res) => {
                                if (err) {
                                    response.send(err.message);
                                } else {
                                    response.send('Updated Status (FAIL)');
                                }
                            });
                        } else {
                            pgcon.query(`UPDATE datareporting SET status='pass' WHERE commitid = '${request.query.id}'`, (err, res) => {
                                if (err) {
                                    response.send(err.message);
                                } else {
                                    response.send('Updated Status (PASS)');
                                }
                            });
                        }
                    }
                });
            })
        }

    } else {
        pgcon.connect(error => {
            pgcon.query(`UPDATE datareporting SET ${request.query.tool}='${request.query.status}' WHERE commitid = '${request.query.id}'`, (err, res) => {
                if (err) {
                    response.send(err.message);
                } else {
                    response.send('Updated Status Tool');
                }
            });
        })
    }
});

app.get('/datareport', (request, response) => {
    pgcon.connect(error => {
        pgcon.query(`SELECT * FROM datareporting`, (err, res) => {
            if (err) {
                response.send(err.message);
            } else {
                response.send(res.rows);
            }
        });
    })
});

app.get('/detailreport', (request, response) => {
    let path = '';
    if (!request.query.tool) {
        return;
    } else {
        if (request.query.tool === 'zap-quickscan') {
            path = `/home/reports/${request.query.commitid}-${request.query.tool}.xml`;
        } else {
            path = `/home/reports/${request.query.commitid}-${request.query.tool}.json`;
        }
    }
    const dataBuffer = fs.readFileSync(path);
    const dataString = dataBuffer.toString();
    if (path.includes('.json')) {
        response.send(dataString);
    } else {
        const parseString = require('xml2js').parseString;
        parseString(dataString, function (err, result) {
            const dataJSON = JSON.stringify(result);
            response.send(dataJSON);
        });
    }
})

app.listen(PORT);