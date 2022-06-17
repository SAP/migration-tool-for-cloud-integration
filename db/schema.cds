namespace migrationtool;

using {
    managed,
    cuid
} from '@sap/cds/common';

entity SystemRoles : CodeList {};
entity Landscapes : CodeList {};
entity MigrationTaskPresets : CodeList {};

aspect CodeList {
    key Code : String(10) @title : 'Code'  @Common.Text : Value;
    Value    : String(50) @title : 'Description';
}

@cds.persistence.skip
entity LaunchpadInfo {
    Script : String;
};

// Errors ----------------------------------------------------------------
entity Errors {
    key ObjectID      : UUID @Core.Computed;
        toParent      : UUID;
        Type          : String(20);
        Component     : String;
        ComponentName : String;
        Description   : String;
        Path          : String;
        Severity      : Integer;
};

// Tenants ---------------------------------------------------------------
entity Tenants : managed {
    key ObjectID                      : UUID    @Core.Computed  @Common.Text : Name;
        Name                          : String;
        Host                          : String;
        Token_host                    : String;
        Oauth_clientid                : String;
        Oauth_secret                  : String  @Common.MaskedAlways :         true;
        Oauth_servicekeyid            : String;
        CF_organizationID             : String;
        CF_organizationName           : String;
        CF_spaceID                    : String;
        CF_spaceName                  : String;
        CF_servicePlanID              : String;
        Neo_accountid                 : String;
        Neo_Platform_domain           : String;
        Neo_Platform_user             : String;
        Neo_Platform_password         : String;
        CF_Platform_domain            : String;
        CF_Platform_user              : String;
        CF_Platform_password          : String;
        UseForCertificateUserMappings : Boolean;
        Role                          : String;
        Environment                   : String;
        Statistics                    : TenantStatisticsType;
        RefreshedDate                 : DateTime;
        ReadOnly                      : Boolean default false;
        virtual ReadOnlyText          : String;
        virtual ErrorsText            : String  @Core.Computed;
        virtual ErrorsCriticality     : CriticalityType;
        virtual NumberOfErrors        : Integer @Core.Computed;
        toMigrationTasks              : Association to many MigrationTasks
                                            on toMigrationTasks.SourceTenant = $self;
        toErrors                      : Composition of many Errors
                                            on toErrors.toParent = ObjectID;
        toIntegrationPackages         : Composition of many extIntegrationPackages
                                            on toIntegrationPackages.toParent = $self;
        toKeyStoreEntries             : Composition of many extKeyStoreEntries
                                            on toKeyStoreEntries.toParent = $self;
        toUserCredentials             : Composition of many extUserCredentials
                                            on toUserCredentials.toParent = $self;
        toCustomTagConfigurations     : Composition of many extCustomTagConfigurations
                                            on toCustomTagConfigurations.toParent = $self;
        toNumberRanges                : Composition of many extNumberRanges
                                            on toNumberRanges.toParent = $self;
        toOAuth2ClientCredentials     : Composition of many extOAuth2ClientCredentials
                                            on toOAuth2ClientCredentials.toParent = $self;
        toAccessPolicies              : Composition of many extAccessPolicies
                                            on toAccessPolicies.toParent = $self;
        toJMSBrokers                  : Composition of many extJMSBrokers
                                            on toJMSBrokers.toParent = $self;
        toVariables                   : Composition of many extVariables
                                            on toVariables.toParent = $self;
        toCertificateUserMappings     : Composition of many extCertificateUserMappings
                                            on toCertificateUserMappings.toParent = $self;
};

type TenantStatisticsType {
    numIntegrationPackages             : Integer default 0;
    numIntegrationDesigntimeArtifacts  : Integer default 0;
    numConfigurations                  : Integer default 0;
    numResources                       : Integer default 0;
    numValueMappingDesigntimeArtifacts : Integer default 0;
    numValMapSchema                    : Integer default 0;
    numCustomTags                      : Integer default 0;
    numKeyStoreEntries                 : Integer default 0;
    numUserCredentials                 : Integer default 0;
    numCustomTagConfigurations         : Integer default 0;
    numNumberRanges                    : Integer default 0;
    numOAuth2ClientCredentials         : Integer default 0;
    numAccessPolicies                  : Integer default 0;
    numAccessPolicyReferences          : Integer default 0;
    numJMSBrokers                      : Integer default 0;
    numVariables                       : Integer default 0;
    numCertificateUserMappings         : Integer default 0;
};


// Integration Packages -----------------------------------------------------
entity extIntegrationPackages {
    key ObjectID                          : UUID    @Core.Computed;
    key Id                                : String;
        Name                              : String;
        Description                       : String;
        ShortText                         : String;
        Version                           : String;
        Vendor                            : String;
        Mode                              : String;
        SupportedPlatform                 : String;
        ModifiedBy                        : String;
        CreationDate                      : String;
        ModifiedDate                      : String;
        CreatedBy                         : String;
        Products                          : String;
        Keywords                          : String;
        Countries                         : String;
        Industries                        : String;
        LineOfBusiness                    : String;
        PartnerContent                    : Boolean;
        UpdateAvailable                   : Boolean;
        toParent                          : Association to one Tenants;
        ModifiedDateFormatted             : Date;
        virtual NumberOfErrors            : Integer @Core.Computed;
        virtual Criticality               : Integer @Core.Computed;
        toIntegrationDesigntimeArtifacts  : Composition of many extIntegrationDesigntimeArtifacts
                                                on toIntegrationDesigntimeArtifacts.toParent = $self;
        toValueMappingDesigntimeArtifacts : Composition of many extValueMappingDesigntimeArtifacts
                                                on toValueMappingDesigntimeArtifacts.toParent = $self;
        toCustomTags                      : Composition of many extCustomTags
                                                on toCustomTags.toParent = $self;
        toErrors                          : Association to many Errors
                                                on  toErrors.ComponentName = Name
                                                and toErrors.Component     = 'Integration Package';
};

// Integration Designtime Artifacts -----------------------------------------------------
entity extIntegrationDesigntimeArtifacts {
    key ObjectID               : UUID    @Core.Computed;
    key Id                     : String;
        Version                : String;
        PackageId              : String;
        Name                   : String;
        Description            : String;
        ArtifactContent        : Binary;
        virtual NumberOfErrors : Integer @Core.Computed;
        virtual Criticality    : Integer @Core.Computed;
        toParent               : Association to one extIntegrationPackages;
        toConfigurations       : Composition of many extConfigurations
                                     on toConfigurations.toParent = $self;
        toResources            : Composition of many extResources
                                     on toResources.toParent = $self;
        toErrors               : Association to many Errors
                                     on  toErrors.ComponentName = Name
                                     and toErrors.Component     = 'Integration Flow';
};

entity extConfigurations {
    key ObjectID       : UUID @Core.Computed;
    key ParameterKey   : String;
        ParameterValue : String;
        DataType       : String;
        toParent       : Association to one extIntegrationDesigntimeArtifacts;
};

entity extResources {
    key ObjectID               : UUID @Core.Computed;
    key Name                   : String;
    key ResourceType           : String;
        ReferencedResourceType : String;
        ResourceContent        : Binary;
        toParent               : Association to one extIntegrationDesigntimeArtifacts;
};

// ValueMapping Designtime Artifacts -----------------------------------------------------
entity extValueMappingDesigntimeArtifacts {
    key ObjectID        : UUID @Core.Computed;
    key Id              : String;
    key Version         : String;
        PackageId       : String;
        Name            : String;
        Description     : String;
        ArtifactContent : Binary;
        toParent        : Association to one extIntegrationPackages;
        toValMapSchema  : Composition of many extValMapSchema
                              on toValMapSchema.toParent = $self;
};

entity extValMapSchema {
    key ObjectID  : UUID @Core.Computed;
    key SrcAgency : String;
    key SrcId     : String;
    key TgtAgency : String;
    key TgtId     : String;
        State     : String;
        toParent  : Association to one extValueMappingDesigntimeArtifacts;
};

// Custom Tags ----------------------------------------------------------------------------
entity extCustomTags {
    key ObjectID : UUID @Core.Computed;
    key Name     : String;
        Value    : String;
        toParent : Association to one extIntegrationPackages;
};

// KeyStore Entries ----------------------------------------------------------------------------
entity extKeyStoreEntries {
    key ObjectID : UUID @Core.Computed;
        toParent : Association to one Tenants;
        Hexalias : String;
        Alias    : String;
        Type     : String;
        Owner    : String;
};

// User Credentials ----------------------------------------------------------------------------
entity extUserCredentials {
    key ObjectID                   : UUID @Core.Computed;
        toParent                   : Association to one Tenants;
        Name                       : String;
        Kind                       : String;
        Description                : String;
        User                       : String;
        Password                   : String;
        CompanyId                  : String;
        SecurityArtifactDescriptor : extSecurityArtifactDescriptorType;
};

type extSecurityArtifactDescriptorType {
    Type       : String;
    DeployedBy : String;
    DeployedOn : Date;
    Status     : String;
};

// Custom Tag Configurations ----------------------------------------------------------------------------
entity extCustomTagConfigurations {
    key ObjectID        : UUID @Core.Computed;
        toParent        : Association to one Tenants;
        tagName         : String;
        permittedValues : String;
        isMandatory     : Boolean;
};

// Number Ranges ----------------------------------------------------------------------------
entity extNumberRanges {
    key ObjectID     : UUID @Core.Computed;
        toParent     : Association to one Tenants;
        Name         : String;
        Description  : String;
        MaxValue     : Integer;
        MinValue     : Integer;
        Rotate       : Boolean;
        CurrentValue : Integer;
        FieldLength  : Integer;
        DeployedBy   : String;
        DeployedOn   : Date;
};

// OAuth2Client Credentials ----------------------------------------------------------------------------
entity extOAuth2ClientCredentials {
    key ObjectID                   : UUID @Core.Computed;
        toParent                   : Association to one Tenants;
        Name                       : String;
        Description                : String;
        TokenServiceUrl            : String;
        ClientId                   : String;
        ClientSecret               : String;
        ClientAuthentication       : String;
        Scope                      : String;
        ScopeContentType           : String;
        SecurityArtifactDescriptor : extSecurityArtifactDescriptorType;
};

// JMS Broker ------------------------------------------------------------------------------------
entity extJMSBrokers {
    key ObjectID                 : UUID @Core.Computed;
        toParent                 : Association to one Tenants;
        zKey                     : String;
        Capacity                 : Integer;
        MaxCapacity              : String;
        IsTransactedSessionsHigh : Integer;
        IsConsumersHigh          : Integer;
        IsProducersHigh          : Integer;
        MaxQueueNumber           : Integer;
        QueueNumber              : Integer;
        CapacityOk               : Integer;
        CapacityWarning          : Integer;
        CapacityError            : Integer;
        IsQueuesHigh             : Integer;
        IsMessageSpoolHigh       : Integer;
};

// Access Policies ------------------------------------------------------------------------------------
entity extAccessPolicies {
    key ObjectID             : UUID @Core.Computed;
        toParent             : Association to one Tenants;
        Id                   : String;
        RoleName             : String;
        Description          : String;
        toArtifactReferences : Composition of many extArtifactReferences
                                   on toArtifactReferences.toParent = $self;
};

entity extArtifactReferences {
    key ObjectID           : UUID @Core.Computed;
        toParent           : Association to one extAccessPolicies;
        Id                 : String;
        Name               : String;
        Description        : String;
        Type               : String;
        ConditionAttribute : String;
        ConditionValue     : String;
        ConditionType      : String;
};

// Certificate User Mappings ---------------------------------------------------------------------------------
entity extCertificateUserMappings {
    key ObjectID              : UUID    @Core.Computed;
        toParent              : Association to one Tenants;
        Id                    : String;
    key User                  : String;
        LastModifiedBy        : String;
        LastModifiedTime      : DateTime;
        ValidUntil            : DateTime;
        ValidUntilCriticality : Integer @Core.Computed;
        NumberOfRoles         : Integer @Core.Computed;
        toRoles               : Composition of many extCertificateUserMappingRoles
                                    on toRoles.toParent = $self;
};

entity extCertificateUserMappingRoles {
    key ObjectID        : UUID @Core.Computed;
        toParent        : Association to one extCertificateUserMappings;
    key name            : String;
        applicationName : String;
        providerAccount : String;
};

// Global Variables ------------------------------------------------------------------------------------
entity extVariables {
    key ObjectID        : UUID @Core.Computed;
        toParent        : Association to one Tenants;
        VariableName    : String;
        IntegrationFlow : String;
        Visibility      : String;
        UpdatedAt       : DateTime;
        RetainUntil     : DateTime;
};

// Migration Tasks ------------------------------------------------------------------------------------
entity MigrationTasks : managed {
    key ObjectID                      : UUID               @Core.Computed;
        SourceTenant                  : Association to one Tenants;
        TargetTenant                  : Association to one Tenants;
        Name                          : String;
        Description                   : String;
        virtual LastStatus            : String;
        virtual LastStatusCriticality : CriticalityType;
        virtual Statistics            : TaskStatisticsType @Core.Computed;
        CustomConfig                  : String default '{ "name_prefix": "" }';
        toTaskNodes                   : Composition of many MigrationTaskNodes
                                            on toTaskNodes.toMigrationTask = $self;
        toMigrationJobs               : Composition of many MigrationJobs
                                            on toMigrationJobs.MigrationTaskID = ObjectID;
};

type TaskStatisticsType {
    numIntegrationPackages : Integer default 0;
    numSecurityArtifacts   : Integer default 0;
    numOtherArtifacts      : Integer default 0;
};

entity MigrationTaskNodes {
    key ObjectID                         : UUID       @Core.Computed;
    key toMigrationTask                  : Association to one MigrationTasks;
        Id                               : String;
        Name                             : String;
        Component                        : String;
        PackageId                        : String; //used only for Flows and Valmaps to link it back to the package
        virtual Status                   : CriticalityType;
        ExistInSource                    : Boolean;
        virtual ExistInSourceCriticality : CriticalityType;
        ExistInTarget                    : Boolean;
        virtual ExistInTargetCriticality : CriticalityType;
        Included                         : Boolean default true;
        virtual IncludedText             : String(10) @Core.Computed;
        virtual IncludedCriticality      : CriticalityType;
        ConfigureOnly                    : Boolean default false;
        virtual ConfigureOnlyText        : String(20) @Core.Computed;
        virtual ConfigureOnlyCriticality : CriticalityType;
        virtual flagCanConfigure         : TechnicalBooleanFlag not null default false;
        PackageVendor                    : String; //used only for Integration Packages to show which are SAP and which are Custom
};

type TechnicalBooleanFlag : Boolean @Core.Computed  @UI.Hidden;
type CriticalityType : Integer @Core.Computed;

entity MigrationJobs {
    key ObjectID          : UUID;
        MigrationTaskID   : UUID @mandatory;
        toMigrationTask   : Association to one MigrationTasks
                                on toMigrationTask.ObjectID = MigrationTaskID;
        StartTime         : DateTime default $now;
        EndTime           : DateTime;
        Status            : String default 'Created';
        StatusCriticality : Integer default 2;
        IsRunning         : Boolean default false;
        Log               : String default '';
        toErrors          : Composition of many Errors
                                on toErrors.toParent = ObjectID;
};
