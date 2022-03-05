using ConfigService from '../../srv/service';

annotate ConfigService.MigrationTasks with @(UI : {
    PresentationVariant      : {
        SortOrder      : [{
            Property   : modifiedAt,
            Descending : true
        }],
        Visualizations : ['@UI.LineItem']
    },
    SelectionFields          : [
        SourceTenant_ObjectID,
        TargetTenant_ObjectID
    ],
    Identification           : [
        {Value : ObjectID},
        {
            ![@UI.Hidden] : {$edmJson : {$Not : [{$Path : 'IsActiveEntity'}]}},
            $Type         : 'UI.DataFieldForAction',
            Label         : 'Change Target ...',
            Action        : 'ConfigService.Task_setTargetTenant'
        },
        {
            ![@UI.Hidden] : {$edmJson : {$Not : [{$Path : 'IsActiveEntity'}]}},
            $Type         : 'UI.DataFieldForAction',
            Label         : 'Run Now',
            Action        : 'ConfigService.Task_startMigration'
        }
    ],
    CreateHidden             : true,
    HeaderInfo               : {
        TypeName       : 'Migration Task',
        TypeNamePlural : 'Migration Tasks',
        Title          : {Value : Name},
        Description    : {Value : Description},
        TypeImageUrl   : 'sap-icon://begin'
    },
    HeaderFacets             : [
        {
            $Type  : 'UI.ReferenceFacet',
            Target : '@UI.FieldGroup#HeaderSource',
            Label  : 'Source Tenant'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            Target : '@UI.FieldGroup#HeaderTarget',
            Label  : 'Target Tenant'
        }
    ],
    LineItem                 : [
        {Value : modifiedAt},
        {Value : Name},
        {
            Value : SourceTenant.Name,
            Label : 'Source'
        },
        {
            Value : TargetTenant.Name,
            Label : 'Target'
        },
        {
            Value                     : LastStatus,
            Criticality               : LastStatusCriticality,
            CriticalityRepresentation : #WithIcon
        }
    ],
    Facets                   : [
        {
            ![@UI.Hidden] : {$edmJson : {$Not : [{$Path : 'IsActiveEntity'}]}},
            $Type         : 'UI.CollectionFacet',
            ID            : 'taskjobs',
            Label         : 'Executions',
            Facets        : [
                {
                    $Type  : 'UI.ReferenceFacet',
                    Target : '@UI.FieldGroup#RefreshJobs'
                },
                {
                    $Type  : 'UI.ReferenceFacet',
                    Target : 'toMigrationJobs/@UI.LineItem'
                }
            ]
        },
        {
            ![@UI.Hidden] : {$edmJson : {$Not : [{$Path : 'IsActiveEntity'}]}},
            $Type         : 'UI.CollectionFacet',
            ID            : 'taskcontent',
            Label         : 'Migration Content',
            Facets        : [
                {
                    $Type  : 'UI.ReferenceFacet',
                    Target : '@UI.FieldGroup#NodesHeader',
                    Label  : 'Number of items selected for migration'
                },
                {
                    $Type  : 'UI.ReferenceFacet',
                    Target : 'toTaskNodes/@UI.LineItem',
                }
            ]
        },
        {
            $Type  : 'UI.CollectionFacet',
            ID     : 'taskcustom',
            Label  : 'Parameters',
            Facets : [{
                $Type  : 'UI.ReferenceFacet',
                Target : '@UI.FieldGroup#CustomConfig'
            }]
        },
        {
            $Type  : 'UI.CollectionFacet',
            ID     : 'metadata',
            Label  : 'Metadata',
            Facets : [{
                $Type  : 'UI.ReferenceFacet',
                Target : '@UI.FieldGroup#Overview'
            }]
        }
    ],
    FieldGroup #RefreshJobs  : {Data : [{
        $Type  : 'UI.DataFieldForAction',
        Label  : 'Refresh Table',
        Action : 'ConfigService.Task_refreshJobsTable'
    }]},
    FieldGroup #NodesHeader  : {Data : [
        {Value : Statistics_numIntegrationPackages},
        {Value : Statistics_numSecurityArtifacts},
        {Value : Statistics_numOtherArtifacts},
        {
            $Type  : 'UI.DataFieldForAction',
            Label  : 'Reset / Regenerate Task Items',
            Action : 'ConfigService.Task_resetTaskNodes'
        }
    ]},
    FieldGroup #HeaderSource : {Data : [
        {Value : SourceTenant.Name},
        {Value : SourceTenant.Role},
        {Value : SourceTenant.Environment},
        {Value : SourceTenant.RefreshedDate}
    ]},
    FieldGroup #HeaderTarget : {Data : [
        {Value : TargetTenant.Name},
        {Value : TargetTenant.Role},
        {Value : TargetTenant.Environment},
        {Value : TargetTenant.RefreshedDate}
    ]},
    FieldGroup #Overview     : {Data : [
        {Value : Name},
        {Value : Description},
        {Value : ObjectID},
        {Value : modifiedAt},
        {
            Value                     : LastStatus,
            Criticality               : LastStatusCriticality,
            CriticalityRepresentation : #WithIcon
        }
    ]},
    FieldGroup #CustomConfig : {Data : [{Value : CustomConfig}]}
}) {
    ObjectID                   @title : 'Task ID';
    createdAt                  @title : 'Created';
    SourceTenant               @title : 'Source Tenant'  @mandatory;
    TargetTenant               @title : 'Target Tenant';
    Name                       @title : 'Task Name'  @mandatory  @Common.SemanticObject : 'migrationtasks';
    Description                @title : 'Description';
    LastStatus                 @title : 'Last Run Status';
    CustomConfig               @title : 'Custom Configuration'  @UI.MultiLineText : true;
    modifiedAt                 @title : 'Last Modified';
    Statistics {
        numIntegrationPackages @title : 'Integration Packages';
        numSecurityArtifacts   @title : 'Security Artifacts';
        numOtherArtifacts      @title : 'Other Artifacts';
    }
};


annotate ConfigService.MigrationTasks with {
    SourceTenant @(Common : {
        ValueListWithFixedValues : true,
        Text                     : SourceTenant.Name,
        TextArrangement          : #TextFirst,
        ValueList                : {
            CollectionPath : 'Tenants',
            Parameters     : [{
                $Type             : 'Common.ValueListParameterInOut',
                ValueListProperty : 'ObjectID',
                LocalDataProperty : SourceTenant_ObjectID
            }]
        }
    });
    TargetTenant @(Common : {
        ValueListWithFixedValues : true,
        Text                     : TargetTenant.Name,
        TextArrangement          : #TextFirst,
        ValueList                : {
            CollectionPath : 'Tenants',
            Parameters     : [{
                $Type             : 'Common.ValueListParameterInOut',
                ValueListProperty : 'ObjectID',
                LocalDataProperty : TargetTenant_ObjectID
            }]
        }
    });
};

annotate ConfigService.MigrationTaskNodes with @(UI : {
    PresentationVariant        : {
        SortOrder      : [{
            Property   : Name,
            Descending : false
        }],
        Visualizations : ['@UI.LineItem'],
        RequestAtLeast : [
            Included,
            ConfigureOnly
        ]
    },
    SelectionVariant #Packages : {
        Text          : 'Integration Packages',
        SelectOptions : [{
            $Type        : 'UI.SelectOptionType',
            PropertyName : Component,
            Ranges       : [{
                $Type  : 'UI.SelectionRangeType',
                Sign   : #I,
                Option : #EQ,
                Low    : 'Integration Package'
            }]
        }]
    },
    SelectionVariant #Security : {
        Text          : 'Security Artifacts',
        SelectOptions : [{
            $Type        : 'UI.SelectOptionType',
            PropertyName : Component,
            Ranges       : [
                {
                    $Type  : 'UI.SelectionRangeType',
                    Sign   : #I,
                    Option : #EQ,
                    Low    : 'Keystore'
                },
                {
                    $Type  : 'UI.SelectionRangeType',
                    Sign   : #I,
                    Option : #EQ,
                    Low    : 'User Credential'
                },
                {
                    $Type  : 'UI.SelectionRangeType',
                    Sign   : #I,
                    Option : #EQ,
                    Low    : 'oAuth Credential'
                },
                {
                    $Type  : 'UI.SelectionRangeType',
                    Sign   : #I,
                    Option : #EQ,
                    Low    : 'Access Policy'
                }
            ]
        }]
    },
    SelectionVariant #Others   : {
        Text          : 'Other Artifacts',
        SelectOptions : [{
            $Type        : 'UI.SelectOptionType',
            PropertyName : Component,
            Ranges       : [
                {
                    $Type  : 'UI.SelectionRangeType',
                    Sign   : #I,
                    Option : #EQ,
                    Low    : 'Number Range'
                },
                {
                    $Type  : 'UI.SelectionRangeType',
                    Sign   : #I,
                    Option : #EQ,
                    Low    : 'Custom Tag'
                },
                {
                    $Type  : 'UI.SelectionRangeType',
                    Sign   : #I,
                    Option : #EQ,
                    Low    : 'JMS Broker'
                },
                {
                    $Type  : 'UI.SelectionRangeType',
                    Sign   : #I,
                    Option : #EQ,
                    Low    : 'Global Variable'
                }
            ]
        }]
    },
    CreateHidden               : true,
    DeleteHidden               : true,
    Identification             : [{Value : Id}],
    HeaderInfo                 : {
        $Type          : 'UI.HeaderInfoType',
        TypeName       : 'Task Item',
        TypeNamePlural : 'Task Items',
    },
    LineItem                   : {
        ![@UI.Criticality] : Status,
        $value             : [
            {
                $Type  : 'UI.DataFieldForAction',
                Label  : 'Include selection',
                Action : 'ConfigService.Nodes_IncludeSelected'
            },
            {
                $Type  : 'UI.DataFieldForAction',
                Label  : 'Skip selection',
                Action : 'ConfigService.Nodes_SkipSelected'
            },
            {
                Value                     : Name,
                Criticality               : Status,
                CriticalityRepresentation : #WithoutIcon
            },
            {
                Value                     : PackageVendor,
                Criticality               : Status,
                CriticalityRepresentation : #WithoutIcon
            },
            {
                Value                     : Component,
                Criticality               : Status,
                CriticalityRepresentation : #WithoutIcon
            },
            {
                Value                     : ExistInSource,
                Criticality               : ExistInSourceCriticality,
                CriticalityRepresentation : #OnlyIcon
            },
            {
                Value                     : ExistInTarget,
                Criticality               : ExistInTargetCriticality,
                CriticalityRepresentation : #WithoutIcon

            },
            {
                Value                     : IncludedText,
                Criticality               : IncludedCriticality,
                CriticalityRepresentation : #WithoutIcon
            },
            {
                $Type       : 'UI.DataFieldForAction',
                Label       : 'Configure ...',
                Action      : 'ConfigService.Nodes_ConfigurePackage',
                Inline      : true,
                Criticality : ConfigureOnlyCriticality
            },
            {Value : ConfigureOnlyText},
            {Value : Included},
            {Value : ConfigureOnly}
        ]
    }
}) {
    Name              @title : 'Name'  @readonly;
    Component         @title : 'Component Type'  @readonly;
    ExistInSource     @title : 'In Source'  @readonly;
    ExistInTarget     @title : 'In Target'  @readonly;
    IncludedText      @title : 'Selected for Migration';
    ConfigureOnlyText @title : 'Configuration';
    Included          @UI.Hidden;
    ConfigureOnly     @UI.Hidden;
    PackageVendor     @title : 'Vendor';
};
