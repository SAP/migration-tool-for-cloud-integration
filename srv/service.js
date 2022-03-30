const generateUUID = require('@sap/cds-foss')('uuid');
const Connectivity = require('./helpers/externalConnection');
const DownloadHelper = require('./helpers/contentDownloader');
const MigrationJobHelper = require('./helpers/migrationJob');
const MigrationTaskHelper = require('./helpers/migrationTask');
const Settings = require('./config/settings');
const assert = require('assert');
const fs = require('fs');

const { Tenants, MigrationTasks, MigrationJobs, MigrationTaskNodes, extIntegrationPackages } = cds.entities;

module.exports = async (srv) => {
    srv.after('READ', srv.entities.Tenants, each => {
        if (each.numberOfErrors > 0) {
            each.ErrorsText = each.numberOfErrors + ' errors found';
            each.ErrorsCriticality = Settings.CriticalityCodes.Red;
        } else {
            each.ErrorsText = 'No errors';
            each.ErrorsCriticality = Settings.CriticalityCodes.Green;
        }
        each.ReadOnlyText = each.ReadOnly ? 'Read only' : 'Read/Write';
    });
    srv.before('DELETE', srv.entities.Tenants, async (req) => {
        const tenant_id = req.params[0].ObjectID ? req.params[0].ObjectID : req.params[0];
        const tenant = await srv.read(Tenants, tenant_id, t => { t('*'), t.toMigrationTasks(n => n('*')) });

        tenant.toMigrationTasks.length > 0 && req.error(400, 'This tenant has ' + tenant.toMigrationTasks.length + ' migration task(s). Please delete the task(s) first, before deleting the tenant.');
    });
    srv.on('DELETE', srv.entities.Tenants, async (req, next) => {
        const tenant_id = req.params[0].ObjectID ? req.params[0].ObjectID : req.params[0];
        const tasks = await srv.read(MigrationTasks).where({ TargetTenant_ObjectID: tenant_id });
        console.log(tasks);
        tasks.length > 0 && await srv.update(MigrationTasks).with({ TargetTenant_ObjectID: null }).where({ TargetTenant_ObjectID: tenant_id });
        return next();
    });
    srv.on('Tenant_testConnection', async (req) => {
        const tenant_id = req.params[0].ObjectID ? req.params[0].ObjectID : req.params[0];
        const tenant = await srv.read(Tenants, tenant_id);

        const caller = new Connectivity.ExternalConnection(tenant);
        await caller.refreshToken();
        const success = await caller.pingTenant() ? true : false;
        success ? req.notify(200, 'Connection test successful for ' + tenant.Name) : req.warn(400, 'Unsuccessful.');
        return success;
    });
    srv.on('Tenant_getIntegrationContent', async (req) => {
        const tenant_id = req.params[0].ObjectID ? req.params[0].ObjectID : req.params[0];
        const Tenant = await srv.read(Tenants, tenant_id);

        assert(req._emitter, 'No EventEmitter present in Request object. Please use Node v14.5 or higher.');
        req._emitter.setMaxListeners(0);

        const downloader = new DownloadHelper.ContentDownloader(Tenant)
        const count = await downloader.getIntegrationContent();
        req.notify(201, 'Integration Content of ' + Tenant.Name + ' has been refreshed with ' + count + ' items.');

        console.log('Updating migration tasks that have this tenant either as source or as target ...');
        const AffectedTasks = await srv.read(MigrationTasks, t => { t('*'), t.toTaskNodes(n => n('*')), t.SourceTenant(o => o('*')) })
            .where({ SourceTenant_ObjectID: tenant_id, or: { TargetTenant_ObjectID: tenant_id } });
        for (let Task of AffectedTasks) {
            const migrationTask = new MigrationTaskHelper.MigrationTask(Task);
            const errorList = await migrationTask.updateExistInTenantFlags();
            console.log('- Task ' + Task.Name + ' has ' + errorList.length + ' issues.');
            if (errorList.length > 0) {
                const errorText = errorList.map(x => '- ' + x).join('\r\n');
                req.warn(200, 'Task ' + Task.Name + ' from tenant ' + Task.SourceTenant.Name + ' has issues.\r\n' +
                    '\r\n' +
                    'The migration task has been updated to reflect the available content, but ' + errorList.length + ' of the items selected to be in scope of this task is no longer available on the source tenant:\r\n' +
                    errorText + '\r\n' +
                    '\r\n' +
                    'Please open the migration task and switch the item(s) to \'skip\'.'
                );
            } else {
                req.notify(200, 'Task ' + Task.Name + ' from tenant ' + Task.SourceTenant.Name + ' has been updated to reflect the available content.');
            }
        }
        console.log('Done.');

        return await srv.read(Tenants, tenant_id);
    });
    srv.on('Package_analyzeScriptFiles', async (req) => {
        const tenant_id = req.params[0].ObjectID ? req.params[0].ObjectID : req.params[0];
        const package_id = req.params[1];
        const Tenant = await srv.read(Tenants, tenant_id);
        const Package = await srv.read(extIntegrationPackages, package_id);

        const downloader = new DownloadHelper.ContentDownloader(Tenant);
        const result = await downloader.downloadPackageAndSearchForEnvVars(req, Package);
        if (result) {
            resultTextFound = result.filter(x => x.count > 0).map(x => '- ' + x.artifact + ': ' + x.file + ' = ' + x.count + ' occurrences').join('\r\n') || '(none)';
            resultTextNotFound = result.filter(x => x.count == 0).map(x => '- ' + x.artifact + ': ' + x.file).join('\r\n') || '(none)';
            resultTextError = result.filter(x => x.count == -1).map(x => '- ' + x.artifact + ': ' + x.file).join('\r\n') || '';
            if (result.length == 0) {
                req.info(200, 'No script files in package "' + Package.Name + '"');
            } else {
                req.info(200, 'Script files in package "' + Package.Name + '" have been analyzed for their usage of environment variables. ' +
                    'Scripts that use these need to be updated after migration to Cloud Foundry. Environment variables are accessed via "System.getenv()".\r\n' +
                    '\r\n' +
                    'Scripts that contain Environment Variables:\r\n' +
                    resultTextFound + '\r\n' +
                    '\r\n' +
                    'Scripts without Environment Variables:\r\n' +
                    resultTextNotFound + '\r\n' +
                    (resultTextError.length > 0 ?
                        ('\r\nArtifacts which could not be analyzed:\r\n' + resultTextError) : '')
                );
            }
        }
        return result;
    });
    srv.on('Tenant_createNewMigrationTask', async (req) => {
        const tenant_id = req.params[0].ObjectID ? req.params[0].ObjectID : req.params[0];

        const TenantStats = await srv.read(Tenants, tenant_id, t => {
            t('Statistics_numIntegrationPackages'),
                t('Statistics_numKeyStoreEntries'),
                t('Statistics_numUserCredentials'),
                t('Statistics_numCustomTagConfigurations'),
                t('Statistics_numNumberRanges'),
                t('Statistics_numOAuth2ClientCredentials'),
                t('Statistics_numAccessPolicies')
        });
        const countItems = Object.keys(TenantStats).reduce((p, c) => p + TenantStats[c], 0);
        countItems == 0 && req.error(400, 'No content downloaded yet. Please click on \'Get Integration Content\' first before creating a Migration Task');

        const uuid = generateUUID.v4();
        const newTask = await srv.create(MigrationTasks, {
            ObjectID: uuid,
            Name: req.data.Name,
            Description: req.data.Description,
            SourceTenant_ObjectID: tenant_id,
            TargetTenant_ObjectID: req.data.TargetTenant,
        });

        const Task = await srv.read(MigrationTasks, uuid, t => { t('*'), t.toTaskNodes(n => n('*')) });
        const migrationTask = new MigrationTaskHelper.MigrationTask(Task);
        await migrationTask.generateTaskNodes(req.data.Preset);

        req.notify(201, 'Migration Task created.');
        return Task;
    });
    srv.on('Tenant_export', async (req) => {
        const TenantList = await srv.read(Tenants);
        const headers = 'ObjectID;Name;Host;Token_host;Oauth_clientid;Oauth_secret;Role;Environment;ReadOnly';
        const content = [headers];
        for (const t of TenantList) {
            content.push([
                t.ObjectID,
                t.Name,
                t.Host,
                t.Token_host,
                t.Oauth_clientid,
                t.Oauth_secret,
                t.Role,
                t.Environment,
                t.ReadOnly
            ].join(';'));
        }
        fs.writeFileSync('db/data/migrationtool-Tenants.csv', content.join('\r\n'));
        req.notify(201, 'CSV created: ' + TenantList.length + ' registration(s) exported.');
    });

    srv.after('READ', srv.entities.MigrationTasks, async (tasks, req) => {
        const taskList = Array.isArray(tasks) ? tasks : [tasks];
        for (const t of taskList) {
            const status = await SELECT.one.from(MigrationJobs).where({ 'MigrationTaskID': t.ObjectID }).orderBy('StartTime desc').columns(['Status', 'StatusCriticality']);
            if (status) {
                t.LastStatus = status.Status;
                t.LastStatusCriticality = status.StatusCriticality;
            } else {
                t.LastStatus = 'No executions yet';
                t.LastStatusCriticality = Settings.CriticalityCodes.Orange;
            }
            const nodes = await srv.read(MigrationTaskNodes).where({ 'toMigrationTask_ObjectID': t.ObjectID }).columns(['Component', 'Included', 'ConfigureOnly']);
            t.Statistics_numIntegrationPackages = nodes.filter(x => x.Included && (
                x.Component == Settings.ComponentNames.Package
            )).length;
            t.Statistics_numSecurityArtifacts = nodes.filter(x => x.Included && (
                x.Component == Settings.ComponentNames.KeyStoreEntry ||
                x.Component == Settings.ComponentNames.Credentials ||
                x.Component == Settings.ComponentNames.OAuthCredential ||
                x.Component == Settings.ComponentNames.AccessPolicy
            )).length;
            t.Statistics_numOtherArtifacts = nodes.filter(x => x.Included && (
                x.Component == Settings.ComponentNames.NumberRange ||
                x.Component == Settings.ComponentNames.CustomTags ||
                x.Component == Settings.ComponentNames.JMSBrokers ||
                x.Component == Settings.ComponentNames.Variables
            )).length;
        }
    });
    srv.before('SAVE', srv.entities.MigrationTasks, req => {
        const customConfig = req.data.CustomConfig;
        if (customConfig) {
            try { JSON.parse(customConfig) }
            catch (e) { req.reject(400, 'Validation of the custom configuration failed. Please verify you express valid JSON content.\r\n\r\n' + e.message) }
        }
    });
    srv.after('READ', srv.entities.MigrationTaskNodes, each => {
        if (each.ExistInSource) {
            each.Status = each.Included ? Settings.CriticalityCodes.Green : Settings.CriticalityCodes.Default;
        } else {
            each.Status = Settings.CriticalityCodes.Red;
        }

        each.IncludedText = each.Included ? 'Include' : 'Skip';
        each.flagCanConfigure = each.Included && (each.Component == Settings.ComponentNames.Package);
        if (each.Component == Settings.ComponentNames.Package) {
            each.ConfigureOnlyText = each.ConfigureOnly ? 'Configuration only' : 'Full copy with variables';
        } else {
            each.ConfigureOnlyText = 'Default';
        }

        each.ExistInSourceCriticality = each.ExistInSource ? Settings.CriticalityCodes.Green : Settings.CriticalityCodes.Red;
        each.ExistInTargetCriticality = each.ExistInTarget ? Settings.CriticalityCodes.Green : Settings.CriticalityCodes.Blue;
        each.IncludedCriticality = each.Included ? each.Status : Settings.CriticalityCodes.Default;
        each.ConfigureOnlyCriticality = Settings.CriticalityCodes.Default;
    });
    srv.on('Nodes_SkipSelected', async (req) => {
        const nodeId = {
            ObjectID: req.params[1].ObjectID,
            toMigrationTask_ObjectID: req.params[1].toMigrationTask_ObjectID
        };
        await srv.update(MigrationTaskNodes, nodeId).with({ 'Included': false, 'ConfigureOnly': false });
    });
    srv.on('Nodes_IncludeSelected', async (req) => {
        const nodeId = {
            ObjectID: req.params[1].ObjectID,
            toMigrationTask_ObjectID: req.params[1].toMigrationTask_ObjectID
        };
        await srv.update(MigrationTaskNodes, nodeId).with({ 'Included': true });
    });
    srv.on('Nodes_ConfigurePackage', async (req) => {
        const nodeId = {
            ObjectID: req.params[1].ObjectID,
            toMigrationTask_ObjectID: req.params[1].toMigrationTask_ObjectID
        };
        const Node = await srv.read(MigrationTaskNodes, nodeId);
        await srv.update(MigrationTaskNodes, nodeId).with({ 'ConfigureOnly': !Node.ConfigureOnly });

        if (!Node.ConfigureOnly) {
            const children = await srv.read(MigrationTaskNodes)
                .where([
                    { ref: ['toMigrationTask_ObjectID'] }, '=', { val: Node.toMigrationTask_ObjectID },
                    'and',
                    { ref: ['PackageId'] }, '=', { val: Node.Id }
                ]);
            const resultTextFlows = children.filter(x => x.Component == Settings.ComponentNames.Flow).map(x => '- ' + x.Name).join('\r\n') || 'none';
            const resultTextValmaps = children.filter(x => x.Component == Settings.ComponentNames.ValMap).map(x => '- ' + x.Name).join('\r\n') || 'none';

            req.info(200, 'This package contains the following items which are now configured for \'Configuration Only\':\r\n' +
                '\r\n' +
                'Artifacts:\r\n' +
                resultTextFlows + '\r\n' +
                '\r\n' +
                'Value Mappings:\r\n' +
                resultTextValmaps
            );
        }
    });
    srv.on('Task_startMigration', async (req) => {
        const task_id = req.params[0].ObjectID ? req.params[0].ObjectID : req.params[0];
        const Task = await srv.read(MigrationTasks, task_id, t => { t.TargetTenant(n => n('*')) });

        if (Task.TargetTenant === null)
            req.error('No target tenant has been defined.\r\n\r\nPlease select a target tenant via \'Change Target ...\'.');
        else {
            const job_id = generateUUID.v4();
            await srv.create(MigrationJobs,
                {
                    ObjectID: job_id,
                    MigrationTaskID: task_id,
                    StartTime: new Date().toISOString(),
                    Status: 'Pending start',
                    StatusCriticality: Settings.CriticalityCodes.Orange,
                    EndTime: null
                }
            );
            const Job = await srv.read(MigrationJobs, job_id);
            const myJob = new MigrationJobHelper.MigrationJob(Job);

            myJob.execute();
            req.notify(200, 'Job started ...');

            return Job;
        }
    });
    srv.on('Task_resetTaskNodes', async (req) => {
        const task_id = req.params[0].ObjectID ? req.params[0].ObjectID : req.params[0];

        const Task = await srv.read(MigrationTasks, task_id, t => { t('*'), t.toTaskNodes(n => n('*')) });
        const migrationTask = new MigrationTaskHelper.MigrationTask(Task);
        await migrationTask.resetTaskNodes(req.data.Preset);

        req.notify(200, 'Migration Task items reset.');
    });
    srv.on('Task_setTargetTenant', async (req) => {
        const task_id = req.params[0].ObjectID ? req.params[0].ObjectID : req.params[0];
        await srv.update(MigrationTasks, task_id).with({ 'TargetTenant_ObjectID': req.data.TargetTenant });

        const Task = await srv.read(MigrationTasks, task_id, t => { t('*'), t.toTaskNodes(n => n('*')) });
        const migrationTask = new MigrationTaskHelper.MigrationTask(Task);
        await migrationTask.updateExistInTenantFlags();
    });
    srv.on('Task_refreshJobsTable', req => { }); //empty function, but triggers side effect to refresh the table
    srv.on('READ', 'LaunchpadInfo', async (req) => {
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
