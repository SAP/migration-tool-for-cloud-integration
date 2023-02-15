const cds = require('@sap/cds');

cds.on('bootstrap', (app) => {
    app.get('/downloadDatabase', (req, res) => {
        console.log('Using express hook to download DB file ...');
        res.download(`${__dirname}/../db.sqlite`);
    });
    app.get('/downloadTenants', (req, res) => {
        console.log('Using express hook to download Tenants file ...');
        res.download(`${__dirname}/../db/data/migrationtool-Tenants.csv`);
    });
})

module.exports = cds.server;