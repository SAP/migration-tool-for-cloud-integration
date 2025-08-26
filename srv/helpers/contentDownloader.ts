import cds from '@sap/cds'
import xml2js from 'xml2js'
import assert from 'assert'

import ZipHelper from './zip'
import ExternalConnection from './externalConnection'
import { Settings } from '../config/settings'

import {
    TIntegrationContentStatus,
    TArtifactAnalysis,
    TErrorComponentName,
    TContentDownloaderFilter
} from '#cds-models/migrationtool'

import {
    extAccessPolicy,
    extAccessPolicies,
    extArtifactReference,
    extArtifactReferences,
    extCertificateUserMapping,
    extCertificateUserMappings,
    extCertificateUserMappingRole,
    extCertificateUserMappingRoles,
    extConfiguration,
    extConfigurations,
    extCustomTag,
    extCustomTags,
    extCustomTagConfiguration,
    extCustomTagConfigurations,
    extDataStore,
    extDataStores,
    extDataStoreEntry,
    extDataStoreEntries,
    extIntegrationDesigntimeArtifact,
    extIntegrationDesigntimeArtifacts,
    extIntegrationPackage,
    extIntegrationPackages,
    extJMSBroker,
    extJMSBrokers,
    extKeyStoreEntry,
    extKeyStoreEntries,
    extNumberRange,
    extNumberRanges,
    extOAuth2ClientCredential,
    extOAuth2ClientCredentials,
    extResource,
    extResources,
    extUserCredential,
    extUserCredentials,
    extValMapSchema,
    extValMapSchemas,
    extValueMappingDesigntimeArtifact,
    extValueMappingDesigntimeArtifacts,
    extVariable,
    extVariables,
    Errors,
    Tenant,
    Tenants
} from '#cds-models/migrationtool'

const { info, warn } = cds.log('ContentDownloader')
const Entities = cds.entities('migrationtool')

export default class ContentDownloader {
    IntegrationContentStatus: TIntegrationContentStatus
    Tenant: Tenant
    NumberOfItems: number
    Connector: ExternalConnection

    constructor(t: Tenant, m?: TIntegrationContentStatus) {
        this.Tenant = t
        this.IntegrationContentStatus = m || { Topic: '', Item: '', Progress: 0, Running: false }
        this.NumberOfItems = 0
        this.Connector = this.Tenant && new ExternalConnection(this.Tenant)
    }

    public getIntegrationContent = async (
        filter: TContentDownloaderFilter = {
            getIntegrationPackages_include: false,

        }
    ): Promise<number> => {
        info('getIntegrationContent ' + this.Tenant.ObjectID)

        this.IntegrationContentStatus.Progress = 0
        this.setIntegrationContentStatusTopic('Connecting ...')

        const numberOfCategories =
            [
                filter.getIntegrationPackages_include,
                filter.getKeyStoreEntries_include,
                filter.getNumberRanges_include,
                filter.getCustomTagConfigurations_include,
                filter.getAccessPolicies_include,
                filter.getOAuth2ClientCredentials_include,
                filter.getUserCredentials_include,
                filter.getVariables_include,
                filter.getDataStores_include,
                filter.getJMSBrokers_include
            ].reduce((p, c) => p += c ? 1 : 0, 0)
            + ((filter.getCertificateUserMappings_include && this.Tenant.UseForCertificateUserMappings) ? 1 : 0)
            + 1

        const IntegrationContentStatusProgressPerItem = 99 / numberOfCategories // Max 99% since afterwards the Tasks still need to be analyzed

        this.validatePreconditions()

        await this.Connector.refreshIntegrationToken()

        if (filter.getIntegrationPackages_include) {
            await this.getIntegrationPackages(filter.getIntegrationPackages_filter, filter.getIntegrationPackages_discover ?? false).then(n => this.NumberOfItems += n)
            this.setIntegrationContentStatusProgress(IntegrationContentStatusProgressPerItem) // 01
            this.setIntegrationContentStatusItem('')
        }

        if (filter.getUserCredentials_include) {
            await this.getUserCredentials(filter.getUserCredentials_filter, filter.getUserCredentials_discover ?? false).then(n => this.NumberOfItems += n)
            this.setIntegrationContentStatusProgressIncrease(IntegrationContentStatusProgressPerItem) // 07
        }
        if (filter.getKeyStoreEntries_include) {
            await this.getKeyStoreEntries(filter.getKeyStoreEntries_filter, filter.getKeyStoreEntries_discover ?? false).then(n => this.NumberOfItems += n)
            this.setIntegrationContentStatusProgressIncrease(IntegrationContentStatusProgressPerItem) // 02
        }
        if (filter.getOAuth2ClientCredentials_include) {
            await this.getOAuth2ClientCredentials(filter.getOAuth2ClientCredentials_filter, filter.getOAuth2ClientCredentials_discover ?? false).then(n => this.NumberOfItems += n)
            this.setIntegrationContentStatusProgressIncrease(IntegrationContentStatusProgressPerItem) // 06
        }
        if (filter.getCertificateUserMappings_include) {
            if (this.Tenant.UseForCertificateUserMappings) {
                if (this.Tenant.Environment == 'Neo') {
                    await this.getNeoCertificateUserMappings(filter.getCertificateUserMappings_filter, filter.getCertificateUserMappings_discover ?? false).then(n => this.NumberOfItems += n)
                } else {
                    await this.getCFCertificateUserMappings(filter.getCertificateUserMappings_filter, filter.getCertificateUserMappings_discover ?? false).then(n => this.NumberOfItems += n)
                }
                this.setIntegrationContentStatusProgressIncrease(IntegrationContentStatusProgressPerItem) // 12
                this.setIntegrationContentStatusItem('')
            } else {
                await DELETE.from(extCertificateUserMappingRoles).where({ 'toParent_ObjectID': this.Tenant.ObjectID })
                await DELETE.from(extCertificateUserMappings).where({ 'toParent_ObjectID': this.Tenant.ObjectID })
            }
        }
        if (filter.getAccessPolicies_include) {
            await this.getAccessPolicies(filter.getAccessPolicies_filter, filter.getAccessPolicies_discover ?? false).then(n => this.NumberOfItems += n)
            this.setIntegrationContentStatusProgressIncrease(IntegrationContentStatusProgressPerItem) // 05
            this.setIntegrationContentStatusItem('')
        }

        if (filter.getNumberRanges_include) {
            await this.getNumberRanges(filter.getNumberRanges_filter, filter.getNumberRanges_discover ?? false).then(n => this.NumberOfItems += n)
            this.setIntegrationContentStatusProgressIncrease(IntegrationContentStatusProgressPerItem) // 03
        }
        if (filter.getVariables_include) {
            await this.getVariables(filter.getVariables_filter, filter.getVariables_discover ?? false).then(n => this.NumberOfItems += n)
            this.setIntegrationContentStatusProgressIncrease(IntegrationContentStatusProgressPerItem) // 08
        }
        if (filter.getDataStores_include) {
            await this.getDataStores(filter.getDataStores_filter, filter.getDataStores_discover ?? false).then(n => this.NumberOfItems += n)
            this.setIntegrationContentStatusProgressIncrease(IntegrationContentStatusProgressPerItem) // 09
            this.setIntegrationContentStatusItem('')
        }
        if (filter.getCustomTagConfigurations_include) {
            await this.getCustomTagConfigurations(filter.getCustomTagConfigurations_filter, filter.getCustomTagConfigurations_discover ?? false).then(n => this.NumberOfItems += n)
            this.setIntegrationContentStatusProgressIncrease(IntegrationContentStatusProgressPerItem) // 04
        }

        if (filter.getJMSBrokers_include) {
            await this.getJMSBrokers().then(n => this.NumberOfItems += n)
            this.setIntegrationContentStatusProgressIncrease(IntegrationContentStatusProgressPerItem) // 10
        }

        await this.generateLimitationNotices()
        this.setIntegrationContentStatusProgressIncrease(IntegrationContentStatusProgressPerItem) // 11

        await UPDATE(Tenants, this.Tenant.ObjectID).with({
            RefreshedDate: new Date().toISOString()
        })

        info(`Done: ${this.NumberOfItems} items.`)
        return this.NumberOfItems
    }

    private validatePreconditions = (): void => {
        const configurationOK: Boolean = this.Tenant.Environment == 'Neo' ?
            !!this.Tenant.Neo_accountid &&
            !!this.Tenant.Neo_Platform_domain &&
            !!this.Tenant.Neo_Platform_user &&
            !!this.Tenant.Neo_Platform_password
            :
            !!this.Tenant.CF_organizationID &&
            !!this.Tenant.CF_organizationName &&
            !!this.Tenant.CF_spaceID &&
            !!this.Tenant.CF_spaceName &&
            !!this.Tenant.CF_servicePlanID &&
            !!this.Tenant.CF_Platform_domain &&
            !!this.Tenant.CF_Platform_user &&
            !!this.Tenant.CF_Platform_password

        if (this.Tenant.UseForCertificateUserMappings) {
            assert(configurationOK, 'Tenant is not yet fully configured. Please complete the configuration in the \'Register Tenants\' application.')
        }
    }

    private getIntegrationPackages = async (filter?: string[], oppositeFilter?: boolean): Promise<number> => {
        info('getIntegrationPackages ' + this.Tenant.ObjectID)
        this.setIntegrationContentStatusTopic('Integration Packages:')
        let items = (await this.Connector.externalCall(Settings.Paths.IntegrationPackages.path)) as extIntegrationPackage[]
        if (filter && !oppositeFilter) items = items.filter(x => filter.includes(x.Id!))
        if (filter && oppositeFilter) items = items.filter(x => !filter.includes(x.Id!))

        const IntegrationContentStatusProgressPerPackage = 100 / items.length

        await DELETE.from(Errors).where({
            toParent: this.Tenant.ObjectID,
            Component: TErrorComponentName.IntegrationPackage,
            ...filter ? { ComponentName: { in: items.map(x => x.Name) } } : {}
        })
        if (filter == undefined) {
            // This means this is a full refresh, so also remove the errors from packages that are no longer on the tenant.
            // A filtered download will remove the errors only from the items in scope of the download
            await DELETE.from(Errors).where({
                toParent: this.Tenant.ObjectID,
                Component: { in: [TErrorComponentName.IntegrationFlow, TErrorComponentName.ValueMapping] },
            })
        }

        await this.checkIntegrationPackages(items)

        this.removeInvalidParameters(Entities.extIntegrationPackages, items)
        for (let each of items) {
            delete each.IntegrationDesigntimeArtifacts

            each.toParent_ObjectID = this.Tenant.ObjectID
            each.ModifiedDateFormatted = (new Date(parseInt(each.ModifiedDate ?? ''))).toISOString()// .toUTCString()
        }
        await DELETE.from(extIntegrationPackages).where({ 'toParent_ObjectID': this.Tenant.ObjectID, ...filter ? { Id: { in: items.map(x => x.Id) } } : {} })

        try {
            items.length > 0 && await INSERT(items).into(extIntegrationPackages)
        } catch (error) { info(error); throw error }

        for (let each of items) {
            this.setIntegrationContentStatusItem(each.Id!)
            await this.getIntegrationDesigntimeArtifacts(each.Id!, each.ObjectID!).then(n => this.NumberOfItems += n)
            await this.getValueMappingDesigntimeArtifacts(each.Id!, each.ObjectID!).then(n => this.NumberOfItems += n)
            await this.getCustomTags(each.Id!, each.ObjectID!).then(n => this.NumberOfItems += n)

            if (Settings.Flags.AnalyzePackageContentWhenRefreshingContent && (each.Vendor != 'SAP' && each.PartnerContent != true)) {
                await this.extractInfoFromPackage(each)
            }

            this.setIntegrationContentStatusProgressIncrease(IntegrationContentStatusProgressPerPackage)
        }
        return items.length
    }
    private checkIntegrationPackages = async (items: extIntegrationPackage[]): Promise<number> => {
        var count = 0
        for (let each of items) {
            if ((each.Vendor == "SAP" || each.PartnerContent == true) && each.UpdateAvailable == true)
                count += await this.createError(TErrorComponentName.IntegrationPackage, 'Error', each, 'Item is not in the latest version', Settings.Paths.DeepLinks.PackageOverview.replace('{PACKAGE_ID}', each.Id!))
        }
        info('checkIntegrationPackages returned ' + count + ' errors.')
        return count
    }

    private getIntegrationDesigntimeArtifacts = async (package_id: string, parent_id: string): Promise<number> => {
        info('getIntegrationDesigntimeArtifacts ' + package_id + ' with parent ID: ' + parent_id)
        const items = await this.Connector.externalCall(Settings.Paths.IntegrationPackages.IntegrationDesigntimeArtifacts.path.replace('{PACKAGE_ID}', package_id)) as extIntegrationDesigntimeArtifact[]

        await DELETE.from(Errors).where({
            toParent: this.Tenant.ObjectID,
            Component: TErrorComponentName.IntegrationFlow,
            ComponentName: { in: items.map(x => x.Name) }
        })
        await this.checkIntegrationDesigntimeArtifacts(items, package_id)

        this.removeInvalidParameters(Entities.extIntegrationDesigntimeArtifacts, items)
        for (let each of items) {
            delete each.Configurations
            delete each.Resources

            each.toParent_ObjectID = parent_id
            each.toParent_Id = package_id
            each.toParent_toParent_ObjectID = this.Tenant.ObjectID
        }
        await DELETE.from(extIntegrationDesigntimeArtifacts).where({ 'toParent_ObjectID': parent_id })
        try {
            items.length > 0 && await INSERT(items).into(extIntegrationDesigntimeArtifacts)
        } catch (error) { info(error); throw error }

        if (Settings.Flags.DownloadConfigurationsAndResources) {
            for (let each of items) {
                await this.getConfigurations(package_id, each.Id!, each.ObjectID!).then(n => this.NumberOfItems += n)
                await this.getResources(package_id, each.Id!, each.ObjectID!).then(n => this.NumberOfItems += n)
            }
        }
        return items.length
    }
    private checkIntegrationDesigntimeArtifacts = async (items: extIntegrationDesigntimeArtifact[], package_id: string): Promise<number> => {
        var count = 0
        for (let each of items) {
            if (each.Version == "Active")
                count += await this.createError(TErrorComponentName.IntegrationFlow, 'Error', each, 'Item is in Draft state (package: ' + package_id + ')', Settings.Paths.DeepLinks.PackageArtifacts.replace('{PACKAGE_ID}', each.PackageId!))
        }
        info('checkIntegrationDesigntimeArtifacts returned ' + count + ' errors.')
        return count
    }

    private getConfigurations = async (package_id: string, artifact_id: string, parent_id: string): Promise<number> => {
        info('getConfigurations ' + package_id + ' / ' + artifact_id)
        const items = await this.Connector.externalCall(Settings.Paths.IntegrationPackages.IntegrationDesigntimeArtifacts.Configurations.path.replace('{ARTIFACT_ID}', artifact_id)) as extConfiguration[]

        this.removeInvalidParameters(Entities.extConfigurations, items)
        for (let each of items) {
            each.toParent_ObjectID = parent_id
            each.toParent_Id = artifact_id
        }
        await DELETE.from(extConfigurations).where({ 'toParent_ObjectID': parent_id })
        try {
            items.length > 0 && await INSERT(items).into(extConfigurations)
        } catch (error) { info(error); throw error }

        return items.length
    }

    private getResources = async (package_id: string, artifact_id: string, parent_id: string): Promise<number> => {
        info('getResources ' + package_id + ' / ' + artifact_id)

        // HACK:
        // if (package_id != 'eDocumentElectronicInvoicingforItaly') {
        const items = await this.Connector.externalCall(Settings.Paths.IntegrationPackages.IntegrationDesigntimeArtifacts.Resources.path.replace('{ARTIFACT_ID}', artifact_id)) as extResource[]

        this.removeInvalidParameters(Entities.extResources, items)
        for (let each of items) {
            each.toParent_ObjectID = parent_id
            each.toParent_Id = artifact_id
        }
        await DELETE.from(extResources).where({ 'toParent_ObjectID': parent_id })
        try {
            items.length > 0 && await INSERT(items).into(extResources)
        } catch (error) { info(error); throw error }

        return items.length
        // } else {
        //     return 0
        // }
    }

    private getValueMappingDesigntimeArtifacts = async (package_id: string, parent_id: string): Promise<number> => {
        info('getValueMappingDesigntimeArtifacts ' + package_id)
        const items = await this.Connector.externalCall(Settings.Paths.IntegrationPackages.ValueMappingDesigntimeArtifacts.path.replace('{PACKAGE_ID}', package_id)) as extValueMappingDesigntimeArtifact[]

        await DELETE.from(Errors).where({
            toParent: this.Tenant.ObjectID,
            Component: TErrorComponentName.ValueMapping,
            ComponentName: { in: items.map(x => x.Name) }
        })
        await this.checkValueMappingDesigntimeArtifacts(items)

        this.removeInvalidParameters(Entities.extValueMappingDesigntimeArtifacts, items)
        for (let each of items) {
            delete each.ValMapSchema

            each.toParent_ObjectID = parent_id
            each.toParent_Id = package_id
            each.toParent_toParent_ObjectID = this.Tenant.ObjectID
        }
        await DELETE.from(extValueMappingDesigntimeArtifacts).where({ 'toParent_ObjectID': parent_id })
        try {
            items.length > 0 && await INSERT(items).into(extValueMappingDesigntimeArtifacts)
        } catch (error) { info(error); throw error }

        for (let each of items) {
            if (each.Version != 'Draft') // API can not download content of Draft items
                await this.getValMapSchema(package_id, each.Id!, each.Version!, each.ObjectID!).then(n => this.NumberOfItems += n)
        }

        return items.length
    }
    private checkValueMappingDesigntimeArtifacts = async (items: extValueMappingDesigntimeArtifact[]): Promise<number> => {
        var count = 0
        for (let each of items) {
            if (each.Version == "Active" || each.Version == "Draft") {
                count += await this.createError(TErrorComponentName.ValueMapping, 'Error', each, 'Item is in Draft state', Settings.Paths.DeepLinks.PackageArtifacts.replace('{PACKAGE_ID}', each.PackageId!))
            }
        }
        info('checkValueMappingDesigntimeArtifacts returned ' + count + ' errors.')
        return count
    }

    private getValMapSchema = async (package_id: string, artifact_id: string, version_id: string, parent_id: string): Promise<number> => {
        info('getValMapSchema ' + package_id + ' / ' + artifact_id)
        const items = await this.Connector.externalCall(Settings.Paths.IntegrationPackages.ValueMappingDesigntimeArtifacts.ValMapSchema.path.replace('{ARTIFACT_ID}', artifact_id).replace('{VERSION_ID}', version_id)) as extValMapSchema[]

        this.removeInvalidParameters(Entities.extValMapSchemas, items)
        for (let each of items) {
            delete each.ValMaps
            delete each.DefaultValMaps

            each.toParent_ObjectID = parent_id
            each.toParent_Id = artifact_id
            each.toParent_Version = version_id
        }
        await DELETE.from(extValMapSchemas).where({ 'toParent_ObjectID': parent_id })
        try {
            items.length > 0 && await INSERT(items).into(extValMapSchemas)
        } catch (error) { info(error); throw error }

        return items.length
    }

    private getCustomTags = async (package_id: string, parent_id: string): Promise<number> => {
        info('getCustomTags ' + package_id)
        const items = await this.Connector.externalCall(Settings.Paths.IntegrationPackages.CustomTags.path.replace('{PACKAGE_ID}', package_id)) as extCustomTag[]

        this.removeInvalidParameters(Entities.extCustomTags, items)
        for (let each of items) {
            each.toParent_ObjectID = parent_id
            each.toParent_Id = package_id
            each.toParent_toParent_ObjectID = this.Tenant.ObjectID
        }
        await DELETE.from(extCustomTags).where({ 'toParent_ObjectID': parent_id })
        try {
            items.length > 0 && await INSERT(items).into(extCustomTags)
        } catch (error) { info(error); throw error }

        return items.length
    }

    private getKeyStoreEntries = async (filter?: string[], oppositeFilter?: boolean): Promise<number> => {
        info('getKeyStoreEntries ' + this.Tenant.ObjectID)
        this.setIntegrationContentStatusTopic('Key Store Entries')
        let items = (await this.Connector.externalCall(Settings.Paths.KeyStoreEntries.path) as extKeyStoreEntry[])
            .filter(x => x.Owner != 'SAP')
        if (filter && !oppositeFilter) items = items.filter(x => filter.includes(x.Alias!))
        if (filter && oppositeFilter) items = items.filter(x => !filter.includes(x.Alias!))

        await DELETE.from(Errors).where({
            toParent: this.Tenant.ObjectID,
            Component: TErrorComponentName.KeystoreEntry,
            ...filter ? { ComponentName: { in: items.map(x => x.Alias) } } : {}
        })

        const itemsSupported = items.filter(x => x.Type == 'Certificate')
        if (items.length > itemsSupported.length) {
            const notSupported = items.filter(x => !itemsSupported.includes(x)).map(x => x.Alias)
            await this.createError(TErrorComponentName.KeystoreEntry, 'Limitation', { Name: 'See documentation' }, 'This tenant contains ' + notSupported.length + ' keystore entries which are not supported for migration: ' + notSupported.join(', '), Settings.Paths.DeepLinks.LimitationsDocument)
        }

        this.removeInvalidParameters(Entities.extKeyStoreEntries, itemsSupported)
        for (let each of itemsSupported) {
            each.toParent_ObjectID = this.Tenant.ObjectID
        }
        await DELETE.from(extKeyStoreEntries).where({ 'toParent_ObjectID': this.Tenant.ObjectID, ...filter ? { Alias: { in: itemsSupported.map(x => x.Alias) } } : {} })
        try {
            itemsSupported.length > 0 && await INSERT(itemsSupported).into(extKeyStoreEntries)
        } catch (error) { info(error); throw error }

        return itemsSupported.length
    }

    private getNumberRanges = async (filter?: string[], oppositeFilter?: boolean): Promise<number> => {
        info('getNumberRanges ' + this.Tenant.ObjectID)
        this.setIntegrationContentStatusTopic('Number Ranges')
        let items = await this.Connector.externalCall(Settings.Paths.NumberRanges.path) as extNumberRange[]
        if (filter && !oppositeFilter) items = items.filter(x => filter.includes(x.Name!))
        if (filter && oppositeFilter) items = items.filter(x => !filter.includes(x.Name!))

        await DELETE.from(Errors).where({
            toParent: this.Tenant.ObjectID,
            Component: TErrorComponentName.NumberRange,
            ...filter ? { ComponentName: { in: items.map(x => x.Name) } } : {}
        })

        this.removeInvalidParameters(Entities.extNumberRanges, items)
        for (let each of items) {
            each.toParent_ObjectID = this.Tenant.ObjectID
            each.DeployedOn = ContentDownloader.fixDateFormatIfNeeded(each.DeployedOn!)
        }
        await DELETE.from(extNumberRanges).where({ 'toParent_ObjectID': this.Tenant.ObjectID, ...filter ? { Name: { in: items.map(x => x.Name) } } : {} })
        try {
            items.length > 0 && await INSERT(items).into(extNumberRanges)
        } catch (error) { info(error); throw error }

        return items.length
    }

    private getCustomTagConfigurations = async (filter?: string[], oppositeFilter?: boolean): Promise<number> => {
        info('getCustomTagConfigurations ' + this.Tenant.ObjectID)
        this.setIntegrationContentStatusTopic('Custom Tag Configurations')
        let items = (await this.Connector.externalCall(Settings.Paths.CustomTagConfigurations.path)).customTagsConfiguration as extCustomTagConfiguration[]
        // items = items.customTagsConfiguration
        if (filter && !oppositeFilter) items = items.filter(x => filter.includes(x.tagName!))
        if (filter && oppositeFilter) items = items.filter(x => !filter.includes(x.tagName!))

        await DELETE.from(Errors).where({
            toParent: this.Tenant.ObjectID,
            Component: TErrorComponentName.CustomTag,
            ...filter ? { ComponentName: { in: items.map(x => x.tagName) } } : {}
        })

        this.removeInvalidParameters(Entities.extCustomTagConfigurations, items)
        for (let each of items) {
            each.toParent_ObjectID = this.Tenant.ObjectID
        }
        await DELETE.from(extCustomTagConfigurations).where({ 'toParent_ObjectID': this.Tenant.ObjectID, ...filter ? { tagName: { in: items.map(x => x.tagName) } } : {} })
        try {
            items.length > 0 && await INSERT(items).into(extCustomTagConfigurations)
        } catch (error) { info(error); throw error }

        return items.length
    }

    private getUserCredentials = async (filter?: string[], oppositeFilter?: boolean): Promise<number> => {
        info('getUserCredentials ' + this.Tenant.ObjectID)
        this.setIntegrationContentStatusTopic('User Credentials')
        let items = await this.Connector.externalCall(Settings.Paths.UserCredentials.path) as extUserCredential[]
        const OAuth2ClientCredentialsList = (await this.Connector.externalCall(Settings.Paths.OAuth2ClientCredentials.path) as extOAuth2ClientCredential[]).map(x => x.Name!)
        if (filter && !oppositeFilter) items = items.filter(x => filter.includes(x.Name!))
        if (filter && oppositeFilter) items = items.filter(x => !filter.includes(x.Name!))

        await DELETE.from(Errors).where({
            toParent: this.Tenant.ObjectID,
            Component: TErrorComponentName.UserCredential,
            ...filter ? { ComponentName: { in: items.map(x => x.Name) } } : {}
        })

        const itemsSupported = items.filter(x => (x.Kind == 'default' || x.Kind == 'successfactors'))
        const itemsNotSupported = items.filter(x => (!itemsSupported.includes(x) && (!OAuth2ClientCredentialsList.includes(x.Name!)))).map(x => x.Name)
        if (itemsNotSupported.length > 0) {
            await this.createError(TErrorComponentName.UserCredential, 'Limitation', { Name: 'See documentation' }, 'This tenant contains ' + itemsNotSupported.length + ' user credential(s) which are not supported for migration: ' + itemsNotSupported.join(', '), Settings.Paths.DeepLinks.LimitationsDocument)
        }
        itemsSupported.forEach(x => ContentDownloader.fixSecurityArtifactDescriptor(x))
        await this.checkUserCredentials(itemsSupported)

        this.removeInvalidParameters(Entities.extUserCredentials, itemsSupported, ['SecurityArtifactDescriptor'])
        for (let each of itemsSupported) {
            each.toParent_ObjectID = this.Tenant.ObjectID
            each.SecurityArtifactDescriptor_DeployedOn = ContentDownloader.fixDateFormatIfNeeded(each.SecurityArtifactDescriptor_DeployedOn!)
        }
        await DELETE.from(extUserCredentials).where({ 'toParent_ObjectID': this.Tenant.ObjectID, ...filter ? { Name: { in: itemsSupported.map(x => x.Name) } } : {} })
        try {
            itemsSupported.length > 0 && await INSERT(itemsSupported).into(extUserCredentials)
        } catch (error) { info(error); throw error }

        return itemsSupported.length
    }
    private checkUserCredentials = async (items: extUserCredential[]): Promise<number> => {
        var count = 0
        for (let each of items) {
            if (each.SecurityArtifactDescriptor_DeployedBy == this.Tenant.Oauth_clientid)
                count += await this.createError(TErrorComponentName.UserCredential, 'Warning', each, 'Item created by migration tool. Please update with the correct password/secret', Settings.Paths.DeepLinks.SecurityMaterial)
        }
        info('checkUserCredentials returned ' + count + ' errors.')
        return count
    }

    private getOAuth2ClientCredentials = async (filter?: string[], oppositeFilter?: boolean): Promise<number> => {
        info('getOAuth2ClientCredentials ' + this.Tenant.ObjectID)
        this.setIntegrationContentStatusTopic('OAuth2 Client Credentials')
        let items = await this.Connector.externalCall(Settings.Paths.OAuth2ClientCredentials.path) as extOAuth2ClientCredential[]
        if (filter && !oppositeFilter) items = items.filter(x => filter.includes(x.Name!))
        if (filter && oppositeFilter) items = items.filter(x => !filter.includes(x.Name!))

        await DELETE.from(Errors).where({
            toParent: this.Tenant.ObjectID,
            Component: TErrorComponentName.OAuth2ClientCredential,
            ...filter ? { ComponentName: { in: items.map(x => x.Name) } } : {}
        })

        items.forEach(x => ContentDownloader.fixSecurityArtifactDescriptor(x))
        await this.checkOAuth2ClientCredentials(items)

        this.removeInvalidParameters(Entities.extOAuth2ClientCredentials, items, ['SecurityArtifactDescriptor'])
        for (let each of items) {
            each.toParent_ObjectID = this.Tenant.ObjectID
            each.SecurityArtifactDescriptor_DeployedOn = ContentDownloader.fixDateFormatIfNeeded(each.SecurityArtifactDescriptor_DeployedOn!)
        }
        await DELETE.from(extOAuth2ClientCredentials).where({ 'toParent_ObjectID': this.Tenant.ObjectID, ...filter ? { Name: { in: items.map(x => x.Name) } } : {} })
        try {
            items.length > 0 && await INSERT(items).into(extOAuth2ClientCredentials)
        } catch (error) { info(error); throw error }

        return items.length
    }
    private checkOAuth2ClientCredentials = async (items: extOAuth2ClientCredential[]): Promise<number> => {
        var count = 0
        for (let each of items) {
            if (each.SecurityArtifactDescriptor_DeployedBy == this.Tenant.Oauth_clientid)
                count += await this.createError(TErrorComponentName.OAuth2ClientCredential, 'Warning', each, 'Item created by migration tool. Please update with the correct password/secret', Settings.Paths.DeepLinks.SecurityMaterial)
        }
        info('checkOAuth2ClientCredentials returned ' + count + ' errors.')
        return count
    }

    private getNeoCertificateUserMappings = async (filter?: string[], oppositeFilter?: boolean): Promise<number> => {
        info('getNeoCertificateUserMappings ' + this.Tenant.ObjectID)
        this.setIntegrationContentStatusTopic('Certificate User Mappings')
        let items = await this.Connector.externalCall(Settings.Paths.CertificateUserMappings.Neo.path) as extCertificateUserMapping[]
        if (filter && !oppositeFilter) items = items.filter(x => filter.includes(x.Id!))
        if (filter && oppositeFilter) items = items.filter(x => !filter.includes(x.Id!))

        await DELETE.from(Errors).where({
            toParent: this.Tenant.ObjectID,
            Component: TErrorComponentName.CertificateUserMapping,
            ...filter ? { ComponentName: { in: items.map(x => x.User) } } : {}
        })

        this.removeInvalidParameters(Entities.extCertificateUserMappings, items)
        for (let each of items) {
            each.toParent_ObjectID = this.Tenant.ObjectID

            each.LastModifiedTime = ContentDownloader.dateNotationToISO(each.LastModifiedTime ?? '')
            each.ValidUntil = new Date(parseInt(each.ValidUntil ?? '')).toISOString()
        }
        await DELETE.from(extCertificateUserMappings).where({ 'toParent_ObjectID': this.Tenant.ObjectID, ...filter ? { Id: { in: items.map(x => x.User) } } : {} })
        try {
            items.length > 0 && await INSERT(items).into(extCertificateUserMappings)
        } catch (error) { info(error); throw error }

        for (let each of items) {
            this.setIntegrationContentStatusItem(each.User!)
            await this.getNeoRolesForUser(each)
        }

        return items.length
    }
    private getNeoRolesForUser = async (certificateUserMapping: extCertificateUserMapping): Promise<number> => {
        info('getNeoRolesForUser ' + certificateUserMapping.User)
        const items = await this.Connector.externalPlatformGetCall(Settings.Paths.CertificateUserMappings.Neo.Roles
            .replace('{ACCOUNT_ID}', this.Tenant.Neo_accountid!)
            .replace('{USER_ID}', certificateUserMapping.User!)
        )
        assert(items !== null, 'Could not retrieve roles for Neo account ' + this.Tenant.Neo_accountid + '. Verify connection settings.')

        const roles = (items.roles || []) as extCertificateUserMappingRole[]
        this.removeInvalidParameters(Entities.extCertificateUserMappingRoles, roles)

        for (let each of roles) {
            each.toParent_ObjectID = certificateUserMapping.ObjectID
            each.toParent_User = certificateUserMapping.User
        }
        await DELETE.from(extCertificateUserMappingRoles).where({ 'toParent_ObjectID': certificateUserMapping.ObjectID })
        try {
            roles.length > 0 && await INSERT(roles).into(extCertificateUserMappingRoles)
        } catch (error) { info(error); throw error }

        return roles.length
    }

    private getCFCertificateUserMappings = async (filter?: string[], oppositeFilter?: boolean): Promise<number> => {
        info('getCFCertificateUserMappings ' + this.Tenant.ObjectID)
        this.setIntegrationContentStatusTopic('Certificate User Mappings')
        const items = await this.Connector.externalPlatformGetCall(Settings.Paths.CertificateUserMappings.CF.ServiceInstances
            .replace('{SPACE_ID}', this.Tenant.CF_spaceID!)
            .replace('{SERVICEPLAN_ID}', this.Tenant.CF_servicePlanID!)
        )
        assert(items !== null, 'Could not retrieve service instances for CF space ' + this.Tenant.CF_spaceID + '. Verify connection settings.')

        let instances = items.resources || []
        if (filter && !oppositeFilter) instances = instances.filter((x: any) => filter.includes(x.guid))
        if (filter && oppositeFilter) instances = instances.filter((x: any) => !filter.includes(x.guid))

        await DELETE.from(Errors).where({
            toParent: this.Tenant.ObjectID,
            Component: TErrorComponentName.CertificateUserMapping,
            ...filter ? { ComponentName: { in: instances.map((x: any) => x.name) } } : {}
        })

        const userMappings = instances
            .filter((x: any) => x.last_operation.state == 'succeeded')
            .map((x: any) => {
                return {
                    toParent_ObjectID: this.Tenant.ObjectID,
                    Id: x.guid,
                    User: x.name,
                    LastModifiedBy: null,
                    LastModifiedTime: x.updated_at,
                    ValidUntil: null
                }
            }) as extCertificateUserMapping[]
        await DELETE.from(extCertificateUserMappings).where({ 'toParent_ObjectID': this.Tenant.ObjectID, ...filter ? { Id: { in: userMappings.map(x => x.User) } } : {} })
        try {
            userMappings.length > 0 && await INSERT(userMappings).into(extCertificateUserMappings)
        } catch (error) { info(error); throw error }

        for (let each of userMappings) {
            this.setIntegrationContentStatusItem(each.User!)
            await this.getCFCertificateUserMappingBindings(each)
        }

        return userMappings.length
    }
    private getCFCertificateUserMappingBindings = async (instance: extCertificateUserMapping): Promise<number> => {
        info('getCFCertificateUserMappingBindings ' + instance.User)
        const items = await this.Connector.externalPlatformGetCall(Settings.Paths.CertificateUserMappings.CF.ServiceBindings.replace('{SERVICE_INSTANCE_ID}', instance.Id!))
        assert(items !== null, 'Could not retrieve service bindings for CF space ' + this.Tenant.CF_spaceID + '. Verify connection settings.')
        const bindings = items.resources || []

        const credentials = bindings
            .filter((x: any) => x.last_operation.state == 'succeeded')
            .map((x: any) => {
                return {
                    toParent_ObjectID: instance.ObjectID,
                    toParent_User: instance.User,
                    name: x.name,
                    applicationName: null,
                    providerAccount: null
                }
            })
        await DELETE.from(extCertificateUserMappingRoles).where({ 'toParent_ObjectID': instance.ObjectID })
        try {
            credentials.length > 0 && await INSERT(credentials).into(extCertificateUserMappingRoles)
        } catch (error) { info(error); throw error }

        return credentials.length
    }

    private getJMSBrokers = async (): Promise<number> => {
        info('getJMSBrokers ' + this.Tenant.ObjectID)
        this.setIntegrationContentStatusTopic('JMS Brokers')
        info('The next call might result in an error. This just means that JMS is not activated. The error will be ignored.')
        const item = await this.Connector.externalCall(Settings.Paths.JMSBrokers.path, true) as extJMSBroker
        await DELETE.from(extJMSBrokers).where({ 'toParent_ObjectID': this.Tenant.ObjectID })

        if (item) {
            await this.checkJMSBrokers(item)
            this.removeInvalidParameters(Entities.extJMSBrokers, item)
            item.toParent_ObjectID = this.Tenant.ObjectID
            try {
                await INSERT(item).into(extJMSBrokers)
            } catch (error) { info(error); throw error }
        }
        return item ? 1 : 0
    }
    private checkJMSBrokers = async (item: extJMSBroker) => {
        // await this.createError('JMS Broker', 'Prototype Limitation', item, 'This tenant contains a JMS Broker which is not supported in this prototype. Usage = ' + item.QueueNumber + '/' + item.MaxQueueNumber)
    }

    private getAccessPolicies = async (filter?: string[], oppositeFilter?: boolean): Promise<number> => {
        info('getAccessPolicies ' + this.Tenant.ObjectID)
        this.setIntegrationContentStatusTopic('Access Policies')
        let items = await this.Connector.externalCall(Settings.Paths.AccessPolicies.path) as extAccessPolicy[]
        if (filter && !oppositeFilter) items = items.filter(x => filter.includes(x.Id!))
        if (filter && oppositeFilter) items = items.filter(x => !filter.includes(x.Id!))

        await DELETE.from(Errors).where({
            toParent: this.Tenant.ObjectID,
            Component: TErrorComponentName.AccessPolicy,
            ...filter ? { ComponentName: { in: items.map(x => x.Id) } } : {}
        })

        this.removeInvalidParameters(Entities.extAccessPolicies, items)
        for (let each of items) {
            each.toParent_ObjectID = this.Tenant.ObjectID
        }
        await DELETE.from(extAccessPolicies).where({ 'toParent_ObjectID': this.Tenant.ObjectID, ...filter ? { Id: { in: items.map(x => x.Id) } } : {} })
        try {
            items.length > 0 && await INSERT(items).into(extAccessPolicies)
        } catch (error) { info(error); throw error }

        for (let each of items) {
            this.setIntegrationContentStatusItem(each.Id!)
            await this.getArtifactReferences(each.Id!, each.ObjectID!).then(n => this.NumberOfItems += n)
        }
        return items.length
    }
    private getArtifactReferences = async (accesspolicy_id: string, parent_id: string): Promise<number> => {
        info('getArtifactReferences ' + accesspolicy_id)
        const items = await this.Connector.externalCall(Settings.Paths.AccessPolicies.ArtifactReferences.path.replace('{ACCESSPOLICY_ID}', accesspolicy_id)) as extArtifactReference[]

        this.removeInvalidParameters(Entities.extArtifactReferences, items)
        for (let each of items) {
            each.toParent_ObjectID = parent_id
        }
        await DELETE.from(extArtifactReferences).where({ 'toParent_ObjectID': parent_id })
        try {
            items.length > 0 && await INSERT(items).into(extArtifactReferences)
        } catch (error) { info(error); throw error }

        return items.length
    }

    private getVariables = async (filter?: string[], oppositeFilter?: boolean): Promise<number> => {
        info('getVariables ' + this.Tenant.ObjectID)
        this.setIntegrationContentStatusTopic('Variables')
        let items = await this.Connector.externalCall(Settings.Paths.Variables.path) as extVariable[]
        if (filter && !oppositeFilter) items = items.filter(x => filter.includes(x.VariableName!))
        if (filter && oppositeFilter) items = items.filter(x => !filter.includes(x.VariableName!))

        await DELETE.from(Errors).where({
            toParent: this.Tenant.ObjectID,
            Component: TErrorComponentName.Variable,
            ...filter ? { ComponentName: { in: items.map(x => x.VariableName) } } : {}
        })

        this.removeInvalidParameters(Entities.extVariables, items)
        for (let each of items) {
            each.UpdatedAt = ContentDownloader.dateNotationToISO(each.UpdatedAt ?? '')
            each.RetainUntil = ContentDownloader.dateNotationToISO(each.RetainUntil ?? '')
            each.toParent_ObjectID = this.Tenant.ObjectID
        }
        await DELETE.from(extVariables).where({ 'toParent_ObjectID': this.Tenant.ObjectID, ...filter ? { VariableName: { in: items.map(x => x.VariableName) } } : {} })
        try {
            items.length > 0 && await INSERT(items).into(extVariables)
        } catch (error) { info(error); throw error }

        return items.length
    }

    private getDataStores = async (filter?: string[], oppositeFilter?: boolean): Promise<number> => {
        info('getDataStores ' + this.Tenant.ObjectID)
        this.setIntegrationContentStatusTopic('Data Stores')
        let items = await this.Connector.externalCall(Settings.Paths.DataStores.path) as extDataStore[]
        if (filter && !oppositeFilter) items = items.filter(x => filter.includes(x.DataStoreName!))
        if (filter && oppositeFilter) items = items.filter(x => !filter.includes(x.DataStoreName!))

        await DELETE.from(Errors).where({
            toParent: this.Tenant.ObjectID,
            Component: TErrorComponentName.DataStore,
            ...filter ? { ComponentName: { in: items.map(x => x.DataStoreName) } } : {}
        })

        await this.checkDataStores(items)

        this.removeInvalidParameters(Entities.extDataStores, items)
        for (let each of items) {
            each.toParent_ObjectID = this.Tenant.ObjectID
        }
        await DELETE.from(extDataStores).where({ 'toParent_ObjectID': this.Tenant.ObjectID, ...filter ? { DataStoreName: { in: items.map(x => x.DataStoreName) } } : {} })
        try {
            items.length > 0 && await INSERT(items).into(extDataStores)
        } catch (error) { info(error); throw error }

        for (let each of items) {
            this.setIntegrationContentStatusItem(each.DataStoreName!)
            await this.getDataStoreEntries(each.ObjectID!, each.DataStoreName!, each.IntegrationFlow!, each.Type!)
        }
        return items.length
    }
    private getDataStoreEntries = async (id: string, name: string, flow: string, type: string): Promise<number> => {
        info('getDataStoreEntries ' + name)
        const items = await this.Connector.externalCall(Settings.Paths.DataStores.Entries.path
            .replace('{DATA_STORE_NAME}', name)
            .replace('{INTEGRATION_FLOW}', flow)
            .replace('{TYPE}', type)
        ) as extDataStoreEntry[]

        this.removeInvalidParameters(Entities.extDataStoreEntries, items)
        for (let each of items) {
            each.DueAt = ContentDownloader.dateNotationToISO(each.DueAt ?? '')
            each.CreatedAt = ContentDownloader.dateNotationToISO(each.CreatedAt ?? '')
            each.RetainUntil = ContentDownloader.dateNotationToISO(each.RetainUntil ?? '')
            each.toParent_ObjectID = id
        }
        await DELETE.from(extDataStoreEntries).where({ 'toParent_ObjectID': id })
        try {
            items.length > 0 && await INSERT(items).into(extDataStoreEntries)
        } catch (error) { info(error); throw error }

        return items.length
    }
    private checkDataStores = async (items: extDataStore[]): Promise<number> => {
        var count = 0
        for (let each of items) {
            if (each.Type !== '')
                count += await this.createError(TErrorComponentName.IntegrationFlow, 'Error', each.IntegrationFlow, `Item relies on data store from ${each.Type} adapter, which can not be migrated`, Settings.Paths.DeepLinks.DataStores)
        }
        info('checkDataStores returned ' + count + ' errors.')
        return count
    }

    private generateLimitationNotices = async (): Promise<void> => {
        info('generateLimitationNotices ' + this.Tenant.ObjectID)
        this.setIntegrationContentStatusTopic('Finishing up')

        // if (this.Tenant.Environment == 'Neo') {
        //     const certificateUserMappings = (await this.Connector.externalCall(Settings.Paths.CertificateUserMappings.Neo.path)).map(x => x.User)
        //     certificateUserMappings.length > 0 && await this.createError('Certificate User Mapping', 'Limitation', { Name: 'See documentation' },
        //         'This tenant contains ' + certificateUserMappings.length + ' certificate user mapping(s) which are not supported for migration: ' + certificateUserMappings.join(', '), Settings.Paths.DeepLinks.LimitationsDocument)
        // }

        const dataStores = (await this.Connector.externalCall(Settings.Paths.DataStores.path) as extDataStore[])
            .filter(x => x.Type !== '')
            .map(x => `${x.DataStoreName} (${x.Type})`)
        dataStores.length > 0 && await this.createError(TErrorComponentName.DataStore, 'Limitation', { Name: 'See documentation' },
            'This tenant contains ' + dataStores.length + ' data store(s) which are not supported for migration: ' + dataStores.join(', '), Settings.Paths.DeepLinks.LimitationsDocument)

        // const variables = (await this.Connector.externalCall(Settings.Paths.Variables.path)).map(x => x.VariableName)
        // variables.length > 0 && await this.createError('Variables', 'Limitation', { Name: 'See documentation' },
        //     'This tenant contains ' + variables.length + ' variable(s) which are not supported for migration: ' + variables.join(', '), Settings.Paths.DeepLinks.LimitationsDocument)

    }
    private createError = async (component: TErrorComponentName, type: string, item: any, text: string, path: string | null = null): Promise<number> => {
        const fullPath = path ? (path.indexOf('https://') == 0 ? path : 'https://' + this.Tenant.Host + path) : ''
        const errorBody = {
            toParent: this.Tenant.ObjectID,
            Type: type,
            Component: component,
            ComponentName: (item && item.Name) || item.toString() || 'Generic',
            Description: text.slice(0, 5000),
            Path: fullPath,
            Severity: (type === 'Error' ? Settings.CriticalityCodes.Red : (type === 'Warning' ? Settings.CriticalityCodes.Orange : Settings.CriticalityCodes.Blue))
        }
        await INSERT(errorBody).into(Errors)
        return 1
    }
    private removeInvalidParameters = (entity: cds.entity, items: Object, allow: string[] = []): void => {
        const entityParams = Object.keys(entity.elements).concat(allow)
        const removed: string[] = []
        for (let each of Array.isArray(items) ? items : [items]) {
            const itemParams = Object.keys(each)
            const deleteParams = itemParams.filter(x => !entityParams.includes(x))
            deleteParams.map(x => removed.push(x) && delete each[x])
        }
        const removedText = removed.filter((x, i) => i === removed.indexOf(x)).join(', ')
        removedText.length > 0 && info('  the folowing parameters were provided by API, but not stored in database (extend database?): ' + removedText)

        /**
         * Truncate long strings if needed
         */
        try {
            const truncateMessage = '>> Truncated by CPI Migration Tool!'
            const entityStrings = Object.entries(entity.elements)
                .filter(([k, v]) => v.type == 'cds.String')
                .map(([k, v]) => { return [k, (v as cds.__String).length ?? cds.env.cdsc.defaultStringLength] })
            for (let each of Array.isArray(items) ? items : [items]) {
                entityStrings.forEach(param => {
                    if (param[0] in each && each[param[0]] && typeof each[param[0]] == 'string') {
                        const nEscapedChars = each[param[0]]?.match(/[\n\"\t\r\']/gm)?.length || 0
                        if (each[param[0]].toString().length > (param[1] - nEscapedChars)) {
                            each[param[0]] = each[param[0]].toString().slice(0, param[1] - truncateMessage.length - nEscapedChars - 1) + truncateMessage //quick hack for escaped chars for Postgres (which uses \r\n), need better solution.
                        }
                    }
                })
            }
        } catch (error) { info(error); throw error }
    }
    private static fixDateFormatIfNeeded = (value: string): string => {
        const dateFormat = /\/Date\((\d*)\)\//
        return dateFormat.test(value)
            ? (new Date(parseInt(value.match(dateFormat)?.at(1) || '0'))).toISOString()
            : value
    }
    private static fixSecurityArtifactDescriptor(oItem: any): void {
        if ('SecurityArtifactDescriptor' in oItem && typeof oItem.SecurityArtifactDescriptor == 'object') {
            Object.assign(oItem, {
                SecurityArtifactDescriptor_DeployedBy: oItem.SecurityArtifactDescriptor.DeployedBy,
                SecurityArtifactDescriptor_DeployedOn: oItem.SecurityArtifactDescriptor.DeployedOn,
                SecurityArtifactDescriptor_Status: oItem.SecurityArtifactDescriptor.Status,
                SecurityArtifactDescriptor_Type: oItem.SecurityArtifactDescriptor.Type,
            })
            delete oItem.SecurityArtifactDescriptor
        }
    }

    public downloadPackage = async (req: cds.Request | null, item: extIntegrationPackage): Promise<Buffer | null> => {
        info('downloading Package ' + item.Name)

        await this.Connector.refreshIntegrationToken()
        const response = await this.Connector.externalAxiosBinary(Settings.Paths.IntegrationPackages.download.replace('{PACKAGE_ID}', item.Id!))
        if (response.code >= 400) {
            const msg = 'Package "' + item.Name + '": Error (' + response.code + ') ' + response.value.error.message.value
            if (req) {
                req.error(400, msg)
            } else {
                warn(400, msg)
            }
            return null
        } else {
            return response.value.data
        }
    }
    public searchForEnvVarsInPackage = async (zipFile: Buffer, CustomizationModule: any = null): Promise<TArtifactAnalysis[]> => {
        var result: TArtifactAnalysis[] = []
        const zipContent = await new ZipHelper().readZip(zipFile)
        if (zipContent && zipContent['resources.cnt']) {
            const resourcesBase64 = zipContent['resources.cnt'].toString('utf-8')
            const resourcesJson = JSON.parse(Buffer.from(resourcesBase64, 'base64').toString('utf-8'))
            for (let resource of resourcesJson?.resources) {
                info('File ' + resource.id + ': ' + resource.resourceType)
                if (resource.resourceType == 'IFlow' || resource.resourceType == 'ScriptCollection') {
                    result = result.concat(await this.searchForEnvVarsInFile(zipContent, resource, CustomizationModule))
                }
            }
        }
        return result
    }
    private searchForEnvVarsInFile = async (zipContent: Record<string, Buffer>, entry: Record<string, any>, CustomizationModule: any): Promise<TArtifactAnalysis[]> => {
        info(" Artifact: " + entry.displayName)
        try {
            const zip = new ZipHelper()
            const unzipped = await zip.readZip(zipContent[entry.id + '_content'])
            const scriptFiles = Object.keys(unzipped).filter(x => x.match(Settings.RegEx.scriptFile))

            var result: TArtifactAnalysis[] = []
            for (let file of scriptFiles) {
                const content = unzipped[file].toString('utf-8')
                // const content = Buffer.from(unzipped[file], 'base64').toString('utf-8')
                info("  Script File: " + file + ' (' + content.length + ' bytes)')

                CustomizationModule && await CustomizationModule.onMigrateScript(file.replace('src/main/resources/script/', ''), entry.displayName, content)

                const matches = content.match(Settings.RegEx.scriptLine)
                info('   Matches found: ' + (matches?.length || 0))
                result.push({
                    artifact: String(entry.displayName),
                    file: file.replace('src/main/resources/script/', ''),
                    count: matches?.length || 0
                })
            }
            return result
        } catch (e: any) {
            info('Error: Skipping file: ' + (e.message || e))
            return [{
                artifact: String(entry.displayName),
                file: 'Could not analyze usage of system.getenv(): ' + (e.message || e),
                count: -1
            }]
        }
    }
    private searchForEmbeddedCertificateInPackage = async (zipFile: Buffer): Promise<TArtifactAnalysis[]> => {
        var result: TArtifactAnalysis[] = []
        const zipContent = await new ZipHelper().readZip(zipFile)
        if (zipContent && zipContent['resources.cnt']) {
            const resourcesBase64 = zipContent['resources.cnt'].toString('utf-8')
            const resourcesJson = JSON.parse(Buffer.from(resourcesBase64, 'base64').toString('utf-8'))
            for (let resource of resourcesJson?.resources) {
                info('File ' + resource.id + ': ' + resource.resourceType)
                if (resource.resourceType == 'IFlow') {
                    result = result.concat(await this.searchForEmbeddedCertificateInFile(zipContent, resource))
                }
            }
        }
        return result
    }
    private searchForEmbeddedCertificateInFile = async (zipContent: Record<string, Buffer>, entry: Record<string, any>): Promise<TArtifactAnalysis[]> => {
        info(" Artifact: " + entry.displayName)
        try {
            const zip = new ZipHelper()
            const unzipped = await zip.readZip(zipContent[entry.id + '_content'])
            const iflowFiles = Object.keys(unzipped).filter(x => x.match(Settings.RegEx.iflowFile))

            var result: TArtifactAnalysis[] = []
            for (let file of iflowFiles) {
                const content = unzipped[file].toString('utf-8')
                info("  iFlow File: " + file + ' (' + content.length + ' bytes)')

                var count = 0
                xml2js.parseString(content, (err, json: any) => {
                    if (!err) {
                        const participantIDs =
                            (
                                json?.['bpmn2:definitions']?.['bpmn2:collaboration']?.at(0)?.['bpmn2:participant']
                                    .filter((x: any) => x['$']['ifl:type'] == 'EndpointSender')
                                    .map((x: any) => x['$']['id'])
                            ) as String[] || []

                        participantIDs.forEach(p => {
                            const participantSettings = json['bpmn2:definitions']['bpmn2:collaboration']?.at(0)?.['bpmn2:messageFlow']?.find((x: any) => x['$']['sourceRef'] == p)
                            const senderAuthTypeProperty = participantSettings?.['bpmn2:extensionElements']?.at(0)?.['ifl:property']?.find((x: any) => x.key[0] == 'senderAuthType')
                            const senderAuthType = senderAuthTypeProperty?.value?.at(0)

                            if (senderAuthTypeProperty) info('    Participant ' + p + ' is a ' + participantSettings['$']['name'] + ' sender with authentication type set to ' + senderAuthType)
                            if (senderAuthType == 'ClientCertificate') count++
                        })

                        info('   Certificates found: ' + count)
                        result.push({
                            'artifact': String(entry.displayName),
                            'file': file.replace('src/main/resources/scenarioflows/integrationflow/', ''),
                            'count': count
                        })
                    }
                })
            }
            return result
        } catch (e: any) {
            info('Error: Skipping file: ' + (e.message || e))
            return [{
                artifact: String(entry.displayName),
                file: 'Could not analyze usage of embedded certificates: ' + (e.message || e),
                count: -1
            }]
        }
    }
    private setIntegrationContentStatusTopic = (topic: string): void => { this.IntegrationContentStatus.Topic = topic }
    private setIntegrationContentStatusItem = (item: string): void => { this.IntegrationContentStatus.Item = item }
    private setIntegrationContentStatusProgress = (progress: number): void => { this.IntegrationContentStatus.Progress = progress }
    private setIntegrationContentStatusProgressIncrease = (increase: number): void => { this.IntegrationContentStatus.Progress = (this.IntegrationContentStatus.Progress ?? 0) + increase }
    // private setIntegrationContentStatusRunning = (running: boolean): void => { this.IntegrationContentStatus.Running = running }

    /**
     * 
     * @param dateNotation a date expressed like /Date(123456)/
     * @returns a date expressed like YYYY-MM-DDTHH:MM:SS.mmmZ
     */
    private static dateNotationToISO = (dateNotation: string) => new Date(parseInt(dateNotation.match(Settings.RegEx.dateTimestamp)?.at(1) ?? '')).toISOString()

    private extractInfoFromPackage = async (Package: extIntegrationPackage): Promise<void> => {
        const packageContent = await this.downloadPackage(null, Package)
        if (!!packageContent) {

            // Verify scripts for environment variables
            (await this.searchForEnvVarsInPackage(packageContent))
                .filter(x => x.count! > 0)
                .forEach(async (x) => {
                    await this.createError(TErrorComponentName.IntegrationPackage, 'Info', Package, x.file + ' in ' + x.artifact + ' contains ' + x.count + ' occurences of System.getenv()')
                });

            // Search for embedded certificates
            (await this.searchForEmbeddedCertificateInPackage(packageContent))
                .filter(x => x.count! > 0)
                .forEach(async (x) => {
                    await this.createError(TErrorComponentName.IntegrationPackage, 'Warning', Package, 'Integration flow ' + x.artifact + ' contains ' + x.count + ' sender(s) which is configured for Client Certificate Authorization. This might no longer work after migration. Please convert to User Role Authorization first.')
                });
        }
    }

}
