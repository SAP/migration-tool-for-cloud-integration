const Connectivity = require('./externalConnection');
const Settings = require('../config/settings');
const CustomLogicHelper = require('../customizing/customLogic');
const DownloadHelper = require('../helpers/contentDownloader');
const ZipHelper = require('./zip');
const fs = require('fs');
const xml2js = require('xml2js');
const assert = require('assert');

class MigrationJob {
    constructor(j) {
        this.Job = j;

        this.Task = null;
        this.MigrationContent = {};
        this.Log = '';
        this.ConnectorSource = null;
        this.ConnectorTarget = null;

        this.ErrorList = [];
        this.WarningList = [];

        this.runResult = false;
        this.Customizations = null;

        this.Variables = [];
    };

    execute = async () => {
        try {
            await new Promise(r => setTimeout(r, 1000));
            await this.setStartTime();

            await this.clearLogEntries();
            await this.addLogEntry(0, 'Starting Migration Execution of Job ' + this.Job.ObjectID);
            await this.setStatus('Running', Settings.CriticalityCodes.Blue);

            this.Task = await SELECT.from('MigrationTasks', { ObjectID: this.Job.MigrationTaskID })
                .columns(['*', { ref: ['toTaskNodes'], expand: ['*'] }, { ref: ['SourceTenant'], expand: ['*'] }, { ref: ['TargetTenant'], expand: ['*'] }]);
            await this.addLogEntry(0, 'Task details: ' + this.Task.Name + ' (' + this.Task.ObjectID + ')');

            this.Customizations = new CustomLogicHelper.CustomLogic(this.Task.CustomConfig, this.addLogEntry, this.generateWarning, this.generateError);
            await this.addLogEntry(0, 'Custom parameters used for this job:\r\n' + this.Task.CustomConfig);

            this.Task.SourceTenant === null && await this.generateError('Internal', 'Task Configuration', 'No source tenant specified.');
            if (this.Task.SourceTenant) {
                this.ConnectorSource = new Connectivity.ExternalConnection(this.Task.SourceTenant);
                await this.ConnectorSource.refreshIntegrationToken();
                await this.addLogEntry(0, 'Source: ' + this.Task.SourceTenant.Name);
            }

            this.Task.TargetTenant === null && await this.generateError('Internal', 'Task Configuration', 'No target tenant specified.');
            if (this.Task.TargetTenant) {
                this.ConnectorTarget = new Connectivity.ExternalConnection(this.Task.TargetTenant);
                await this.ConnectorTarget.refreshIntegrationToken();
                await this.addLogEntry(0, 'Target: ' + this.Task.TargetTenant.Name);
            }

            this.runResult = await this.migrateContent();

        } catch (e) {
            await this.generateError('Internal', 'Job Execution', e.message || e);
        } finally {
            if (this.runResult == true) {
                await this.addLogEntry(0, 'Migration completed.');
                this.ErrorList.length == 0 && this.WarningList.length == 0 && await this.setStatus('Finished', Settings.CriticalityCodes.Green, false);
                this.ErrorList.length == 0 && this.WarningList.length > 0 && await this.setStatus('Finished with Warnings', Settings.CriticalityCodes.Green, false);
                this.ErrorList.length > 0 && await this.setStatus('Finished with Errors', Settings.CriticalityCodes.Red, false);
            } else {
                await this.setStatus('Failed', Settings.CriticalityCodes.Red, false);
                await this.addLogEntry(0, 'Migration prematurely failed:');
            }

            this.ErrorList.length == 0 ? await this.addLogEntry(0, 'No errors reported.') : await this.addLogEntry(0, this.ErrorList.length + ' errors reported:');
            for (let error of this.ErrorList) await this.addLogEntry(1, error);

            this.WarningList.length == 0 ? await this.addLogEntry(0, 'No warnings reported.') : await this.addLogEntry(0, this.WarningList.length + ' warnings reported:');;
            for (let warning of this.WarningList) await this.addLogEntry(1, warning);
        }

        // if (this.runResult == true && Settings.Flags.DownloadTargetIntegrationContentAfterMigrationRun == true) {
        //     cds.spawn({ tenant: 't0', after: 1000 }, async (tx) => {
        //         const srv = await cds.connect.to('ConfigService');
        //         await srv.Tenant_getIntegrationContent('Tenants', this.Task.SourceTenant.ObjectID);
        //     })
        // }

        await this.setEndTime();
    };
    migrateContent = async () => {
        try {
            this.MigrationContent.IntegrationPackages = this.Task.toTaskNodes.filter(x => (x.Component == Settings.ComponentNames.Package && x.Included && !x.ConfigureOnly)).map(x => x.Id);
            this.MigrationContent.IntegrationPackagesConfigOnly = this.Task.toTaskNodes.filter(x => (x.Component == Settings.ComponentNames.Package && x.Included && x.ConfigureOnly)).map(x => x.Id);
            this.MigrationContent.DesignTimeArtifacts = this.Task.toTaskNodes.filter(x => (x.Component == Settings.ComponentNames.Flow && x.Included)).map(x => x.Id);
            this.MigrationContent.ValueMappingDesigntimeArtifacts = this.Task.toTaskNodes.filter(x => (x.Component == Settings.ComponentNames.ValMap && x.Included)).map(x => x.Id);
            this.MigrationContent.KeyStoreEntries = this.Task.toTaskNodes.filter(x => (x.Component == Settings.ComponentNames.KeyStoreEntry && x.Included)).map(x => x.Id);
            this.MigrationContent.NumberRanges = this.Task.toTaskNodes.filter(x => (x.Component == Settings.ComponentNames.NumberRange && x.Included)).map(x => x.Id);
            this.MigrationContent.CustomTagConfigurations = this.Task.toTaskNodes.filter(x => (x.Component == Settings.ComponentNames.CustomTags && x.Included)).map(x => x.Id);
            this.MigrationContent.UserCredentials = this.Task.toTaskNodes.filter(x => (x.Component == Settings.ComponentNames.Credentials && x.Included)).map(x => x.Id);
            this.MigrationContent.OAuth2ClientCredentials = this.Task.toTaskNodes.filter(x => (x.Component == Settings.ComponentNames.OAuthCredential && x.Included)).map(x => x.Id);
            this.MigrationContent.AccessPolicies = this.Task.toTaskNodes.filter(x => (x.Component == Settings.ComponentNames.AccessPolicy && x.Included)).map(x => x.Id);
            this.MigrationContent.JMSBrokers = this.Task.toTaskNodes.filter(x => (x.Component == Settings.ComponentNames.JMSBrokers && x.Included)).map(x => x.Id);
            this.MigrationContent.GlobalVariables = this.Task.toTaskNodes.filter(x => (x.Component == Settings.ComponentNames.Variables && x.Included)).map(x => x.Id);
            this.MigrationContent.CertificateUserMappings = this.Task.toTaskNodes.filter(x => (x.Component == Settings.ComponentNames.CertificateUserMappings && x.Included)).map(x => x.Id);

            await this.getListOfVariables();
            await this.migrateGlobalVariables();

            await this.migrateIntegrationPackages();
            await this.migrateCustomCertificates();

            await this.migrateNumberRanges();
            await this.migrateCustomTagConfigurations();
            await this.migrateUserCredentials();
            await this.migrateOAuth2ClientCredentials();
            await this.migrateAccessPolicies();

            if (this.Task.SourceTenant.UseForCertificateUserMappings) {
                if (this.Task.SourceTenant.Environment == 'Neo') {
            await this.migrateCertificateUserMappings();
                }
            }
            await this.migrateJMSBrokers();

            return true;
        } catch (error) {
            await this.addLogEntry(0, 'CRITICAL ERROR: ' + error);
            await this.generateError('Internal', 'Job Execution', error);
            return false;
        }
    };

    getListOfVariables = async () => {
        await this.addLogEntry(1, 'VARIABLES:');
        const items = await this.ConnectorSource.externalCall(Settings.Paths.Variables.path);

        for (let item of items) {
            this.Variables.push(item);
        }
        await this.addLogEntry(2, 'Found ' + this.Variables.filter(x => x.Visibility == 'Global').length + ' Global variables');
        await this.addLogEntry(2, 'Found ' + this.Variables.filter(x => x.Visibility != 'Global').length + ' Local variables');
    };
    migrateGlobalVariables = async () => {
        await this.addLogEntry(1, 'GLOBAL VARIABLES:');

        const items = await this.ConnectorSource.externalCall(Settings.Paths.Variables.path);
        const itemsInScope = items.filter(x => this.MigrationContent.GlobalVariables.includes(x.VariableName));

        const itemsNotFound = this.MigrationContent.GlobalVariables.filter(x => !itemsInScope.find(e => e.VariableName == x));
        itemsNotFound && await this.addMissingContentErrors(itemsNotFound);

        await this.addLogEntry(2, 'Retrieving Variables:');
        const variables = [];
        for (let item of itemsInScope) {
            const keyvaluepair = await this.getVariableData(item);
            await this.Customizations.onMigrateGlobalVariable(keyvaluepair);
            if (keyvaluepair != null) {
                variables.push(
                    '<row>'
                    + '<cell>' + keyvaluepair.key + '</cell>'
                    + '<cell></cell>'
                    + '<cell>constant</cell>'
                    + '<cell>' + keyvaluepair.value + '</cell>'
                    + '<cell>' + 'global' + '</cell>'
                    + '</row>'
                );
            }
        };

        const variablesByFlows = [{
            flowId: Settings.Defaults.Variables.flowId,
            variables: variables
        }];
        if (variables.length > 0) {
            const successCount = await this.migrateVariables(variablesByFlows, Settings.Defaults.Variables.packageId);
            await this.addLogEntry(2, successCount + '/' + itemsInScope.length + ' successful.');
        } else {
            await this.addLogEntry(2, 'No items to migrate.');
        }
    };
    migrateLocalVariables = async (flowIds) => {
        await this.addLogEntry(2, 'START LOCAL VARIABLES for package:');

        const items = await this.ConnectorSource.externalCall(Settings.Paths.Variables.path);
        const itemsInScope = items.filter(x => x.Visibility == 'Integration Flow' && flowIds.includes(x.IntegrationFlow));

        await this.addLogEntry(2, 'Retrieving Variables:');
        const variablesByFlows = [];
        for (const flowId of flowIds) {
            const variablesByFlow = {
                flowId: flowId,
                variables: []
            };
            for (let item of itemsInScope.filter(x => x.IntegrationFlow == flowId)) {
                const keyvaluepair = await this.getVariableData(item);
                await this.Customizations.onMigrateLocalVariable(keyvaluepair);
                if (keyvaluepair != null) {
                    variablesByFlow.variables.push(
                        '<row>'
                        + '<cell>' + keyvaluepair.key + '</cell>'
                        + '<cell></cell>'
                        + '<cell>constant</cell>'
                        + '<cell>' + keyvaluepair.value + '</cell>'
                        + '<cell>' + 'local' + '</cell>'
                        + '</row>'
                    );
                }
            };
            if (variablesByFlow.variables.length > 0) {
                variablesByFlows.push(variablesByFlow);
            }
        }

        if (variablesByFlows.length > 0) {
            const successCount = await this.migrateVariables(variablesByFlows, Settings.Defaults.Variables.packageId);
            await this.addLogEntry(2, successCount + '/' + itemsInScope.length + ' successful.');
        } else {
            await this.addLogEntry(2, 'No items to migrate.');
        }

        await this.addLogEntry(2, 'END LOCAL VARIABLES for package.');
    };
    migrateVariables = async (variablesByFlows, packageId) => {
        await this.addLogEntry(2, 'Compiling integration flows ...');
        var successCount = 0;

        const createPackageSuccess = await this.variablesCreateIntegrationPackage(packageId);
        if (createPackageSuccess) {
            for (const variablesByFlow of variablesByFlows) {
                const zipHelper = new ZipHelper.ZipHelper();
                const updatedIntegrationFlowContent = await zipHelper.manipulateZipFile(Settings.Defaults.Variables.templateFile, Settings.Defaults.Variables.iflwFileInZip, async data => {
                    return await this.variablesSetValueInXML(data, variablesByFlow.variables.join(''));
                });

                await this.addLogEntry(2, 'Uploading Variables for ' + variablesByFlow.flowId + ':');
                const createFlowSuccess = await this.variablesCreateIntegrationFlow(packageId, variablesByFlow.flowId, updatedIntegrationFlowContent);
                const deployFlowSuccess = createFlowSuccess && await this.variablesDeployIntegrationFlow(variablesByFlow.flowId);

                if (deployFlowSuccess) {
                    await this.addLogEntry(3, 'Checking status of flow ' + variablesByFlow.flowId);
                    const startTime = Date.now();
                    var deployStatus = '';
                    var waitAndFetchAgain = true;
                    while (waitAndFetchAgain) {
                        await this.sleep(Settings.Defaults.Variables.sleepInterval);
                        deployStatus = await this.variablesGetIntegrationFlowDeploymentStatus(variablesByFlow.flowId);
                        await this.addLogEntry(4, '... ' + deployStatus);
                        waitAndFetchAgain = deployStatus !== Settings.Defaults.Variables.successStatus
                            && deployStatus !== Settings.Defaults.Variables.errorStatus
                            && (Date.now() - startTime < Settings.Defaults.Variables.maxWait);
                    };
                    if (deployStatus == Settings.Defaults.Variables.successStatus) {
                        successCount += variablesByFlow.variables.length;
                    } else {
                        if (deployStatus == Settings.Defaults.Variables.errorStatus) {
                            const errorText = 'Error: Integration flow ' + variablesByFlow.flowId + ' encountered an error during deployment. Try manually uploading generated zip file.'
                            await this.addLogEntry(4, errorText);
                            await this.generateError('Variable', 'Flow deployment status', errorText);
                        } else {
                            const errorText = 'Error: Integration flow ' + variablesByFlow.flowId + ' was not successfully deployed within ' + Settings.Defaults.Variables.maxWait + 'ms.'
                            await this.addLogEntry(4, errorText);
                            await this.generateError('Variable', 'Flow deployment status', errorText);
                        }
                    }
                }
                await this.addLogEntry(2, 'Cleaning up temporary artifacts:');
                deployFlowSuccess && await this.variablesUndeployIntegrationFlow(variablesByFlow.flowId);
                createFlowSuccess && await this.variablesDeleteIntegrationFlow(variablesByFlow.flowId);
            }
        }

        createPackageSuccess && await this.variablesDeleteIntegrationPackage(packageId);

        return successCount;
    };
    getVariableData = async (item) => {
        await this.addLogEntry(3, 'Downloading variable ' + item.VariableName);
        const response = await this.ConnectorSource.externalAxiosBinary(Settings.Paths.Variables.download.replace('{FLOW_ID}', item.IntegrationFlow).replace('{VARIABLE_NAME}', encodeURIComponent(item.VariableName)));
        if (response.code < 400) {
            try {
                const zipHelper = new ZipHelper.ZipHelper();
                const unzipped = await zipHelper.readZip(Buffer.from(response.value.data, 'binary'));
                const content = Buffer.from(unzipped['headers.prop'], 'binary').toString('utf-8');
                if (content.length > 0) {
                    const keyvaluepairs = Array.from(content.matchAll(Settings.RegEx.keyvaluepair), x => { return { key: x[1], value: x[2] } });
                    const keyvaluepair = keyvaluepairs[0];
                    await this.addLogEntry(4, 'Found variable ' + keyvaluepair.key + ' with value ' + keyvaluepair.value);
                    return keyvaluepair;
                }
            } catch (error) {
                await this.addLogEntry(4, 'Error: ' + error);
                await this.generateError('Variable', item.VariableName, error);
            }
        } else {
            await this.addLogEntry(4, 'Error: Could not download variable ' + item.VariableName + '. OAuth client missing \'AuthGroup.BusinessExpert\' role?');
            await this.generateError('Variable', item.VariableName, 'Could not download variable');
        }
        return null;
    };
    variablesSetValueInXML = async (inputXML, newValue) => {
        try {
            const json = await new Promise((resolve, reject) => {
                xml2js.parseString(inputXML, (err, result) => {
                    if (err) return reject(err);
                    resolve(result);
                });
            });
            const properties = json['bpmn2:definitions']['bpmn2:process'][0]['bpmn2:callActivity'][0]['bpmn2:extensionElements'][0]['ifl:property'];
            const variableProperty = properties.find(x => x.key[0] == 'variable');
            variableProperty.value[0] = newValue;

            const builder = new xml2js.Builder({ cdata: false, xmldec: { version: '1.0', encoding: 'UTF-8' } });
            const outputXML = builder.buildObject(json);
            return outputXML;
        } catch (error) {
            await this.addLogEntry(2, 'Error: ' + error);
            await this.generateError('Variable', 'XML set value', error);
            return '';
        }
    };
    variablesCreateIntegrationPackage = async (packageId) => {
        await this.addLogEntry(3, 'Creating package ' + packageId);
        const payload = {
            Id: packageId,
            Name: packageId,
            Description: 'Helper Package for Global Variable Migration',
            ShortText: 'Helper Package for Global Variable Migration',
            Version: '1.0',
            SupportedPlatform: 'SAP Cloud Integration',
            Products: 'SAP Cloud Integration',
            Keywords: 'SAP Cloud Integration',
            Countries: '',
            Industries: '',
            LineOfBusiness: ''
        };
        const response = await this.ConnectorTarget.externalPost(Settings.Paths.IntegrationPackages.path, payload);
        return await this.validateResponse('Variables', 'Package creation', response, 4, [], []); //409 ignore
    };
    variablesCreateIntegrationFlow = async (packageId, flowId, binaryContent) => {
        await this.addLogEntry(3, 'Creating flow ' + flowId);
        const artifactContent = Buffer.from(binaryContent, 'binary').toString('base64');
        const payload = {
            Name: flowId,
            Id: flowId,
            PackageId: packageId,
            ArtifactContent: artifactContent
        };
        const response = await this.ConnectorTarget.externalPost(Settings.Paths.IntegrationPackages.IntegrationDesigntimeArtifacts.create, payload);
        return await this.validateResponse('Variables', 'Flow creation', response, 4);
    };
    variablesDeployIntegrationFlow = async (flowId) => {
        await this.addLogEntry(3, 'Deploying flow ' + flowId);
        const response = await this.ConnectorTarget.externalPost(Settings.Paths.IntegrationPackages.IntegrationDesigntimeArtifacts.deploy.replace('{ARTIFACT_ID}', flowId));
        return await this.validateResponse('Variables', 'Flow deployment', response, 4);
    };
    variablesGetIntegrationFlowDeploymentStatus = async (flowId) => {
        const response = await this.ConnectorTarget.externalCall(Settings.Paths.IntegrationPackages.IntegrationRuntimeArtifacts.path.replace('{ARTIFACT_ID}', flowId), true);
        const status = response ? response.Status : 'DEPLOYING';
        return status;
    };
    variablesUndeployIntegrationFlow = async (flowId) => {
        await this.addLogEntry(3, 'Undeploying flow ' + flowId);
        const response = await this.ConnectorTarget.externalDelete(Settings.Paths.IntegrationPackages.IntegrationDesigntimeArtifacts.undeploy.replace('{ARTIFACT_ID}', flowId));
        return await this.validateResponse('Variables', 'Flow undeployment', response, 4, [], [404]);
    };
    variablesDeleteIntegrationFlow = async (flowId) => {
        await this.addLogEntry(3, 'Deleting flow ' + flowId);
        const response = await this.ConnectorTarget.externalDelete(Settings.Paths.IntegrationPackages.IntegrationDesigntimeArtifacts.delete.replace('{ARTIFACT_ID}', flowId));
        return await this.validateResponse('Variables', 'Flow deletion', response, 4, [], [404]);
    };
    variablesDeleteIntegrationPackage = async (packageId) => {
        await this.addLogEntry(3, 'Deleting package ' + packageId);
        const response = await this.ConnectorTarget.externalDelete(Settings.Paths.IntegrationPackages.delete.replace('{PACKAGE_ID}', packageId));
        return await this.validateResponse('Variables', 'Package deletion', response, 4, [], [404]);
    };

    migrateIntegrationPackages = async () => {
        const items = await this.ConnectorSource.externalCall(Settings.Paths.IntegrationPackages.path);
        const itemsInTarget = await this.ConnectorTarget.externalCall(Settings.Paths.IntegrationPackages.path);
        const valueMappings = await this.ConnectorSource.externalCall(Settings.Paths.ValueMappingDesigntimeArtifacts.path);

        // SAP Packages:

        await this.addLogEntry(1, 'SAP INTEGRATION PACKAGES:');
        var SAPSuccessCount = 0;
        // Packages needing full copy:
        const SAPContentInScope_FullCopy = items.filter(x => (x.Vendor == 'SAP' && this.MigrationContent.IntegrationPackages.includes(x.Id)));
        for (let item of SAPContentInScope_FullCopy) {
            const exists = await this.validateIfPackageExistsInTarget(itemsInTarget, item);
            const deleteBeforeHand = exists && Settings.Flags.DeletePackagesFromTargetBeforeOverwriting;
            const success = await this.migrateSAPPackage(item, deleteBeforeHand);
            if (success) {
                await this.migrateIntegrationDesigntimeArtifacts(item.Id, valueMappings) && SAPSuccessCount++;
            }
        }
        // Packages needing config copy only:
        const SAPContentInScope_ConfigOnly = items.filter(x => (x.Vendor == 'SAP' && this.MigrationContent.IntegrationPackagesConfigOnly.includes(x.Id)));
        for (let item of SAPContentInScope_ConfigOnly) {
            const exists = await this.validateIfPackageExistsInTarget(itemsInTarget, item);
            if (exists) {
                await this.migrateIntegrationDesigntimeArtifacts(item.Id, valueMappings) && SAPSuccessCount++;
            } else {
                await this.addLogEntry(3, 'Error: Package does not exist on target, please Copy full package first');
                await this.generateError('Package', item.Name, 'Package ' + item.Name + ' does not exist on target tenant (configured for Configuration Only)', this.Task.TargetTenant.Host + Settings.Paths.DeepLinks.AllPackages);
            }
        }

        const SAPItemCount = SAPContentInScope_FullCopy.length + SAPContentInScope_ConfigOnly.length;
        if (SAPItemCount > 0) {
            await this.addLogEntry(2, SAPSuccessCount + '/' + SAPItemCount + ' successful.');
        } else {
            await this.addLogEntry(2, 'No items to migrate.');
        }


        // Custom Packages:

        await this.addLogEntry(1, 'CUSTOM INTEGRATION PACKAGES:');
        var customSuccessCount = 0;
        // Packages needing full copy:
        const CustomInScope_FullCopy = items.filter(x => (x.Vendor != 'SAP' && x.PartnerContent != true && this.MigrationContent.IntegrationPackages.includes(x.Id)));
        for (let item of CustomInScope_FullCopy) {
            const exists = await this.validateIfPackageExistsInTarget(itemsInTarget, item);
            const deleteBeforeHand = exists && Settings.Flags.DeletePackagesFromTargetBeforeOverwriting;
            const success = await this.migrateCustomPackage(item, deleteBeforeHand);
            if (success) {
                await this.migrateIntegrationDesigntimeArtifacts(item.Id, valueMappings) && customSuccessCount++;
            }
        }
        // Packages needing config copy only:
        const CustomInScope_ConfigOnly = items.filter(x => (x.Vendor != 'SAP' && x.PartnerContent != true && this.MigrationContent.IntegrationPackagesConfigOnly.includes(x.Id)));
        for (let item of CustomInScope_ConfigOnly) {
            const exists = await this.validateIfPackageExistsInTarget(itemsInTarget, item);
            if (exists) {
                await this.migrateIntegrationDesigntimeArtifacts(item.Id, valueMappings) && customSuccessCount++;
            } else {
                await this.addLogEntry(3, 'Error: Package does not exist on target, please Copy full package first');
                await this.generateError('Package', item.Name, 'Package ' + item.Name + ' does not exist on target tenant (configured for Configuration Only)', this.Task.TargetTenant.Host + Settings.Paths.DeepLinks.AllPackages);
            }
        }

        const CustomItemCount = CustomInScope_FullCopy.length + CustomInScope_ConfigOnly.length;
        if (CustomItemCount > 0) {
            await this.addLogEntry(2, customSuccessCount + '/' + CustomItemCount + ' successful.');
        } else {
            await this.addLogEntry(2, 'No items to migrate.');
        }

        const itemsNotFound_FullCopy = this.MigrationContent.IntegrationPackages.filter(x => !(SAPContentInScope_FullCopy.find(e => e.Id == x) || CustomInScope_FullCopy.find(e => e.Id == x)));
        const itemsNotFound_ConfigOnly = this.MigrationContent.IntegrationPackagesConfigOnly.filter(x => !(SAPContentInScope_ConfigOnly.find(e => e.Id == x) || CustomInScope_ConfigOnly.find(e => e.Id == x)));
        itemsNotFound_FullCopy && await this.addMissingContentErrors(itemsNotFound_FullCopy);
        itemsNotFound_ConfigOnly && await this.addMissingContentErrors(itemsNotFound_ConfigOnly);
    };

    // Subscribe to package from API Business Hub:
    migrateSAPPackage = async (item, deleteBeforeHand) => {
        await this.addLogEntry(2, 'Subscribing Package ' + item.Name);

        item = await this.Customizations.onMigrateSAPPackage(item);

        // IMPORTANT: The following assumes that SAP Packages have no dot (.) in their name and if a dot (.) is present this means it is a copy!
        const suffixPosition = item.Id.indexOf('.');
        const isCopy = suffixPosition >= 0;
        var url = null;
        if (isCopy) {
            const originalPackageName = item.Id.substring(0, suffixPosition);
            const packageSuffix = item.Id.substring(suffixPosition + 1);
            await this.addLogEntry(3, 'Info: This is a copy of \'' + originalPackageName + '\' with suffix \'' + packageSuffix + '\'');
            url = Settings.Paths.IntegrationPackages.createCopy.replace('{PACKAGE_ID}', originalPackageName).replace('{SUFFIX}', packageSuffix);
        } else {
            url = Settings.Paths.IntegrationPackages.subscribe.replace('{PACKAGE_ID}', item.Id);
        }

        deleteBeforeHand && await this.deleteIntegrationPackage(item);
        const response = await this.ConnectorTarget.externalPost(url);
        return await this.validateResponse('Package', item.Name, response);
    };

    // Download package zip and upload to target:
    migrateCustomPackage = async (item, deleteBeforeHand) => {
        await this.addLogEntry(2, 'Copying Package ' + item.Name);

        const response = await this.ConnectorSource.externalAxiosBinary(Settings.Paths.IntegrationPackages.download.replace('{PACKAGE_ID}', item.Id));
        const downloaded = await this.validateResponse('Package', item.Name, response, 3, [], [], false);
        if (downloaded) {
            await this.analyzePackageScriptFiles(item, response.value.data);
            const customizedData = await this.Customizations.onMigrateCustomPackage(item, response.value.data);
            const base64Data = Buffer.from(customizedData, 'binary').toString('base64');
            const payload = {
                PackageContent: base64Data
            };

            // Deleting existing package
            deleteBeforeHand && await this.deleteIntegrationPackage(item);

            // Migrating variables before the actual content
            const integrationFlowIds = await this.listIntegrationFlowsInPackage(customizedData);
            const localVariables = this.Variables.filter(x => x.Visibility == 'Integration Flow' && integrationFlowIds.includes(x.IntegrationFlow));
            if (localVariables.length > 0) {
                await this.migrateLocalVariables(integrationFlowIds);
            }

            // Migrating actual content
            await this.addLogEntry(3, 'Uploading Package ' + item.Name);
            const uploadResponse = await this.ConnectorTarget.externalPost(Settings.Paths.IntegrationPackages.upload, payload);
            return await this.validateResponse('Package', item.Name, uploadResponse, 4);
        } else {
            return false;
        }
    };

    validateIfPackageExistsInTarget = async (itemsInTarget, item) => {
        await this.addLogEntry(2, 'Searching target package ' + item.Name);
        const exists = (undefined !== itemsInTarget.find(x => x.Id == item.Id));
        exists ? await this.addLogEntry(3, 'Found') : await this.addLogEntry(3, 'Not Found');
        return exists;
    };
    deleteIntegrationPackage = async (item) => {
        await this.addLogEntry(3, 'Deleting target package ' + item.Name);
        const response = await this.ConnectorTarget.externalDelete(Settings.Paths.IntegrationPackages.delete.replace('{PACKAGE_ID}', item.Id));
        return await this.validateResponse('Package', item.Name, response, 4);
    };
    analyzePackageScriptFiles = async (item, itemBinary) => {
        const downloader = new DownloadHelper.ContentDownloader()
        const result = await downloader.searchForEnvVarsInPackage(itemBinary, this.Customizations);
        if (result) {
            const resultTexts = result.filter(x => x.count > 0).map(x => x.artifact + ': ' + x.file + ' contains ' + x.count + ' occurrences of system.getenv()');
            const resultTextErrors = result.filter(x => x.count == -1).map(x => x.artifact + ': ' + x.file);
            if (resultTexts.length == 0) {
                await this.addLogEntry(3, 'Analyzing scripts: No script files in package, or no usage of Environment Variables found.');
            } else {
                await this.addLogEntry(3, 'Analyzing scripts: ' + resultTexts.length + ' script(s) found which need analysis. See Warnings.');
                resultTexts.forEach(async warning => await this.generateWarning('Package', item.Name, warning, this.Task.SourceTenant.Host + Settings.Paths.DeepLinks.PackageOverview.replace('{PACKAGE_ID}', item.Id)));
            }
            if (resultTextErrors.length > 0) {
                await this.addLogEntry(3, 'Analyzing scripts: ' + resultTextErrors.length + ' artifacts could not be analyzed. See Warnings.');
                resultTextErrors.forEach(async warning => await this.generateWarning('Package', item.Name, warning, this.Task.SourceTenant.Host + Settings.Paths.DeepLinks.PackageOverview.replace('{PACKAGE_ID}', item.Id)));
            }
        }
    };
    listIntegrationFlowsInPackage = async (zipFile) => {
        const zip = new ZipHelper.ZipHelper();
        const zipContent = await zip.readZip(Buffer.from(zipFile));
        if (zipContent && zipContent['resources.cnt']) {
            const resourcesBase64 = Buffer.from(zipContent['resources.cnt']).toString('utf-8');
            const resourcesJson = JSON.parse(Buffer.from(resourcesBase64, 'base64').toString('utf-8'));
            return resourcesJson.resources.filter(x => x.resourceType == 'IFlow').map(x => x.uniqueId);
        }
        return [];
    };

    // Copy over the settings for each of the iFlows / value mappings inside the package
    migrateIntegrationDesigntimeArtifacts = async (package_id, valueMappings) => {
        const artifacts = await this.ConnectorSource.externalCall(Settings.Paths.IntegrationPackages.IntegrationDesigntimeArtifacts.path.replace('{PACKAGE_ID}', package_id));
        const artifactsInScope = artifacts.filter(x => (this.MigrationContent.DesignTimeArtifacts.includes(x.Id)));

        const valmapsInScope = valueMappings.filter(x => (
            this.MigrationContent.ValueMappingDesigntimeArtifacts.includes(x.Id)
            && x.PackageId == package_id
        ));

        const countOfItems = valmapsInScope.length + artifactsInScope.length;
        var successCount = 0;

        for (let artifact of artifactsInScope) {
            await this.migrateConfigurations(artifact) && successCount++;
        }
        for (let valmap of valmapsInScope) {
            await this.migrateValMapSchemas(valmap) && successCount++;
        }

        if (countOfItems > 0) {
            await this.addLogEntry(3, successCount + '/' + countOfItems + ' successful.');
        } else {
            await this.addLogEntry(3, 'No individual items to configure.');
        }
        return successCount == countOfItems;
    };
    migrateConfigurations = async (artifact) => {
        await this.addLogEntry(3, 'Configurations of ' + artifact.Name);

        var payload = '';
        const configurations = await this.ConnectorSource.externalCall(Settings.Paths.IntegrationPackages.IntegrationDesigntimeArtifacts.Configurations.path.replace('{ARTIFACT_ID}', artifact.Id));
        for (let configuration of configurations) {

            await this.Customizations.onMigrateConfiguration(configuration);

            const paramKey = encodeURIComponent(configuration.ParameterKey);
            payload = payload + "\r\n--changeset_77162fcd-b8da-41ac-a9f8-9357efbbd621\r\n"
                + "Content-Type: application/http\r\n"
                + "Content-Transfer-Encoding: binary\r\n\r\n"
                + "PUT IntegrationDesigntimeArtifacts(Id='" + artifact.Id + "',Version='active')/$links/Configurations('" + paramKey + "') HTTP/1.1\r\n"
                + "Accept: application/json\r\n"
                + "Content-Type: application/json\r\n\r\n"
                + "{\"ParameterKey\":\"" + configuration.ParameterKey + "\",\"ParameterValue\":\"" + configuration.ParameterValue + "\",\"DataType\":\"" + configuration.DataType + "\"}\r\n";
        }
        if (payload.length > 0) {
            const response = await this.ConnectorTarget.externalBatch(Settings.Paths.Batch, payload);
            return await this.validateResponse('Configurations', artifact.Name, response, 4);
        } else {
            await this.addLogEntry(4, 'No items to migrate.');
            return true;
        }
    };

    migrateValMapSchemas = async (artifact) => {
        await this.addLogEntry(3, 'Value mappings of ' + artifact.Name);

        var successCount = 0;
        const schemas = await this.ConnectorSource.externalCall(Settings.Paths.ValueMappingDesigntimeArtifacts.ValMapSchema.path.replace('{ARTIFACT_ID}', artifact.Id));
        for (let schema of schemas) {
            await this.migrateValMapSchema(artifact, schema) && successCount++;
        }
        if (schemas.length > 0) {
            await this.addLogEntry(4, successCount + '/' + schemas.length + ' successful.');
        } else {
            await this.addLogEntry(4, 'No items to migrate.');
        }
        return successCount == schemas.length;
    };
    migrateValMapSchema = async (artifact, schema) => {
        const srcAgency = encodeURIComponent(schema.SrcAgency);
        const srcId = encodeURIComponent(schema.SrcId);
        const tgtAgency = encodeURIComponent(schema.TgtAgency);
        const tgtId = encodeURIComponent(schema.TgtId);
        var defSrcValue = '';
        var defTgtValue = '';
        var payload = '';
        const UrlValMaps = Settings.Paths.ValueMappingDesigntimeArtifacts.ValMapSchema.one
            .replace('{ARTIFACT_ID}', artifact.Id)
            .replace('{SrcAgency}', srcAgency)
            .replace('{SrcId}', srcId)
            .replace('{TgtAgency}', tgtAgency)
            .replace('{TgtId}', tgtId);


        // VALMAPS:
        var valmapsResult = true;
        const values = await this.ConnectorSource.externalCall(UrlValMaps + '/ValMaps');
        for (let value of values) {
            const srcValue = encodeURIComponent(value.Value.SrcValue);
            const tgtValue = encodeURIComponent(value.Value.TgtValue);
            payload = payload + "\r\n--changeset_77162fcd-b8da-41ac-a9f8-9357efbbd621\r\n"
                + "Content-Type: application/http\r\n"
                + "Content-Transfer-Encoding: binary\r\n\r\n"
                + "POST UpsertValMaps?Id='" + artifact.Id + "'&Version='active'&SrcAgency='" + srcAgency + "'&SrcId='" + srcId + "'&TgtAgency='" + tgtAgency + "'&TgtId='" + tgtId + "'&SrcValue='" + srcValue + "'&TgtValue='" + tgtValue + "'&IsConfigured=true HTTP/1.1\r\n\r\n"
                + "Accept: application/json\r\n";
        }
        if (values.length > 0) {
            await this.addLogEntry(4, 'Schema ' + srcAgency + '/' + srcId + ' > ' + tgtAgency + '/' + tgtId + ' with ' + values.length + ' value mappings');
            const response = await this.ConnectorTarget.externalBatch(Settings.Paths.Batch, payload);
            valmapsResult = await this.validateResponse('Value Mapping', artifact.Name, response, 5)
        } else {
            await this.addLogEntry(4, 'Schema ' + srcAgency + '/' + srcId + ' > ' + tgtAgency + '/' + tgtId + ' has no value mappings');
        }


        //DEFAULT VALMAPS:
        var defaultvalmapsResult = false;
        const defaults = await this.ConnectorSource.externalCall(UrlValMaps + '/DefaultValMaps');
        if (defaults.length > 1) {
            await this.addLogEntry(5, 'Error in value mapping defaults: More than 1 default specified in ' + schema.SrcId);
            await this.generateError('Value Mapping', artifact.Name, 'Error in value mapping defaults: More than 1 default specified in ' + schema.SrcId, this.Task.SourceTenant.Host + Settings.Paths.DeepLinks.AllPackages);
        }
        if (defaults.length == 1) {
            await this.addLogEntry(5, 'This item has a default value configured:');
            defSrcValue = encodeURIComponent(defaults[0].Value.SrcValue);
            defTgtValue = encodeURIComponent(defaults[0].Value.TgtValue);

            const urlDefaultValMapID = UrlValMaps + '/ValMaps?$filter= Value/SrcValue eq \'' + defSrcValue + '\' and Value/TgtValue eq \'' + defTgtValue + '\'';
            const mapIDs = await this.ConnectorTarget.externalCall(urlDefaultValMapID);
            if (mapIDs.length != 1) {
                await this.addLogEntry(6, 'Error in value mapping default IDs: More than 1 default ID specified in ' + schema.SrcId);
                await this.generateError('Value Mapping', artifact.Name, 'Error in value mapping default IDs: More than 1 default ID specified in ' + schema.SrcId, this.Task.SourceTenant.Host + Settings.Paths.DeepLinks.AllPackages);
            } else {
                const defValMapID = mapIDs[0].Id;
                const urlUpdateDefaultValMap = Settings.Paths.DefaultValMap.update
                    .replace('{ARTIFACT_ID}', artifact.Id)
                    .replace('{SrcAgency}', srcAgency)
                    .replace('{SrcId}', srcId)
                    .replace('{TgtAgency}', tgtAgency)
                    .replace('{TgtId}', tgtId)
                    .replace('{DefValMapID}', defValMapID);

                const response = await this.ConnectorTarget.externalPost(urlUpdateDefaultValMap, '');
                defaultvalmapsResult = await this.validateResponse('Value Mapping', artifact.Name, response, 6, [], [400]);
            }
        } else {
            defaultvalmapsResult = true;
        }

        return valmapsResult && defaultvalmapsResult;
    };


    migrateCustomCertificates = async () => {
        await this.addLogEntry(1, 'CUSTOM CERTIFICATES:');

        var successCount = 0;
        const items = await this.ConnectorSource.externalCall(Settings.Paths.KeyStoreEntries.path);
        const itemsInScope = items.filter(x => this.MigrationContent.KeyStoreEntries.includes(x.Hexalias));

        const itemsNotFound = this.MigrationContent.KeyStoreEntries.filter(x => !itemsInScope.find(e => e.Hexalias == x));
        itemsNotFound && await this.addMissingContentErrors(itemsNotFound);

        for (let item of itemsInScope) {
            await this.migrateCustomCertificate(item) && successCount++;
        }
        if (itemsInScope.length > 0) {
            await this.addLogEntry(2, successCount + '/' + itemsInScope.length + ' successful.');
        } else {
            await this.addLogEntry(2, 'No items to migrate.');
        }
    };
    migrateCustomCertificate = async (entry) => {
        await this.addLogEntry(2, 'Certificate ' + entry.Alias);

        const certificate = await this.ConnectorSource.externalCallCertificate(Settings.Paths.KeyStoreEntries.Certificate.download.replace('{HEXALIAS_ID}', entry.Hexalias));
        if (certificate) {
            const response = await this.ConnectorTarget.externalPutCertificate(Settings.Paths.KeyStoreEntries.Certificate.upload.replace('{HEXALIAS_ID}', entry.Hexalias), certificate);
            return await this.validateResponse('Certificate', entry.Alias, response, 3, [400], [], true, this.Task.TargetTenant.Host + Settings.Paths.DeepLinks.Keystore);
        } else {
            await this.addLogEntry(3, 'Error: Could not download certificate');
            await this.generateError('Certificate', entry.Alias, 'Error: Could not download certificate ' + entry.Alias, this.Task.SourceTenant.Host + Settings.Paths.DeepLinks.Keystore);
            return false;
        }
    };


    migrateNumberRanges = async () => {
        await this.addLogEntry(1, 'NUMBER RANGES:');

        var successCount = 0;
        const items = await this.ConnectorSource.externalCall(Settings.Paths.NumberRanges.path);
        const itemsInScope = items.filter(x => this.MigrationContent.NumberRanges.includes(x.Name));

        const itemsNotFound = this.MigrationContent.NumberRanges.filter(x => !itemsInScope.find(e => e.Name == x));
        itemsNotFound && await this.addMissingContentErrors(itemsNotFound);

        for (let item of itemsInScope) {
            await this.migrateNumberRange(item) && successCount++;
        }
        if (itemsInScope.length > 0) {
            await this.addLogEntry(2, successCount + '/' + itemsInScope.length + ' successful.');
        } else {
            await this.addLogEntry(2, 'No items to migrate.');
        }
    };
    migrateNumberRange = async (range) => {
        await this.addLogEntry(2, 'Number Range ' + range.Name);

        await this.Customizations.onMigrateNumberRange(range);

        delete range.DeployedBy;
        delete range.DeployedOn;
        const response = await this.ConnectorTarget.externalPost(Settings.Paths.NumberRanges.upload, range);
        return await this.validateResponse('Number Range', range.Name, response, 3, [409], [], true, this.Task.TargetTenant.Host + Settings.Paths.DeepLinks.NumberRanges);
    };


    migrateCustomTagConfigurations = async () => {
        await this.addLogEntry(1, 'CUSTOM TAG CONFIGURATIONS:');

        var tagsInScope = [];
        const tagConfiguration = await this.ConnectorSource.externalCall(Settings.Paths.CustomTagConfigurations.path);
        if (tagConfiguration.customTagsConfiguration && tagConfiguration.customTagsConfiguration.length > 0) {
            tagsInScope = tagConfiguration.customTagsConfiguration.filter(x => this.MigrationContent.CustomTagConfigurations.includes(x.tagName));
        }

        const itemsNotFound = this.MigrationContent.CustomTagConfigurations.filter(x => !tagsInScope.find(e => e.tagName == x));
        itemsNotFound && await this.addMissingContentErrors(itemsNotFound);

        if (tagsInScope.length > 0) {
            const tagConfigurationInTarget = await this.ConnectorTarget.externalCall(Settings.Paths.CustomTagConfigurations.path);
            const tagsInTarget = tagConfigurationInTarget.customTagsConfiguration;

            await this.Customizations.onMigrateCustomTagConfigurations(tagsInScope);

            const tagNamesInScope = tagsInScope.map(x => x.tagName);
            const combinedTags = tagsInScope.concat(tagsInTarget.filter(x => !tagNamesInScope.includes(x.tagName)));

            await this.migrateCustomTagConfigurationItems(combinedTags);
        } else {
            await this.addLogEntry(2, 'No items to migrate.');
        }
    };
    migrateCustomTagConfigurationItems = async (tags) => {
        await this.addLogEntry(2, 'Merging tags');

        const content = { customTagsConfiguration: tags };
        const contentEncoded = Buffer.from(JSON.stringify(content)).toString('base64');
        const payload = { CustomTagsConfigurationContent: contentEncoded };

        const response = await this.ConnectorTarget.externalPost(Settings.Paths.CustomTagConfigurations.upload, payload);
        await this.validateResponse('Custom Tag', 'Generic', response, 3, [409], [], true, this.Task.TargetTenant.Host + Settings.Paths.DeepLinks.CustomTags);
    };


    migrateUserCredentials = async () => {
        await this.addLogEntry(1, 'USER CREDENTIALS:');

        var successCount = 0;
        const items = await this.ConnectorSource.externalCall(Settings.Paths.UserCredentials.path);
        const itemsInScope = items.filter(x => this.MigrationContent.UserCredentials.includes(x.Name));

        const itemsNotFound = this.MigrationContent.UserCredentials.filter(x => !itemsInScope.find(e => e.Name == x));
        itemsNotFound && await this.addMissingContentErrors(itemsNotFound);

        for (let item of itemsInScope) {
            await this.migrateUserCredential(item) && successCount++;
        }
        if (itemsInScope.length > 0) {
            await this.addLogEntry(2, successCount + '/' + itemsInScope.length + ' successful.');
        } else {
            await this.addLogEntry(2, 'No items to migrate.');
        }
    };
    migrateUserCredential = async (item) => {
        await this.addLogEntry(2, 'User Credential ' + item.Name);

        await this.Customizations.onMigrateUserCredential(item);

        const payload = {
            Name: item.Name,
            Kind: item.Kind,
            Description: item.Description,
            User: item.User,
            Password: item.Password || Settings.DefaultPassword,
            CompanyId: item.CompanyId
        };
        const response = await this.ConnectorTarget.externalPost(Settings.Paths.UserCredentials.upload, payload);
        const success = await this.validateResponse('User Credential', item.Name, response, 3, [409], [], true, this.Task.TargetTenant.Host + Settings.Paths.DeepLinks.SecurityMaterial);
        if (success && response.code < 400) {
            await this.generateInfo('User Credential', item.Name, 'Item created with blank password/secret. Please update manually in target tenant', this.Task.TargetTenant.Host + Settings.Paths.DeepLinks.SecurityMaterial);
        }
        return success;
    };


    migrateOAuth2ClientCredentials = async () => {
        await this.addLogEntry(1, 'OAUTH2 CLIENT CREDENTIALS:');

        var successCount = 0;
        const items = await this.ConnectorSource.externalCall(Settings.Paths.OAuth2ClientCredentials.path);
        const itemsInScope = items.filter(x => this.MigrationContent.OAuth2ClientCredentials.includes(x.Name));

        const itemsNotFound = this.MigrationContent.OAuth2ClientCredentials.filter(x => !itemsInScope.find(e => e.Name == x));
        itemsNotFound && await this.addMissingContentErrors(itemsNotFound);

        for (let item of itemsInScope) {
            await this.migrateOAuth2ClientCredential(item) && successCount++;
        }
        if (itemsInScope.length > 0) {
            await this.addLogEntry(2, successCount + '/' + itemsInScope.length + ' successful.');
        } else {
            await this.addLogEntry(2, 'No items to migrate.');
        }
    };
    migrateOAuth2ClientCredential = async (item) => {
        await this.addLogEntry(2, 'OAuth Client Credential ' + item.Name);

        await this.Customizations.onMigrateOAuth2ClientCredential(item);

        const payload = {
            Name: item.Name,
            Description: item.Description,
            TokenServiceUrl: item.TokenServiceUrl,
            ClientId: item.ClientId,
            ClientSecret: item.ClientSecret || Settings.DefaultPassword,
            Scope: item.Scope,
            ScopeContentType: item.ScopeContentType,
            ClientAuthentication: item.ClientAuthentication
        };
        const response = await this.ConnectorTarget.externalPost(Settings.Paths.OAuth2ClientCredentials.upload, payload);
        const success = await this.validateResponse('OAuth Credential', item.Name, response, 3, [409], [], true, this.Task.TargetTenant.Host + Settings.Paths.DeepLinks.SecurityMaterial);
        if (success && response.code < 400) {
            await this.generateInfo('OAuth Credential', item.Name, 'Item created with blank password/secret. Please update manually in target tenant', this.Task.TargetTenant.Host + Settings.Paths.DeepLinks.SecurityMaterial);
        }
        return success;
    };


    migrateAccessPolicies = async () => {
        await this.addLogEntry(1, 'ACCESS POLICIES:');

        var successCount = 0;
        const items = await this.ConnectorSource.externalCall(Settings.Paths.AccessPolicies.path);
        const itemsInScope = items.filter(x => this.MigrationContent.AccessPolicies.includes(x.RoleName));

        const itemsNotFound = this.MigrationContent.AccessPolicies.filter(x => !itemsInScope.find(e => e.RoleName == x));
        itemsNotFound && await this.addMissingContentErrors(itemsNotFound);

        for (let item of itemsInScope) {
            await this.migrateAccessPolicy(item) && successCount++;
        }
        if (itemsInScope.length > 0) {
            await this.addLogEntry(2, successCount + '/' + itemsInScope.length + ' successful.');
        } else {
            await this.addLogEntry(2, 'No items to migrate.');
        }
    };
    migrateAccessPolicy = async (item) => {
        await this.addLogEntry(2, 'Access Policy ' + item.RoleName);

        await this.Customizations.onMigrateAccessPolicy(item);

        var referencesPayload = [];
        const references = await this.ConnectorSource.externalCall(Settings.Paths.AccessPolicies.ArtifactReferences.path.replace('{ACCESSPOLICY_ID}', item.Id));
        for (let reference of references) {

            await this.Customizations.onMigrateAccessPolicyReference(reference);

            referencesPayload.push({
                Name: reference.Name,
                Description: reference.Description,
                Type: reference.Type,
                ConditionAttribute: reference.ConditionAttribute,
                ConditionValue: reference.ConditionValue,
                ConditionType: reference.ConditionType
            });
        }
        const accessPoliciesPayload = {
            RoleName: item.RoleName,
            Description: item.Description,
            ArtifactReferences: referencesPayload
        };
        const response = await this.ConnectorTarget.externalPost(Settings.Paths.AccessPolicies.upload, accessPoliciesPayload);
        return await this.validateResponse('Access Policy', item.RoleName, response, 3, [409], [], true, this.Task.TargetTenant.Host + Settings.Paths.DeepLinks.AccessPolicies);
    };

    migrateJMSBrokers = async () => {
        await this.addLogEntry(1, 'JMS BROKERS:');

        var successCount = 0;
        const item = await this.ConnectorSource.externalCall(Settings.Paths.JMSBrokers.path, true);
        if (item && this.MigrationContent.JMSBrokers.includes(item.Key)) {
            await this.migrateJMSBroker(item) && successCount++;
            await this.addLogEntry(2, successCount + '/' + 1 + ' successful.');
        } else {
            const itemsNotFound = this.MigrationContent.JMSBrokers.filter(x => item.Key != x);
            if (itemsNotFound.length > 0) {
                await this.addMissingContentErrors(itemsNotFound);
            } else {
                await this.addLogEntry(2, 'No items to migrate.');
            }
        }
    };
    migrateJMSBroker = async (item) => {
        await this.addLogEntry(2, 'JMS Broker ' + item.Key);

        await this.Customizations.onMigrateJMSBroker(item);
        const target = await this.ConnectorTarget.externalCall(Settings.Paths.JMSBrokers.path, true);
        if (target) {
            if (target.MaxQueueNumber < item.QueueNumber) {
                await this.addLogEntry(3, 'Not enough JMS queues available on target tenant: ' + item.QueueNumber + ' used in source, while ' + target.MaxQueueNumber + ' available in target.');
                await this.generateError('JMS Brokers', item.Key, 'Not enough JMS queues available on target tenant. Used queues on source: ' + item.QueueNumber + ', available on target: ' + target.MaxQueueNumber);
                return false;
            } else {
                await this.addLogEntry(3, 'OK. ' + item.QueueNumber + ' used in source, ' + target.MaxQueueNumber + ' available in target. No queues have been migrated, this has to be done manually.');
                item.QueueNumber > 0 && await this.generateInfo('JMS Brokers', item.Key, 'Please create JMS queues on target tenant: ' + item.QueueNumber + ' queues on source tenant.');
                return true;
            }
        }
        else {
            if (item.QueueNumber > 0) {
                await this.addLogEntry(3, 'Error: JMS not available on target tenant.');
                await this.generateError('JMS Brokers', item.Key, 'Enterprise Messaging is not activated on target tenant, however source tenant has a JMS queue usage of ' + item.QueueNumber);
                return false;
            } else {
                await this.addLogEntry(3, 'Warning: JMS not available on target tenant, but there is no usage on source either.');
                await this.generateWarning('JMS Brokers', item.Key, 'Enterprise Messaging is activated on source tenant, but not used, but is not activated on target tenant.');
                return true;
            }
        }
    };


    migrateCertificateUserMappings = async () => {
        await this.addLogEntry(1, 'CERTIFICATE TO USER MAPPINGS:');

        var successCount = 0;
        const items = await this.ConnectorSource.externalCall(Settings.Paths.CertificateUserMappings.Neo.path);
        const itemsInScope = items.filter(x => this.MigrationContent.CertificateUserMappings.includes(x.Id));

        const itemsNotFound = this.MigrationContent.CertificateUserMappings.filter(x => !itemsInScope.find(e => e.Id == x));
        itemsNotFound && await this.addMissingContentErrors(itemsNotFound);

        for (let item of itemsInScope) {
            const instance = await this.migrateCertificateUserMapping(item);
            if (instance.found && instance.status == Settings.Defaults.CertificateUserMappings.successStatus) {
                const binding = await this.migrateCertificateUserMappingCertificate(item, instance);
                binding.found && binding.status == Settings.Defaults.CertificateUserMappings.successStatus && successCount++;
            }
        }
        if (itemsInScope.length > 0) {
            await this.addLogEntry(2, successCount + '/' + itemsInScope.length + ' successful.');
        } else {
            await this.addLogEntry(2, 'No items to migrate.');
        }
    };
    migrateCertificateUserMapping = async (mapping) => {
        await this.addLogEntry(2, 'User mapping ' + mapping.User);

        const items = await this.ConnectorSource.externalPlatformCall(Settings.Paths.CertificateUserMappings.Neo.Roles
            .replace('{ACCOUNT_ID}', this.Task.SourceTenant.Neo_accountid)
            .replace('{USER_ID}', mapping.User)
        );
        assert(items !== null, 'Could not retrieve roles for Neo account ' + this.Task.SourceTenant.Neo_accountid + '. Verify connection settings.');

        var deployStatus = await this.GetServiceInstanceDeploymentStatus(mapping.User);
        if (deployStatus.found) {
            if (deployStatus.status == Settings.Defaults.CertificateUserMappings.successStatus) {
                await this.addLogEntry(3, 'Warning: Service Instance by the name of ' + mapping.User + ' already exists. It will be re-used. If any new roles were assigned to this user, these will NOT be updated.');
                await this.generateWarning('Certificate User Mapping', mapping.User, 'Service Instance already existed and was not updated.');
            } else {
                await this.addLogEntry(3, 'Error: Service Instance by the name of ' + mapping.User + ' already exists and is in error state. Please delete manually and re-run migration job.');
                await this.generateError('Certificate User Mapping', mapping.User, 'Service Instance already exists and is in error state. Please delete manually and re-run migration job.');
            }
        } else {
            const roles = items.roles.filter(x => x.applicationName.includes('iflmap')).map(x => x.name);
            await this.createCFServiceInstance(mapping, roles);

            await this.addLogEntry(3, 'Waiting for service instance to be created ...');
            const startTime = Date.now();
            var waitAndFetchAgain = true;
            while (waitAndFetchAgain) {
                await this.sleep(Settings.Defaults.CertificateUserMappings.sleepInterval);
                deployStatus = await this.GetServiceInstanceDeploymentStatus(mapping.User);

                await this.addLogEntry(4, '... ' + deployStatus.status);
                waitAndFetchAgain = deployStatus.status !== Settings.Defaults.CertificateUserMappings.successStatus
                    && deployStatus.status !== Settings.Defaults.CertificateUserMappings.errorStatus
                    && deployStatus.found == true
                    && (Date.now() - startTime < Settings.Defaults.CertificateUserMappings.maxWait);
            }
            if (deployStatus.status == Settings.Defaults.CertificateUserMappings.successStatus) {
                await this.addLogEntry(3, 'Service instance created');
            } else {
                await this.addLogEntry(3, 'Service instance not created');
                await this.generateError('Certificate User Mapping', mapping.User, 'Service Instance could not be created.');
            }
        }
        return deployStatus;
    };
    createCFServiceInstance = async (mapping, roles) => {
        await this.addLogEntry(3, 'Creating service instance for roles: ' + roles.join(', '));
        const body = {
            'type': 'managed',
            'name': mapping.User,
            'parameters': {
                'grant-types': [
                    'client_credentials'
                ],
                'redirect-uris': [],
                'roles': roles
            },
            'tags': [],
            'metadata': {
                'labels': {},
                'annotations': {}
            },
            'relationships': {
                'space': {
                    'data': {
                        'guid': this.Task.TargetTenant.CF_spaceID
                    }
                },
                'service_plan': {
                    'data': {
                        'guid': this.Task.TargetTenant.CF_servicePlanID
                    }
                }
            }
        };
        await this.ConnectorTarget.externalPlatformPostCall(Settings.Paths.CertificateUserMappings.CF.CreateServiceInstance, body);
    };
    GetServiceInstanceDeploymentStatus = async (user) => {
        const response = await this.ConnectorTarget.externalPlatformCall(Settings.Paths.CertificateUserMappings.CF.ServiceInstanceByName
            .replace('{NAME}', user)
            .replace('{SPACE_ID}', this.Task.TargetTenant.CF_spaceID)
            .replace('{SERVICEPLAN_ID}', this.Task.TargetTenant.CF_servicePlanID));

        if (response.resources.length == 1) {
            return {
                found: true,
                guid: response.resources[0].guid,
                type: response.resources[0].last_operation.type,
                status: response.resources[0].last_operation.state
            };
        } else {
            return {
                found: false,
                guid: '',
                type: '',
                status: 'error'
            };
        }
    };

    migrateCertificateUserMappingCertificate = async (mapping, instance) => {
        await this.addLogEntry(3, 'Generating Binding ' + mapping.Id);

        var deployStatus = await this.GetServiceInstanceBindingDeploymentStatus(mapping.Id, instance.guid);
        if (deployStatus.found) {
            if (deployStatus.status == Settings.Defaults.CertificateUserMappings.successStatus) {
                await this.addLogEntry(4, 'Warning: Service Instance Binding by the name of ' + mapping.Id + ' already exists. Certificate was not renewed.');
                await this.generateWarning('Certificate User Mapping', mapping.User, 'Service Instance Binding ' + mapping.Id + ' already existed and was not updated.');
            } else {
                await this.addLogEntry(4, 'Error: Service Instance Binding by the name of ' + mapping.Id + ' already exists and is in error state. Please delete manually and re-run migration job.');
                await this.generateError('Certificate User Mapping', mapping.User, 'Service Instance Binding ' + mapping.Id + ' already exists and is in error state. Please delete manually and re-run migration job.');
            }
        } else {
            await this.createCFServiceInstanceBinding(mapping, instance);

            await this.addLogEntry(4, 'Waiting for service instance binding to be created ...');
            const startTime = Date.now();
            var waitAndFetchAgain = true;
            while (waitAndFetchAgain) {
                await this.sleep(Settings.Defaults.CertificateUserMappings.sleepInterval);
                deployStatus = await this.GetServiceInstanceBindingDeploymentStatus(mapping.Id, instance.guid);

                await this.addLogEntry(5, '... ' + deployStatus.status);
                waitAndFetchAgain = deployStatus.status !== Settings.Defaults.CertificateUserMappings.successStatus
                    && deployStatus.status !== Settings.Defaults.CertificateUserMappings.errorStatus
                    && deployStatus.found == true
                    && (Date.now() - startTime < Settings.Defaults.CertificateUserMappings.maxWait);
            }
            if (deployStatus.status == Settings.Defaults.CertificateUserMappings.successStatus) {
                await this.addLogEntry(4, 'Service instance binding created');
            } else {
                await this.addLogEntry(4, 'Service instance binding not created');
                await this.generateError('Certificate User Mapping', mapping.User, 'Service Instance Binding ' + mapping.Id + ' could not be created.');
            }
        }
        return deployStatus;
    };
    createCFServiceInstanceBinding = async (mapping, instance) => {
        await this.addLogEntry(4, 'Creating service instance binding for ' + mapping.Id);

        const x509 = Buffer.from(mapping.Certificate, 'base64').toString('binary').replace(Settings.RegEx.newLines, "");
        const body = {
            'type': 'key',
            'name': mapping.Id,
            'relationships': {
                'service_instance': {
                    'data': {
                        'guid': instance.guid
                    }
                }
            },
            'parameters': {
                'X.509': x509
            },
            'metadata': {
            }
        };
        await this.ConnectorTarget.externalPlatformPostCall(Settings.Paths.CertificateUserMappings.CF.CreateServiceInstanceBinding, body);
    };
    GetServiceInstanceBindingDeploymentStatus = async (id, guid) => {
        const response = await this.ConnectorTarget.externalPlatformCall(Settings.Paths.CertificateUserMappings.CF.ServiceBindingsByName
            .replace('{NAME}', id)
            .replace('{SERVICE_INSTANCE_ID}', guid));

        if (response.resources.length == 1) {
            return {
                found: true,
                guid: response.resources[0].guid,
                type: response.resources[0].last_operation.type,
                status: response.resources[0].last_operation.state
            };
        } else {
            return {
                found: false,
                guid: '',
                type: '',
                status: 'error'
            };
        }
    };

    // Helpers
    validateResponse = async (component, name, response, indent = 3, warnings = [], ignores = [], generatePositiveLog = true, path = null) => {
        var result = true;
        // console.log(response);
        const errorMessage = response.value.error ? response.value.error.message.value : response.value;
        if (ignores.includes(response.code)) {
            await this.addLogEntry(indent, 'Ignored (' + response.code + ') ' + errorMessage);
        } else if (warnings.includes(response.code)) {
            await this.addLogEntry(indent, 'Warning (' + response.code + ') ' + errorMessage);
            await this.generateWarning(component, name, response.code + ' ' + errorMessage, path);
        } else if (response.code >= 400) {
            await this.addLogEntry(indent, 'Error (' + response.code + ') ' + errorMessage);
            await this.generateError(component, name, response.code + ' ' + errorMessage, path);
            result = false;
        } else {
            generatePositiveLog && await this.addLogEntry(indent, 'Success (' + response.code + ') ' + response.value.statusText);
        }
        return result;
    };
    addMissingContentErrors = async (items) => {
        for (let item of items) {
            await this.addLogEntry(2, 'Error: Item is part of migration task but was not found on source tenant: ' + item);
            await this.generateError('Missing Content', item, 'Missing content on source tenant: ' + item, this.Task.SourceTenant.Host + Settings.Paths.DeepLinks.AllPackages);
        }
    };
    generateError = async (component, item, text, path = null) => {
        await this.createErrorEntry(component, 'Error', item, text, path);
        this.ErrorList.push(text);
    };
    generateWarning = async (component, item, text, path = null) => {
        await this.createErrorEntry(component, 'Warning', item, text, path);
        this.WarningList.push(text);
    };
    generateInfo = async (component, item, text, path = null) => {
        await this.createErrorEntry(component, 'Info', item, text, path);
    };
    createErrorEntry = async (component, type, item, text, path) => {
        const errorBody = {
            toParent: this.Job.ObjectID,
            Type: type,
            Component: component,
            ComponentName: item,
            Description: text,
            Path: path ? ('https://' + path) : '#',
            Severity: (type === 'Error' ? Settings.CriticalityCodes.Red : (type === 'Warning' ? Settings.CriticalityCodes.Orange : Settings.CriticalityCodes.Blue))
        };
        await INSERT(errorBody).into('Errors');
    };
    addLogEntry = async (indent, text = null) => {
        const now = new Date().toLocaleTimeString();
        var entry = text ? (now + ' > ' + ''.padStart(indent * 2, ' ') + text) : '';
        const entryNewLine = entry + '\r\n';

        console.log(entry);
        this.Log = this.Log + entryNewLine;
        await UPDATE('MigrationJobs', { ObjectID: this.Job.ObjectID }).set`log = (log || ${entryNewLine})`;
        return entry;
    };
    clearLogEntries = async () => {
        this.Log = '';
        await UPDATE('MigrationJobs', { ObjectID: this.Job.ObjectID }).set`log = ''`;
    };
    setStatus = async (statusText, StatusCriticality = Settings.CriticalityCodes.Orange, isRunning = true) => {
        await UPDATE('MigrationJobs', { ObjectID: this.Job.ObjectID }).set(
            {
                Status: statusText,
                IsRunning: isRunning,
                StatusCriticality: StatusCriticality
            }
        );
    };
    setStartTime = async () => {
        await UPDATE('MigrationJobs', { ObjectID: this.Job.ObjectID }).set({ StartTime: new Date().toISOString() });
    };
    setEndTime = async () => {
        await UPDATE('MigrationJobs', { ObjectID: this.Job.ObjectID }).set({ EndTime: new Date().toISOString() });
    };
    sleep = async (ms) => {
        await new Promise(resolve => setTimeout(resolve, ms));
    }
};
module.exports = {
    MigrationJob: MigrationJob
};