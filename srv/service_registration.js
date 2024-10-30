const generateUUID = require('node:crypto').randomUUID;
const Connectivity = require('./helpers/externalConnection');
const Settings = require('./config/settings');
const fs = require('fs');

const TenantTableFields = ['ObjectID', 'Name', 'Host', 'Token_host', 'Oauth_clientid', 'Oauth_secret', 'Role', 'Environment', 'ReadOnly',
    'Oauth_servicekeyid', 'CF_organizationID', 'CF_organizationName', 'CF_spaceID', 'CF_spaceName', 'CF_servicePlanID', 'Neo_accountid',
    'Neo_Platform_domain', 'Neo_Platform_user', 'Neo_Platform_password', 'CF_Platform_domain', 'CF_Platform_user', 'CF_Platform_password',
    'UseForCertificateUserMappings'];

const Entities = cds.entities('migrationtool');

module.exports = async (srv) => {
    srv.after('READ', [srv.entities.Tenants, srv.entities.Tenants.drafts], each => {
        if (each.NumberOfErrors > 0) {
            each.ErrorsText = each.NumberOfErrors + ' errors found';
            each.ErrorsCriticality = Settings.CriticalityCodes.Red;
        } else {
            each.ErrorsText = 'No errors';
            each.ErrorsCriticality = Settings.CriticalityCodes.Green;
        }
        each.ReadOnlyText = each.ReadOnly ? 'Read only' : 'Read-Write';
    });
    srv.on('SAVE', srv.entities.Tenants, async (req, next) => {
        const tenant = req.data;
        try {
            if (tenant.Environment == 'Cloud Foundry' && tenant.UseForCertificateUserMappings) {
                const caller = new Connectivity.ExternalConnection(tenant);
                await caller.refreshPlatformToken();
                const CFdata = await caller.getCFOrgDataFromServiceInstanceID();

                tenant.CF_organizationID = CFdata.orgData.guid;
                tenant.CF_organizationName = CFdata.orgData.name;
                tenant.CF_spaceID = CFdata.spaceData.guid;
                tenant.CF_spaceName = CFdata.spaceData.name;
                tenant.CF_servicePlanID = CFdata.servicePlanData.guid;
            };
        } catch (error) {
            tenant.CF_organizationID = null;
            tenant.CF_organizationName = null;
            tenant.CF_spaceID = null;
            tenant.CF_spaceName = null;
            tenant.CF_servicePlanID = null;
            req.warn(400, 'Your data was saved, but a connection was not successful: Setting the organization and space from the Service instance was not successful.<br/><br/>' + error);
        } finally {
            return next();
        }
    });
    srv.after('EDIT', srv.entities.Tenants, tenant => {
        const mask = '*********'
        tenant.CF_Platform_password = mask;
        tenant.Neo_Platform_password = mask;
        tenant.Oauth_secret = mask;
    });
    srv.before('DELETE', srv.entities.Tenants, async (req) => {
        const tenant_id = req.params[0].ObjectID ? req.params[0].ObjectID : req.params[0];
        const tenant = await srv.read(Entities.Tenants, tenant_id, t => { t('*'), t.toMigrationTasks(n => n('*')) });

        tenant.toMigrationTasks.length > 0 && req.error(400, 'This tenant has ' + tenant.toMigrationTasks.length + ' migration task(s). Please delete the task(s) first, before deleting the tenant.');
    });
    srv.on('DELETE', srv.entities.Tenants, async (req, next) => {
        const tenant_id = req.params[0].ObjectID ? req.params[0].ObjectID : req.params[0];
        const tasks = await srv.read(Entities.MigrationTasks).where({ TargetTenant_ObjectID: tenant_id });
        console.log(tasks);
        tasks.length > 0 && await srv.update(Entities.MigrationTasks).with({ TargetTenant_ObjectID: null }).where({ TargetTenant_ObjectID: tenant_id });
        return next();
    });
    srv.on('Tenant_duplicate', async (req) => {
        const tenant_id = req.params[0].ObjectID ? req.params[0].ObjectID : req.params[0];
        const tenantInfo = await srv.read(Entities.Tenants, tenant_id);
        const tenantCopy = {};

        TenantTableFields.forEach(f => tenantCopy[f] = tenantInfo[f]);
        tenantCopy.ObjectID = generateUUID();
        tenantCopy.Name += '_duplicate';

        await srv.create(Entities.Tenants, tenantCopy);
        req.notify('Tenant duplicated with name ' + tenantCopy.Name);

        return tenantCopy;
    });
    srv.on('Tenant_testConnection', async (req) => {
        try {
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
        } catch (error) { return req.error(400, error) }
    });
    srv.on('Tenant_export', async (req) => {
        const TenantList = await srv.read(Entities.Tenants);

        const csv = [TenantTableFields.join(';')];
        TenantList.forEach(t => csv.push(TenantTableFields.flatMap(x => t[x]).join(';')))
        fs.writeFileSync('db/data/migrationtool-Tenants.csv', csv.join('\r\n'));

        req.notify(201, 'CSV created: ' + TenantList.length + ' registration(s) exported.');
    });
    
};
