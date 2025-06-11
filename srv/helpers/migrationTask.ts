import cds from '@sap/cds'

import { Settings } from '../config/settings'

import {
    MigrationTask,
    MigrationTasks,
    MigrationTaskNode,
    MigrationTaskNodes,
    Tenants,
    Tenant
} from '#cds-models/ConfigService'

import { TMigrationTaskPresets } from '#cds-models/migrationtool'

const { info, warn } = cds.log('MigrationTaskHelper')

export default class MigrationTaskHelper {
    Task: MigrationTask

    constructor(task: MigrationTask) {
        this.Task = task
    }

    public generateTaskNodes = async (preset: TMigrationTaskPresets): Promise<void> => {
        this.Task.toTaskNodes = await this.buildNodesFromContent()
        await this.updateNodesWithExistInFlags()

        if (preset == TMigrationTaskPresets.SkipAll) { this.Task.toTaskNodes.forEach(node => node.Included = false) }
        if (preset == TMigrationTaskPresets.IncludeAll) { this.Task.toTaskNodes.forEach(node => node.Included = true) }
        if (preset == TMigrationTaskPresets.Optimal) { this.Task.toTaskNodes.forEach(node => node.Included = (node.ExistInSource && !node.ExistInTarget)) }

        this.Task.toTaskNodes.length > 0 && await INSERT.into(MigrationTaskNodes).entries(this.Task.toTaskNodes)
    }

    public resetTaskNodes = async (preset: TMigrationTaskPresets): Promise<void> => {
        await DELETE.from(MigrationTaskNodes).where({ toMigrationTask_ObjectID: this.Task.ObjectID })
        await this.generateTaskNodes(preset)
    }

    public updateExistInTenantFlags = async (): Promise<string[]> => {
        const errorList = await this.updateNodesWithExistInFlags()
        await UPDATE(MigrationTasks, this.Task.ObjectID).with({ toTaskNodes: this.Task.toTaskNodes })
        return errorList
    }

    private getTenantDetails = async (ObjectID: string): Promise<Tenant> => {
        return await SELECT.one.from(Tenants, ObjectID)
            .columns(x => {
                x.ObjectID,
                    x.toIntegrationPackages(y => {
                        y('*'),
                            y.toIntegrationDesigntimeArtifacts('*'),
                            y.toValueMappingDesigntimeArtifacts('*')
                    }),
                    x.toKeyStoreEntries('*'),
                    x.toUserCredentials('*'),
                    x.toOAuth2ClientCredentials('*'),
                    x.toNumberRanges('*'),
                    x.toAccessPolicies('*'),
                    x.toCustomTagConfigurations('*'),
                    x.toJMSBrokers('*'),
                    x.toVariables('*'),
                    x.toCertificateUserMappings('*'),
                    x.toDataStores('*')
            }) as Tenant
    }
    private buildNodesFromContent = async (): Promise<MigrationTaskNode[]> => {
        const nodes: MigrationTaskNode[] = []

        const Tenant = await this.getTenantDetails(this.Task.SourceTenant_ObjectID!)

        for (let item of Tenant.toIntegrationPackages!) {
            nodes.push({
                ObjectID: item.ObjectID,
                Id: item.Id,
                Name: item.Name,
                Component: Settings.ComponentNames.Package,
                PackageVendor: item.Vendor,
                toMigrationTask_ObjectID: this.Task.ObjectID
            })
            for (let artifact of item.toIntegrationDesigntimeArtifacts!) {
                nodes.push({
                    ObjectID: artifact.ObjectID,
                    Id: artifact.Id,
                    Name: artifact.Id,
                    Component: Settings.ComponentNames.Flow,
                    toMigrationTask_ObjectID: this.Task.ObjectID,
                    PackageId: item.Id
                })
            }
            for (let valmap of item.toValueMappingDesigntimeArtifacts!) {
                nodes.push({
                    ObjectID: valmap.ObjectID,
                    Id: valmap.Id,
                    Name: valmap.Name,
                    Component: Settings.ComponentNames.ValMap,
                    toMigrationTask_ObjectID: this.Task.ObjectID,
                    PackageId: item.Id
                })
            }
        }
        for (let item of Tenant.toKeyStoreEntries!) {
            nodes.push({
                ObjectID: item.ObjectID,
                Id: item.Hexalias,
                Name: item.Alias,
                Component: Settings.ComponentNames.KeyStoreEntry,
                toMigrationTask_ObjectID: this.Task.ObjectID
            })
        }
        for (let item of Tenant.toUserCredentials!) {
            nodes.push({
                ObjectID: item.ObjectID,
                Id: item.Name,
                Name: item.Name,
                Component: Settings.ComponentNames.Credentials,
                toMigrationTask_ObjectID: this.Task.ObjectID
            })
        }
        for (let item of Tenant.toOAuth2ClientCredentials!) {
            nodes.push({
                ObjectID: item.ObjectID,
                Id: item.Name,
                Name: item.Name,
                Component: Settings.ComponentNames.OAuthCredential,
                toMigrationTask_ObjectID: this.Task.ObjectID
            })
        }
        for (let item of Tenant.toNumberRanges!) {
            nodes.push({
                ObjectID: item.ObjectID,
                Id: item.Name,
                Name: item.Name,
                Component: Settings.ComponentNames.NumberRange,
                toMigrationTask_ObjectID: this.Task.ObjectID
            })
        }
        for (let item of Tenant.toAccessPolicies!) {
            nodes.push({
                ObjectID: item.ObjectID,
                Id: item.RoleName,
                Name: item.RoleName,
                Component: Settings.ComponentNames.AccessPolicy,
                toMigrationTask_ObjectID: this.Task.ObjectID
            })
        }
        for (let item of Tenant.toCustomTagConfigurations!) {
            nodes.push({
                ObjectID: item.ObjectID,
                Id: item.tagName,
                Name: item.tagName,
                Component: Settings.ComponentNames.CustomTags,
                toMigrationTask_ObjectID: this.Task.ObjectID
            })
        }
        for (let item of Tenant.toJMSBrokers!) {
            nodes.push({
                ObjectID: item.ObjectID,
                Id: item.Key,
                Name: item.Key,
                Component: Settings.ComponentNames.JMSBrokers,
                toMigrationTask_ObjectID: this.Task.ObjectID
            })
        }
        for (let item of Tenant.toVariables?.filter((x: any) => x.Visibility == 'Global')!) {
            nodes.push({
                ObjectID: item.ObjectID,
                Id: item.VariableName,
                Name: item.VariableName,
                Component: Settings.ComponentNames.Variables,
                toMigrationTask_ObjectID: this.Task.ObjectID
            })
        }
        for (let item of Tenant.toDataStores?.filter((x: any) => x.Visibility == 'Global')!) { //FILTER ???
            nodes.push({
                ObjectID: item.ObjectID,
                Id: item.DataStoreName,
                Name: item.DataStoreName,
                Component: Settings.ComponentNames.DataStores,
                toMigrationTask_ObjectID: this.Task.ObjectID
            })
        }
        for (let item of Tenant.toCertificateUserMappings!) {
            nodes.push({
                ObjectID: item.ObjectID,
                Id: item.Id,
                Name: item.User,
                Component: Settings.ComponentNames.CertificateUserMappings,
                toMigrationTask_ObjectID: this.Task.ObjectID
            })
        }

        info(`${nodes.length} migration task nodes generated`)
        return nodes
    }

    private updateNodesWithExistInFlags = async (): Promise<string[]> => {
        const includedItemsNoLongerInSource: string[] = []

        const SourceTenant = await this.getTenantDetails(this.Task.SourceTenant_ObjectID!)
        const TargetTenant = await this.getTenantDetails(this.Task.TargetTenant_ObjectID!)

        if (this.Task.toTaskNodes)
            for (let node of this.Task.toTaskNodes) {
                switch (node.Component) {
                    case Settings.ComponentNames.Package:
                        node.ExistInSource = SourceTenant.toIntegrationPackages!.findIndex(x => x.Id == node.Id) >= 0
                        node.ExistInTarget = TargetTenant.toIntegrationPackages!.findIndex(x => x.Id == node.Id) >= 0
                        break
                    case Settings.ComponentNames.KeyStoreEntry:
                        node.ExistInSource = SourceTenant.toKeyStoreEntries!.findIndex(x => x.Hexalias == node.Id) >= 0
                        node.ExistInTarget = TargetTenant.toKeyStoreEntries!.findIndex(x => x.Hexalias == node.Id) >= 0
                        break
                    case Settings.ComponentNames.Credentials:
                        node.ExistInSource = SourceTenant.toUserCredentials!.findIndex(x => x.Name == node.Id) >= 0
                        node.ExistInTarget = TargetTenant.toUserCredentials!.findIndex(x => x.Name == node.Id) >= 0
                        break
                    case Settings.ComponentNames.OAuthCredential:
                        node.ExistInSource = SourceTenant.toOAuth2ClientCredentials!.findIndex(x => x.Name == node.Id) >= 0
                        node.ExistInTarget = TargetTenant.toOAuth2ClientCredentials!.findIndex(x => x.Name == node.Id) >= 0
                        break
                    case Settings.ComponentNames.NumberRange:
                        node.ExistInSource = SourceTenant.toNumberRanges!.findIndex(x => x.Name == node.Id) >= 0
                        node.ExistInTarget = TargetTenant.toNumberRanges!.findIndex(x => x.Name == node.Id) >= 0
                        break
                    case Settings.ComponentNames.AccessPolicy:
                        node.ExistInSource = SourceTenant.toAccessPolicies!.findIndex(x => x.RoleName == node.Id) >= 0
                        node.ExistInTarget = TargetTenant.toAccessPolicies!.findIndex(x => x.RoleName == node.Id) >= 0
                        break
                    case Settings.ComponentNames.CustomTags:
                        node.ExistInSource = SourceTenant.toCustomTagConfigurations!.findIndex(x => x.tagName == node.Id) >= 0
                        node.ExistInTarget = TargetTenant.toCustomTagConfigurations!.findIndex(x => x.tagName == node.Id) >= 0
                        break
                    case Settings.ComponentNames.JMSBrokers:
                        node.ExistInSource = SourceTenant.toJMSBrokers!.findIndex(x => x.Key == node.Id) >= 0
                        node.ExistInTarget = TargetTenant.toJMSBrokers!.findIndex(x => x.Key == node.Id) >= 0
                        break
                    case Settings.ComponentNames.Variables:
                        node.ExistInSource = SourceTenant.toVariables!.findIndex(x => x.VariableName == node.Id) >= 0
                        node.ExistInTarget = TargetTenant.toVariables!.findIndex(x => x.VariableName == node.Id) >= 0
                        break
                    case Settings.ComponentNames.CertificateUserMappings:
                        node.ExistInSource = SourceTenant.toCertificateUserMappings!.findIndex(x => x.Id == node.Id) >= 0
                        node.ExistInTarget = TargetTenant.toCertificateUserMappings!.findIndex(x => x.Id == node.Id) >= 0
                        break
                    case Settings.ComponentNames.DataStores:
                        node.ExistInSource = SourceTenant.toDataStores!.findIndex(x => x.DataStoreName == node.Id) >= 0
                        node.ExistInTarget = TargetTenant.toDataStores!.findIndex(x => x.DataStoreName == node.Id) >= 0
                        break
                    default:
                        break
                }
                if (node.Included && node.ExistInSource == false) {
                    includedItemsNoLongerInSource.push(node.Id + ' (' + node.Component + ')')
                }
            }
        if (includedItemsNoLongerInSource.length > 0) {
            warn(`This task contains ${includedItemsNoLongerInSource} items which do not exist in the source tenant anymore. Refresh needed.`)
        }
        return includedItemsNoLongerInSource
    }

}
