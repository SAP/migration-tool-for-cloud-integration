using migrationtool as my from '../db/schema';

service ConfigService {
    @readonly
    entity Tenants_TargetsOnly             as projection on my.Tenants {
        ObjectID,
        Name
    } where ReadOnly = false;

    @cds.redirection.target
    entity Tenants                         as projection on my.Tenants {
        *,
        count(
            toErrors.ObjectID
        ) as numberOfErrors : Integer
    } group by ObjectID actions {
        action Tenant_testConnection()        returns Boolean;

        @cds.odata.bindingparameter.name   : '_it'
        @Common.SideEffects.TargetEntities : [
            _it.toAccessPolicies,
            _it.toCustomTagConfigurations,
            _it.toErrors,
            _it.toIntegrationPackages,
            _it.toJMSBrokers,
            _it.toKeyStoreEntries,
            _it.toNumberRanges,
            _it.toOAuth2ClientCredentials,
            _it.toUserCredentials,
            _it.toVariables
        ]
        action Tenant_getIntegrationContent() returns Tenants;

        @cds.odata.bindingparameter.name   : '_it'
        @Common.SideEffects.TargetEntities : [_it.toMigrationTasks]
        action Tenant_createNewMigrationTask(
                @UI.ParameterDefaultValue :  'My new migration task'
                @title                    :  'Task Name'
                @mandatory
        Name : String, Description : String,

                @title                    :  'Target Tenant'
                @mandatory
                @(Common : {
                ValueListWithFixedValues : true,
                ValueListMapping         : {
                    CollectionPath : 'Tenants_TargetsOnly',
                    Parameters     : [{
                        $Type             : 'Common.ValueListParameterOut',
                        ValueListProperty : 'ObjectID',
                        LocalDataProperty : 'TargetTenant'
                    }]
                }
            })
            TargetTenant : UUID,

                @title                    :  'How do you want to generate the task'
                @mandatory
                @UI.ParameterDefaultValue :  'Optimal'
                @(Common : {
                    ValueListWithFixedValues : true,
                    ValueListMapping         : {
                        CollectionPath : 'MigrationTaskPresets',
                        Parameters     : [{
                            $Type             : 'Common.ValueListParameterOut',
                            ValueListProperty : 'Code',
                            LocalDataProperty : 'Preset'
                        }]
                    }
                })
                Preset : String)              returns MigrationTasks;
            };

    entity IntegrationPackages             as projection on my.extIntegrationPackages actions {
        action Package_analyzeScriptFiles() returns many String;
    };

    entity IntegrationDesigntimeArtifacts  as projection on my.extIntegrationDesigntimeArtifacts;
    entity KeyStoreEntries                 as projection on my.extKeyStoreEntries;
    entity Configurations                  as projection on my.extConfigurations;
    entity Resources                       as projection on my.extResources;
    entity UserCredentials                 as projection on my.extUserCredentials;
    entity CustomTagConfigurations         as projection on my.extCustomTagConfigurations;
    entity CustomTags                      as projection on my.extCustomTags;
    entity ValueMappingDesigntimeArtifacts as projection on my.extValueMappingDesigntimeArtifacts;
    entity ValMapSchema                    as projection on my.extValMapSchema;
    entity NumberRanges                    as projection on my.extNumberRanges;
    entity OAuth2ClientCredentials         as projection on my.extOAuth2ClientCredentials;
    entity AccessPolicies                  as projection on my.extAccessPolicies;
    entity ArtifactReferences              as projection on my.extArtifactReferences;
    entity JMSBrokers                      as projection on my.extJMSBrokers;
    entity Variables                       as projection on my.extVariables;

    @sap.deletable : false
    entity Errors                          as projection on my.Errors;

    @odata.draft.enabled
    @fiori.draft.enabled
    entity MigrationTasks                  as projection on my.MigrationTasks actions {

        @cds.odata.bindingparameter.name   : '_it'
        @Common.SideEffects.TargetEntities : [_it.toMigrationJobs]
        @Common.IsActionCritical           : true
        action Task_startMigration() returns MigrationJobs;

        @cds.odata.bindingparameter.name   : '_it'
        @Common.SideEffects.TargetEntities : [_it.toMigrationJobs]
        action Task_refreshJobsTable();

        @cds.odata.bindingparameter.name   : '_it'
        @Common.SideEffects.TargetEntities : [
            _it.toTaskNodes,
            _it
        ]
        @Common.IsActionCritical           : true
        action Task_resetTaskNodes(
        @title                    :          'How would you like to preset the items'
        @mandatory
        @UI.ParameterDefaultValue :          'Optimal'
        @(Common : {
            ValueListWithFixedValues : true,
            ValueListMapping         : {
                CollectionPath : 'MigrationTaskPresets',
                Parameters     : [{
                    $Type             : 'Common.ValueListParameterOut',
                    ValueListProperty : 'Code',
                    LocalDataProperty : 'Preset'
                }]
            }
        })
        Preset : String);

        @cds.odata.bindingparameter.name   : '_it'
        @Common.SideEffects.TargetEntities : [
            _it.toTaskNodes,
            _it.TargetTenant
        ]
        action Task_setTargetTenant(
        @title                    :          'New Target Tenant'
        @mandatory
        @(Common : {
            ValueListWithFixedValues : true,
            ValueListMapping         : {
                CollectionPath : 'Tenants_TargetsOnly',
                Parameters     : [{
                    $Type             : 'Common.ValueListParameterOut',
                    ValueListProperty : 'ObjectID',
                    LocalDataProperty : 'TargetTenant'
                }]
            }
        })
        TargetTenant : UUID);
    };

    @readonly
    entity SystemRoles                     as projection on my.SystemRoles;

    @readonly
    entity Landscapes                      as projection on my.Landscapes;

    @readonly
    entity MigrationTaskPresets            as projection on my.MigrationTaskPresets;

    @sap.creatable : false
    entity MigrationJobs                   as projection on my.MigrationJobs;

    entity MigrationTaskNodes              as projection on my.MigrationTaskNodes actions {

        @cds.odata.bindingparameter.name   : '_it'
        @Common.SideEffects.TargetEntities : [
            _it,
            _it.toMigrationTask
        ]
        action Nodes_IncludeSelected();

        @cds.odata.bindingparameter.name   : '_it'
        @Common.SideEffects.TargetEntities : [
            _it,
            _it.toMigrationTask
        ]
        action Nodes_SkipSelected();

        @cds.odata.bindingparameter.name   : '_it'
        @Core.OperationAvailable           : _it.flagCanConfigure
        @Common.SideEffects.TargetEntities : [_it]
        action Nodes_ConfigurePackage();
    }
};

// Registration service is separate as it enables Draft mode on the Tenant object
service RegistrationService {
    @odata.draft.enabled
    entity Tenants     as projection on my.Tenants actions {

        @cds.odata.bindingparameter.name : '_it'
        @Core.OperationAvailable         : _it.IsActiveEntity
        action Tenant_testConnection() returns Boolean;

        // @cds.odata.bindingparameter.name : '_it'
        // @Core.OperationAvailable         : _it.IsActiveEntity
        @Common.IsActionCritical         : true
        action Tenant_export()         returns Boolean;
    };

    @readonly
    entity SystemRoles as projection on my.SystemRoles;

    @readonly
    entity Landscapes  as projection on my.Landscapes;

};

service AppInformation {
    entity LaunchpadInfo as projection on my.LaunchpadInfo;
};
