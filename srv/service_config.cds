using migrationtool as db from '../db/schema';

@requires: 'MigrationUser'
service ConfigService {

    @readonly
    entity Tenants_TargetsOnly             as
        projection on db.Tenants {
            ObjectID,
            Name
        }
        where
            ReadOnly = false;

            @cds.redirection.target
    entity Tenants                         as
        projection on db.Tenants
        as t {
            *,
            (
                select count(x.ObjectID) from db.Errors as x
                where
                    t.ObjectID = x.toParent
            )                                                                                as NumberOfErrors                     : Integer,
            (
                select count(x.ObjectID) from db.extIntegrationPackages as x
                where
                    t.ObjectID = x.toParent.ObjectID
            )                                                                                as numIntegrationPackages             : Integer,
            (
                select count(x.ObjectID) from db.extKeyStoreEntries as x
                where
                    t.ObjectID = x.toParent.ObjectID
            )                                                                                as numKeyStoreEntries                 : Integer,
            (
                select count(x.ObjectID) from db.extUserCredentials as x
                where
                    t.ObjectID = x.toParent.ObjectID
            )                                                                                as numUserCredentials                 : Integer,
            (
                select count(x.ObjectID) from db.extCustomTagConfigurations as x
                where
                    t.ObjectID = x.toParent.ObjectID
            )                                                                                as numCustomTagConfigurations         : Integer,
            (
                select count(x.ObjectID) from db.extNumberRanges as x
                where
                    t.ObjectID = x.toParent.ObjectID
            )                                                                                as numNumberRanges                    : Integer,
            (
                select count(x.ObjectID) from db.extOAuth2ClientCredentials as x
                where
                    t.ObjectID = x.toParent.ObjectID
            )                                                                                as numOAuth2ClientCredentials         : Integer,
            (
                select count(x.ObjectID) from db.extAccessPolicies as x
                where
                    t.ObjectID = x.toParent.ObjectID
            )                                                                                as numAccessPolicies                  : Integer,
            (
                select count(x.ObjectID) from db.extJMSBrokers as x
                where
                    t.ObjectID = x.toParent.ObjectID
            )                                                                                as numJMSBrokers                      : Integer,
            (
                select count(x.ObjectID) from db.extVariables as x
                where
                    t.ObjectID = x.toParent.ObjectID
            )                                                                                as numVariables                       : Integer,
            (
                select count(x.ObjectID) from db.extCertificateUserMappings as x
                where
                    t.ObjectID = x.toParent.ObjectID
            )                                                                                as numCertificateUserMappings         : Integer,
            (
                select count(x.ObjectID) from db.extDataStores as x
                where
                    t.ObjectID = x.toParent.ObjectID
            )                                                                                as numDataStores                      : Integer,
            count(distinct toIntegrationPackages.toIntegrationDesigntimeArtifacts.ObjectID)  as numIntegrationDesigntimeArtifacts  : Integer,
            count(distinct toIntegrationPackages.toValueMappingDesigntimeArtifacts.ObjectID) as numValueMappingDesigntimeArtifacts : Integer
        }
        group by
            ObjectID,
            createdAt,
            createdBy,
            modifiedAt,
            modifiedBy,
            Name,
            Host,
            Token_host,
            Oauth_clientid,
            Oauth_secret,
            Oauth_servicekeyid,
            CF_organizationID,
            CF_organizationName,
            CF_spaceID,
            CF_spaceName,
            CF_servicePlanID,
            Neo_accountid,
            Neo_Platform_domain,
            Neo_Platform_user,
            Neo_Platform_password,
            CF_Platform_domain,
            CF_Platform_user,
            CF_Platform_password,
            UseForCertificateUserMappings,
            Role,
            Environment,
            RefreshedDate,
            ReadOnly
        actions {
            action testConnection()                                          returns Boolean;

            @Common.SideEffects.TargetEntities: [
                in,
                in.toAccessPolicies,
                in.toCustomTagConfigurations,
                in.toErrors,
                in.toIntegrationPackages,
                in.toJMSBrokers,
                in.toKeyStoreEntries,
                in.toNumberRanges,
                in.toOAuth2ClientCredentials,
                in.toUserCredentials,
                in.toVariables,
                in.toCertificateUserMappings,
                in.toDataStores
            ]
            action getIntegrationContentRefresh()                            returns Tenants;

            action getIntegrationContent();
            action getSelectedIntegrationContent(filter : db.TContentDownloaderFilter);

            @Common.SideEffects.TargetEntities: [in.toMigrationTasks]
            action createNewMigrationTask(

                                          @title: 'Task Name'
                                          @UI.ParameterDefaultValue: 'My new migration task'
                                          @mandatory
                                          Name : String,

                                          @title: 'Description'
                                          @UI.ParameterDefaultValue: ''
                                          @mandatory: false
                                          Description : String,

                                          @title: 'Target Tenant'
                                          @mandatory
                                          @(Common: {
                                              ValueListWithFixedValues: true,
                                              ValueListMapping        : {
                                                  CollectionPath: 'Tenants_TargetsOnly',
                                                  Parameters    : [{
                                                      $Type            : 'Common.ValueListParameterOut',
                                                      ValueListProperty: 'ObjectID',
                                                      LocalDataProperty: 'TargetTenant'
                                                  }]
                                              }
                                          })
                                          TargetTenant : UUID,

                                          @title: 'How do you want to generate the task'
                                          @UI.ParameterDefaultValue: 'Optimal'
                                          @mandatory
                                          @(Common: {
                                              ValueListWithFixedValues: true,
                                              ValueListMapping        : {
                                                  CollectionPath: 'MigrationTaskPresets',
                                                  Parameters    : [{
                                                      $Type            : 'Common.ValueListParameterOut',
                                                      ValueListProperty: 'Code',
                                                      LocalDataProperty: 'Preset'
                                                  }]
                                              }
                                          })
                                          Preset : db.TMigrationTaskPresets) returns MigrationTasks;
        };

    function getIntegrationContentStatus() returns db.TIntegrationContentStatus;

    entity IntegrationPackages             as
        projection on db.extIntegrationPackages {
            *,
            count(toErrors.ObjectID) as NumberOfErrors : Integer,
        }
        group by
            ObjectID,
            Id,
            Name,
            Description,
            ShortText,
            Version,
            Vendor,
            Mode,
            SupportedPlatform,
            ModifiedBy,
            CreationDate,
            ModifiedDate,
            CreatedBy,
            Products,
            Keywords,
            Countries,
            Industries,
            LineOfBusiness,
            PartnerContent,
            UpdateAvailable,
            toParent,
            ModifiedDateFormatted
        actions {
            action analyzeScriptFiles() returns many db.TArtifactAnalysis;
        };

    entity IntegrationDesigntimeArtifacts  as
        projection on db.extIntegrationDesigntimeArtifacts {
            *,
            count(toErrors.ObjectID) as NumberOfErrors : Integer
        }
        group by
            ObjectID,
            Id,
            Version,
            PackageId,
            Name,
            Description,
            ArtifactContent,
            toParent;

    entity KeyStoreEntries                 as projection on db.extKeyStoreEntries;
    entity Configurations                  as projection on db.extConfigurations;
    entity Resources                       as projection on db.extResources;
    entity UserCredentials                 as projection on db.extUserCredentials;
    entity CustomTagConfigurations         as projection on db.extCustomTagConfigurations;
    entity CustomTags                      as projection on db.extCustomTags;
    entity ValueMappingDesigntimeArtifacts as projection on db.extValueMappingDesigntimeArtifacts;
    entity ValMapSchemas                   as projection on db.extValMapSchemas;
    entity NumberRanges                    as projection on db.extNumberRanges;
    entity OAuth2ClientCredentials         as projection on db.extOAuth2ClientCredentials;
    entity AccessPolicies                  as projection on db.extAccessPolicies;
    entity ArtifactReferences              as projection on db.extArtifactReferences;
    entity JMSBrokers                      as projection on db.extJMSBrokers;
    entity Variables                       as projection on db.extVariables;

    entity CertificateUserMappings         as
        projection on db.extCertificateUserMappings {
            *,
            count(toRoles.ObjectID) as NumberOfRoles : Integer
        }
        group by
            ObjectID,
            toParent,
            Id,
            User,
            LastModifiedBy,
            LastModifiedTime,
            ValidUntil,
            ValidUntilCriticality;

    entity CertificateUserMappingRoles     as projection on db.extCertificateUserMappingRoles;
    entity DataStores                      as projection on db.extDataStores;
    entity DataStoreEntries                as projection on db.extDataStoreEntries;

    @sap.deletable: false
    entity Errors                          as projection on db.Errors;

            @odata.draft.enabled
            @fiori.draft.enabled
    entity MigrationTasks                  as
        projection on db.MigrationTasks
        as t {
            *,
            (
                select count(n.ObjectID) from db.MigrationTaskNodes as n
                where
                    (
                            n.Included  =  true
                        and n.Component in ('Integration Package')
                        and t.ObjectID  =  n.toMigrationTask.ObjectID
                    )
            ) as numIntegrationPackages : Integer,
            (
                select count(n.ObjectID) from db.MigrationTaskNodes as n
                where
                    (
                            n.Included  =  true
                        and n.Component in (
                            'Keystore', 'User Credential', 'oAuth Credential', 'Access Policy', 'Certificate User Mapping'
                        )
                        and t.ObjectID  =  n.toMigrationTask.ObjectID
                    )
            ) as numSecurityArtifacts   : Integer,
            (
                select count(n.ObjectID) from db.MigrationTaskNodes as n
                where
                    (
                            n.Included  =  true
                        and n.Component in (
                            'Number Range', 'Custom Tag', 'Global Variable', 'Global Data Store', 'JMS Broker'
                        )
                        and t.ObjectID  =  n.toMigrationTask.ObjectID
                    )
            ) as numOtherArtifacts      : Integer
        }
        actions {

            @Common.SideEffects.TargetEntities: [in.toMigrationJobs]
            @Common.IsActionCritical          : true
            action startMigration() returns MigrationJobs;

            @Common.SideEffects.TargetEntities: [in.toMigrationJobs]
            action refreshJobsTable();

            @Common.SideEffects.TargetEntities: [
                in,
                in.toTaskNodes
            ]
            @Common.IsActionCritical          : true
            action resetTaskNodes(
                                  @title: 'How would you like to preset the items'
                                  @UI.ParameterDefaultValue: 'Optimal'
                                  @mandatory
                                  @(Common: {
                                      ValueListWithFixedValues: true,
                                      ValueListMapping        : {
                                          CollectionPath: 'MigrationTaskPresets',
                                          Parameters    : [{
                                              $Type            : 'Common.ValueListParameterOut',
                                              ValueListProperty: 'Code',
                                              LocalDataProperty: 'Preset'
                                          }]
                                      }
                                  })
                                  Preset : db.TMigrationTaskPresets);

            @Common.SideEffects.TargetEntities: [
                in.toTaskNodes,
                in.TargetTenant
            ]
            action setTargetTenant(
                                   @title: 'New Target Tenant'
                                   @UI.ParameterDefaultValue: in.TargetTenant.ObjectID
                                   @mandatory
                                   @(Common: {
                                       ValueListWithFixedValues: true,
                                       ValueListMapping        : {
                                           CollectionPath: 'Tenants_TargetsOnly',
                                           Parameters    : [{
                                               $Type            : 'Common.ValueListParameterOut',
                                               ValueListProperty: 'ObjectID',
                                               LocalDataProperty: 'TargetTenant'
                                           }]
                                       }
                                   })
                                   TargetTenant : UUID);
        };

    @readonly
    entity CodeLists                       as projection on db.CodeLists;

    entity SystemRoles                     as projection on CodeLists[List = 'SystemRoles'];
    entity Landscapes                      as projection on CodeLists[List = 'Landscapes'];
    entity MigrationTaskPresets            as projection on CodeLists[List = 'MigrationTaskPresets'];

            @sap.creatable                    : false
    entity MigrationJobs                   as projection on db.MigrationJobs
        actions {
            @Common.SideEffects.TargetEntities: [in]
            action refreshLog();
        };

    entity MigrationTaskNodes              as projection on db.MigrationTaskNodes
        actions {

            @Common.SideEffects.TargetEntities: [
                in,
                in.toMigrationTask
            ]
            action includeSelected();

            @Common.SideEffects.TargetEntities: [
                in,
                in.toMigrationTask
            ]
            action skipSelected();

            @Core.OperationAvailable          : in.flagCanConfigure
            @Common.SideEffects.TargetEntities: [in]
            action configurePackage();
        }
};
