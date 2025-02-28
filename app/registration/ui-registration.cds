using RegistrationService from '../../srv/service_registration';

annotate RegistrationService.Tenants with @(UI: {
    PresentationVariant          : {
        $Type         : 'UI.PresentationVariantType',
        SortOrder     : [
            {
                Property  : Environment,
                Descending: true
            },
            {Property: Name}
        ],
        Visualizations: ['@UI.LineItem'],
        RequestAtLeast: [ReadOnly],
        GroupBy       : [Environment]
    },
    Identification               : [
        {Value: ObjectID},
        {
            $Type      : 'UI.DataFieldForAction',
            Label      : 'Test Connection',
            Action     : 'RegistrationService.Tenant_testConnection',
            Criticality: #Positive
        }
    ],
    HeaderInfo                   : {
        TypeName      : 'Tenant',
        TypeNamePlural: 'Tenants',
        Title         : {Value: Name},
        Description   : {Value: ObjectID},
        TypeImageUrl  : 'sap-icon://connected'
    },
    SelectionFields              : [
        Name,
        Role,
        Environment
    ],
    LineItem                     : [
        {
            Value                : Name,
            ![@HTML5.CssDefaults]: {width: '14rem'},
            ![@UI.Importance]    : #High
        },
        {
            Value                : Role,
            ![@HTML5.CssDefaults]: {width: '8rem'}
        },
        {
            Value                : ReadOnlyText,
            ![@HTML5.CssDefaults]: {width: '7rem'},
            ![@UI.Importance]    : #High
        },
        {
            Value                : Environment,
            ![@HTML5.CssDefaults]: {width: '9rem'},
            ![@UI.Importance]    : #High
        },
        {
            $Type                : 'UI.DataFieldForAnnotation',
            Target               : '@UI.FieldGroup#PlatformAccount',
            Label                : 'Platform Account',
            ![@HTML5.CssDefaults]: {width: '11rem'}
        },
        {
            $Type                : 'UI.DataFieldForAnnotation',
            Target               : '@UI.FieldGroup#PlatformDomain',
            Label                : 'Platform Domain',
            ![@HTML5.CssDefaults]: {width: '13rem'}
        },
        {
            Value                : Host,
            ![@HTML5.CssDefaults]: {width: '30rem'}
        },
        {
            $Type : 'UI.DataFieldForAction',
            Label : 'Duplicate',
            Action: 'RegistrationService.Tenant_duplicate'
        },
        {
            $Type : 'UI.DataFieldForAction',
            Label : 'Test Connection',
            Action: 'RegistrationService.Tenant_testConnection'
        },
        {
            $Type : 'UI.DataFieldForAction',
            Label : 'Save to Tenants.csv file',
            Action: 'RegistrationService.EntityContainer/Tenant_export'
        }
    ],
    HeaderFacets                 : [{
        $Type : 'UI.ReferenceFacet',
        Target: '@UI.FieldGroup#Header'
    }],
    Facets                       : [
        {
            $Type : 'UI.CollectionFacet',
            ID    : 'generalinfo',
            Label : 'General Information',
            Facets: [
                {
                    $Type : 'UI.ReferenceFacet',
                    Label : 'General Data',
                    Target: '@UI.FieldGroup#Basic_type'
                },
                {
                    $Type : 'UI.ReferenceFacet',
                    Label : 'Landscape',
                    Target: '@UI.FieldGroup#Basic_role'
                }
            ]
        },
        {
            $Type : 'UI.CollectionFacet',
            ID    : 'platformtenant',
            Label : 'BTP Subaccount Access',
            Facets: [
                {
                    $Type : 'UI.ReferenceFacet',
                    Label : 'Enabled',
                    Target: '@UI.FieldGroup#useForUserMapping'
                },
                {
                    $Type        : 'UI.ReferenceFacet',
                    Label        : 'Cloud Foundry Setup',
                    Target       : '@UI.FieldGroup#CF_data',
                    ![@UI.Hidden]: ( not ( Environment = 'Cloud Foundry' and UseForCertificateUserMappings ) )
                },
                {
                    $Type        : 'UI.ReferenceFacet',
                    Label        : 'Neo Subaccount',
                    Target       : '@UI.FieldGroup#Neo_data',
                    ![@UI.Hidden]: ( not ( Environment = 'Neo' and UseForCertificateUserMappings ) )
                },
                {
                    $Type        : 'UI.ReferenceFacet',
                    Label        : 'Technical User',
                    Target       : '@UI.FieldGroup#CF_Platform_user',
                    ![@UI.Hidden]: ( not ( Environment = 'Cloud Foundry' and UseForCertificateUserMappings ) )
                },
                {
                    $Type        : 'UI.ReferenceFacet',
                    Label        : 'Platform oAuth Client',
                    Target       : '@UI.FieldGroup#Neo_Platform_user',
                    ![@UI.Hidden]: ( not ( Environment = 'Neo' and UseForCertificateUserMappings ) )
                }
            ]
        },
        {
            $Type : 'UI.CollectionFacet',
            ID    : 'integrationtenant',
            Label : 'Integration Tenant Access',
            Facets: [
                {
                    $Type : 'UI.ReferenceFacet',
                    Label : 'Integration Tenant',
                    Target: '@UI.FieldGroup#Connection_gen'
                },
                {
                    $Type : 'UI.ReferenceFacet',
                    Label : 'oAuth Service Key',
                    Target: '@UI.FieldGroup#Connection_auth'
                }
            ]
        }
    ],
    FieldGroup #Header           : {Data: [
        {Value: Name},
        {Value: modifiedAt},
        {Value: ObjectID}
    ]},
    FieldGroup #useForUserMapping: {Data: [{Value: UseForCertificateUserMappings}]},
    FieldGroup #PlatformDomain   : {Data: [
        {
            Value        : CF_Platform_domain,
            ![@UI.Hidden]: ( Environment = 'Neo' )
        },
        {
            Value        : Neo_Platform_domain,
            ![@UI.Hidden]: ( Environment = 'Cloud Foundry' )
        }
    ]},
    FieldGroup #PlatformAccount  : {Data: [
        {
            Value        : CF_organizationName,
            ![@UI.Hidden]: ( Environment = 'Neo' )
        },
        {
            Value        : CF_spaceName,
            ![@UI.Hidden]: ( Environment = 'Neo' )
        },
        {
            Value        : Neo_accountid,
            ![@UI.Hidden]: ( Environment = 'Cloud Foundry' )
        }
    ]},
    FieldGroup #Basic_type       : {Data: [
        {Value: Name},
        {Value: Environment},
    ]},
    FieldGroup #Basic_role       : {Data: [
        {Value: Role},
        {Value: ReadOnly}
    ]},
    FieldGroup #Connection_gen   : {Data: [{Value: Host}]},
    FieldGroup #Connection_auth  : {Data: [
        {Value: Token_host},
        {Value: Oauth_clientid},
        {
            Value        : Oauth_secret,
            ![@UI.Hidden]: {$edmJson: {$Path: 'IsActiveEntity'}}
        }
    ]},
    FieldGroup #CF_data          : {Data: [
        {Value: CF_organizationName},
        {Value: CF_spaceName},
        {Value: Oauth_servicekeyid}
    ]},
    FieldGroup #Neo_data         : {Data: [{Value: Neo_accountid}]},
    FieldGroup #CF_Platform_user : {Data: [
        {Value: CF_Platform_domain},
        {Value: CF_Platform_user},
        {
            Value        : CF_Platform_password,
            ![@UI.Hidden]: {$edmJson: {$Path: 'IsActiveEntity'}}
        }
    ]},
    FieldGroup #Neo_Platform_user: {Data: [
        {Value: Neo_Platform_domain},
        {Value: Neo_Platform_user},
        {
            Value        : Neo_Platform_password,
            ![@UI.Hidden]: {$edmJson: {$Path: 'IsActiveEntity'}}
        }
    ]}
}) {
    ObjectID                      @title: 'View Content'               @Common.SemanticObject: 'tenants';
    Name                          @title: 'Name'                       @UI.Placeholder       : 'Please provide a name'                                    @mandatory;
    Host                          @title: 'Integration Host'           @UI.Placeholder       : 'subdomain.environment.cfapps.eu10-001.hana.ondemand.com'  @mandatory;
    Token_host                    @title: 'Token Host'                 @UI.Placeholder       : 'subdomain.authentication.eu10.hana.ondemand.com'          @mandatory;
    Oauth_clientid                @title: 'oAuth Client ID'            @UI.Placeholder       : 'See OAuth Client credentials'                             @mandatory;
    Oauth_secret                  @title: 'oAuth Secret'               @UI.Placeholder       : 'See OAuth Client credentials'                             @mandatory;
    Oauth_servicekeyid            @title: 'oAuth Service Instance ID'  @UI.Placeholder       : 'ID of the service instance';
    Role                          @title: 'System Role'                @UI.Placeholder       : 'Select role'                                              @mandatory;
    Environment                   @title: 'Environment'                @UI.Placeholder       : 'Select environment'                                       @mandatory;
    ReadOnly                      @title: 'Source-only system';
    ReadOnlyText                  @title: 'Mode';
    CF_organizationName           @title: 'CF Organization'            @readonly;
    CF_spaceName                  @title: 'CF Space'                   @readonly;
    Neo_accountid                 @title: 'Subaccount Technical Name'  @UI.Placeholder       : 'Cockpit > Overview > Technical Name';
    CF_Platform_domain            @title: 'Platform Host'              @UI.Placeholder       : 'eu10.hana.ondemand.com';
    CF_Platform_user              @title: 'Email'                      @UI.Placeholder       : 'platform.user@domain.com';
    CF_Platform_password          @title: 'Password'                   @UI.Placeholder       : 'Password';
    Neo_Platform_domain           @title: 'Platform Host'              @UI.Placeholder       : 'hana.ondemand.com';
    Neo_Platform_user             @title: 'oAuth Client ID'            @UI.Placeholder       : 'See OAuth Client credentials';
    Neo_Platform_password         @title: 'oAuth Secret'               @UI.Placeholder       : 'See OAuth Client credentials';
    UseForCertificateUserMappings @title: 'Enable migration of Certificate to User Mappings (source or target)';
};

annotate RegistrationService.Tenants with {
    Role        @(Common: {
        ValueListWithFixedValues: true,
        ValueList               : {
            Label         : 'List of System Roles',
            CollectionPath: 'SystemRoles',
            Parameters    : [{
                $Type            : 'Common.ValueListParameterOut',
                ValueListProperty: 'Value',
                LocalDataProperty: 'Role'
            }]
        }
    });

    Environment @(Common: {
        ValueListWithFixedValues: true,
        ValueList               : {
            Label         : 'List of System Roles',
            CollectionPath: 'Landscapes',
            Parameters    : [{
                $Type            : 'Common.ValueListParameterOut',
                ValueListProperty: 'Value',
                LocalDataProperty: 'Environment'
            }]
        }
    });
};
