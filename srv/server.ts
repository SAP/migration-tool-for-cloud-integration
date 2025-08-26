import cds from '@sap/cds'

const { info } = cds.log('Server')

cds.on('bootstrap', (app): void => {
    app.get('/downloadDatabase', (req, res): void => {
        info('Using express hook to download DB file ...')
        res.download(`${__dirname}/../db.sqlite`)
    })
    app.get('/downloadTenants', (req, res): void => {
        info('Using express hook to download Tenants file ...')
        res.download(`${__dirname}/../db/data/migrationtool-Tenants.csv`)
    })
})

export default cds.server
