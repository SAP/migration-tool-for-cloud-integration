const generateUUID = require('node:crypto').randomUUID;
const Connectivity = require('./helpers/externalConnection');
const DownloadHelper = require('./helpers/contentDownloader');
const MigrationJobHelper = require('./helpers/migrationJob');
const MigrationTaskHelper = require('./helpers/migrationTask');
const Settings = require('./config/settings');
const assert = require('assert');

const Entities = cds.entities('migrationtool');

module.exports = async (srv) => {
    var IntegrationContentStatus = {};
    srv.on('getIntegrationContentStatus', req => {
        return {
            Running: IntegrationContentStatus.Running,
            Tenant: IntegrationContentStatus.Tenant,
            Progress: Math.floor(IntegrationContentStatus.Progress),
            Topic: IntegrationContentStatus.Topic,
            Item: IntegrationContentStatus.Item
        }
    });
    srv.after('READ', srv.entities.Tenants, each => {
        if (each.NumberOfErrors > 0) {
            each.ErrorsText = each.NumberOfErrors + ' errors found';
            each.ErrorsCriticality = Settings.CriticalityCodes.Red;
        } else {
            each.ErrorsText = 'No errors';
            each.ErrorsCriticality = Settings.CriticalityCodes.Green;
        }
        each.ReadOnlyText = each.ReadOnly ? 'Read only' : 'Read-Write';
    });
    srv.on('Tenant_testConnection', async (req) => {
        const tenant_id = req.params[0].ObjectID ? req.params[0].ObjectID : req.params[0];
        const tenant = await srv.read(Entities.Tenants, tenant_id);

        const caller = new Connectivity.ExternalConnection(tenant);

        await caller.refreshIntegrationToken();
        var success = await caller.pingIntegrationTenant() ? true : false;
        success ? req.notify(200, 'Integration Tenant Connection test successful for ' + tenant.Name) : req.warn(400, 'Integration Tenant Connection test unsuccessful for ' + tenant.Name);

        if (tenant.UseForCertificateUserMappings) {
            await caller.refreshPlatformToken();
            success = success && await caller.pingPlatformTenant() ? true : false;
            success ? req.notify(200, 'Platform Account Connection test successful for ' + tenant.Name) : req.warn(400, 'Platform Account Connection test unsuccessful for ' + tenant.Name);

            success = success && await caller.testPlatformSettings() ? true : false;
            success ? req.notify(200, 'Validating Platform Settings successful for ' + tenant.Name) : req.warn(400, ' Validating Platform Settings unsuccessful for ' + tenant.Name);
        }

        return success;
    });
    srv.on('Tenant_getIntegrationContentRefresh', req => { }); //empty function, but triggers side effect to refresh the page
    srv.on('Tenant_getIntegrationContent', async (req) => {
        const tenant_id = req.params[0].ObjectID ? req.params[0].ObjectID : req.params[0];
        const Tenant = await srv.read(Entities.Tenants, tenant_id);

        IntegrationContentStatus = {
            Running: true,
            Tenant: Tenant.Name,
            Progress: 0,
            Topic: 'Initializing',
            Item: ''
        };

        // assert(req._emitter, 'No EventEmitter present in Request object. Please use Node v14.5 or higher.');
        // req._emitter.setMaxListeners(0);
        req.http.req.setMaxListeners(0);

        const downloader = new DownloadHelper.ContentDownloader(Tenant, IntegrationContentStatus)
        downloader.getIntegrationContent()
            .then(async (count) => {
                IntegrationContentStatus.Topic = `Integration Content has been refreshed with ${count} items.`;
                IntegrationContentStatus.Item = '';

                console.log('Updating migration tasks that have this tenant either as source or as target ...');
                const AffectedTasks = await srv.read(Entities.MigrationTasks, t => { t('*'), t.toTaskNodes(n => n('*')), t.SourceTenant(o => o('*')) })
                    .where({ SourceTenant_ObjectID: tenant_id, or: { TargetTenant_ObjectID: tenant_id } });
                for (let Task of AffectedTasks) {
                    const migrationTask = new MigrationTaskHelper.MigrationTask(Task);
                    const errorList = await migrationTask.updateExistInTenantFlags();
                    console.log('- Task ' + Task.Name + ' has ' + errorList.length + ' issues.');
                    if (errorList.length > 0) {
                        const errorText = errorList.map(x => '- ' + x).join('\r\n');
                        IntegrationContentStatus.Item += `Task ${Task.Name} has been updated to reflect the available content, but ${errorList.length} of the items selected to be in scope of this task are no longer available on the source tenant:\r\n${errorText}\r\n\r\nPlease open the migration task and switch the item(s) to 'skip'.\r\n`
                    } else {
                        IntegrationContentStatus.Item += `Task ${Task.Name} has been updated to reflect the available content.\r\n`
                    }
                }
                IntegrationContentStatus.Running = false;
                console.log('Done.');
            })
            .catch(e => req.error(400, e));
    });
    srv.on('Package_analyzeScriptFiles', async (req) => {
        const tenant_id = req.params[0].ObjectID ? req.params[0].ObjectID : req.params[0];
        const package_id = req.params[1];
        const Tenant = await srv.read(Entities.Tenants, tenant_id);
        const Package = await srv.read(Entities.extIntegrationPackages, package_id);

        const downloader = new DownloadHelper.ContentDownloader(Tenant);
        const packageContent = await downloader.downloadPackage(req, Package);
        const result = packageContent && await downloader.searchForEnvVarsInPackage(packageContent);
        if (result) {
            resultTextFound = result.filter(x => x.count > 0).map(x => '- ' + x.artifact + ': ' + x.file + ' = ' + x.count + ' occurrences').join('<br/>') || '(none)';
            resultTextNotFound = result.filter(x => x.count == 0).map(x => '- ' + x.artifact + ': ' + x.file).join('<br/>') || '(none)';
            resultTextError = result.filter(x => x.count == -1).map(x => '- ' + x.artifact + ': ' + x.file).join('<br/>') || '';
            if (result.length == 0) {
                req.info(200, 'No script files in package "' + Package.Name + '"');
            } else {
                req.info(200, 'Script files in package "' + Package.Name + '" have been analyzed for their usage of environment variables. ' +
                    'Scripts that use these need to be updated after migration to Cloud Foundry. Environment variables are accessed via "System.getenv()".<br/>' +
                    '<br/>' +
                    'Scripts that contain Environment Variables:<br/>' +
                    resultTextFound + '<br/>' +
                    '<br/>' +
                    'Scripts without Environment Variables:<br/>' +
                    resultTextNotFound + '<br/>' +
                    (resultTextError.length > 0 ?
                        ('<br/>Artifacts which could not be analyzed:<br/>' + resultTextError) : '')
                );
            }
        }
        return result;
    });
    srv.on('Tenant_createNewMigrationTask', async (req) => {
        const tenant_id = req.params[0].ObjectID ? req.params[0].ObjectID : req.params[0];

        const TenantStats = await srv.read(Entities.Tenants, tenant_id, t => {
            t('Statistics_numIntegrationPackages'),
                t('Statistics_numKeyStoreEntries'),
                t('Statistics_numUserCredentials'),
                t('Statistics_numCustomTagConfigurations'),
                t('Statistics_numNumberRanges'),
                t('Statistics_numOAuth2ClientCredentials'),
                t('Statistics_numAccessPolicies'),
                t('Statistics_numVariables'),
                t('Statistics_numCertificateUserMappings'),
                t('Statistics_numDataStores')
        });

        const countItems = Object.keys(TenantStats).reduce((p, c) => p + TenantStats[c], 0);
        countItems == 0 && req.error(400, 'No content downloaded yet. Please click on \'Get Integration Content\' first before creating a Migration Task');

        const uuid = generateUUID();
        const newTask = await srv.create(Entities.MigrationTasks, {
            ObjectID: uuid,
            Name: req.data.Name,
            Description: req.data.Description,
            SourceTenant_ObjectID: tenant_id,
            TargetTenant_ObjectID: req.data.TargetTenant,
        });

        const Task = await srv.read(Entities.MigrationTasks, newTask.ObjectID, t => { t('*'), t.toTaskNodes(n => n('*')) });
        const migrationTask = new MigrationTaskHelper.MigrationTask(Task);
        await migrationTask.generateTaskNodes(req.data.Preset);

        req.notify(201, 'Migration Task created.');
        return Task;
    });
    srv.after('READ', [srv.entities.IntegrationPackages, srv.entities.IntegrationDesigntimeArtifacts], each => {
        each.Criticality = each.NumberOfErrors > 0 ? Settings.CriticalityCodes.Orange : Settings.CriticalityCodes.Default;
    });
    srv.after('READ', srv.entities.CertificateUserMappings, each => {
        each.ValidUntilCriticality = new Date(each.ValidUntil) < Date.now() ? Settings.CriticalityCodes.Red : Settings.CriticalityCodes.Green;
    });

    srv.after('READ', [srv.entities.MigrationTasks, srv.entities.MigrationTasks.drafts], async (tasks, req) => {
        const taskList = Array.isArray(tasks) ? tasks : [tasks];
        for (const t of taskList) {
            const status = await SELECT.one.from(Entities.MigrationJobs).where({ 'MigrationTaskID': t.ObjectID }).orderBy('StartTime desc').columns(['Status', 'StatusCriticality']);
            if (status) {
                t.LastStatus = status.Status;
                t.LastStatusCriticality = status.StatusCriticality;
            } else {
                t.LastStatus = 'No executions yet';
                t.LastStatusCriticality = Settings.CriticalityCodes.Orange;
            }
            const nodes = await srv.read(Entities.MigrationTaskNodes).where({ 'toMigrationTask_ObjectID': t.ObjectID }).columns(['Component', 'Included', 'ConfigureOnly']);
            t.Statistics_numIntegrationPackages = nodes.filter(x => x.Included && (
                x.Component == Settings.ComponentNames.Package
            )).length;
            t.Statistics_numSecurityArtifacts = nodes.filter(x => x.Included && (
                x.Component == Settings.ComponentNames.KeyStoreEntry ||
                x.Component == Settings.ComponentNames.Credentials ||
                x.Component == Settings.ComponentNames.OAuthCredential ||
                x.Component == Settings.ComponentNames.AccessPolicy ||
                x.Component == Settings.ComponentNames.CertificateUserMappings
            )).length;
            t.Statistics_numOtherArtifacts = nodes.filter(x => x.Included && (
                x.Component == Settings.ComponentNames.NumberRange ||
                x.Component == Settings.ComponentNames.CustomTags ||
                x.Component == Settings.ComponentNames.JMSBrokers ||
                x.Component == Settings.ComponentNames.Variables ||
                x.Component == Settings.ComponentNames.DataStores
            )).length;
        }
    });
    srv.before('SAVE', srv.entities.MigrationTasks, req => {
        const customConfig = req.data.CustomConfig;
        if (customConfig) {
            try { JSON.parse(customConfig) }
            catch (e) { req.reject(400, 'Validation of the custom configuration failed. Please verify you express valid JSON content.<br/><br/>' + e.message) }
        }
    });
    srv.after('READ', [srv.entities.MigrationTaskNodes, srv.entities.MigrationTaskNodes.drafts], each => {
        if (each.ExistInSource) {
            each.Status = each.Included ? Settings.CriticalityCodes.Green : Settings.CriticalityCodes.Default;
        } else {
            each.Status = Settings.CriticalityCodes.Red;
        }

        each.IncludedText = each.Included ? 'Include' : 'Skip';
        each.flagCanConfigure = each.Included && (each.Component == Settings.ComponentNames.Package);
        if (each.Included) {
            if (each.Component == Settings.ComponentNames.Package) {
                each.ConfigureOnlyText = each.ConfigureOnly ? 'Configuration only' : 'Full copy with variables';
            } else {
                each.ConfigureOnlyText = 'Default';
            }
        } else each.ConfigureOnlyText = '' // CDS 7 -> virtual fields do not have a default null value

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
        await srv.update(Entities.MigrationTaskNodes, nodeId).with({ 'Included': false, 'ConfigureOnly': false });
    });
    srv.on('Nodes_IncludeSelected', async (req) => {
        const nodeId = {
            ObjectID: req.params[1].ObjectID,
            toMigrationTask_ObjectID: req.params[1].toMigrationTask_ObjectID
        };
        await srv.update(Entities.MigrationTaskNodes, nodeId).with({ 'Included': true });
    });
    srv.on('Nodes_ConfigurePackage', async (req) => {
        const nodeId = {
            ObjectID: req.params[1].ObjectID,
            toMigrationTask_ObjectID: req.params[1].toMigrationTask_ObjectID
        };
        const Node = await srv.read(Entities.MigrationTaskNodes, nodeId);
        await srv.update(Entities.MigrationTaskNodes, nodeId).with({ 'ConfigureOnly': !Node.ConfigureOnly });

        if (!Node.ConfigureOnly) {
            const children = await srv.read(Entities.MigrationTaskNodes)
                .where([
                    { ref: ['toMigrationTask_ObjectID'] }, '=', { val: Node.toMigrationTask_ObjectID },
                    'and',
                    { ref: ['PackageId'] }, '=', { val: Node.Id }
                ]);
            const resultTextFlows = children.filter(x => x.Component == Settings.ComponentNames.Flow).map(x => '- ' + x.Name).join('<br/>') || 'none';
            const resultTextValmaps = children.filter(x => x.Component == Settings.ComponentNames.ValMap).map(x => '- ' + x.Name).join('<br/>') || 'none';

            req.info(200, 'This package contains the following items which are now configured for \'Configuration Only\':<br/>' +
                '<br/>' +
                'Artifacts:<br/>' +
                resultTextFlows + '<br/>' +
                '<br/>' +
                'Value Mappings:<br/>' +
                resultTextValmaps
            );
        }
    });
    srv.on('Task_startMigration', async (req) => {
        try {
            const task_id = req.params[0].ObjectID ? req.params[0].ObjectID : req.params[0];
            const Task = await srv.read(Entities.MigrationTasks, task_id, t => {
                t.SourceTenant(n => { n('Name'), n('UseForCertificateUserMappings'), n('Environment') }),
                    t.TargetTenant(n => { n('Name'), n('UseForCertificateUserMappings'), n('Environment') }),
                    t.toTaskNodes(n => { n('ObjectID'), n('Component') }).where({ 'Included': true })
            });
            assert(Task.TargetTenant !== null, 'No target tenant has been defined.<br/><br/>Please select a target tenant via \'Change Target ...\'.');
            assert(Task.toTaskNodes.length > 0, 'No items are selected for migration. Can not run empty job.')

            const countCertificateUserMappings = Task.toTaskNodes.filter(x => x.Component == Settings.ComponentNames.CertificateUserMappings).length;
            if (countCertificateUserMappings > 0) {
                assert(Task.SourceTenant.Environment == 'Neo' && Task.TargetTenant.Environment == 'Cloud Foundry',
                    'You have included at least 1 Certificate-to-User Mapping for this migration. This is only supported for migrations from Neo (source) to Cloud Foundry (target).');
                assert(Task.SourceTenant.UseForCertificateUserMappings && Task.TargetTenant.UseForCertificateUserMappings,
                    'You have included at least 1 Certificate-to-User Mapping for this migration. Before these can be migrated, both source and target tenants have to be configured for the migration of Certificate-to-User Mappings via the \'Register Tenants\' application:<br/><br/>' +
                    Task.SourceTenant.Name + ': ' + (Task.SourceTenant.UseForCertificateUserMappings ? 'Ok' : 'Not configured') + '<br/>' +
                    Task.TargetTenant.Name + ': ' + (Task.TargetTenant.UseForCertificateUserMappings ? 'Ok' : 'Not configured'));
            }

            const job_id = generateUUID();
            const newJob = await srv.create(Entities.MigrationJobs,
                {
                    ObjectID: job_id,
                    MigrationTaskID: task_id,
                    StartTime: new Date(),
                    Status: 'Pending start',
                    StatusCriticality: Settings.CriticalityCodes.Orange,
                    EndTime: null
                }
            );
            const Job = await srv.read(Entities.MigrationJobs, newJob.ObjectID);
            const myJob = new MigrationJobHelper.MigrationJob(Job);

            myJob.execute();
            req.notify(200, 'Job started ...');

            return Job;
        } catch (e) { return req.error(400, e) }
    });
    srv.on('Task_resetTaskNodes', async (req) => {
        const task_id = req.params[0].ObjectID ? req.params[0].ObjectID : req.params[0];

        const Task = await srv.read(Entities.MigrationTasks, task_id, t => { t('*'), t.toTaskNodes(n => n('*')) });
        const migrationTask = new MigrationTaskHelper.MigrationTask(Task);
        await migrationTask.resetTaskNodes(req.data.Preset);

        req.notify(200, 'Migration Task items reset.');
    });
    srv.on('Task_setTargetTenant', async (req) => {
        const task_id = req.params[0].ObjectID ? req.params[0].ObjectID : req.params[0];
        await srv.update(Entities.MigrationTasks, task_id).with({ 'TargetTenant_ObjectID': req.data.TargetTenant });

        const Task = await srv.read(Entities.MigrationTasks, task_id, t => { t('*'), t.toTaskNodes(n => n('*')) });
        const migrationTask = new MigrationTaskHelper.MigrationTask(Task);
        await migrationTask.updateExistInTenantFlags();
    });
    srv.on('Task_refreshJobsTable', req => { }); //empty function, but triggers side effect to refresh the table
};
