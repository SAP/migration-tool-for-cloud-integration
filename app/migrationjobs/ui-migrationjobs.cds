using ConfigService from '../../srv/service';

annotate ConfigService.MigrationJobs with @(UI : {
    PresentationVariant   : {
        SortOrder      : [{
            Property   : StartTime,
            Descending : true
        }],
        Visualizations : ['@UI.LineItem']
    },
    Identification        : [{Value : ObjectID}],
    SelectionFields       : [
        StartTime,
        EndTime
    ],
    HeaderInfo            : {
        TypeName       : 'Migration Job',
        TypeNamePlural : 'Migration Jobs',
        Title          : {Value : toMigrationTask.Name},
        Description    : {Value : ObjectID},
        TypeImageUrl   : 'sap-icon://survey'
    },
    HeaderFacets          : [{
        $Type  : 'UI.ReferenceFacet',
        Target : '@UI.FieldGroup#Execution'
    }],
    CreateHidden          : true,
    LineItem              : [
        {Value : ObjectID},
        {Value : toMigrationTask.Name},
        {Value : StartTime},
        {Value : EndTime},
        {
            Value                     : Status,
            Criticality               : StatusCriticality,
            CriticalityRepresentation : #WithIcon
        }
    ],
    Facets                : [{
        $Type  : 'UI.CollectionFacet',
        ID     : 'errors',
        Label  : 'Result',
        Facets : [{
            $Type  : 'UI.ReferenceFacet',
            Target : 'toErrors/@UI.LineItem'
        }]
    }],
    FieldGroup #Execution : {Data : [
        {
            Value                     : Status,
            Criticality               : StatusCriticality,
            CriticalityRepresentation : #WithIcon
        },
        {Value : StartTime},
        {Value : EndTime}
    ]},
    FieldGroup #Log       : {Data : [{Value : Log}]}
}) {
    ObjectID          @title : 'Job Identifier'  @readonly;
    StartTime         @title : 'Start Time'  @readonly;
    EndTime           @title : 'End Time'  @readonly;
    Status            @title : 'Status'  @readonly;
    Log               @title : 'Log'  @readonly;
    StatusCriticality @title : 'Status Value'  @readonly;
};
