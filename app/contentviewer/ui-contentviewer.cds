using ConfigService from '../../srv/service';
using from '../migrationtasks/ui-migrationtasks';
using from './ui-errors';

// Tenants ---------------------------------------------------------------
annotate ConfigService.Tenants with @(UI : {
    PresentationVariant  : {
        SortOrder      : [{Property : Name}],
        Visualizations : ['@UI.LineItem'],
        RequestAtLeast : [NumberOfErrors]
    },
    Identification       : [
        {Value : ObjectID},
        {
            $Type  : 'UI.DataFieldForAction',
            Label  : 'Test Connection',
            Action : 'ConfigService.Tenant_testConnection'
        },
        {
            $Type  : 'UI.DataFieldForAction',
            Label  : 'Get Integration Content',
            Action : 'ConfigService.Tenant_getIntegrationContent'
        }
    ],
    HeaderInfo           : {
        TypeName       : 'Tenant',
        TypeNamePlural : 'Tenants',
        Title          : {Value : Name},
        Description    : {Value : ObjectID},
        TypeImageUrl   : 'sap-icon://it-system'
    },
    HeaderFacets         : [{
        $Type  : 'UI.ReferenceFacet',
        Target : '@UI.FieldGroup#Header'
    }],
    SelectionFields      : [
        Name,
        Role,
        Environment
    ],
    DeleteHidden         : true,
    LineItem             : [
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
            Value                 : Host,
            ![@HTML5.CssDefaults] : {width : '30rem'},
            ![@UI.Importance]     : #Low
        },
        {
            Value                 : Role,
            ![@HTML5.CssDefaults] : {width : '9rem'},
            ![@UI.Importance]     : #High
        },
        {
            Value                 : RefreshedDate,
            ![@HTML5.CssDefaults] : {width : '15rem'},
            ![@UI.Importance]     : #Medium
        },
        {
            Value                 : ErrorsText,
            Criticality           : ErrorsCriticality,
            ![@HTML5.CssDefaults] : {width : '10rem'},
            ![@UI.Importance]     : #High
        },
        {
            $Type  : 'UI.DataFieldForAction',
            Label  : 'Test Connection',
            Action : 'ConfigService.Tenant_testConnection'
        },
        {
            $Type  : 'UI.DataFieldForAction',
            Label  : 'Get Integration Content',
            Action : 'ConfigService.Tenant_getIntegrationContent'
        }
    ],
    Facets               : [
        {
            $Type  : 'UI.CollectionFacet',
            ID     : 'overviewcontent',
            Label  : 'Tenant Status',
            Facets : [
                {
                    $Type  : 'UI.ReferenceFacet',
                    Target : '@UI.FieldGroup#Overview',
                    ID     : 'tenantOverview'
                },
                {
                    $Type  : 'UI.ReferenceFacet',
                    Target : 'toErrors/@UI.PresentationVariant'
                }
            ]
        },
        {
            $Type  : 'UI.CollectionFacet',
            ID     : 'integrationcontent',
            Label  : 'Integration Packages',
            Facets : [{
                $Type  : 'UI.ReferenceFacet',
                Target : 'toIntegrationPackages/@UI.PresentationVariant'
            }]
        },
        {
            $Type  : 'UI.CollectionFacet',
            ID     : 'securitycontent',
            Label  : 'Security Artifacts',
            Facets : [
                {
                    $Type  : 'UI.CollectionFacet',
                    ID     : 'usercredentialscontent',
                    Label  : 'User Credentials',
                    Facets : [{
                        $Type  : 'UI.ReferenceFacet',
                        Target : 'toUserCredentials/@UI.PresentationVariant'
                    }]
                },
                {
                    $Type  : 'UI.CollectionFacet',
                    ID     : 'keystorecontent',
                    Label  : 'Key Stores',
                    Facets : [{
                        $Type  : 'UI.ReferenceFacet',
                        Target : 'toKeyStoreEntries/@UI.PresentationVariant'
                    }]
                },
                {
                    $Type  : 'UI.CollectionFacet',
                    ID     : 'oauthcontent',
                    Label  : 'OAuth2 Client Credentials',
                    Facets : [{
                        $Type  : 'UI.ReferenceFacet',
                        Target : 'toOAuth2ClientCredentials/@UI.PresentationVariant'
                    }]
                },
                {
                    $Type  : 'UI.CollectionFacet',
                    ID     : 'accesspoliciescontent',
                    Label  : 'Access Policies',
                    Facets : [{
                        $Type  : 'UI.ReferenceFacet',
                        Target : 'toAccessPolicies/@UI.PresentationVariant'
                    }]
                }
            ]
        },
        {
            $Type  : 'UI.CollectionFacet',
            ID     : 'othercontent',
            Label  : 'Other Artifacts',
            Facets : [
                {
                    $Type  : 'UI.CollectionFacet',
                    ID     : 'numberrangescontent',
                    Label  : 'Number Ranges',
                    Facets : [{
                        $Type  : 'UI.ReferenceFacet',
                        Target : 'toNumberRanges/@UI.PresentationVariant'
                    }]
                },
                {
                    $Type  : 'UI.CollectionFacet',
                    ID     : 'customtagcontent',
                    Label  : 'Custom Tags',
                    Facets : [{
                        $Type  : 'UI.ReferenceFacet',
                        Target : 'toCustomTagConfigurations/@UI.PresentationVariant'
                    }]
                },
                {
                    $Type  : 'UI.CollectionFacet',
                    ID     : 'variablescontent',
                    Label  : 'Variables',
                    Facets : [{
                        $Type  : 'UI.ReferenceFacet',
                        Target : 'toVariables/@UI.PresentationVariant'
                    }]
                }
            ]
        },
        {
            $Type  : 'UI.CollectionFacet',
            ID     : 'migrationcontent',
            Label  : 'Migration Tasks',
            Facets : [
                {
                    $Type  : 'UI.ReferenceFacet',
                    Target : '@UI.FieldGroup#Tasks',
                },
                {
                    $Type  : 'UI.ReferenceFacet',
                    Target : 'toMigrationTasks/@UI.PresentationVariant'
                }
            ]
        }
    ],
    FieldGroup #Header   : {Data : [
        {Value : Name},
        {Value : Role},
        {Value : Environment},
        {Value : RefreshedDate}
    ]},
    FieldGroup #Overview : {Data : [
        {Value : Statistics_numIntegrationPackages},
        {Value : Statistics_numIntegrationDesigntimeArtifacts},
        {Value : Statistics_numConfigurations},
        {Value : Statistics_numResources},
        {Value : Statistics_numValueMappingDesigntimeArtifacts},
        {Value : Statistics_numValMapSchema},
        {Value : Statistics_numCustomTags},
        {Value : Statistics_numKeyStoreEntries},
        {Value : Statistics_numUserCredentials},
        {Value : Statistics_numCustomTagConfigurations},
        {Value : Statistics_numNumberRanges},
        {Value : Statistics_numAccessPolicies},
        {Value : Statistics_numAccessPolicyReferences},
        {Value : Statistics_numOAuth2ClientCredentials},
        {Value : Statistics_numJMSBrokers},
        {Value : Statistics_numVariables}
    ]},
    FieldGroup #Tasks    : {Data : [{
        $Type  : 'UI.DataFieldForAction',
        Label  : 'Create Migration Task',
        Action : 'ConfigService.Tenant_createNewMigrationTask'
    }]}
}) {
    ObjectID                               @title : 'Object ID';
    Name                                   @title : 'Name';
    Host                                   @title : 'Tenant Host';
    Token_host                             @title : 'Token Host';
    Oauth_clientid                         @title : 'oAuth Client ID';
    Oauth_secret                           @title : 'oAuth Secret';
    Role                                   @title : 'System Role';
    Environment                            @title : 'Environment';
    RefreshedDate                          @title : 'Last Content Refresh';
    ErrorsText                             @title : 'Errors';
    Statistics {
        numIntegrationPackages             @title : 'Integration Packages';
        numIntegrationDesigntimeArtifacts  @title : 'Integration Designtime Artifacts';
        numConfigurations                  @title : 'Configurations';
        numResources                       @title : 'Resources';
        numValueMappingDesigntimeArtifacts @title : 'Value Mapping Designtime Artifacts';
        numValMapSchema                    @title : 'Value Mapping Schemas';
        numCustomTags                      @title : 'Custom Tags';
        numKeyStoreEntries                 @title : 'Key Store Entries';
        numUserCredentials                 @title : 'User Credentials';
        numCustomTagConfigurations         @title : 'Custom Tag Configurations';
        numNumberRanges                    @title : 'Number Ranges';
        numAccessPolicies                  @title : 'Access Policies';
        numAccessPolicyReferences          @title : 'Artifact References';
        numOAuth2ClientCredentials         @title : 'OAuth2 Client Credentials';
        numJMSBrokers                      @title : 'JMS Brokers';
        numVariables                       @title : 'Variables';
    }
};

annotate ConfigService.Tenants with {
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

// Integration Packages -----------------------------------------------------
annotate ConfigService.IntegrationPackages with @(UI : {
    PresentationVariant : {
        SortOrder      : [
            {
                Property   : NumberOfErrors,
                Descending : true
            },
            {Property : Name}
        ],
        Visualizations : ['@UI.LineItem'],
        RequestAtLeast : [NumberOfErrors]
    },
    Identification      : [
        {Value : Name},
        {
            $Type  : 'UI.DataFieldForAction',
            Label  : 'Analyze Scripts for Env Vars',
            Action : 'ConfigService.Package_analyzeScriptFiles'
        }
    ],
    HeaderInfo          : {
        TypeName       : 'Integration Package',
        TypeNamePlural : 'Integration Packages',
        Title          : {Value : Name},
        Description    : {Value : ShortText}
    },
    LineItem            : [
        {
            $Type                 : 'UI.DataFieldForAnnotation',
            Target                : '@UI.DataPoint#Alerts',
            ![@HTML5.CssDefaults] : {width : '3rem'},
            ![@UI.Hidden]         : {$edmJson : {$Eq : [
                {$Path : 'NumberOfErrors'},
                0
            ]}}
        },
        {
            Value                 : Name,
            ![@HTML5.CssDefaults] : {width : '30rem'},
        },
        {Value : Vendor},
        {Value : Version},
        {Value : Mode},
        {
            $Type  : 'UI.DataFieldForAction',
            Label  : 'Analyze Scripts for Env Vars',
            Action : 'ConfigService.Package_analyzeScriptFiles',
            Inline : false
        }
    ],
    DataPoint #Alerts   : {
        Value                     : NumberOfErrors,
        Criticality               : Criticality,
        CriticalityRepresentation : #OnlyIcon,
        ![@Common.QuickInfo]      : 'One or more error(s) will prevent migration of this item.'
    },
    Facets              : [
        {
            $Type  : 'UI.CollectionFacet',
            ID     : 'metadata',
            Label  : 'Metadata',
            Facets : [{
                $Type  : 'UI.ReferenceFacet',
                Target : '@UI.FieldGroup#Basic'
            }]
        },
        {
            $Type  : 'UI.CollectionFacet',
            ID     : 'content',
            Label  : 'Content',
            Facets : [
                {
                    $Type  : 'UI.ReferenceFacet',
                    Target : 'toIntegrationDesigntimeArtifacts/@UI.PresentationVariant',
                },
                {
                    $Type  : 'UI.ReferenceFacet',
                    Target : 'toValueMappingDesigntimeArtifacts/@UI.PresentationVariant',
                },
                {
                    $Type  : 'UI.ReferenceFacet',
                    Target : 'toCustomTags/@UI.PresentationVariant',
                }
            ]
        },
        {
            ![@UI.Hidden] : {$edmJson : {$Eq : [
                {$Path : 'NumberOfErrors'},
                0
            ]}},
            $Type         : 'UI.CollectionFacet',
            ID            : 'errors',
            Label         : 'Errors',
            Facets        : [{
                $Type  : 'UI.ReferenceFacet',
                Target : 'toErrors/@UI.PresentationVariant',
            }, ]
        }
    ],
    FieldGroup #Basic   : {Data : [
        {Value : Id},
        {Value : Vendor},
        {Value : Version},
        {Value : Mode},
        {Value : ModifiedDateFormatted}
    ]}
}) {
    Id                    @title : 'ID';
    Name                  @title : 'Name';
    Version               @title : 'Version';
    Vendor                @title : 'Vendor';
    Mode                  @title : 'Mode';
    ModifiedDateFormatted @title : 'Last Modified';
};


// Integration Designtime Artifacts -----------------------------------------------------
annotate ConfigService.IntegrationDesigntimeArtifacts with @(UI : {
    Identification      : [{Value : Id}],
    PresentationVariant : {
        SortOrder      : [
            {
                Property   : NumberOfErrors,
                Descending : true
            },
            {Property : Name}
        ],
        Visualizations : ['@UI.LineItem'],
        RequestAtLeast : [NumberOfErrors]
    },
    HeaderInfo          : {
        TypeName       : 'Designtime Artifact',
        TypeNamePlural : 'Designtime Artifacts',
        Title          : {Value : Name},
        Description    : {Value : Description}
    },
    LineItem            : [
        {
            $Type                 : 'UI.DataFieldForAnnotation',
            Target                : '@UI.DataPoint#Alerts',
            ![@HTML5.CssDefaults] : {width : '3rem'},
            ![@UI.Hidden]         : {$edmJson : {$Eq : [
                {$Path : 'NumberOfErrors'},
                0
            ]}}
        },
        {
            Value                 : Name,
            ![@HTML5.CssDefaults] : {width : '30rem'}
        },
        {Value : Version},
        {
            Value                 : Description,
            ![@HTML5.CssDefaults] : {width : '30rem'}
        }
    ],
    DataPoint #Alerts   : {
        Value                     : NumberOfErrors,
        Criticality               : Criticality,
        CriticalityRepresentation : #OnlyIcon,
        ![@Common.QuickInfo]      : 'One or more error(s) will prevent migration of this item.'
    },
    Facets              : [
        {
            $Type  : 'UI.CollectionFacet',
            ID     : 'metadata',
            Label  : 'Metadata',
            Facets : [{
                $Type  : 'UI.ReferenceFacet',
                Target : '@UI.FieldGroup#Basic'
            }]
        },
        {
            $Type  : 'UI.CollectionFacet',
            ID     : 'content',
            Label  : 'Content',
            Facets : [
                {
                    $Type  : 'UI.ReferenceFacet',
                    Target : 'toConfigurations/@UI.PresentationVariant',
                },
                {
                    $Type  : 'UI.ReferenceFacet',
                    Target : 'toResources/@UI.PresentationVariant',
                }
            ]
        },
        {
            ![@UI.Hidden] : {$edmJson : {$Eq : [
                {$Path : 'NumberOfErrors'},
                0
            ]}},
            $Type         : 'UI.CollectionFacet',
            ID            : 'errors',
            Label         : 'Errors',
            Facets        : [{
                $Type  : 'UI.ReferenceFacet',
                Target : 'toErrors/@UI.PresentationVariant',
            }, ]
        }
    ],
    FieldGroup #Basic   : {Data : [
        {Value : Name},
        {Value : Id},
        {Value : Version},
        {Value : Description},
        {Value : ArtifactContent}
    ]}
}) {
    Id              @title : 'ID';
    Version         @title : 'Version';
    PackageId       @title : 'Package';
    Name            @title : 'Name';
    Description     @title : 'Description';
    ArtifactContent @title : 'Artifact Content';
};

annotate ConfigService.Configurations with @(UI : {
    PresentationVariant : {
        SortOrder      : [{Property : ParameterKey}],
        Visualizations : ['@UI.LineItem']
    },
    Identification      : [{Value : ParameterKey}],
    HeaderInfo          : {
        TypeName       : 'Configuration',
        TypeNamePlural : 'Configurations',
        Title          : {Value : ParameterKey},
        Description    : {Value : DataType}
    },
    LineItem            : [
        {Value : ParameterKey},
        {Value : ParameterValue},
        {Value : DataType}
    ],
    Facets              : [{
        $Type  : 'UI.CollectionFacet',
        ID     : 'metadata',
        Label  : 'Metadata',
        Facets : [{
            $Type  : 'UI.ReferenceFacet',
            Target : '@UI.FieldGroup#Basic'
        }]
    }],
    FieldGroup #Basic   : {Data : [
        {Value : ParameterKey},
        {Value : ParameterValue},
        {Value : DataType}
    ]}
}) {
    ParameterKey   @title : 'Key';
    ParameterValue @title : 'Value';
    DataType       @title : 'Type';
};

annotate ConfigService.Resources with @(UI : {
    PresentationVariant : {
        SortOrder      : [{Property : Name}],
        Visualizations : ['@UI.LineItem']
    },
    HeaderInfo          : {
        TypeName       : 'Resource',
        TypeNamePlural : 'Resources',
        Title          : {Value : Name},
        Description    : {Value : ResourceType}
    },
    LineItem            : [
        {Value : Name},
        {Value : ResourceType},
        {Value : ReferencedResourceType},
        {Value : ResourceContent}
    ],
    Facets              : [{
        $Type  : 'UI.CollectionFacet',
        ID     : 'metadata',
        Label  : 'Metadata',
        Facets : [{
            $Type  : 'UI.ReferenceFacet',
            Target : '@UI.FieldGroup#Basic'
        }]
    }],
    FieldGroup #Basic   : {Data : [
        {Value : Name},
        {Value : ResourceType},
        {Value : ReferencedResourceType},
        {Value : ResourceContent}
    ]}
}) {
    Name                   @title : 'Name';
    ResourceType           @title : 'Type';
    ReferencedResourceType @title : 'Reference Type';
    ResourceContent        @title : 'Content';
};


// ValueMapping Designtime Artifacts -----------------------------------------------------
annotate ConfigService.ValueMappingDesigntimeArtifacts with @(UI : {
    PresentationVariant : {
        SortOrder      : [{Property : Name}],
        Visualizations : ['@UI.LineItem']
    },
    HeaderInfo          : {
        TypeName       : 'Value Mapping',
        TypeNamePlural : 'Value Mappings',
        Title          : {Value : Name},
        Description    : {Value : Description}
    },
    LineItem            : [
        {
            Value                 : Name,
            ![@HTML5.CssDefaults] : {width : '30rem'}
        },

        {Value : Version},
        {Value : Id},
        {
            Value                 : Description,
            ![@HTML5.CssDefaults] : {width : '30rem'}
        }
    ],
    Facets              : [
        {
            $Type  : 'UI.CollectionFacet',
            ID     : 'metadata',
            Label  : 'Metadata',
            Facets : [{
                $Type  : 'UI.ReferenceFacet',
                Target : '@UI.FieldGroup#Basic'
            }]
        },
        {
            $Type  : 'UI.CollectionFacet',
            ID     : 'content',
            Label  : 'Content',
            Facets : [{
                $Type  : 'UI.ReferenceFacet',
                Target : 'toValMapSchema/@UI.PresentationVariant',
            }]
        }
    ],
    FieldGroup #Basic   : {Data : [
        {Value : Id},
        {Value : Version},
        {Value : Name},
        {Value : Description},
        {Value : ArtifactContent}
    ]}
}) {
    Id              @title : 'ID';
    Version         @title : 'Version';
    PackageId       @title : 'Package';
    Name            @title : 'Name';
    Description     @title : 'Description';
    ArtifactContent @title : 'Artifact Content';
};

annotate ConfigService.ValMapSchema with @(UI : {
    PresentationVariant : {
        SortOrder      : [{Property : SrcAgency}],
        Visualizations : ['@UI.LineItem']
    },
    HeaderInfo          : {
        TypeName       : 'Value Mapping Schema',
        TypeNamePlural : 'Value Mapping Schemas',
        Title          : {Value : SrcAgency},
        Description    : {Value : TgtAgency}
    },
    LineItem            : [
        {Value : SrcAgency},
        {Value : SrcId},
        {Value : TgtAgency},
        {Value : TgtId},
        {Value : State}
    ],
    Facets              : [{
        $Type  : 'UI.CollectionFacet',
        ID     : 'metadata',
        Label  : 'Metadata',
        Facets : [{
            $Type  : 'UI.ReferenceFacet',
            Target : '@UI.FieldGroup#Basic'
        }]
    }],
    FieldGroup #Basic   : {Data : [
        {Value : SrcAgency},
        {Value : SrcId},
        {Value : TgtAgency},
        {Value : TgtId},
        {Value : State}
    ]}
}) {
    SrcAgency @title : 'Src Agency';
    SrcId     @title : 'Src ID';
    TgtAgency @title : 'Tgt Agency';
    TgtId     @title : 'Tgt ID';
    State     @title : 'State';
};


// Custom Tags ----------------------------------------------------------------------------
annotate ConfigService.CustomTags with @(UI : {
    PresentationVariant : {
        SortOrder      : [{Property : Name}],
        Visualizations : ['@UI.LineItem']
    },
    HeaderInfo          : {
        TypeName       : 'Custom Tag',
        TypeNamePlural : 'Custom Tags',
        Title          : {Value : Name}
    },
    LineItem            : [
        {
            Value                 : Name,
            ![@HTML5.CssDefaults] : {width : '20rem'}
        },
        {Value : Value}
    ],
    Facets              : [{
        $Type  : 'UI.CollectionFacet',
        ID     : 'metadata',
        Label  : 'Metadata',
        Facets : [{
            $Type  : 'UI.ReferenceFacet',
            Target : '@UI.FieldGroup#Basic'
        }]
    }],
    FieldGroup #Basic   : {Data : [
        {Value : Name},
        {Value : Value}
    ]}
}) {
    Name  @title : 'Name';
    Value @title : 'Value';
};

// User Credentials ----------------------------------------------------------------------------
annotate ConfigService.UserCredentials with @(UI : {
    PresentationVariant : {
        SortOrder      : [{Property : Name}],
        Visualizations : ['@UI.LineItem']
    },
    HeaderInfo          : {
        TypeName       : 'User Credential',
        TypeNamePlural : 'User Credentials',
        Title          : {Value : Name},
        Description    : {Value : Kind}
    },
    LineItem            : [
        {
            Value                 : Name,
            ![@HTML5.CssDefaults] : {width : '20rem'}
        },
        {Value : Kind},
        {Value : SecurityArtifactDescriptor_Type},
        {Value : SecurityArtifactDescriptor_Status}
    ],
    Facets              : [{
        $Type  : 'UI.CollectionFacet',
        ID     : 'metadata',
        Label  : 'Metadata',
        Facets : [{
            $Type  : 'UI.ReferenceFacet',
            Target : '@UI.FieldGroup#Basic'
        }]
    }],
    FieldGroup #Basic   : {Data : [
        {Value : Name},
        {Value : Kind},
        {Value : CompanyId},
        {Value : SecurityArtifactDescriptor_Type},
        {Value : SecurityArtifactDescriptor_DeployedOn},
        {Value : SecurityArtifactDescriptor_Status},
        {Value : Description},
        {Value : Password},
        {Value : User}
    ]}
}) {
    Name           @title : 'Name';
    Kind           @title : 'Kind';
    Description    @title : 'Description';
    User           @title : 'User';
    Password       @title : 'Password';
    CompanyId      @title : 'Company';
    SecurityArtifactDescriptor {
        Type       @title : 'Type';
        DeployedBy @title : 'Deployed By';
        DeployedOn @title : 'Deployed On';
        Status     @title : 'Status';
    }
};

// KeyStore Entries ----------------------------------------------------------------------------
annotate ConfigService.KeyStoreEntries with @(UI : {
    PresentationVariant : {
        SortOrder      : [{Property : Alias}],
        Visualizations : ['@UI.LineItem']
    },
    HeaderInfo          : {
        TypeName       : 'KeyStore Entry',
        TypeNamePlural : 'KeyStore Entries',
        Title          : {Value : Alias},
        Description    : {Value : Owner}
    },
    LineItem            : [
        {
            Value                 : Alias,
            ![@HTML5.CssDefaults] : {width : '20rem'}
        },
        {Value : Type},
        {Value : Owner}
    ],
    Facets              : [{
        $Type  : 'UI.CollectionFacet',
        ID     : 'metadata',
        Label  : 'Metadata',
        Facets : [{
            $Type  : 'UI.ReferenceFacet',
            Target : '@UI.FieldGroup#Basic'
        }]
    }],
    FieldGroup #Basic   : {Data : [
        {Value : Hexalias},
        {Value : Alias},
        {Value : Type},
        {Value : Owner}
    ]}
}) {
    Hexalias @title : 'HEX';
    Alias    @title : 'Alias';
    Type     @title : 'Type';
    Owner    @title : 'Owner';
};

// OAuth2Client Credentials ----------------------------------------------------------------------------
annotate ConfigService.OAuth2ClientCredentials with @(UI : {
    PresentationVariant : {
        SortOrder      : [{Property : Name}],
        Visualizations : ['@UI.LineItem']
    },
    HeaderInfo          : {
        TypeName       : 'OAuth2 Client Credential',
        TypeNamePlural : 'OAuth2 Client Credentials',
        Title          : {Value : Name},
        Description    : {Value : SecurityArtifactDescriptor_Status}
    },
    LineItem            : [
        {
            Value                 : Name,
            ![@HTML5.CssDefaults] : {width : '20rem'}
        },
        {Value : SecurityArtifactDescriptor_Type},
        {Value : SecurityArtifactDescriptor_Status}
    ],
    Facets              : [{
        $Type  : 'UI.CollectionFacet',
        ID     : 'metadata',
        Label  : 'Metadata',
        Facets : [{
            $Type  : 'UI.ReferenceFacet',
            Target : '@UI.FieldGroup#Basic'
        }]
    }],
    FieldGroup #Basic   : {Data : [
        {Value : Name},
        {Value : TokenServiceUrl},
        {Value : ClientId},
        {Value : ClientAuthentication},
        {Value : Scope},
        {Value : ScopeContentType},
        {Value : SecurityArtifactDescriptor_Type},
        {Value : SecurityArtifactDescriptor_DeployedOn},
        {Value : SecurityArtifactDescriptor_Status}
    ]}
}) {
    Name                 @title : 'Name';
    Description          @title : 'Description';
    TokenServiceUrl      @title : 'Tokem Service';
    ClientId             @title : 'Client ID';
    ClientAuthentication @title : 'Client Authentication';
    Scope                @title : 'Scope';
    ScopeContentType     @title : 'Content Type';
    SecurityArtifactDescriptor {
        Type             @title : 'Type';
        DeployedBy       @title : 'Deployed By';
        DeployedOn       @title : 'Deployed On';
        Status           @title : 'Status';
    }
};

// Access Policies ----------------------------------------------------------------------------
annotate ConfigService.AccessPolicies with @(UI : {
    PresentationVariant : {
        SortOrder      : [{Property : RoleName}],
        Visualizations : ['@UI.LineItem']
    },
    HeaderInfo          : {
        TypeName       : 'Access Policy',
        TypeNamePlural : 'Access Policies',
        Title          : {Value : RoleName},
        Description    : {Value : ObjectID}
    },
    LineItem            : [
        {
            Value                 : RoleName,
            ![@HTML5.CssDefaults] : {width : '20rem'}
        },
        {Value : Description}
    ],
    Facets              : [
        {
            $Type  : 'UI.CollectionFacet',
            ID     : 'metadata',
            Label  : 'Metadata',
            Facets : [{
                $Type  : 'UI.ReferenceFacet',
                Target : '@UI.FieldGroup#Basic'
            }]
        },
        {
            $Type  : 'UI.CollectionFacet',
            ID     : 'content',
            Label  : 'Content',
            Facets : [{
                $Type  : 'UI.ReferenceFacet',
                Target : 'toArtifactReferences/@UI.PresentationVariant',
            }]
        }
    ],
    FieldGroup #Basic   : {Data : [
        {Value : Id},
        {Value : RoleName},
        {Value : Description}
    ]}
}) {
    RoleName    @title : 'Name';
    Description @title : 'Description';
    Id          @title : 'ID';
};

annotate ConfigService.ArtifactReferences with @(UI : {
    PresentationVariant   : {
        SortOrder      : [{Property : Name}],
        Visualizations : ['@UI.LineItem']
    },
    HeaderInfo            : {
        TypeName       : 'Artifact Reference',
        TypeNamePlural : 'Artifact References',
        Title          : {Value : Name},
        Description    : {Value : ObjectID}
    },
    LineItem              : [
        {
            Value                 : Name,
            ![@HTML5.CssDefaults] : {width : '20rem'}
        },
        {Value : Type},
        {Value : ConditionAttribute},
        {Value : ConditionType},
        {Value : ConditionValue}
    ],
    Facets                : [
        {
            $Type  : 'UI.CollectionFacet',
            ID     : 'metadata',
            Label  : 'Metadata',
            Facets : [{
                $Type  : 'UI.ReferenceFacet',
                Target : '@UI.FieldGroup#Basic'
            }]
        },
        {
            $Type  : 'UI.CollectionFacet',
            ID     : 'condition',
            Label  : 'Condition',
            Facets : [{
                $Type  : 'UI.ReferenceFacet',
                Target : '@UI.FieldGroup#Condition'
            }]
        }
    ],
    FieldGroup #Basic     : {Data : [
        {Value : Id},
        {Value : Name},
        {Value : Description}
    ]},
    FieldGroup #Condition : {Data : [
        {Value : Type},
        {Value : ConditionAttribute},
        {Value : ConditionType},
        {Value : ConditionValue}
    ]}
}) {
    Name               @title : 'Name';
    Description        @title : 'Description';
    Id                 @title : 'ID';
    Type               @title : 'Type';
    ConditionAttribute @title : 'Attribute';
    ConditionValue     @title : 'Value';
    ConditionType      @title : 'Condition';
};


// Number Ranges ----------------------------------------------------------------------------
annotate ConfigService.NumberRanges with @(UI : {
    PresentationVariant : {
        SortOrder      : [{Property : Name}],
        Visualizations : ['@UI.LineItem']
    },
    HeaderInfo          : {
        TypeName       : 'Number Range',
        TypeNamePlural : 'Number Ranges',
        Title          : {Value : Name}
    },
    LineItem            : [
        {
            Value                 : Name,
            ![@HTML5.CssDefaults] : {width : '20rem'}
        },
        {
            Value                 : CurrentValue,
            ![@HTML5.CssDefaults] : {width : '15rem'}
        },
        {
            Value                 : MinValue,
            ![@HTML5.CssDefaults] : {width : '15rem'}
        },
        {
            Value                 : MaxValue,
            ![@HTML5.CssDefaults] : {width : '15rem'}
        },
    ],
    Facets              : [{
        $Type  : 'UI.CollectionFacet',
        ID     : 'metadata',
        Label  : 'Metadata',
        Facets : [{
            $Type  : 'UI.ReferenceFacet',
            Target : '@UI.FieldGroup#Basic'
        }]
    }],
    FieldGroup #Basic   : {Data : [
        {Value : Name},
        {Value : CurrentValue},
        {Value : FieldLength},
        {Value : MinValue},
        {Value : MaxValue},
        {Value : Rotate}
    ]}
}) {
    Name         @title : 'Name';
    Description  @title : 'Description';
    MaxValue     @title : 'Max Value';
    MinValue     @title : 'Min Value';
    Rotate       @title : 'Rotate';
    CurrentValue @title : 'Current Value';
    FieldLength  @title : 'Field Length';
};

// Custom Tag Configurations ----------------------------------------------------------------------------
annotate ConfigService.CustomTagConfigurations with @(UI : {
    PresentationVariant : {
        SortOrder      : [{Property : tagName}],
        Visualizations : ['@UI.LineItem']
    },
    HeaderInfo          : {
        TypeName       : 'Custom Tag Configuration',
        TypeNamePlural : 'Custom Tag Configurations',
        Title          : {Value : tagName}
    },
    LineItem            : [
        {
            Value                 : tagName,
            ![@HTML5.CssDefaults] : {width : '20rem'}
        },
        {Value : permittedValues},
        {Value : isMandatory}
    ],
    Facets              : [{
        $Type  : 'UI.CollectionFacet',
        ID     : 'metadata',
        Label  : 'Metadata',
        Facets : [{
            $Type  : 'UI.ReferenceFacet',
            Target : '@UI.FieldGroup#Basic'
        }]
    }],
    FieldGroup #Basic   : {Data : [
        {Value : tagName},
        {Value : permittedValues},
        {Value : isMandatory}
    ]}
}) {
    toTenant        @title : 'Tenant';
    tagName         @title : 'Tag Name';
    permittedValues @title : 'Permitted';
    isMandatory     @title : 'Mandatory';
};


// Variables ----------------------------------------------------------------------------
annotate ConfigService.Variables with @(UI : {
    PresentationVariant : {
        SortOrder      : [{Property : VariableName}],
        Visualizations : ['@UI.LineItem']
    },
    HeaderInfo          : {
        TypeName       : 'Variable',
        TypeNamePlural : 'Variables',
        Title          : {Value : VariableName}
    },
    LineItem            : [
        {
            Value                 : VariableName,
            ![@HTML5.CssDefaults] : {width : '20rem'}
        },
        {Value : Visibility},
        {Value : IntegrationFlow},
        {Value : UpdatedAt},
        {Value : RetainUntil}
    ],
    Facets              : [{
        $Type  : 'UI.CollectionFacet',
        ID     : 'metadata',
        Label  : 'Metadata',
        Facets : [{
            $Type  : 'UI.ReferenceFacet',
            Target : '@UI.FieldGroup#Basic'
        }]
    }],
    FieldGroup #Basic   : {Data : [
        {Value : VariableName},
        {Value : IntegrationFlow},
        {Value : Visibility},
        {Value : UpdatedAt},
        {Value : RetainUntil}
    ]}
}) {
    VariableName    @title : 'Name';
    IntegrationFlow @title : 'Flow';
    Visibility      @title : 'Visibility';
    UpdatedAt       @title : 'Updated at';
    RetainUntil     @title : 'Retain until';
};
