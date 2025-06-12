import cds from '@sap/cds'
import { randomUUID } from 'crypto'
import fs from 'fs'

import ExternalConnection from './helpers/externalConnection'
import { Settings } from './config/settings'

import {
    Tenant,
    Tenants,
    exportTenants,
    MigrationTasks
} from '#cds-models/RegistrationService'

import {
    Tenant as dbTenant,
    Tenants as dbTenants
} from '#cds-models/migrationtool'

const TenantTableFields = [
    'ObjectID',
    'Name',
    'Host',
    'Token_host',
    'Oauth_clientid',
    'Oauth_secret',
    'Role',
    'Environment',
    'ReadOnly',
    'Oauth_servicekeyid',
    'CF_organizationID',
    'CF_organizationName',
    'CF_spaceID',
    'CF_spaceName',
    'CF_servicePlanID',
    'Neo_accountid',
    'Neo_Platform_domain',
    'Neo_Platform_user',
    'Neo_Platform_password',
    'CF_Platform_domain',
    'CF_Platform_user',
    'CF_Platform_password',
    'UseForCertificateUserMappings'
]

const { info, warn } = cds.log('RegistrationService')

export default class RegistrationService extends cds.ApplicationService {

    async init() {

        this.after('READ', [Tenants, Tenants.drafts], (items, req): void => {
            items?.forEach(each => {
                if (each.NumberOfErrors && each.NumberOfErrors > 0) {
                    each.ErrorsText = each.NumberOfErrors + ' errors found'
                    each.ErrorsCriticality = Settings.CriticalityCodes.Red
                } else {
                    each.ErrorsText = 'No errors'
                    each.ErrorsCriticality = Settings.CriticalityCodes.Green
                }
                each.ReadOnlyText = each.ReadOnly ? 'Read only' : 'Read-Write'
            })
        })
        this.on('SAVE', Tenants, async (req, next) => {
            const tenant = req.data
            try {
                if (tenant.Environment == 'Cloud Foundry' && tenant.UseForCertificateUserMappings) {
                    const caller = new ExternalConnection(tenant)
                    await caller.refreshPlatformToken()
                    const CFdata = await caller.getCFOrgDataFromServiceInstanceID()

                    tenant.CF_organizationID = CFdata.orgData.guid
                    tenant.CF_organizationName = CFdata.orgData.name
                    tenant.CF_spaceID = CFdata.spaceData.guid
                    tenant.CF_spaceName = CFdata.spaceData.name
                    tenant.CF_servicePlanID = CFdata.servicePlanData.guid
                }
            } catch (error) {
                tenant.CF_organizationID = null
                tenant.CF_organizationName = null
                tenant.CF_spaceID = null
                tenant.CF_spaceName = null
                tenant.CF_servicePlanID = null
                req.warn(400, 'Your data was saved, but a connection was not successful: Setting the organization and space from the Service instance was not successful.<br/><br/>' + error)
            } finally {
                return next()
            }
        })
        /**
         * TODO: Can be removed once there is a stable SAPUI5 release > 1.135.0
         */
        this.after('EDIT', Tenants, (item): void => {
            if (item) {
                const mask = '*********'
                item.CF_Platform_password = mask
                item.Neo_Platform_password = mask
                item.Oauth_secret = mask
            }
        })
        this.before('DELETE', Tenants, async (req): Promise<void> => {
            const [keys] = req.params as typeof Tenant.keys[]

            const tenant = await SELECT.one.from(dbTenants, keys.ObjectID).columns(x => { x('*'), x.toMigrationTasks('*') }) as dbTenant
            if (tenant.toMigrationTasks && tenant.toMigrationTasks.length > 0) {
                req.error(400, 'This tenant has ' + tenant.toMigrationTasks.length + ' migration task(s). Please delete the task(s) first, before deleting the tenant.')
            }
        })
        this.on('DELETE', Tenants, async (req, next) => {
            const [keys] = req.params as typeof Tenant.keys[]
            const tasks = await SELECT.from(MigrationTasks).where({ TargetTenant_ObjectID: keys.ObjectID })
            if (tasks.length > 0) {
                warn(400, 'This tenant was configured as the target of the below migration tasks. Please select a new target for these tasks:\r\n\r\n' +
                    tasks.map(x => `- ${x.Name}`).join('\r\n')
                )
                await UPDATE(MigrationTasks)
                    .where({ TargetTenant_ObjectID: keys.ObjectID })
                    .with({ TargetTenant_ObjectID: null })
            }
            return next()
        })
        this.on(Tenant.actions.duplicate, async (req): Promise<Tenant> => {
            const [keys] = req.params as typeof Tenant.keys[]
            const tenant = await SELECT.one.from(dbTenants, keys.ObjectID) as dbTenant
            const tenantCopy = {} as Record<string, any>

            (TenantTableFields as (keyof dbTenant)[]).forEach(f => tenantCopy[f] = tenant[f])
            tenantCopy.ObjectID = randomUUID()
            tenantCopy.Name += '_duplicate'

            await INSERT.into(Tenants, tenantCopy)
            req.notify('Tenant duplicated with name ' + tenantCopy.Name)

            return tenantCopy as Tenant
        })
        this.on(Tenant.actions.testConnection, async (req): Promise<boolean | Error> => {
            try {
                const Tenant = await SELECT.one.from(req.subject) as Tenant
                const caller = new ExternalConnection(Tenant)

                var success = true

                await caller.refreshIntegrationToken()
                const success_pingTenant = await caller.pingIntegrationTenant()
                success_pingTenant ? req.notify(200, 'Integration Tenant Connection test successful for ' + Tenant.Name) : req.warn(400, 'Integration Tenant Connection test unsuccessful for ' + Tenant.Name)
                success &&= success_pingTenant

                if (Tenant.UseForCertificateUserMappings) {
                    await caller.refreshPlatformToken()

                    const success_pingPlatform = await caller.pingPlatformTenant()
                    success_pingPlatform ? req.notify(200, 'Platform Account Ping test successful for ' + Tenant.Name) : req.warn(400, 'Platform Account Ping test unsuccessful for ' + Tenant.Name)
                    success &&= success_pingPlatform

                    const success_testPlatform = await caller.testPlatformSettings()
                    success_testPlatform ? req.notify(200, 'Validating Platform Settings successful for ' + Tenant.Name) : req.warn(400, ' Validating Platform Settings unsuccessful for ' + Tenant.Name)
                    success &&= success_testPlatform
                }

                return success
            } catch (error: any) {
                return req.error(400, error.message ?? error)
            }
        })
        this.on(exportTenants, async (req) => {
            const TenantList = await SELECT.from(Tenants)

            const csv = [TenantTableFields.join(';')]
            TenantList.forEach(t => {
                csv.push((TenantTableFields as (keyof Tenant)[]).map(x => t[x]).join(';'))
            })
            fs.writeFileSync('db/data/migrationtool-Tenants.csv', csv.join('\r\n'))

            req.notify(201, 'CSV created: ' + TenantList.length + ' registration(s) exported.')
        })

        return super.init()
    }

}
