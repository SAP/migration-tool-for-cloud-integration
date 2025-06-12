import cds from '@sap/cds'
import { randomUUID, UUID } from 'crypto'
import assert from 'assert'

import { Settings } from './config/settings'
import ExternalConnection from './helpers/externalConnection'
import DownloadHelper from './helpers/contentDownloader'
import MigrationJobHelper from './helpers/migrationJob'
import MigrationTaskHelper from './helpers/migrationTask'

import {
    CertificateUserMappings,
    IntegrationDesigntimeArtifacts,
    IntegrationPackage,
    IntegrationPackages,
    MigrationJob,
    MigrationJobs,
    MigrationTask,
    MigrationTaskNode,
    MigrationTaskNodes,
    MigrationTasks,
    Tenant,
    Tenants,
    getIntegrationContentStatus
} from '#cds-models/ConfigService'

import {
    TArtifactAnalysis,
    TContentDownloaderFilter,
    TIntegrationContentStatus,
    TMigrationTaskPresets
} from '#cds-models/migrationtool'

const { info, error } = cds.log('ConfigService')

export default class ConfigService extends cds.ApplicationService {

    async init() {

        let IntegrationContentStatus: TIntegrationContentStatus = {
            Running: false,
            Tenant: '',
            Progress: 0,
            Topic: '',
            Item: '',
            ErrorState: false
        }

        this.on(getIntegrationContentStatus, (req): TIntegrationContentStatus => {
            const status: TIntegrationContentStatus = {
                Running: IntegrationContentStatus.Running,
                Tenant: IntegrationContentStatus.Tenant,
                Progress: Math.floor(IntegrationContentStatus.Progress ?? 0),
                Topic: IntegrationContentStatus.Topic,
                Item: IntegrationContentStatus.Item,
                ErrorState: IntegrationContentStatus.ErrorState
            }
            return status
        })
        this.after('READ', Tenants, (items): void => {
            items?.forEach(each => {
                if (!!each.NumberOfErrors && each.NumberOfErrors > 0) {
                    each.ErrorsText = each.NumberOfErrors + ' errors found'
                    each.ErrorsCriticality = Settings.CriticalityCodes.Red
                } else {
                    each.ErrorsText = 'No errors'
                    each.ErrorsCriticality = Settings.CriticalityCodes.Green
                }
                each.ReadOnlyText = each.ReadOnly ? 'Read only' : 'Read-Write'
            })
        })
        this.on(Tenant.actions.testConnection, async (req): Promise<boolean> => {
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
        })
        this.on(Tenant.actions.getIntegrationContentRefresh, (req): void => { }) //empty function, but triggers side effect to refresh the page
        this.on(Tenant.actions.getIntegrationContent, async (req): Promise<void> => {
            const Tenant = await SELECT.one.from(req.subject) as Tenant
            getIntegrationContentHandler(req, Tenant, {
                getAccessPolicies_include: true,
                getCertificateUserMappings_include: true,
                getCustomTagConfigurations_include: true,
                getDataStores_include: true,
                getIntegrationPackages_include: true,
                getJMSBrokers_include: true,
                getKeyStoreEntries_include: true,
                getNumberRanges_include: true,
                getOAuth2ClientCredentials_include: true,
                getUserCredentials_include: true
            })
        })
        this.on(Tenant.actions.getSelectedIntegrationContent, async (req): Promise<void> => {
            const Tenant = await SELECT.one.from(req.subject) as Tenant
            const { filter } = req.data
            if (filter) {
                if (filter.getAccessPolicies_filter?.length == 0) filter.getAccessPolicies_filter = undefined
                if (filter.getCertificateUserMappings_filter?.length == 0) filter.getCertificateUserMappings_filter = undefined
                if (filter.getCustomTagConfigurations_filter?.length == 0) filter.getCustomTagConfigurations_filter = undefined
                if (filter.getDataStores_filter?.length == 0) filter.getDataStores_filter = undefined
                if (filter.getIntegrationPackages_filter?.length == 0) filter.getIntegrationPackages_filter = undefined
                if (filter.getKeyStoreEntries_filter?.length == 0) filter.getKeyStoreEntries_filter = undefined
                if (filter.getNumberRanges_filter?.length == 0) filter.getNumberRanges_filter = undefined
                if (filter.getOAuth2ClientCredentials_filter?.length == 0) filter.getOAuth2ClientCredentials_filter = undefined
                if (filter.getUserCredentials_filter?.length == 0) filter.getUserCredentials_filter = undefined
                if (filter.getVariables_filter?.length == 0) filter.getVariables_filter = undefined
                getIntegrationContentHandler(req, Tenant, filter)
            }
        })
        this.on(IntegrationPackage.actions.analyzeScriptFiles, async (req): Promise<TArtifactAnalysis[]> => {
            const Package = await SELECT.one.from(req.subject).columns(x => { x('*'), x.toParent('*') }) as IntegrationPackage
            if (!Package || !Package.toParent) return []

            const downloader = new DownloadHelper(Package.toParent)
            const packageContent = await downloader.downloadPackage(req, Package)
            const result: TArtifactAnalysis[] = !!packageContent && await downloader.searchForEnvVarsInPackage(packageContent) || []
            if (result.length == 0) {
                req.info(200, 'No script files in package "' + Package.Name + '"')
            } else {
                const resultTextFound = result.filter(x => x.count! > 0).map(x => '- ' + x.artifact + ': ' + x.file + ' = ' + x.count + ' occurrences').join('<br/>') || '(none)'
                const resultTextNotFound = result.filter(x => x.count == 0).map(x => '- ' + x.artifact + ': ' + x.file).join('<br/>') || '(none)'
                const resultTextError = result.filter(x => x.count == -1).map(x => '- ' + x.artifact + ': ' + x.file).join('<br/>') || ''
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
                )
            }
            return result
        })
        this.on(Tenant.actions.createNewMigrationTask, async (req): Promise<MigrationTask> => {
            const [keys] = req.params as typeof Tenant.keys[]
            const { Name, Description, TargetTenant, Preset } = req.data

            const TenantStats = await SELECT.one.from(req.subject)
                .columns((t: Tenant) => {
                    t.numIntegrationPackages,
                        t.numKeyStoreEntries,
                        t.numUserCredentials,
                        t.numCustomTagConfigurations,
                        t.numNumberRanges,
                        t.numOAuth2ClientCredentials,
                        t.numAccessPolicies,
                        t.numVariables,
                        t.numCertificateUserMappings,
                        t.numDataStores
                }) as Record<string, number>
            if (!TenantStats) return {}

            const countItems = Object.values(TenantStats).reduce((p, c) => p + c, 0)
            countItems == 0 && req.error(400, 'No content downloaded yet. Please click on \'Get Integration Content\' first before creating a Migration Task')

            const newTask = await this.create(MigrationTasks, {
                ObjectID: randomUUID(),
                Name: Name,
                Description: Description,
                SourceTenant_ObjectID: keys.ObjectID,
                TargetTenant_ObjectID: TargetTenant,
                CustomConfig: '{ "name_prefix": "" }'
            })

            const Task = await SELECT.one.from(MigrationTasks, newTask.ObjectID).columns(x => { x('*'), x.toTaskNodes('*') })
            if (!Task) return {}

            await new MigrationTaskHelper(Task).generateTaskNodes(Preset ?? 'Optimal')

            req.notify(201, 'Migration Task created.')
            return Task
        })
        this.after('READ', [IntegrationPackages, IntegrationDesigntimeArtifacts], (items): void => {
            items?.forEach(each => {
                each.Criticality = (each.NumberOfErrors && each.NumberOfErrors > 0)
                    ? Settings.CriticalityCodes.Orange
                    : Settings.CriticalityCodes.Default
            })
        })
        this.after('READ', CertificateUserMappings, (items): void => {
            items?.forEach(each => {
                if (each.ValidUntil) {
                    each.ValidUntilCriticality = (new Date(each.ValidUntil).getTime() < Date.now())
                        ? Settings.CriticalityCodes.Red
                        : Settings.CriticalityCodes.Green
                }
            })
        })

        this.after('READ', [MigrationTasks, MigrationTasks.drafts], async (items): Promise<void> => {
            items?.forEach(async each => {
                const status = await SELECT.one.from(MigrationJobs)
                    .columns(j => { j.Status, j.StatusCriticality })
                    .where({ MigrationTaskID: each.ObjectID })
                    .orderBy('StartTime desc')
                if (status) {
                    each.LastStatus = status.Status
                    each.LastStatusCriticality = status.StatusCriticality
                } else {
                    each.LastStatus = 'No executions yet'
                    each.LastStatusCriticality = Settings.CriticalityCodes.Orange
                }
            })
        })
        this.before('SAVE', MigrationTasks, (req): void => {
            const { CustomConfig } = req.data
            if (CustomConfig) {
                try {
                    JSON.parse(CustomConfig)
                }
                catch (e: any) {
                    req.reject(400, 'Validation of the custom configuration failed. Please verify you express valid JSON content.<br/><br/>' + e.message)
                }
            }
        })
        this.after('READ', [MigrationTaskNodes, MigrationTaskNodes.drafts], (items): void => {
            items?.forEach(each => {
                if (each.ExistInSource) {
                    each.Status = each.Included ? Settings.CriticalityCodes.Green : Settings.CriticalityCodes.Default
                } else {
                    each.Status = Settings.CriticalityCodes.Red
                }

                each.IncludedText = each.Included ? 'Include' : 'Skip'
                each.flagCanConfigure = (each.Included && (each.Component == Settings.ComponentNames.Package)) || false
                if (each.Included) {
                    if (each.Component == Settings.ComponentNames.Package) {
                        each.ConfigureOnlyText = each.ConfigureOnly ? 'Configuration only' : 'Full copy with variables'
                    } else {
                        each.ConfigureOnlyText = 'Default'
                    }
                } else each.ConfigureOnlyText = '' // CDS 7 -> virtual fields do not have a default null value

                each.ExistInSourceCriticality = each.ExistInSource ? Settings.CriticalityCodes.Green : Settings.CriticalityCodes.Red
                each.ExistInTargetCriticality = each.ExistInTarget ? Settings.CriticalityCodes.Green : Settings.CriticalityCodes.Blue
                each.IncludedCriticality = each.Included ? each.Status : Settings.CriticalityCodes.Default
                each.ConfigureOnlyCriticality = Settings.CriticalityCodes.Default
            })
        })
        this.on(MigrationTaskNode.actions.skipSelected, async (req): Promise<void> => {
            await UPDATE(req.subject).with({
                Included: false,
                ConfigureOnly: false
            })
        })
        this.on(MigrationTaskNode.actions.includeSelected, async (req): Promise<void> => {
            await UPDATE(req.subject).with({
                Included: true
            })
        })

        this.on(MigrationTaskNode.actions.configurePackage, async (req) => {
            const Node = await SELECT.one.from(req.subject) as MigrationTaskNode
            await UPDATE(req.subject).with({ 'ConfigureOnly': !Node.ConfigureOnly })

            if (!Node.ConfigureOnly) {
                const children = await SELECT.from(MigrationTaskNodes)
                    .where({
                        toMigrationTask_ObjectID: Node.toMigrationTask_ObjectID,
                        and: { PackageId: Node.Id }
                    })
                const resultTextFlows = children.filter(x => x.Component == Settings.ComponentNames.Flow).map(x => '- ' + x.Name).join('<br/>') || 'none'
                const resultTextValmaps = children.filter(x => x.Component == Settings.ComponentNames.ValMap).map(x => '- ' + x.Name).join('<br/>') || 'none'

                req.info(200, 'This package contains the following items which are now configured for \'Configuration Only\':<br/>' +
                    '<br/>' + 'Artifacts:<br/>' + resultTextFlows +
                    '<br/>' +
                    '<br/>' + 'Value Mappings:<br/>' + resultTextValmaps
                )
            }
        })
        this.on(MigrationTask.actions.startMigration, async (req): Promise<MigrationJob | Error> => {
            const [keys] = req.params as typeof MigrationTask.keys[]
            const Task = await SELECT.one.from(req.subject).columns(x => {
                x.SourceTenant((y: Tenant) => { y.Name, y.UseForCertificateUserMappings, y.Environment }),
                    x.TargetTenant((y: Tenant) => { y.Name, y.UseForCertificateUserMappings, y.Environment }),
                    x.toTaskNodes((y: MigrationTaskNode) => { y.ObjectID, y.Component }).where({ Included: true })
            }) as MigrationTask
            try {
                assert(Task.TargetTenant !== null, 'No target tenant has been defined.<br/><br/>Please select a target tenant via \'Change Target ...\'.')

                const mainTaskNodes = Task.toTaskNodes?.filter(x => x.Component !== Settings.ComponentNames.Flow && x.Component !== Settings.ComponentNames.ValMap) || []
                assert(mainTaskNodes.length > 0, 'No items are selected for migration. Can not run empty job.')

                const countCertificateUserMappings = Task.toTaskNodes!.filter(x => x.Component == Settings.ComponentNames.CertificateUserMappings).length
                if (countCertificateUserMappings > 0) {
                    assert(Task.SourceTenant!.Environment == 'Neo' && Task.TargetTenant!.Environment == 'Cloud Foundry',
                        'You have included at least 1 Certificate-to-User Mapping for this migration. This is only supported for migrations from Neo (source) to Cloud Foundry (target).')
                    assert(Task.SourceTenant!.UseForCertificateUserMappings && Task.TargetTenant!.UseForCertificateUserMappings,
                        'You have included at least 1 Certificate-to-User Mapping for this migration. Before these can be migrated, both source and target tenants have to be configured for the migration of Certificate-to-User Mappings via the \'Register Tenants\' application:<br/><br/>' +
                        Task.SourceTenant!.Name + ': ' + (Task.SourceTenant!.UseForCertificateUserMappings ? 'Ok' : 'Not configured') + '<br/>' +
                        Task.TargetTenant!.Name + ': ' + (Task.TargetTenant!.UseForCertificateUserMappings ? 'Ok' : 'Not configured'))
                }

                const job_id = randomUUID()
                await INSERT.into(MigrationJobs).entries({
                    ObjectID: job_id,
                    MigrationTaskID: keys.ObjectID as UUID,
                    StartTime: new Date().toISOString(),
                    Status: 'Pending start',
                    StatusCriticality: Settings.CriticalityCodes.Orange,
                    EndTime: null
                })

                const Job = await SELECT.one.from(MigrationJobs, job_id) as MigrationJob
                const myJob = new MigrationJobHelper(Job)

                myJob.execute()
                req.notify(200, 'Job started ...')

                return Job
            } catch (e: any) { return req.error(400, e) }
        })
        this.on(MigrationTask.actions.resetTaskNodes, async (req): Promise<void> => {
            const { Preset } = req.data
            const Task = await SELECT.one.from(req.subject).columns(t => { t('*'), t.toTaskNodes('*') }) as MigrationTask

            await new MigrationTaskHelper(Task).resetTaskNodes(Preset ?? TMigrationTaskPresets.Optimal)
            req.notify(200, 'Migration Task items reset.')
        })
        this.on(MigrationTask.actions.setTargetTenant, async (req): Promise<void> => {
            const { TargetTenant } = req.data
            await UPDATE(req.subject).with({ TargetTenant_ObjectID: TargetTenant })

            const Task = await SELECT.one.from(req.subject).columns(x => { x('*'), x.toTaskNodes('*'), x.TargetTenant((y: Tenant) => { y.Name }) }) as MigrationTask
            await new MigrationTaskHelper(Task).updateExistInTenantFlags()
            req.notify(200, `Target set to ${Task.TargetTenant?.Name}`)
        })
        this.on(MigrationTask.actions.refreshJobsTable, (req): void => { }) //empty function, but triggers side effect to refresh the table
        this.on(MigrationJob.actions.refreshLog, (req): void => { }) //empty function, but triggers side effect to refresh the table

        function getIntegrationContentHandler(req: cds.Request<any>, Tenant: Tenant, filter: TContentDownloaderFilter): void {
            IntegrationContentStatus = {
                Running: true,
                Tenant: Tenant.Name,
                Progress: 0,
                Topic: 'Initializing',
                Item: '',
                ErrorState: false
            }

            req.http?.req?.setMaxListeners(0)
            const startTime = Date.now()
            new DownloadHelper(Tenant, IntegrationContentStatus)
                .getIntegrationContent(filter)
                .then(async (count) => {
                    IntegrationContentStatus.Topic = `Integration Content has been refreshed with ${count} items.`
                    IntegrationContentStatus.Item = ''

                    info('Updating migration tasks that have this tenant either as source or as target ...')
                    const AffectedTasks = await SELECT.from(MigrationTasks)
                        .columns(t => { t('*'), t.toTaskNodes('*'), t.SourceTenant('*') })
                        .where({ SourceTenant_ObjectID: Tenant.ObjectID, or: { TargetTenant_ObjectID: Tenant.ObjectID } })
                    for (let Task of AffectedTasks) {
                        const errorList = await new MigrationTaskHelper(Task).updateExistInTenantFlags()
                        info('- Task ' + Task.Name + ' has ' + errorList.length + ' issues.')
                        if (errorList.length > 0) {
                            const errorText = errorList.map(x => '- ' + x).join('\r\n')
                            IntegrationContentStatus.Item += `Task ${Task.Name} has been updated to reflect the available content, but ${errorList.length} of the items selected to be in scope of this task are no longer available on the source tenant:\r\n${errorText}\r\n\r\nPlease open the migration task and switch the item(s) to 'skip'.\r\n`
                        } else {
                            IntegrationContentStatus.Item += `Task ${Task.Name} has been updated to reflect the available content.\r\n`
                        }
                    }

                    const elapsedTime = ConfigService.msToTime(Date.now() - startTime)
                    IntegrationContentStatus.Item += `\r\nTime elapsed: ${elapsedTime}`

                    IntegrationContentStatus.Running = false
                    info('Done in ' + elapsedTime)
                })
                .catch((e: any) => {
                    error(e?.message || e)
                    IntegrationContentStatus.ErrorState = true
                    IntegrationContentStatus.Item = e?.message || String(e)
                    req.error(400, e)
                })
        }

        return super.init()
    }

    private static msToTime(ms: number): string {
        const seconds = ms / (1000)
        const minutes = ms / (1000 * 60)
        const hours = ms / (1000 * 60 * 60)
        const days = ms / (1000 * 60 * 60 * 24)
        if (seconds < 60) return seconds.toFixed(1) + ' seconds'
        else if (minutes < 60) return minutes.toFixed(1) + ' minutes'
        else if (hours < 24) return hours.toFixed(1) + ' hours'
        else return days.toFixed(1) + ' days'
    }
}
