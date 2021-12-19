using RegistrationService from '../../srv/service';

annotate RegistrationService.Tenants with @(UI : {
    PresentationVariant         : {
        $Type          : 'UI.PresentationVariantType',
        SortOrder      : [{Property : Name}],
        Visualizations : ['@UI.LineItem']
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
        {Value : Name},
        {Value : Environment},
        {Value : Host},
        {Value : Token_host},
        {Value : Oauth_clientid},
        {Value : Role},
        {
            $Type       : 'UI.DataFieldForAction',
            Label       : 'Test Connection',
            Determining : false,
            Action      : 'RegistrationService.Tenant_testConnection'
        },
        {
            $Type       : 'UI.DataFieldForAction',
            Label       : 'Export All to CSV',
            Action      : 'RegistrationService.Tenant_export'
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
        {Value : Role},
        {Value : Environment}
    ]},
    FieldGroup #Connection_gen  : {Data : [{Value : Host}]},
    FieldGroup #Connection_auth : {Data : [
        {Value : Token_host},
        {Value : Oauth_clientid},
        {Value : Oauth_secret}
    ]}
}) {
    ObjectID       @title : 'View Content'  @Common.SemanticObject : 'tenants';
    Name           @title : 'Name'  @mandatory;
    Host           @title : 'Tenant Host'  @mandatory;
    Token_host     @title : 'Token Host'  @mandatory;
    Oauth_clientid @title : 'oAuth Client ID'  @mandatory;
    Oauth_secret   @title : 'oAuth Secret'  @mandatory  @Common.MaskedAlways : true;
    Role           @title : 'System Role'  @mandatory;
    Environment    @title : 'Environment'  @mandatory;
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
