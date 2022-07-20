const Connectivity = require('./externalConnection');
const Settings = require('../config/settings');
const ZipHelper = require('./zip');
const xml2js = require('xml2js');
const assert = require('assert');

class ContentDownloader {
    constructor(t) {
        this.Tenant = t;
        this.stats = {
            Statistics_numIntegrationPackages: 0,
            Statistics_numIntegrationDesigntimeArtifacts: 0,
            Statistics_numConfigurations: 0,
            Statistics_numResources: 0,
            Statistics_numValueMappingDesigntimeArtifacts: 0,
            Statistics_numValMapSchema: 0,
            Statistics_numCustomTags: 0,
            Statistics_numKeyStoreEntries: 0,
            Statistics_numUserCredentials: 0,
            Statistics_numCustomTagConfigurations: 0,
            Statistics_numNumberRanges: 0,
            Statistics_numAccessPolicies: 0,
            Statistics_numAccessPolicyReferences: 0,
            Statistics_numOAuth2ClientCredentials: 0,
            Statistics_numJMSBrokers: 0,
            Statistics_numVariables: 0,
            Statistics_numCertificateUserMappings: 0
        };
        this.Connector = this.Tenant && new Connectivity.ExternalConnection(this.Tenant);
        this.OAuth2ClientCredentialsList = [];
    }

    validatePreconditions = () => {
        const configurationOK = this.Tenant.Environment == 'Neo' ?
            this.Tenant.Neo_accountid &&
            this.Tenant.Neo_Platform_domain &&
            this.Tenant.Neo_Platform_user &&
            this.Tenant.Neo_Platform_password
            :
            this.Tenant.CF_organizationID &&
            this.Tenant.CF_organizationName &&
            this.Tenant.CF_spaceID &&
            this.Tenant.CF_spaceName &&
            this.Tenant.CF_servicePlanID &&
            this.Tenant.CF_Platform_domain &&
            this.Tenant.CF_Platform_user &&
            this.Tenant.CF_Platform_password;

        if (this.Tenant.UseForCertificateUserMappings) {
            assert(configurationOK, 'Tenant is not yet fully configured. Please complete the configuration in the \'Register Tenants\' application.');
        }
    };

    getIntegrationContent = async () => {
        console.log('getIntegrationContent ' + this.Tenant.ObjectID);

        this.validatePreconditions();

        await this.Connector.refreshIntegrationToken();
        await DELETE.from('Errors').where({ 'toParent': this.Tenant.ObjectID });

        await this.getIntegrationPackages().then(n => this.stats.Statistics_numIntegrationPackages += n);

        await this.getKeyStoreEntries().then(n => this.stats.Statistics_numKeyStoreEntries += n);
        await this.getNumberRanges().then(n => this.stats.Statistics_numNumberRanges += n);
        await this.getCustomTagConfigurations().then(n => this.stats.Statistics_numCustomTagConfigurations += n);
        await this.getAccessPolicies().then(n => this.stats.Statistics_numAccessPolicies += n);

        await this.getOAuth2ClientCredentials().then(n => this.stats.Statistics_numOAuth2ClientCredentials += n);
        await this.getUserCredentials().then(n => this.stats.Statistics_numUserCredentials += n);
        await this.getVariables().then(n => this.stats.Statistics_numVariables += n);

        if (this.Tenant.UseForCertificateUserMappings) {
            if (this.Tenant.Environment == 'Neo') {
                await this.getNeoCertificateUserMappings().then(n => this.stats.Statistics_numCertificateUserMappings += n);
            } else {
                await this.getCFCertificateUserMappings().then(n => this.stats.Statistics_numCertificateUserMappings += n);
            }
        } else {
            await DELETE.from('extCertificateUserMappingRoles').where({ 'toParent_ObjectID': this.Tenant.ObjectID });
            await DELETE.from('extCertificateUserMappings').where({ 'toParent_ObjectID': this.Tenant.ObjectID });
        }

        await this.getJMSBrokers().then(n => this.stats.Statistics_numJMSBrokers += n);

        await this.generateLimitationNotices();

        var count = 0;
        for (let i of Object.keys(this.stats)) { count += this.stats[i] };

        this.stats.RefreshedDate = (new Date()).toISOString();
        await UPDATE(cds.entities.Tenants, this.Tenant.ObjectID).with(this.stats);

        console.log('Done: ' + count + ' items.');
        return count;
    };

    getIntegrationPackages = async () => {
        console.log('getIntegrationPackages ' + this.Tenant.ObjectID);
        const items = await this.Connector.externalCall(Settings.Paths.IntegrationPackages.path);
        await this.checkIntegrationPackages(items);

        this.removeInvalidParameters(cds.entities.extIntegrationPackages, items);
        for (let each of items) {
            delete each.IntegrationDesigntimeArtifacts;

            each.toParent_ObjectID = this.Tenant.ObjectID;
            each.ModifiedDateFormatted = (new Date(parseInt(each.ModifiedDate))).toUTCString();
        }
        await DELETE.from('extIntegrationPackages').where({ 'toParent_ObjectID': this.Tenant.ObjectID });
        items.length > 0 && await INSERT(items).into('extIntegrationPackages');

        for (let each of items) {
            await this.getIntegrationDesigntimeArtifacts(each.Id, each.ObjectID).then(n => this.stats.Statistics_numIntegrationDesigntimeArtifacts += n);
            await this.getValueMappingDesigntimeArtifacts(each.Id, each.ObjectID).then(n => this.stats.Statistics_numValueMappingDesigntimeArtifacts += n);
            await this.getCustomTags(each.Id, each.ObjectID).then(n => this.stats.Statistics_numCustomTags += n);

            // Search for Env Vars + Embedded Certificates for custom packages only:
            if (Settings.Flags.AnalyzePackageContentWhenRefreshingConent && (each.Vendor != 'SAP' && each.PartnerContent != true)) {
                const packageContent = await this.downloadPackage(null, each);
                const envVarsResult = packageContent && await this.searchForEnvVarsInPackage(packageContent);
                if (envVarsResult) {
                    envVarsResult.filter(x => x.count > 0).forEach(async (x) => await this.createError('Integration Package', 'Info', each, x.file + ' in ' + x.artifact + ' contains ' + x.count + ' occurences of System.getenv()'));
                } else {
                    console.log('Could not analyze script files.');
                }

                const embeddedCertificatesResult = packageContent && await this.searchForEmbeddedCertificateInPackage(packageContent);
                if (embeddedCertificatesResult) {
                    embeddedCertificatesResult.filter(x => x.count > 0).forEach(async (x) => await this.createError('Integration Package', 'Warning', each, 'Integration flow ' + x.artifact + ' contains ' + x.count + ' sender(s) which is configured for Client Certificate Authorization. This might no longer work after migration. Please convert to User Role Authorization first.'));
                } else {
                    console.log('Could not analyze embedded certificates.');
                }
            }
        }
        return items.length;
    };
    checkIntegrationPackages = async (items) => {
        var count = 0;
        for (let each of items) {
            if ((each.Vendor == "SAP" || each.PartnerContent == true) && each.UpdateAvailable == true)
                count += await this.createError('Integration Package', 'Error', each, 'Item is not in the latest version', Settings.Paths.DeepLinks.PackageOverview.replace('{PACKAGE_ID}', each.Id));
        }
        console.log('checkIntegrationPackages returned ' + count + ' errors.');
        return count;
    };

    getIntegrationDesigntimeArtifacts = async (package_id, parent_id) => {
        console.log('getIntegrationDesigntimeArtifacts ' + package_id + ' with parent ID: ' + parent_id);
        const items = await this.Connector.externalCall(Settings.Paths.IntegrationPackages.IntegrationDesigntimeArtifacts.path.replace('{PACKAGE_ID}', package_id));
        await this.checkIntegrationDesigntimeArtifacts(items, package_id);

        this.removeInvalidParameters(cds.entities.extIntegrationDesigntimeArtifacts, items);
        for (let each of items) {
            delete each.Configurations;
            delete each.Resources;

            each.toParent_ObjectID = parent_id;
            each.toParent_Id = package_id;
        }
        await DELETE.from('extIntegrationDesigntimeArtifacts').where({ 'toParent_ObjectID': parent_id });
        items.length > 0 && await INSERT(items).into('extIntegrationDesigntimeArtifacts');

        if (Settings.Flags.DownloadConfigurationsAndResources) {
            for (let each of items) {
                await this.getConfigurations(package_id, each.Id, each.ObjectID).then(n => this.stats.Statistics_numConfigurations += n);
                await this.getResources(package_id, each.Id, each.ObjectID).then(n => this.stats.Statistics_numResources += n);
            }
        }
        return items.length;
    };
    checkIntegrationDesigntimeArtifacts = async (items, package_id) => {
        var count = 0;
        for (let each of items) {
            if (each.Version == "Active")
                count += await this.createError('Integration Flow', 'Error', each, 'Item is in Draft state (package: ' + package_id + ')', Settings.Paths.DeepLinks.PackageArtifacts.replace('{PACKAGE_ID}', each.PackageId));
        }
        console.log('checkIntegrationDesigntimeArtifacts returned ' + count + ' errors.');
        return count;
    };

    getConfigurations = async (package_id, artifact_id, parent_id) => {
        console.log('getConfigurations ' + package_id + ' / ' + artifact_id);
        const items = await this.Connector.externalCall(Settings.Paths.IntegrationPackages.IntegrationDesigntimeArtifacts.Configurations.path.replace('{ARTIFACT_ID}', artifact_id));

        this.removeInvalidParameters(cds.entities.extConfigurations, items);
        for (let each of items) {
            each.toParent_ObjectID = parent_id;
            each.toParent_Id = artifact_id;
        };
        await DELETE.from('extConfigurations').where({ 'toParent_ObjectID': parent_id });
        items.length > 0 && await INSERT(items).into('extConfigurations');

        return items.length;
    };

    getResources = async (package_id, artifact_id, parent_id) => {
        console.log('getResources ' + package_id + ' / ' + artifact_id);

        // HACK:
        // if (package_id != 'eDocumentElectronicInvoicingforItaly') {
        const items = await this.Connector.externalCall(Settings.Paths.IntegrationPackages.IntegrationDesigntimeArtifacts.Resources.path.replace('{ARTIFACT_ID}', artifact_id));

        this.removeInvalidParameters(cds.entities.extResources, items);
        for (let each of items) {
            each.toParent_ObjectID = parent_id;
            each.toParent_Id = artifact_id;
        };
        await DELETE.from('extResources').where({ 'toParent_ObjectID': parent_id });
        items.length > 0 && await INSERT(items).into('extResources');

        return items.length;
        // } else {
        //     return 0;
        // }
    };

    getValueMappingDesigntimeArtifacts = async (package_id, parent_id) => {
        console.log('getValueMappingDesigntimeArtifacts ' + package_id);
        const items = await this.Connector.externalCall(Settings.Paths.IntegrationPackages.ValueMappingDesigntimeArtifacts.path.replace('{PACKAGE_ID}', package_id));
        await this.checkValueMappingDesigntimeArtifacts(items);

        this.removeInvalidParameters(cds.entities.extValueMappingDesigntimeArtifacts, items);
        for (let each of items) {
            delete each.ValMapSchema;
            each.toParent_ObjectID = parent_id;
            each.toParent_Id = package_id;
        };
        await DELETE.from('extValueMappingDesigntimeArtifacts').where({ 'toParent_ObjectID': parent_id });
        items.length > 0 && await INSERT(items).into('extValueMappingDesigntimeArtifacts');

        for (let each of items) {
            if (each.Version != 'Draft') // API can not download content of Draft items
                await this.getValMapSchema(package_id, each.Id, each.Version, each.ObjectID).then(n => this.stats.Statistics_numValMapSchema += n);
        }

        return items.length;
    };
    checkValueMappingDesigntimeArtifacts = async (items) => {
        var count = 0;
        for (let each of items) {
            if (each.Version == "Active" || each.Version == "Draft") {
                count += await this.createError('Value Mapping', 'Error', each, 'Item is in Draft state', Settings.Paths.DeepLinks.PackageArtifacts.replace('{PACKAGE_ID}', each.PackageId));
            }
        }
        console.log('checkValueMappingDesigntimeArtifacts returned ' + count + ' errors.');
        return count;
    };

    getValMapSchema = async (package_id, artifact_id, version_id, parent_id) => {
        console.log('getValMapSchema ' + package_id + ' / ' + artifact_id);
        const items = await this.Connector.externalCall(Settings.Paths.IntegrationPackages.ValueMappingDesigntimeArtifacts.ValMapSchema.path.replace('{ARTIFACT_ID}', artifact_id).replace('{VERSION_ID}', version_id));

        this.removeInvalidParameters(cds.entities.extValMapSchema, items);
        for (let each of items) {
            delete each.ValMaps;
            delete each.DefaultValMaps;

            each.toParent_ObjectID = parent_id;
            each.toParent_Id = artifact_id;
            each.toParent_Version = version_id;
        };
        await DELETE.from('extValMapSchema').where({ 'toParent_ObjectID': parent_id });
        items.length > 0 && await INSERT(items).into('extValMapSchema');

        return items.length;
    };

    getCustomTags = async (package_id, parent_id) => {
        console.log('getCustomTags ' + package_id);
        const items = await this.Connector.externalCall(Settings.Paths.IntegrationPackages.CustomTags.path.replace('{PACKAGE_ID}', package_id));

        this.removeInvalidParameters(cds.entities.extCustomTags, items);
        for (let each of items) {
            each.toParent_ObjectID = parent_id;
            each.toParent_Id = package_id;
        };
        await DELETE.from('extCustomTags').where({ 'toParent_ObjectID': parent_id });
        items.length > 0 && await INSERT(items).into('extCustomTags');

        return items.length;
    };

    getKeyStoreEntries = async () => {
        console.log('getKeyStoreEntries ' + this.Tenant.ObjectID);
        const items = (await this.Connector.externalCall(Settings.Paths.KeyStoreEntries.path)).filter(x => x.Owner != 'SAP');

        const itemsSupported = items.filter(x => x.Type == 'Certificate');
        if (items.length > itemsSupported.length) {
            const notSupported = items.filter(x => !itemsSupported.includes(x)).map(x => x.Alias);
            await this.createError('Keystore Entry', 'Limitation', { Name: 'See documentation' }, 'This tenant contains ' + notSupported.length + ' keystore entries which are not supported for migration: ' + notSupported.join(', '), Settings.Paths.DeepLinks.LimitationsDocument);
        }

        this.removeInvalidParameters(cds.entities.extKeyStoreEntries, itemsSupported);
        for (let each of itemsSupported) {
            each.toParent_ObjectID = this.Tenant.ObjectID;
        };
        await DELETE.from('extKeyStoreEntries').where({ 'toParent_ObjectID': this.Tenant.ObjectID });
        itemsSupported.length > 0 && await INSERT(itemsSupported).into('extKeyStoreEntries');

        return itemsSupported.length;
    };

    getNumberRanges = async () => {
        console.log('getNumberRanges ' + this.Tenant.ObjectID);
        const items = await this.Connector.externalCall(Settings.Paths.NumberRanges.path);

        this.removeInvalidParameters(cds.entities.extNumberRanges, items);
        for (let each of items) {
            each.toParent_ObjectID = this.Tenant.ObjectID;
        };
        await DELETE.from('extNumberRanges').where({ 'toParent_ObjectID': this.Tenant.ObjectID });
        items.length > 0 && await INSERT(items).into('extNumberRanges');

        return items.length;
    };

    getCustomTagConfigurations = async () => {
        console.log('getCustomTagConfigurations ' + this.Tenant.ObjectID);
        var items = await this.Connector.externalCall(Settings.Paths.CustomTagConfigurations.path);
        items = items.customTagsConfiguration;

        this.removeInvalidParameters(cds.entities.extCustomTagConfigurations, items);
        for (let each of items) {
            each.toParent_ObjectID = this.Tenant.ObjectID;
        };
        await DELETE.from('extCustomTagConfigurations').where({ 'toParent_ObjectID': this.Tenant.ObjectID });
        items.length > 0 && await INSERT(items).into('extCustomTagConfigurations');

        return items.length;
    };

    getUserCredentials = async () => {
        console.log('getUserCredentials ' + this.Tenant.ObjectID);
        const items = await this.Connector.externalCall(Settings.Paths.UserCredentials.path);

        const itemsSupported = items.filter(x => (x.Kind == 'default' || x.Kind == 'successfactors'));
        const itemsNotSupported = items.filter(x => (!itemsSupported.includes(x) && (!this.OAuth2ClientCredentialsList.includes(x.Name)))).map(x => x.Name);
        if (itemsNotSupported.length > 0) {
            await this.createError('User Credential', 'Limitation', { Name: 'See documentation' }, 'This tenant contains ' + itemsNotSupported.length + ' user credential(s) which are not supported for migration: ' + itemsNotSupported.join(', '), Settings.Paths.DeepLinks.LimitationsDocument);
        }
        await this.checkUserCredentials(itemsSupported);

        this.removeInvalidParameters(cds.entities.extUserCredentials, itemsSupported, ['SecurityArtifactDescriptor']);
        for (let each of itemsSupported) {
            each.toParent_ObjectID = this.Tenant.ObjectID;
        };
        await DELETE.from('extUserCredentials').where({ 'toParent_ObjectID': this.Tenant.ObjectID });
        itemsSupported.length > 0 && await INSERT(itemsSupported).into('extUserCredentials');

        return itemsSupported.length;
    };
    checkUserCredentials = async (items) => {
        var count = 0;
        for (let each of items) {
            if (each.SecurityArtifactDescriptor.DeployedBy == this.Tenant.Oauth_clientid)
                count += await this.createError('User Credential', 'Warning', each, 'Item created by migration tool. Please update with the correct password/secret', Settings.Paths.DeepLinks.SecurityMaterial);
        }
        console.log('checkUserCredentials returned ' + count + ' errors.');
        return count;
    };

    getOAuth2ClientCredentials = async () => {
        console.log('getOAuth2ClientCredentials ' + this.Tenant.ObjectID);
        const items = await this.Connector.externalCall(Settings.Paths.OAuth2ClientCredentials.path);
        await this.checkOAuth2ClientCredentials(items);

        this.OAuth2ClientCredentialsList = items.map(x => x.Name); // save the OAuth credentials which will come back in UserCredentials

        this.removeInvalidParameters(cds.entities.extOAuth2ClientCredentials, items, ['SecurityArtifactDescriptor']);
        for (let each of items) {
            each.toParent_ObjectID = this.Tenant.ObjectID;
        };
        await DELETE.from('extOAuth2ClientCredentials').where({ 'toParent_ObjectID': this.Tenant.ObjectID });
        items.length > 0 && await INSERT(items).into('extOAuth2ClientCredentials');

        return items.length;
    };
    checkOAuth2ClientCredentials = async (items) => {
        var count = 0;
        for (let each of items) {
            if (each.SecurityArtifactDescriptor.DeployedBy == this.Tenant.Oauth_clientid)
                count += await this.createError('OAuth2 Client Credential', 'Warning', each, 'Item created by migration tool. Please update with the correct password/secret', Settings.Paths.DeepLinks.SecurityMaterial);
        }
        console.log('checkOAuth2ClientCredentials returned ' + count + ' errors.');
        return count;
    };

    getNeoCertificateUserMappings = async () => {
        console.log('getNeoCertificateUserMappings ' + this.Tenant.ObjectID);
        const items = await this.Connector.externalCall(Settings.Paths.CertificateUserMappings.Neo.path);

        this.removeInvalidParameters(cds.entities.extCertificateUserMappings, items);
        for (let each of items) {
            each.toParent_ObjectID = this.Tenant.ObjectID;

            each.LastModifiedTime = new Date(parseInt(each.LastModifiedTime.match(Settings.RegEx.dateTimestamp)[1]));
            each.ValidUntil = new Date(parseInt(each.ValidUntil));
        };
        await DELETE.from('extCertificateUserMappings').where({ 'toParent_ObjectID': this.Tenant.ObjectID });
        items.length > 0 && await INSERT(items).into('extCertificateUserMappings');

        for (let each of items) {
            await this.getNeoRolesForUser(each);
        }

        return items.length;
    };
    getNeoRolesForUser = async (certificateUserMapping) => {
        console.log('getNeoRolesForUser ' + certificateUserMapping.User);
        const items = await this.Connector.externalPlatformCall(Settings.Paths.CertificateUserMappings.Neo.Roles
            .replace('{ACCOUNT_ID}', this.Tenant.Neo_accountid)
            .replace('{USER_ID}', certificateUserMapping.User)
        );
        assert(items !== null, 'Could not retrieve roles for Neo account ' + this.Tenant.Neo_accountid + '. Verify connection settings.');

        const roles = items.roles || [];
        this.removeInvalidParameters(cds.entities.extCertificateUserMappingRoles, roles);

        for (let each of roles) {
            each.toParent_ObjectID = certificateUserMapping.ObjectID;
            each.toParent_User = certificateUserMapping.User;
        };
        await DELETE.from('extCertificateUserMappingRoles').where({ 'toParent_ObjectID': certificateUserMapping.ObjectID });
        roles.length > 0 && await INSERT(roles).into('extCertificateUserMappingRoles');

        return roles.length;
    };

    getCFCertificateUserMappings = async () => {
        console.log('getCFCertificateUserMappings ' + this.Tenant.ObjectID);
        const items = await this.Connector.externalPlatformCall(Settings.Paths.CertificateUserMappings.CF.ServiceInstances
            .replace('{SPACE_ID}', this.Tenant.CF_spaceID)
            .replace('{SERVICEPLAN_ID}', this.Tenant.CF_servicePlanID)
        );
        assert(items !== null, 'Could not retrieve service instances for CF space ' + this.Tenant.CF_spaceID + '. Verify connection settings.');

        const instances = items.resources || [];
        const userMappings = instances.filter(x => x.last_operation.state == 'succeeded').map(x => {
            return {
                toParent_ObjectID: this.Tenant.ObjectID,
                Id: x.guid,
                User: x.name,
                LastModifiedBy: null,
                LastModifiedTime: x.updated_at,
                ValidUntil: null
            }
        });
        await DELETE.from('extCertificateUserMappings').where({ 'toParent_ObjectID': this.Tenant.ObjectID });
        userMappings.length > 0 && await INSERT(userMappings).into('extCertificateUserMappings');

        for (let each of userMappings) {
            await this.getCFCertificateUserMappingBindings(each);
        }

        return userMappings.length;
    };
    getCFCertificateUserMappingBindings = async (instance) => {
        console.log('getCFCertificateUserMappingBindings ' + instance.User);
        const items = await this.Connector.externalPlatformCall(Settings.Paths.CertificateUserMappings.CF.ServiceBindings.replace('{SERVICE_INSTANCE_ID}', instance.Id));
        assert(items !== null, 'Could not retrieve service bindings for CF space ' + this.Tenant.CF_spaceID + '. Verify connection settings.');
        const bindings = items.resources || [];

        // console.log(bindings);

        const credentials = bindings.filter(x => x.last_operation.state == 'succeeded').map(x => {
            return {
                toParent_ObjectID: instance.ObjectID,
                toParent_User: instance.User,
                name: x.name,
                applicationName: null,
                providerAccount: null
            }
        });
        await DELETE.from('extCertificateUserMappingRoles').where({ 'toParent_ObjectID': instance.ObjectID });
        credentials.length > 0 && await INSERT(credentials).into('extCertificateUserMappingRoles');

        return credentials.length;
    };

    getJMSBrokers = async () => {
        console.log('getJMSBrokers ' + this.Tenant.ObjectID);
        console.log('The next call might result in an error. This just means that JMS is not activated. The error will be ignored.');
        const item = await this.Connector.externalCall(Settings.Paths.JMSBrokers.path, true);
        await DELETE.from('extJMSBrokers').where({ 'toParent_ObjectID': this.Tenant.ObjectID });

        if (item) {
            await this.checkJMSBrokers(item);
            item.zKey = item.Key;

            this.removeInvalidParameters(cds.entities.extJMSBrokers, item);

            item.toParent_ObjectID = this.Tenant.ObjectID;
            await INSERT(item).into('extJMSBrokers');
        }
        return item ? 1 : 0;
    };
    checkJMSBrokers = async (item) => {
        // await this.createError('JMS Broker', 'Prototype Limitation', item, 'This tenant contains a JMS Broker which is not supported in this prototype. Usage = ' + item.QueueNumber + '/' + item.MaxQueueNumber);
    };

    getAccessPolicies = async () => {
        console.log('getAccessPolicies ' + this.Tenant.ObjectID);
        const items = await this.Connector.externalCall(Settings.Paths.AccessPolicies.path);

        this.removeInvalidParameters(cds.entities.extAccessPolicies, items);
        for (let each of items) {
            each.toParent_ObjectID = this.Tenant.ObjectID;
        };
        await DELETE.from('extAccessPolicies').where({ 'toParent_ObjectID': this.Tenant.ObjectID });
        items.length > 0 && await INSERT(items).into('extAccessPolicies');

        for (let each of items) {
            await this.getArtifactReferences(each.Id, each.ObjectID).then(n => this.stats.Statistics_numAccessPolicyReferences += n);
        }
        return items.length;
    };
    getArtifactReferences = async (accesspolicy_id, parent_id) => {
        console.log('getArtifactReferences ' + accesspolicy_id);
        const items = await this.Connector.externalCall(Settings.Paths.AccessPolicies.ArtifactReferences.path.replace('{ACCESSPOLICY_ID}', accesspolicy_id));

        this.removeInvalidParameters(cds.entities.extArtifactReferences, items);
        for (let each of items) {
            each.toParent_ObjectID = parent_id;
        };
        await DELETE.from('extArtifactReferences').where({ 'toParent_ObjectID': parent_id });
        items.length > 0 && await INSERT(items).into('extArtifactReferences');

        return items.length;
    };

    getVariables = async () => {
        console.log('getVariables ' + this.Tenant.ObjectID);
        const items = await this.Connector.externalCall(Settings.Paths.Variables.path);

        this.removeInvalidParameters(cds.entities.extVariables, items);
        for (let each of items) {
            each.UpdatedAt = new Date(parseInt(each.UpdatedAt.match(Settings.RegEx.dateTimestamp)[1]));
            each.RetainUntil = new Date(parseInt(each.RetainUntil.match(Settings.RegEx.dateTimestamp)[1]));
            each.toParent_ObjectID = this.Tenant.ObjectID;
        };
        await DELETE.from('extVariables').where({ 'toParent_ObjectID': this.Tenant.ObjectID });
        items.length > 0 && await INSERT(items).into('extVariables');

        return items.length;
    };

    generateLimitationNotices = async () => {
        console.log('generateLimitationNotices ' + this.Tenant.ObjectID);

        // if (this.Tenant.Environment == 'Neo') {
        //     const certificateUserMappings = (await this.Connector.externalCall(Settings.Paths.CertificateUserMappings.Neo.path)).map(x => x.User);
        //     certificateUserMappings.length > 0 && await this.createError('Certificate User Mapping', 'Limitation', { Name: 'See documentation' },
        //         'This tenant contains ' + certificateUserMappings.length + ' certificate user mapping(s) which are not supported for migration: ' + certificateUserMappings.join(', '), Settings.Paths.DeepLinks.LimitationsDocument);
        // }

        const dataStores = (await this.Connector.externalCall(Settings.Paths.DataStores.path)).map(x => x.DataStoreName);
        dataStores.length > 0 && await this.createError('Data Store', 'Limitation', { Name: 'See documentation' },
            'This tenant contains ' + dataStores.length + ' data store(s) which are not supported for migration: ' + dataStores.join(', '), Settings.Paths.DeepLinks.LimitationsDocument);

        // const variables = (await this.Connector.externalCall(Settings.Paths.Variables.path)).map(x => x.VariableName);
        // variables.length > 0 && await this.createError('Variables', 'Limitation', { Name: 'See documentation' },
        //     'This tenant contains ' + variables.length + ' variable(s) which are not supported for migration: ' + variables.join(', '), Settings.Paths.DeepLinks.LimitationsDocument);

    };
    createError = async (component, type, item, text, path = null) => {
        const fullPath = path ? (path.indexOf('https://') == 0 ? path : 'https://' + this.Tenant.Host + path) : '';
        const errorBody = {
            toParent: this.Tenant.ObjectID,
            Type: type,
            Component: component,
            ComponentName: (item && item.Name) || 'Generic',
            Description: text,
            Path: fullPath,
            Severity: (type === 'Error' ? Settings.CriticalityCodes.Red : (type === 'Warning' ? Settings.CriticalityCodes.Orange : Settings.CriticalityCodes.Blue))
        };
        await INSERT(errorBody).into('Errors');
        return 1;
    };
    removeInvalidParameters = (entity, items, allow = []) => {
        const entityParams = Object.keys(entity.elements).concat(allow);
        const removed = [];
        for (let each of Array.isArray(items) ? items : [items]) {
            const itemParams = Object.keys(each);
            const deleteParams = itemParams.filter(x => !entityParams.includes(x));
            deleteParams.map(x => removed.push(x) && delete each[x]);
        }
        const removedText = removed.filter((x, i) => i === removed.indexOf(x)).join(', ');
        removedText.length > 0 && console.log('  the folowing parameters were provided by API, but not stored in database (extend database?): ' + removedText);
    };

    /************************* */
    // searchForEnvVarsInPackage is a function which will analyze the zip file of the package and search for any 
    // script file containing 'system.getenv()'. These environment variables will need to be updated when migrating
    // to cloud foundry so we have to alert the user about their usage in scripts.
    /************************* */
    downloadPackage = async (req, item) => {
        console.log('downloading Package ' + item.Name);

        await this.Connector.refreshIntegrationToken();
        const response = await this.Connector.externalAxiosBinary(Settings.Paths.IntegrationPackages.download.replace('{PACKAGE_ID}', item.Id));
        if (response.code >= 400) {
            req && req.error('Package "' + item.Name + '": Error (' + response.code + ') ' + response.value.error.message.value);
            return false;
        } else {
            return response.value.data;
        }
    };
    // downloadPackageAndSearchForEnvVars = async (req, item) => {
    //     console.log('checkScripts ' + item.Name);

    //     await this.Connector.refreshIntegrationToken();
    //     const response = await this.Connector.externalAxiosBinary(Settings.Paths.IntegrationPackages.download.replace('{PACKAGE_ID}', item.Id));
    //     if (response.code >= 400) {
    //         req && req.error('Package "' + item.Name + '": Error (' + response.code + ') ' + response.value.error.message.value);
    //         return false;
    //     } else {
    //         return await this.searchForEnvVarsInPackage(response.value.data);
    //     }
    // };
    searchForEnvVarsInPackage = async (zipFile, CustomizationModule = null) => {
        var result = [];
        const zip = new ZipHelper.ZipHelper();
        const zipContent = await zip.readZip(Buffer.from(zipFile));
        if (zipContent && zipContent['resources.cnt']) {
            const resourcesBase64 = Buffer.from(zipContent['resources.cnt']).toString('utf-8');
            const resourcesJson = JSON.parse(Buffer.from(resourcesBase64, 'base64').toString('utf-8'));
            for (let resource of resourcesJson.resources) {
                console.log('File ' + resource.id + ': ' + resource.resourceType);
                if (resource.resourceType == 'IFlow' || resource.resourceType == 'ScriptCollection') {
                    result = result.concat(await this.searchForEnvVarsInFile(zipContent, resource, CustomizationModule));
                }
            }
        }
        return result;
    };
    searchForEnvVarsInFile = async (zipContent, entry, CustomizationModule) => {
        console.log(" Artifact: " + entry.displayName);
        try {
            const zip = new ZipHelper.ZipHelper();
            const unzipped = await zip.readZip(zipContent[entry.id + '_content']);
            const scriptFiles = Object.keys(unzipped).filter(x => x.match(Settings.RegEx.scriptFile));

            var result = [];
            for (let file of scriptFiles) {
                const content = Buffer.from(unzipped[file], 'base64').toString('utf-8');
                console.log("  Script File: " + file + ' (' + content.length + ' bytes)');

                CustomizationModule && await CustomizationModule.onMigrateScript(file.replace('src/main/resources/script/', ''), entry.displayName, content);

                const matches = content.match(Settings.RegEx.scriptLine);
                console.log('   Matches found: ' + ((matches && matches.length) || 0));
                result.push({
                    'artifact': entry.displayName,
                    'file': file.replace('src/main/resources/script/', ''),
                    'count': (matches && matches.length) || 0
                });
            };
            return result;
        } catch (e) {
            console.log('Error: Skipping file: ' + (e.message || e));
            return [{
                'artifact': entry.displayName,
                'file': 'Could not analyze usage of system.getenv(): ' + (e.message || e),
                'count': -1
            }];
        }
    };
    searchForEmbeddedCertificateInPackage = async (zipFile, CustomizationModule = null) => {
        var result = [];
        const zip = new ZipHelper.ZipHelper();
        const zipContent = await zip.readZip(Buffer.from(zipFile));
        if (zipContent && zipContent['resources.cnt']) {
            const resourcesBase64 = Buffer.from(zipContent['resources.cnt']).toString('utf-8');
            const resourcesJson = JSON.parse(Buffer.from(resourcesBase64, 'base64').toString('utf-8'));
            for (let resource of resourcesJson.resources) {
                console.log('File ' + resource.id + ': ' + resource.resourceType);
                if (resource.resourceType == 'IFlow') {
                    result = result.concat(await this.searchForEmbeddedCertificateInFile(zipContent, resource, CustomizationModule));
                }
            }
        }
        return result;
    };
    searchForEmbeddedCertificateInFile = async (zipContent, entry, CustomizationModule) => {
        console.log(" Artifact: " + entry.displayName);
        try {
            const zip = new ZipHelper.ZipHelper();
            const unzipped = await zip.readZip(zipContent[entry.id + '_content']);
            const iflowFiles = Object.keys(unzipped).filter(x => x.match(Settings.RegEx.iflowFile));

            var result = [];
            for (let file of iflowFiles) {
                const content = Buffer.from(unzipped[file], 'base64').toString('utf-8');
                console.log("  iFlow File: " + file + ' (' + content.length + ' bytes)');

                var count = 0;
                const json = await new Promise((resolve, reject) => {
                    xml2js.parseString(content, (err, result) => {
                        if (err) return reject(err);
                        resolve(result);
                    });
                });

                const jsonDefinitions = json['bpmn2:definitions'] || false;
                const jsonCollaboration = jsonDefinitions && jsonDefinitions['bpmn2:collaboration'] || false;
                const jsonElements = jsonCollaboration[0] || {};
                const participantIDs = jsonElements['bpmn2:participant'] && jsonElements['bpmn2:participant'].filter(x => x['$']['ifl:type'] == 'EndpointSender').map(x => x['$']['id']) || [];
            
                participantIDs.forEach(p => {
                    const participantSettings = jsonElements['bpmn2:messageFlow'] && jsonElements['bpmn2:messageFlow'].find(x => x['$']['sourceRef'] == p) || false;
                    const properties = participantSettings && participantSettings['bpmn2:extensionElements'][0]['ifl:property'] || false;
                    const senderAuthTypeProperty = properties && properties.find(x => x.key[0] == 'senderAuthType') || false;
                    const senderAuthType = senderAuthTypeProperty && senderAuthTypeProperty.value[0];
            
                    if (senderAuthTypeProperty) console.log('    Participant ' + p + ' is a ' + participantSettings['$']['name'] + ' sender with authentication type set to ' + senderAuthType);
                    if (senderAuthType == 'ClientCertificate') count++;
                });

                console.log('   Certificates found: ' + count);
                result.push({
                    'artifact': entry.displayName,
                    'file': file.replace('src/main/resources/scenarioflows/integrationflow/', ''),
                    'count': count
                });
            };
            return result;
        } catch (e) {
            console.log('Error: Skipping file: ' + (e.message || e));
            return [{
                'artifact': entry.displayName,
                'file': 'Could not analyze usage of embedded certificates: ' + (e.message || e),
                'count': -1
            }];
        }
    };
};

module.exports = {
    ContentDownloader: ContentDownloader
};
