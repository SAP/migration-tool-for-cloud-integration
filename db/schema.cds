namespace migrationtool;

using {managed} from '@sap/cds/common';

type TKeyValuePair {
    ![key] : String(255);
    value  : String(255);
}

type TIntegrationContentStatus {
    Running    : Boolean;
    Tenant     : String(255);
    Progress   : Integer;
    Topic      : String(255);
    Item       : String(255);
    ErrorState : Boolean;
}

type TArtifactAnalysis {
    artifact : String(255);
    file     : String(1000);
    count    : Integer;
}

type TErrorComponentName   : String(50) enum {
    IntegrationPackage = 'Integration Package';
    IntegrationFlow = 'Integration Flow';
    ValueMapping = 'Value Mapping';
    KeystoreEntry = 'Keystore Entry';
    UserCredential = 'User Credential';
    OAuth2ClientCredential = 'OAuth2 Client Credential';
    JMSBroker = 'JMS Broker';
    CertificateUserMapping = 'Certificate User Mapping';
    DataStore = 'Data Store';
    Variable = 'Variable';
    NumberRange = 'Number Range';
    CustomTag = 'Custom Tag';
    AccessPolicy = 'Access Policy';
}

type TContentDownloaderFilter {
    getIntegrationPackages_include      : Boolean;
    getIntegrationPackages_discover     : Boolean;
    getIntegrationPackages_filter       : many String(255);
    getKeyStoreEntries_include          : Boolean;
    getKeyStoreEntries_discover         : Boolean;
    getKeyStoreEntries_filter           : many String(255);
    getNumberRanges_include             : Boolean;
    getNumberRanges_discover            : Boolean;
    getNumberRanges_filter              : many String(255);
    getCustomTagConfigurations_include  : Boolean;
    getCustomTagConfigurations_discover : Boolean;
    getCustomTagConfigurations_filter   : many String(255);
    getAccessPolicies_include           : Boolean;
    getAccessPolicies_discover          : Boolean;
    getAccessPolicies_filter            : many String(255);
    getOAuth2ClientCredentials_include  : Boolean;
    getOAuth2ClientCredentials_discover : Boolean;
    getOAuth2ClientCredentials_filter   : many String(255);
    getUserCredentials_include          : Boolean;
    getUserCredentials_discover         : Boolean;
    getUserCredentials_filter           : many String(255);
    getVariables_include                : Boolean;
    getVariables_discover               : Boolean;
    getVariables_filter                 : many String(255);
    getDataStores_include               : Boolean;
    getDataStores_discover              : Boolean;
    getDataStores_filter                : many String(255);
    getCertificateUserMappings_include  : Boolean;
    getCertificateUserMappings_discover : Boolean;
    getCertificateUserMappings_filter   : many String(255);
    getJMSBrokers_include               : Boolean;
    getJMSBrokers_discover              : Boolean;
}

type TMigrationTaskPresets : String(50) enum {
    IncludeAll = 'Include All';
    SkipAll = 'Skip All';
    Optimal = 'Optimal';
}

entity CodeLists {
    key List    : String(255) @UI.Hidden;
    key Context : String(255);
    key Code    : String(255) @title: 'Item';
        Value   : String(255) @title: 'Description';
}

// Errors ----------------------------------------------------------------
entity Errors {
    key ObjectID      : UUID @Core.Computed;
        toParent      : UUID;
        Type          : String(50);
        Component     : String(255);
        ComponentName : String(255);
        Description   : String(5000);
        Path          : String(1000);
        Severity      : Integer;
}

// Tenants ---------------------------------------------------------------
entity Tenants : managed {
    key     ObjectID                      : UUID        @Core.Computed  @Common.Text: Name;
            Name                          : String(255);
            Host                          : String(255);
            Token_host                    : String(255);
            Oauth_clientid                : String(255);
            Oauth_secret                  : String(255);
            Oauth_servicekeyid            : String(255);
            CF_organizationID             : String(255);
            CF_organizationName           : String(255);
            CF_spaceID                    : String(255);
            CF_spaceName                  : String(255);
            CF_servicePlanID              : String(255);
            Neo_accountid                 : String(255);
            Neo_Platform_domain           : String(255);
            Neo_Platform_user             : String(255);
            Neo_Platform_password         : String(255);
            CF_Platform_domain            : String(255);
            CF_Platform_user              : String(255);
            CF_Platform_password          : String(255);
            UseForCertificateUserMappings : Boolean;
            Role                          : String(255);
            Environment                   : String(255);
            RefreshedDate                 : DateTime;
            ReadOnly                      : Boolean default false;
    virtual ReadOnlyText                  : String(255);
    virtual ErrorsText                    : String(255) @Core.Computed;
    virtual ErrorsCriticality             : CriticalityType;
    virtual NumberOfErrors                : Integer     @Core.Computed;
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
            toDataStores                  : Composition of many extDataStores
                                                on toDataStores.toParent = $self;
}

// Integration Packages -----------------------------------------------------
entity extIntegrationPackages {
    key     ObjectID                          : UUID    @Core.Computed;
    key     Id                                : String(255);
            Name                              : String(255);
            Description                       : String(1000);
            ShortText                         : String(1000);
            Version                           : String(255);
            Vendor                            : String(255);
            Mode                              : String(255);
            SupportedPlatform                 : String(255);
            ModifiedBy                        : String(255);
            CreationDate                      : String(255);
            ModifiedDate                      : String(255);
            CreatedBy                         : String(255);
            Products                          : String(255);
            Keywords                          : String(255);
            Countries                         : String(255);
            Industries                        : String(255);
            LineOfBusiness                    : String(255);
            PartnerContent                    : Boolean;
            UpdateAvailable                   : Boolean;
    key     toParent                          : Association to one Tenants;
            ModifiedDateFormatted             : DateTime;
    virtual NumberOfErrors                    : Integer @Core.Computed;
    virtual Criticality                       : Integer @Core.Computed;
            toIntegrationDesigntimeArtifacts  : Composition of many extIntegrationDesigntimeArtifacts
                                                    on toIntegrationDesigntimeArtifacts.toParent = $self;
            toValueMappingDesigntimeArtifacts : Composition of many extValueMappingDesigntimeArtifacts
                                                    on toValueMappingDesigntimeArtifacts.toParent = $self;
            toCustomTags                      : Composition of many extCustomTags
                                                    on toCustomTags.toParent = $self;
            toErrors                          : Association to many Errors
                                                    on  toErrors.ComponentName = Name
                                                    and toErrors.toParent      = toParent.ObjectID
                                                    and toErrors.Component     = 'Integration Package';
}

// Integration Designtime Artifacts -----------------------------------------------------
entity extIntegrationDesigntimeArtifacts {
    key     ObjectID         : UUID    @Core.Computed;
    key     Id               : String(255);
            Version          : String(255);
            PackageId        : String(255);
            Name             : String(255);
            Description      : String(1000);
            ArtifactContent  : Binary;
    virtual NumberOfErrors   : Integer @Core.Computed;
    virtual Criticality      : Integer @Core.Computed;
            toParent         : Association to one extIntegrationPackages;
            toConfigurations : Composition of many extConfigurations
                                   on toConfigurations.toParent = $self;
            toResources      : Composition of many extResources
                                   on toResources.toParent = $self;
            toErrors         : Association to many Errors
                                   on  toErrors.ComponentName = Name
                                   and toErrors.toParent      = toParent.toParent.ObjectID
                                   and toErrors.Component     = 'Integration Flow';
}

entity extConfigurations {
    key ObjectID       : UUID @Core.Computed;
    key ParameterKey   : String(255);
        ParameterValue : String(255);
        DataType       : String(255);
        toParent       : Association to one extIntegrationDesigntimeArtifacts;
}

entity extResources {
    key ObjectID               : UUID @Core.Computed;
    key Name                   : String(255);
    key ResourceType           : String(255);
        ReferencedResourceType : String(255);
        ResourceContent        : Binary;
        toParent               : Association to one extIntegrationDesigntimeArtifacts;
}

// ValueMapping Designtime Artifacts -----------------------------------------------------
entity extValueMappingDesigntimeArtifacts {
    key ObjectID        : UUID @Core.Computed;
    key Id              : String(255);
    key Version         : String(255);
        PackageId       : String(255);
        Name            : String(255);
        Description     : String(1000);
        ArtifactContent : Binary;
        toParent        : Association to one extIntegrationPackages;
        toValMapSchemas : Composition of many extValMapSchemas
                              on toValMapSchemas.toParent = $self;
}

entity extValMapSchemas {
    key ObjectID  : UUID @Core.Computed;
    key SrcAgency : String(255);
    key SrcId     : String(255);
    key TgtAgency : String(255);
    key TgtId     : String(255);
        State     : String(255);
        toParent  : Association to one extValueMappingDesigntimeArtifacts;
}

@cds.persistence.skip
entity extValMapValues {
    key SrcValue : String(255);
    key TgtValue : String(255);
}

// Custom Tags ----------------------------------------------------------------------------
entity extCustomTags {
    key ObjectID : UUID @Core.Computed;
    key Name     : String(255);
        Value    : String(255);
        toParent : Association to one extIntegrationPackages;
}

// KeyStore Entries ----------------------------------------------------------------------------
entity extKeyStoreEntries {
    key ObjectID : UUID @Core.Computed;
        toParent : Association to one Tenants;
        Hexalias : String(255);
        Alias    : String(255);
        Type     : String(255);
        Owner    : String(255);
}

// User Credentials ----------------------------------------------------------------------------
entity extUserCredentials {
    key ObjectID                   : UUID @Core.Computed;
        toParent                   : Association to one Tenants;
        Name                       : String(255);
        Kind                       : String(255);
        Description                : String(1000);
        User                       : String(255);
        Password                   : String(255);
        CompanyId                  : String(255);
        SecurityArtifactDescriptor : extSecurityArtifactDescriptorType;
}

type extSecurityArtifactDescriptorType {
    Type       : String(255);
    DeployedBy : String(255);
    DeployedOn : DateTime;
    Status     : String(255);
}

// Custom Tag Configurations ----------------------------------------------------------------------------
entity extCustomTagConfigurations {
    key ObjectID        : UUID @Core.Computed;
        toParent        : Association to one Tenants;
        tagName         : String(255);
        permittedValues : String(255);
        isMandatory     : Boolean;
}

// Number Ranges ----------------------------------------------------------------------------
entity extNumberRanges {
    key ObjectID     : UUID @Core.Computed;
        toParent     : Association to one Tenants;
        Name         : String(255);
        Description  : String(1000);
        MaxValue     : Integer;
        MinValue     : Integer;
        Rotate       : Boolean;
        CurrentValue : Integer;
        FieldLength  : Integer;
        DeployedBy   : String(255);
        DeployedOn   : DateTime;
}

// OAuth2Client Credentials ----------------------------------------------------------------------------
entity extOAuth2ClientCredentials {
    key ObjectID                   : UUID @Core.Computed;
        toParent                   : Association to one Tenants;
        Name                       : String(255);
        Description                : String(1000);
        TokenServiceUrl            : String(255);
        ClientId                   : String(255);
        ClientSecret               : String(255);
        ClientAuthentication       : String(255);
        Scope                      : String(255);
        ScopeContentType           : String(255);
        SecurityArtifactDescriptor : extSecurityArtifactDescriptorType;
}

// JMS Broker ------------------------------------------------------------------------------------
entity extJMSBrokers {
    key ObjectID                 : UUID @Core.Computed;
        toParent                 : Association to one Tenants;
        ![Key]                   : String(255);
        Capacity                 : String(255);
        MaxCapacity              : String(255);
        IsTransactedSessionsHigh : Integer;
        IsConsumersHigh          : Integer;
        IsProducersHigh          : Integer;
        MaxQueueNumber           : String(255);
        QueueNumber              : String(255);
        CapacityOk               : String(255);
        CapacityWarning          : String(255);
        CapacityError            : String(255);
        IsQueuesHigh             : Integer;
        IsMessageSpoolHigh       : Integer;
}

// Access Policies ------------------------------------------------------------------------------------
entity extAccessPolicies {
    key ObjectID             : UUID @Core.Computed;
        toParent             : Association to one Tenants;
        Id                   : String(255);
        RoleName             : String(255);
        Description          : String(1000);
        toArtifactReferences : Composition of many extArtifactReferences
                                   on toArtifactReferences.toParent = $self;
}

entity extArtifactReferences {
    key ObjectID           : UUID @Core.Computed;
        toParent           : Association to one extAccessPolicies;
        Id                 : String(255);
        Name               : String(255);
        Description        : String(1000);
        Type               : String(255);
        ConditionAttribute : String(255);
        ConditionValue     : String(255);
        ConditionType      : String(255);
}

// Certificate User Mappings ---------------------------------------------------------------------------------
entity extCertificateUserMappings {
    key ObjectID              : UUID    @Core.Computed;
        toParent              : Association to one Tenants;
        Id                    : String(255);
    key User                  : String(255);
        LastModifiedBy        : String(255);
        LastModifiedTime      : DateTime;
        ValidUntil            : DateTime;
        ValidUntilCriticality : Integer @Core.Computed;
        NumberOfRoles         : Integer @Core.Computed;
        toRoles               : Composition of many extCertificateUserMappingRoles
                                    on toRoles.toParent = $self;
}

entity extCertificateUserMappingRoles {
    key ObjectID        : UUID @Core.Computed;
        toParent        : Association to one extCertificateUserMappings;
    key name            : String(255);
        applicationName : String(255);
        providerAccount : String(255);
}

// Global Variables ------------------------------------------------------------------------------------
entity extVariables {
    key ObjectID        : UUID @Core.Computed;
        toParent        : Association to one Tenants;
        VariableName    : String(255);
        IntegrationFlow : String(255);
        Visibility      : String(255);
        UpdatedAt       : DateTime;
        RetainUntil     : DateTime;
}

// Data Stores ------------------------------------------------------------------------------------
entity extDataStores {
    key ObjectID                : UUID @Core.Computed;
        toParent                : Association to one Tenants;
        DataStoreName           : String(255);
        IntegrationFlow         : String(255);
        Type                    : String(255);
        Visibility              : String(255);
        NumberOfMessages        : String(255);
        NumberOfOverdueMessages : String(255);
        toDataStoreEntries      : Composition of many extDataStoreEntries
                                      on toDataStoreEntries.toParent = $self;
}

entity extDataStoreEntries {
    key ObjectID    : UUID @Core.Computed;
        toParent    : Association to one extDataStores;
    key Id          : String(255);
        Status      : String(255);
        MessageId   : String(255);
        DueAt       : DateTime;
        CreatedAt   : DateTime;
        RetainUntil : DateTime;
}


// Migration Tasks ------------------------------------------------------------------------------------
entity MigrationTasks : managed {
    key     ObjectID              : UUID               @Core.Computed;
            SourceTenant          : Association to one Tenants;
            TargetTenant          : Association to one Tenants;
            Name                  : String(255);
            Description           : String(1000);
    virtual LastStatus            : String(255);
    virtual LastStatusCriticality : CriticalityType;
            CustomConfig          : LargeString;
            toTaskNodes           : Composition of many MigrationTaskNodes
                                        on toTaskNodes.toMigrationTask = $self;
            toMigrationJobs       : Composition of many MigrationJobs
                                        on toMigrationJobs.MigrationTaskID = ObjectID;
}

entity MigrationTaskNodes {
    key     ObjectID                 : UUID        @Core.Computed;
    key     toMigrationTask          : Association to one MigrationTasks;
            Id                       : String(255);
            Name                     : String(255);
            Component                : String(255);
            PackageId                : String(255); //used only for Flows and Valmaps to link it back to the package
    virtual Status                   : CriticalityType;
            ExistInSource            : Boolean;
    virtual ExistInSourceCriticality : CriticalityType;
            ExistInTarget            : Boolean;
    virtual ExistInTargetCriticality : CriticalityType;
            Included                 : Boolean default true;
    virtual IncludedText             : String(255) @Core.Computed;
    virtual IncludedCriticality      : CriticalityType;
            ConfigureOnly            : Boolean default false;
    virtual ConfigureOnlyText        : String(255) @Core.Computed;
    virtual ConfigureOnlyCriticality : CriticalityType;
    virtual flagCanConfigure         : TechnicalBooleanFlag not null default false;
            PackageVendor            : String(255); //used only for Integration Packages to show which are SAP and which are Custom
}

type TechnicalBooleanFlag  : Boolean  @Core.Computed  @UI.Hidden;
type CriticalityType       : Integer @Core.Computed;

entity MigrationJobs {
    key ObjectID          : UUID;
        MigrationTaskID   : UUID @mandatory;
        toMigrationTask   : Association to one MigrationTasks
                                on toMigrationTask.ObjectID = MigrationTaskID;
        StartTime         : DateTime default $now;
        EndTime           : DateTime;
        Status            : String(255) default 'Created';
        StatusCriticality : Integer default 2;
        IsRunning         : Boolean default false;
        Log               : LargeString;
        toErrors          : Composition of many Errors
                                on toErrors.toParent = ObjectID;
}
