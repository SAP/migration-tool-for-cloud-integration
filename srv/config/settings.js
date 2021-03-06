module.exports = {
    Paths: {
        DeepLinks: {
            AllPackages: '/itspaces/shell/design',
            PackageOverview: '/itspaces/shell/design/contentpackage/{PACKAGE_ID}',
            PackageArtifacts: '/itspaces/shell/design/contentpackage/{PACKAGE_ID}?section=ARTIFACTS',
            SecurityMaterial: '/itspaces/shell/monitoring/SecurityMaterials',
            LimitationsDocument: 'https://github.com/SAP/migration-tool-for-cloud-integration/blob/main/docs/Limitations.md'
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
                create: '/api/v1/IntegrationDesigntimeArtifacts',
                deploy: '/api/v1/DeployIntegrationDesigntimeArtifact?Id=\'{ARTIFACT_ID}\'&Version=\'active\'',
                undeploy: '/api/v1/IntegrationRuntimeArtifacts(\'{ARTIFACT_ID}\')',
                delete: '/api/v1/IntegrationDesigntimeArtifacts(Id=\'{ARTIFACT_ID}\',Version=\'active\')',
                Configurations: { path: 'api/v1/IntegrationDesigntimeArtifacts(Id=\'{ARTIFACT_ID}\',Version=\'active\')/Configurations' },
                Resources: { path: 'api/v1/IntegrationDesigntimeArtifacts(Id=\'{ARTIFACT_ID}\',Version=\'active\')/Resources' }
            },
            IntegrationRuntimeArtifacts: {
                path: '/api/v1/IntegrationRuntimeArtifacts(\'{ARTIFACT_ID}\')'
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
        CertificateUserMappings: {
            Neo: {
                path: '/api/v1/CertificateUserMappings',
                Roles: '/authorization/v1/accounts/{ACCOUNT_ID}/users/roles/?userId={USER_ID}'
            },
            CF: {
                ServiceInstances: '/v3/service_instances?space_guids={SPACE_ID}&service_plan_guids={SERVICEPLAN_ID}',
                ServiceInstanceByName: '/v3/service_instances?names={NAME}&space_guids={SPACE_ID}&service_plan_guids={SERVICEPLAN_ID}',
                CreateServiceInstance: '/v3/service_instances',
                CreateServiceInstanceBinding: '/v3/service_credential_bindings',
                ServiceBindings: '/v3/service_credential_bindings?service_instance_guids={SERVICE_INSTANCE_ID}',
                ServiceBindingsByName: '/v3/service_credential_bindings?names={NAME}&service_instance_guids={SERVICE_INSTANCE_ID}'
            }
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
        DataStores: { path: '/api/v1/DataStores' },
        Variables: {
            path: '/api/v1/Variables',
            download: '/api/v1/Variables(VariableName=\'{VARIABLE_NAME}\',IntegrationFlow=\'{FLOW_ID}\')/$value'
        },
        oAuthToken: {
            CFPath: '/oauth/token?grant_type=client_credentials',
            NeoPath: '/oauth2/api/v1/token?grant_type=client_credentials'
        },
        CFPlatform: {
            TokenHost: 'uaa.cf.{HOST}',
            GetToken: '/oauth/token',
            Host: 'api.cf.{HOST}',
            Ping: '/v3/info',
            TestSettings: '/v3/service_instances/{INSTANCE_ID}',
            ServiceInstance: '/v3/service_instances/{INSTANCE_ID}',
            Space: '/v3/spaces/{SPACE_ID}',
            Organization: '/v3/organizations/{ORGANIZATION_ID}',
            ServicePlan: '/v3/service_plans?space_guids={SPACE_ID}&names=integration-flow'
        },
        NeoPlatform: {
            TokenHost: 'api.{HOST}',
            GetToken: '/oauth2/apitoken/v1?grant_type=client_credentials',
            Host: 'api.{HOST}',
            Ping: '/',
            TestSettings: '/authorization/v1/accounts/{ACCOUNT_ID}/groups'
        }
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
        JMSBrokers: 'JMS Broker',
        Variables: 'Global Variable',
        CertificateUserMappings: 'Certificate User Mapping'
    },

    DefaultPassword: 'default',
    Flags: {
        DeletePackagesFromTargetBeforeOverwriting: true, //Used in migrationJob class. The 'overwrite' POST call might not overwrite all settings, so it's cleaner to first delete existing content. Also, if false, Local Variables can not be migrated. Default is true.
        DownloadConfigurationsAndResources: false, //Used in contentDownloader class. Not really necessary to have this information in 'Explore Tenants' as this really slows down the synchronization, so default false.
        // DownloadTargetIntegrationContentAfterMigrationRun: true //Used in migrationJob class. This will automatically refresh the Integration Content of the Target tenant after a migration job run. Default is true. //Not working
        ManipulateZipFileProduceOutputFile: false, //Used in ziphelper class. For debugging you can generate a physical zip file before uploading it to the tenant. Default is false.
        AnalyzePackageContentWhenRefreshingConent: true //Used in contentDownloader class. Specifies whether script files + embedded certificates are analyzed when downloading the meta data of the tenant. Gives a more complete picture, but slows down the sync.
    },
    RegEx: {
        iflowFile: /^src\/main\/resources\/scenarioflows\/integrationflow\/(.*)\.iflw$/gi,
        scriptFile: /^src\/main\/resources\/script\/(.*)\.(groovy||gsh||js)$/gi,
        scriptLine: /(system\.getenv\()/gmi,
        dateTimestamp: /^\/Date\((\d*)\)\/$/i, //matches the string /Date(123456)/ to extract the number only
        keyvaluepair: /^([^#].*?)(?<!\\)=(.*)$/gm, //matches a keyvalue pair separated by '=' but ignores '\='
        newLines: /(\r\n|\n|\r)/gm
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
    },

    Defaults: {
        Variables: {
            packageId: 'migrationtoolMigrateVariables',
            flowId: 'migrationtoolCreateVariables',
            templateFile: 'srv/config/migrationtoolCreateVariables.zip',
            iflwFileInZip: 'src/main/resources/scenarioflows/integrationflow/CreateGlobalVariable.iflw',
            sleepInterval: 2000,
            successStatus: 'STARTED',
            errorStatus: 'ERROR',
            maxWait: 60000
        },
        CertificateUserMappings:{
            sleepInterval: 1500,
            actionType: 'create',
            successStatus: 'succeeded',
            errorStatus: 'failed',
            maxWait: 60000
        }
    }
};