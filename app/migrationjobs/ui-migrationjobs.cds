using ConfigService from '../../srv/service';
using from '../contentviewer/ui-errors';

annotate ConfigService.MigrationJobs with @(UI : {
    PresentationVariant           : {
        SortOrder      : [{
            Property   : StartTime,
            Descending : true
        }],
        Visualizations : ['@UI.LineItem']
    },
    PresentationVariant #Embedded : {
        SortOrder      : [{
            Property   : StartTime,
            Descending : true
        }],
        Visualizations : ['@UI.LineItem#Embedded']
    },
    Identification                : [{Value : ObjectID}],
    SelectionFields               : [
        StartTime,
        EndTime
    ],
    HeaderInfo                    : {
        TypeName       : 'Migration Job',
        TypeNamePlural : 'Migration Jobs',
        Title          : {Value : toMigrationTask.Name},
        Description    : {Value : ObjectID},
        TypeImageUrl   : 'sap-icon://survey'
    },
    HeaderFacets                  : [{
        $Type  : 'UI.ReferenceFacet',
        Target : '@UI.FieldGroup#Execution'
    }],
    CreateHidden                  : true,
    LineItem                      : [
        {
            Value                 : ObjectID,
            ![@HTML5.CssDefaults] : {width : '20rem'}
        },
        {
            Value                 : toMigrationTask.Name,
            ![@HTML5.CssDefaults] : {width : '20rem'}
        },
        {
            Value                 : StartTime,
            ![@HTML5.CssDefaults] : {width : '15rem'}
        },
        {
            Value                 : EndTime,
            ![@HTML5.CssDefaults] : {width : '15rem'}
        },
        {
            Value                     : Status,
            Criticality               : StatusCriticality,
            CriticalityRepresentation : #WithIcon
        }
    ],
    LineItem #Embedded            : [
        {
            Value                 : ObjectID,
            ![@HTML5.CssDefaults] : {width : '20rem'}
        },
        {
            Value                 : StartTime,
            ![@HTML5.CssDefaults] : {width : '15rem'}
        },
        {
            Value                 : EndTime,
            ![@HTML5.CssDefaults] : {width : '15rem'}
        },
        {
            Value                     : Status,
            Criticality               : StatusCriticality,
            CriticalityRepresentation : #WithIcon
        }
    ],
    Facets                        : [{
        $Type  : 'UI.CollectionFacet',
        ID     : 'errors',
        Label  : 'Result',
        Facets : [{
            $Type  : 'UI.ReferenceFacet',
            Target : 'toErrors/@UI.PresentationVariant'
        }]
    }],
    FieldGroup #Execution         : {Data : [
        {
            Value                     : Status,
            Criticality               : StatusCriticality,
            CriticalityRepresentation : #WithIcon
        },
        {Value : StartTime},
        {Value : EndTime}
    ]},
    FieldGroup #Log               : {Data : [{Value : Log}]}
}) {
    ObjectID          @title : 'Job Identifier'  @readonly;
    StartTime         @title : 'Start Time'  @readonly;
    EndTime           @title : 'End Time'  @readonly;
    Status            @title : 'Status'  @readonly;
    Log               @title : 'Log'  @readonly;
    StatusCriticality @title : 'Status Value'  @readonly;
};
