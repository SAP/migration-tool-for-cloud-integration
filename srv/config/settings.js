module.exports = {
    Paths: {
        DeepLinks: {
            AllPackages: '/itspaces/shell/design',
            PackageOverview: '/itspaces/shell/design/contentpackage/{PACKAGE_ID}',
            PackageArtifacts: '/itspaces/shell/design/contentpackage/{PACKAGE_ID}?section=ARTIFACTS',
            SecurityMaterial: '/itspaces/shell/monitoring/SecurityMaterials'
        },
        IntegrationPackages: {
            path: '/api/v1/IntegrationPackages',
            ping: '/api/v1/IntegrationPackages(\'{PACKAGE_ID}\')',
            delete: '/api/v1/IntegrationPackages(\'{PACKAGE_ID}\')',
            download: '/api/v1/IntegrationPackages(\'{PACKAGE_ID}\')/$value',
            upload: '/api/v1/IntegrationPackages?Overwrite=true',
            subscribe: '/api/v1/CopyIntegrationPackage?Id=\'{PACKAGE_ID}\'&ImportMode=\'OVERWRITE\'',
            createCopy: '/api/v1/CopyIntegrationPackage?Id=\'{PACKAGE_ID}\'&ImportMode=\'CREATE_COPY\'&Suffix=\'{SUFFIX}\'',
            IntegrationDesigntimeArtifacts: {
                path: '/api/v1/IntegrationPackages(\'{PACKAGE_ID}\')/IntegrationDesigntimeArtifacts',
                Configurations: { path: 'api/v1/IntegrationDesigntimeArtifacts(Id=\'{ARTIFACT_ID}\',Version=\'active\')/Configurations' },
                Resources: { path: 'api/v1/IntegrationDesigntimeArtifacts(Id=\'{ARTIFACT_ID}\',Version=\'active\')/Resources' }
            },
            ValueMappingDesigntimeArtifacts: {
                path: '/api/v1/IntegrationPackages(\'{PACKAGE_ID}\')/ValueMappingDesigntimeArtifacts',
                ValMapSchema: { path: '/api/v1/ValueMappingDesigntimeArtifacts(Id=\'{ARTIFACT_ID}\',Version=\'{VERSION_ID}\')/ValMapSchema' }
            },
            CustomTags: { path: '/api/v1/IntegrationPackages(\'{PACKAGE_ID}\')/CustomTags' }
        },
        ValueMappingDesigntimeArtifacts: {
            path: 'api/v1/ValueMappingDesigntimeArtifacts',
            ValMapSchema: {
                path: '/api/v1/ValueMappingDesigntimeArtifacts(Id=\'{ARTIFACT_ID}\',Version=\'active\')/ValMapSchema?$filter=State eq \'Configured\'',
                one: '/api/v1/ValueMappingDesigntimeArtifacts(Id=\'{ARTIFACT_ID}\',Version=\'active\')/ValMapSchema(SrcAgency=\'{SrcAgency}\',SrcId=\'{SrcId}\',TgtAgency=\'{TgtAgency}\',TgtId=\'{TgtId}\')'
            }
        },
        DefaultValMap: {
            update: '/api/v1/UpdateDefaultValMap?Id=\'{ARTIFACT_ID}\'&Version=\'active\'&SrcAgency=\'{SrcAgency}\'&SrcId=\'{SrcId}\'&TgtAgency=\'{TgtAgency}\'&TgtId=\'{TgtId}\'&ValMapId=\'{DefValMapID}\'&IsConfigured=true'
        },
        KeyStoreEntries: {
            path: 'api/v1/KeystoreEntries?$select=Owner,Hexalias,Alias,Type',
            Certificate: {
                download: 'api/v1/KeystoreEntries(\'{HEXALIAS_ID}\')/Certificate/$value',
                upload: 'api/v1/CertificateResources(\'{HEXALIAS_ID}\')/$value?fingerprintVerified=true&update=false'
            }
        },
        NumberRanges: {
            path: 'api/v1/NumberRanges',
            upload: 'api/v1/NumberRanges'
        },
        CustomTagConfigurations: {
            path: 'api/v1/CustomTagConfigurations(\'CustomTags\')/$value',
            upload: 'api/v1/CustomTagConfigurations?Overwrite=true'
        },
        JMSBrokers: { path: 'api/v1/JmsBrokers(\'Broker1\')' },
        UserCredentials: {
            path: '/api/v1/UserCredentials',
            upload: '/api/v1/UserCredentials'
        },
        OAuth2ClientCredentials: {
            path: '/api/v1/OAuth2ClientCredentials',
            upload: '/api/v1/OAuth2ClientCredentials'
        },
        AccessPolicies: {
            path: '/api/v1/AccessPolicies',
            upload: '/api/v1/AccessPolicies',
            ArtifactReferences: {
                path: '/api/v1/AccessPolicies({ACCESSPOLICY_ID}L)/ArtifactReferences'
            }
        },
        Batch: '/api/v1/$batch',
        CertificateUserMappings: { path: '/api/v1/CertificateUserMappings' },
        DataStores: { path: '/api/v1/DataStores' },
        Variables: { path: '/api/v1/Variables' }
    },

    ComponentNames: {
        Package: 'Integration Package',
        Flow: 'Artifact Configurations',
        ValMap: 'Value Mapping',
        KeyStoreEntry: 'Keystore',
        Credentials: 'User Credential',
        OAuthCredential: 'oAuth Credential',
        NumberRange: 'Number Range',
        AccessPolicy: 'Access Policy',
        CustomTags: 'Custom Tag',
        JMSBrokers:'JMS Broker'
    },

    DefaultPassword: 'default',
    Flags: {
        DeletePackagesFromTargetBeforeOverwriting: true, //Used in migrationJob class. The 'overwrite' POST call might not overwrite all settings, so it's cleaner to first delete existing content. Default is true.
        DownloadConfigurationsAndResources: false //Used in contentDownloader class. Not always necessary to have this information in 'Explore Tenants', so default false.
        // ,DownloadTargetIntegrationContentAfterMigrationRun: true //Used in migrationJob class. This will automatically refresh the Integration Content of the Target tenant after a migration job run. Default is true.
    },
    RegEx: {
        scriptFile: /^src\/main\/resources\/script\/(.*)\.(groovy||gsh||js)$/gi,
        scriptLine: /(system\.getenv\()/gmi
    },
    CriticalityCodes: {
        /*
            0 - Neutral
            1 - Negative (red)
            2 - Critical (orange)
            3 - Positive (green)
            5 - New Item (blue)
        */
        Default: 0,
        Red: 1,
        Orange: 2,
        Green: 3,
        Blue: 5
    }
};