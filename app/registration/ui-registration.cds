using RegistrationService from '../../srv/service';

annotate RegistrationService.Tenants with @(UI : {
    PresentationVariant         : {
        $Type          : 'UI.PresentationVariantType',
        SortOrder      : [{Property : Name}],
        Visualizations : ['@UI.LineItem'],
        RequestAtLeast : [ReadOnly]
    },
    Identification              : [{Value : ObjectID}],
    HeaderInfo                  : {
        TypeName       : 'Tenant',
        TypeNamePlural : 'Tenants',
        Title          : {Value : Name},
        Description    : {Value : ObjectID},
        TypeImageUrl   : 'sap-icon://connected'
    },
    SelectionFields             : [
        Name,
        Role,
        Environment
    ],
    LineItem                    : [
        {
            Value                 : Name,
            ![@HTML5.CssDefaults] : {width : '15rem'},
            ![@UI.Importance]     : #High
        },
        {
            Value                 : Environment,
            ![@HTML5.CssDefaults] : {width : '9rem'},
            ![@UI.Importance]     : #High
        },
        {
            Value                 : ReadOnlyText,
            ![@HTML5.CssDefaults] : {width : '8rem'},
            ![@UI.Importance]     : #High
        },
        {
            Value                 : Host,
            ![@HTML5.CssDefaults] : {width : '17rem'},
            ![@UI.Importance]     : #High
        },
        {
            Value                 : Token_host,
            ![@HTML5.CssDefaults] : {width : '17rem'},
            ![@UI.Importance]     : #Low
        },
        {
            Value                 : Oauth_clientid,
            ![@HTML5.CssDefaults] : {width : '17rem'},
            ![@UI.Importance]     : #Low
        },
        {
            Value                 : Role,
            ![@HTML5.CssDefaults] : {width : '9rem'},
            ![@UI.Importance]     : #Medium
        },
        {
            $Type       : 'UI.DataFieldForAction',
            Label       : 'Test Connection',
            Determining : false,
            Action      : 'RegistrationService.Tenant_testConnection'
        },
        {
            $Type  : 'UI.DataFieldForAction',
            Label  : 'Export All to CSV',
            Action : 'RegistrationService.Tenant_export'
        }
    ],
    HeaderFacets                : [{
        $Type  : 'UI.ReferenceFacet',
        Target : '@UI.FieldGroup#Header'
    }],
    Facets                      : [{
        $Type  : 'UI.CollectionFacet',
        ID     : 'config',
        Label  : 'Configuration',
        Facets : [
            {
                $Type  : 'UI.ReferenceFacet',
                Label  : 'Designation',
                Target : '@UI.FieldGroup#Basic'
            },
            {
                $Type  : 'UI.ReferenceFacet',
                Label  : 'Integration Tenant',
                Target : '@UI.FieldGroup#Connection_gen'
            },
            {
                $Type  : 'UI.ReferenceFacet',
                Label  : 'Authentication',
                Target : '@UI.FieldGroup#Connection_auth'
            }
        ]
    }],
    FieldGroup #Header          : {Data : [
        {Value : Name},
        {Value : modifiedAt},
        {Value : ObjectID}
    ]},
    FieldGroup #Basic           : {Data : [
        {
            $Type  : 'UI.DataFieldForAction',
            Label  : 'Test Connection',
            Action : 'RegistrationService.Tenant_testConnection',
        },
        {Value : Name},
        {Value : Role},
        {Value : Environment},
        {Value : ReadOnly}
    ]},
    FieldGroup #Connection_gen  : {Data : [{Value : Host}]},
    FieldGroup #Connection_auth : {Data : [
        {Value : Token_host},
        {Value : Oauth_clientid},
        {Value : Oauth_secret}
    ]}
}) {
    ObjectID       @title : 'View Content'  @Common.SemanticObject : 'tenants';
    Name           @title : 'Name'  @mandatory  @UI.Placeholder            : 'Please provide a name';
    Host           @title : 'Tenant Host'  @mandatory  @UI.Placeholder     : '{subdomain}.{environment}.cfapps.eu10-001.hana.ondemand.com';
    Token_host     @title : 'Token Host'  @mandatory  @UI.Placeholder      : '{subdomain}.authentication.eu10.hana.ondemand.com';
    Oauth_clientid @title : 'oAuth Client ID'  @mandatory  @UI.Placeholder : 'See OAuth Client credentials';
    Oauth_secret   @title : 'oAuth Secret'  @mandatory  @UI.Placeholder    : 'See OAuth Client credentials'  @Common.MaskedAlways : true;
    Role           @title : 'System Role'  @mandatory  @UI.Placeholder     : 'Select role';
    Environment    @title : 'Environment'  @mandatory  @UI.Placeholder     : 'Select environment';
    ReadOnly       @title : 'Source-only system';
    ReadOnlyText   @title : 'Mode';
};

annotate RegistrationService.Tenants with {
    Role        @(Common : {
        ValueListWithFixedValues : true,
        ValueList                : {
            Label          : 'List of System Roles',
            CollectionPath : 'SystemRoles',
            Parameters     : [{
                $Type             : 'Common.ValueListParameterOut',
                ValueListProperty : 'Value',
                LocalDataProperty : 'Role'
            }]
        }
    });

    Environment @(Common : {
        ValueListWithFixedValues : true,
        ValueList                : {
            Label          : 'List of System Roles',
            CollectionPath : 'Landscapes',
            Parameters     : [{
                $Type             : 'Common.ValueListParameterOut',
                ValueListProperty : 'Value',
                LocalDataProperty : 'Environment'
            }]
        }
    });
};
