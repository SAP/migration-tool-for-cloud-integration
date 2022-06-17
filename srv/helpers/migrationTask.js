const Settings = require('../config/settings');

class MigrationTask {
    constructor(t) {
        this.Task = t;
    };
    generateTaskNodes = async (preset) => {
        this.Task.toTaskNodes = await this._createNodes();
        await this._updateExistInTenantFlags();

        switch (preset) {
            case 'Skip All':
                this._setSkipAllValues();
                break;
            case 'Include All':
                this._setIncludeAllValues();
                break;
            case 'Optimal':
                this._setOptimalValues();
                break;
            default:
                break;
        }

        this.Task.toTaskNodes.length > 0 && await INSERT(this.Task.toTaskNodes).into(cds.entities.MigrationTaskNodes);
    };
    resetTaskNodes = async (preset) => {
        await DELETE.from(cds.entities.MigrationTaskNodes).where({ 'toMigrationTask_ObjectID': this.Task.ObjectID });
        await this.generateTaskNodes(preset);
    };
    updateExistInTenantFlags = async () => {
        const errorList = await this._updateExistInTenantFlags();
        await UPDATE(cds.entities.MigrationTasks, this.Task.ObjectID).with({ toTaskNodes: this.Task.toTaskNodes });
        return errorList;
    };
    _createNodes = async () => {
        var nodes = [];
        const SourceTenant = await SELECT.from(cds.entities.Tenants, { ObjectID: this.Task.SourceTenant_ObjectID })
            .columns(['ObjectID',
                {
                    ref: ['toIntegrationPackages'], expand: [
                        '*',
                        { ref: ['toIntegrationDesigntimeArtifacts'], expand: ['*'] },
                        { ref: ['toValueMappingDesigntimeArtifacts'], expand: ['*'] }
                    ]
                },
                { ref: ['toKeyStoreEntries'], expand: ['*'] },
                { ref: ['toUserCredentials'], expand: ['*'] },
                { ref: ['toOAuth2ClientCredentials'], expand: ['*'] },
                { ref: ['toNumberRanges'], expand: ['*'] },
                { ref: ['toAccessPolicies'], expand: ['*'] },
                { ref: ['toCustomTagConfigurations'], expand: ['*'] },
                { ref: ['toJMSBrokers'], expand: ['*'] },
                { ref: ['toVariables'], expand: ['*'] },
                { ref: ['toCertificateUserMappings'], expand: ['*'] }
            ]);

        for (let item of SourceTenant.toIntegrationPackages) {
            nodes.push({
                ObjectID: item.ObjectID,
                Id: item.Id,
                Name: item.Name,
                Component: Settings.ComponentNames.Package,
                PackageVendor: item.Vendor,
                toMigrationTask_ObjectID: this.Task.ObjectID
            });
            for (let artifact of item.toIntegrationDesigntimeArtifacts) {
                nodes.push({
                    ObjectID: artifact.ObjectID,
                    Id: artifact.Id,
                    Name: artifact.Id,
                    Component: Settings.ComponentNames.Flow,
                    toMigrationTask_ObjectID: this.Task.ObjectID,
                    PackageId: item.Id
                });
            }
            for (let valmap of item.toValueMappingDesigntimeArtifacts) {
                nodes.push({
                    ObjectID: valmap.ObjectID,
                    Id: valmap.Id,
                    Name: valmap.Name,
                    Component: Settings.ComponentNames.ValMap,
                    toMigrationTask_ObjectID: this.Task.ObjectID,
                    PackageId: item.Id
                });
            }
        };
        for (let item of SourceTenant.toKeyStoreEntries) {
            nodes.push({
                ObjectID: item.ObjectID,
                Id: item.Hexalias,
                Name: item.Alias,
                Component: Settings.ComponentNames.KeyStoreEntry,
                toMigrationTask_ObjectID: this.Task.ObjectID
            });
        };
        for (let item of SourceTenant.toUserCredentials) {
            nodes.push({
                ObjectID: item.ObjectID,
                Id: item.Name,
                Name: item.Name,
                Component: Settings.ComponentNames.Credentials,
                toMigrationTask_ObjectID: this.Task.ObjectID
            });
        };
        for (let item of SourceTenant.toOAuth2ClientCredentials) {
            nodes.push({
                ObjectID: item.ObjectID,
                Id: item.Name,
                Name: item.Name,
                Component: Settings.ComponentNames.OAuthCredential,
                toMigrationTask_ObjectID: this.Task.ObjectID
            });
        };
        for (let item of SourceTenant.toNumberRanges) {
            nodes.push({
                ObjectID: item.ObjectID,
                Id: item.Name,
                Name: item.Name,
                Component: Settings.ComponentNames.NumberRange,
                toMigrationTask_ObjectID: this.Task.ObjectID
            });
        };
        for (let item of SourceTenant.toAccessPolicies) {
            nodes.push({
                ObjectID: item.ObjectID,
                Id: item.RoleName,
                Name: item.RoleName,
                Component: Settings.ComponentNames.AccessPolicy,
                toMigrationTask_ObjectID: this.Task.ObjectID
            });
        };
        for (let item of SourceTenant.toCustomTagConfigurations) {
            nodes.push({
                ObjectID: item.ObjectID,
                Id: item.tagName,
                Name: item.tagName,
                Component: Settings.ComponentNames.CustomTags,
                toMigrationTask_ObjectID: this.Task.ObjectID
            });
        };
        for (let item of SourceTenant.toJMSBrokers) {
            nodes.push({
                ObjectID: item.ObjectID,
                Id: item.zKey,
                Name: item.zKey,
                Component: Settings.ComponentNames.JMSBrokers,
                toMigrationTask_ObjectID: this.Task.ObjectID
            });
        };
        for (let item of SourceTenant.toVariables.filter(x => x.Visibility == 'Global')) {
            nodes.push({
                ObjectID: item.ObjectID,
                Id: item.VariableName,
                Name: item.VariableName,
                Component: Settings.ComponentNames.Variables,
                toMigrationTask_ObjectID: this.Task.ObjectID
            });
        };
        for (let item of SourceTenant.toCertificateUserMappings) {
            nodes.push({
                ObjectID: item.ObjectID,
                Id: item.Id,
                Name: item.User,
                Component: Settings.ComponentNames.CertificateUserMappings,
                toMigrationTask_ObjectID: this.Task.ObjectID
            });
        };
        return nodes;
    }
    _updateExistInTenantFlags = async () => {
        var includedItemsNoLongerInSource = [];
        const SourceTenant = await SELECT.from(cds.entities.Tenants, { ObjectID: this.Task.SourceTenant_ObjectID })
            .columns(['ObjectID',
                {
                    ref: ['toIntegrationPackages'], expand: [
                        '*',
                        { ref: ['toIntegrationDesigntimeArtifacts'], expand: ['*'] },
                        { ref: ['toValueMappingDesigntimeArtifacts'], expand: ['*'] }
                    ]
                },
                { ref: ['toKeyStoreEntries'], expand: ['*'] },
                { ref: ['toUserCredentials'], expand: ['*'] },
                { ref: ['toOAuth2ClientCredentials'], expand: ['*'] },
                { ref: ['toNumberRanges'], expand: ['*'] },
                { ref: ['toAccessPolicies'], expand: ['*'] },
                { ref: ['toCustomTagConfigurations'], expand: ['*'] },
                { ref: ['toJMSBrokers'], expand: ['*'] },
                { ref: ['toVariables'], expand: ['*'] },
                { ref: ['toCertificateUserMappings'], expand: ['*'] }
            ]);
        const TargetTenant = await SELECT.from(cds.entities.Tenants, { ObjectID: this.Task.TargetTenant_ObjectID })
            .columns(['ObjectID',
                {
                    ref: ['toIntegrationPackages'], expand: [
                        '*',
                        { ref: ['toIntegrationDesigntimeArtifacts'], expand: ['*'] },
                        { ref: ['toValueMappingDesigntimeArtifacts'], expand: ['*'] }
                    ]
                },
                { ref: ['toKeyStoreEntries'], expand: ['*'] },
                { ref: ['toUserCredentials'], expand: ['*'] },
                { ref: ['toOAuth2ClientCredentials'], expand: ['*'] },
                { ref: ['toNumberRanges'], expand: ['*'] },
                { ref: ['toAccessPolicies'], expand: ['*'] },
                { ref: ['toCustomTagConfigurations'], expand: ['*'] },
                { ref: ['toJMSBrokers'], expand: ['*'] },
                { ref: ['toVariables'], expand: ['*'] },
                { ref: ['toCertificateUserMappings'], expand: ['*'] }
            ]);

        for (let node of this.Task.toTaskNodes) {
            switch (node.Component) {
                case Settings.ComponentNames.Package:
                    node.ExistInSource = SourceTenant.toIntegrationPackages.findIndex(x => x.Id == node.Id) >= 0;
                    node.ExistInTarget = TargetTenant.toIntegrationPackages.findIndex(x => x.Id == node.Id) >= 0;
                    break;
                case Settings.ComponentNames.KeyStoreEntry:
                    node.ExistInSource = SourceTenant.toKeyStoreEntries.findIndex(x => x.Hexalias == node.Id) >= 0;
                    node.ExistInTarget = TargetTenant.toKeyStoreEntries.findIndex(x => x.Hexalias == node.Id) >= 0;
                    break;
                case Settings.ComponentNames.Credentials:
                    node.ExistInSource = SourceTenant.toUserCredentials.findIndex(x => x.Name == node.Id) >= 0;
                    node.ExistInTarget = TargetTenant.toUserCredentials.findIndex(x => x.Name == node.Id) >= 0;
                    break;
                case Settings.ComponentNames.OAuthCredential:
                    node.ExistInSource = SourceTenant.toOAuth2ClientCredentials.findIndex(x => x.Name == node.Id) >= 0;
                    node.ExistInTarget = TargetTenant.toOAuth2ClientCredentials.findIndex(x => x.Name == node.Id) >= 0;
                    break;
                case Settings.ComponentNames.NumberRange:
                    node.ExistInSource = SourceTenant.toNumberRanges.findIndex(x => x.Name == node.Id) >= 0;
                    node.ExistInTarget = TargetTenant.toNumberRanges.findIndex(x => x.Name == node.Id) >= 0;
                    break;
                case Settings.ComponentNames.AccessPolicy:
                    node.ExistInSource = SourceTenant.toAccessPolicies.findIndex(x => x.RoleName == node.Id) >= 0;
                    node.ExistInTarget = TargetTenant.toAccessPolicies.findIndex(x => x.RoleName == node.Id) >= 0;
                    break;
                case Settings.ComponentNames.CustomTags:
                    node.ExistInSource = SourceTenant.toCustomTagConfigurations.findIndex(x => x.tagName == node.Id) >= 0;
                    node.ExistInTarget = TargetTenant.toCustomTagConfigurations.findIndex(x => x.tagName == node.Id) >= 0;
                    break;
                case Settings.ComponentNames.JMSBrokers:
                    node.ExistInSource = SourceTenant.toJMSBrokers.findIndex(x => x.zKey == node.Id) >= 0;
                    node.ExistInTarget = TargetTenant.toJMSBrokers.findIndex(x => x.zKey == node.Id) >= 0;
                    break;
                case Settings.ComponentNames.Variables:
                    node.ExistInSource = SourceTenant.toVariables.findIndex(x => x.VariableName == node.Id) >= 0;
                    node.ExistInTarget = TargetTenant.toVariables.findIndex(x => x.VariableName == node.Id) >= 0;
                    break;
                case Settings.ComponentNames.CertificateUserMappings:
                    node.ExistInSource = SourceTenant.toCertificateUserMappings.findIndex(x => x.Id == node.Id) >= 0;
                    node.ExistInTarget = TargetTenant.toCertificateUserMappings.findIndex(x => x.Id == node.Id) >= 0;
                    break;
                default:
                    break;
            };
            node.Included && node.ExistInSource == false && includedItemsNoLongerInSource.push(node.Id + ' (' + node.Component + ')');
        };
        return includedItemsNoLongerInSource;
    };
    _setOptimalValues = () => {
        this.Task.toTaskNodes.forEach(node => {
            node.Included = (node.ExistInSource && !node.ExistInTarget);
        });
    };
    _setIncludeAllValues = () => {
        this.Task.toTaskNodes.forEach(node => {
            node.Included = true;
        });
    };
    _setSkipAllValues = () => {
        this.Task.toTaskNodes.forEach(node => {
            node.Included = false;
        });
    };
};
module.exports = {
    MigrationTask: MigrationTask
};