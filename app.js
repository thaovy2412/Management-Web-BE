const express = require("express");
const app = express();

const fs = require("fs");
const moment = require('moment-timezone');
const cors = require("cors");
const bodyParser = require("body-parser");

app.use(cors());
app.use(bodyParser.json());
const { request } = require("http");
const { response } = require("express");


require("dotenv").config();
const { DB_HOST } = process.env;
const { DB_USER } = process.env;
const { DB_PASS } = process.env;
const { DB_NAME } = process.env;
const { DB_PORT } = process.env;
const pg = require("pg");
const pgcon = new pg.Client({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASS,
    database: DB_NAME,
    port: DB_PORT,
});

const { PORT } = process.env;

app.get("/api/commit", (request, response) => {
    console.log('Request: ', request.url);
    if (request.query.check) {
        if (request.query.check === "start") {
            let date = moment();
            let dateClone = date.tz('Asia/Ho_Chi_Minh').format();
            pgcon.connect((error) => {
                if (error) {
                    console.log('Error connect DB: ', error.message);
                } else {
                    console.log('Connected to the database');
                }
                pgcon.query(
                    `INSERT INTO datareporting (commitid,date,status,zap_baseline,zap_quickscan,sonarqube,trivy,gitleaks) VALUES ('${request.query.id}','${dateClone}','running','running','running','running','running','running')`,
                    (err, res) => {
                        if (err) {
                            console.log('Error SQL: ', err.message);
                            response.send(err.message);
                        } else {
                            console.log('Response SQL: ', res);
                            response.sendStatus(200);
                        }
                    }
                );
            });
        } else {
            pgcon.connect((error) => {
                if (error) {
                    console.log('Error connect DB: ', error.message);
                } else {
                    console.log('Connected to the database');
                }
                pgcon.query(
                    `SELECT * FROM datareporting WHERE commitid='${request.query.id}'`,
                    (err, res) => {
                        if (err) {
                            console.log('Error SQL: ', err.message);
                            response.send(err.message);
                        } else {
                            const data = res.rows[0];
                            if (
                                (data.zap_baseline === "fail") |
                                (data.zap_quickscan === "fail") |
                                (data.sonarqube === "fail") |
                                (data.trivy === "fail") |
                                (data.gitleaks === "fail")
                            ) {
                                pgcon.query(
                                    `UPDATE datareporting SET status='fail' WHERE commitid = '${request.query.id}'; 
                                    UPDATE datareporting SET zap_baseline='skip' WHERE zap_baseline='running';
                                    UPDATE datareporting SET zap_quickscan='skip' WHERE zap_quickscan='running';
                                    UPDATE datareporting SET sonarqube='skip' WHERE sonarqube='running';
                                    UPDATE datareporting SET trivy='skip' WHERE trivy='running';
                                    UPDATE datareporting SET gitleaks='skip' WHERE gitleaks='running'
                                    `,
                                    (err, res) => {
                                        if (err) {
                                            console.log('Error SQL: ', err.message);
                                            response.send(err.message);
                                        } else {
                                            console.log('Response SQL: ', res);
                                            response.sendStatus(200);
                                        }
                                    }
                                );
                            } else {
                                pgcon.query(
                                    `UPDATE datareporting SET status='pass' WHERE commitid = '${request.query.id}'`,
                                    (err, res) => {
                                        if (err) {
                                            console.log('Error SQL: ', err.message);
                                            response.send(err.message);
                                        } else {
                                            console.log('Response SQL: ', res);
                                            response.sendStatus(200);
                                        }
                                    }
                                );
                            }
                        }
                    }
                );
            });
        }
    } else {
        pgcon.connect((error) => {
            if (error) {
                console.log('Error connect DB: ', error.message);
            } else {
                console.log('Connected to the database');
            }
            pgcon.query(
                `UPDATE datareporting SET ${request.query.tool}='${request.query.status}' WHERE commitid = '${request.query.id}'`,
                (err, res) => {
                    if (err) {
                        console.log('Error SQL: ', err.message);
                        response.send(err.message);
                    } else {
                        console.log('Response SQL: ', res);
                        response.sendStatus(200);
                    }
                }
            );
        });
    }
});

app.get("/datareport", (request, response) => {
    console.log('Request', request.url);
    pgcon.connect((error) => {
        if (error) {
            console.log('Error connect DB: ', error.message);
        } else {
            console.log('Connected to the database');
        }
        pgcon.query(`SELECT * FROM datareporting`, (err, res) => {
            if (err) {
                console.log('Error SQL: ', err.message);
                response.send(err.message);
            } else {
                console.log('Response SQL: ', res);
                console.log('Response Data: ', res.rows);
                response.status(200).send(res.rows);
            }
        });
    });
});

app.get("/detailreport", (request, response) => {
    console.log('Request: ', request.url);
    let path = "";
    if (!request.query.tool) {
        return;
    } else {
        if (request.query.tool === "zap-quickscan") {
            path = `/home/reports/${request.query.commitid}-${request.query.tool}.xml`;
        } else {
            path = `/home/reports/${request.query.commitid}-${request.query.tool}.json`;
        }
    }
    const dataBuffer = fs.readFileSync(path);
    const dataString = dataBuffer.toString();
    if (path.includes(".json")) {
        console.log('Response Data: ', dataString);
        response.status(200).send(dataString);
    } else {
        const parseString = require("xml2js").parseString;
        parseString(dataString, function (err, result) {
            const dataJSON = JSON.stringify(result);
            console.log('Response Data: ', dataJSON);
            response.status(200).send(dataJSON);
        });
    }
});

app.get("/search", (request, response) => {
    pgcon.connect((error) => {
        pgcon.query(`SELECT * FROM datareporting WHERE commitid LIKE any (array['${request.query.key}%','%${request.query.key}%','%${request.query.key}']) `, (err, res) => {
            if (err) {
                response.send(err.message);
            } else {
                response.status(200).send(res.rows);
            }
        });
    });
})

app.get("/chart", (request, response) => {
    pgcon.connect((error) => {
        pgcon.query(`SELECT date::date, count(*) filter (where status = 'fail') as fail, count(*) filter (where status = 'pass') as pass from datareporting where extract(days from (current_timestamp - date))<6 and extract(days from (current_timestamp - date))>=0 group by date::date`, (err, res) => {
            if (err) {
                response.send(err.message);
            } else {
                response.status(200).send(res.rows);
            }
        });
    });
})

app.listen(PORT);
