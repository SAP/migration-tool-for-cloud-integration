module.exports = async (srv) => {
    srv.on('READ', srv.entities.LaunchpadInfo, async (req) => {
        const settings = {
            AppVersion: process.env.npm_package_version || 'n/a',
            TileRegistration: 123,
            TileTenants: 123,
            TileTasks: 123,
            TileJobs: 123
        };
        const LaunchpadInfo = { Script: "const LaunchpadInfo = " + JSON.stringify(settings) };
        return req.reply(LaunchpadInfo);
    });
};
