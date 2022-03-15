using ConfigService from '../../srv/service';

annotate ConfigService.Errors with @(UI : {
    PresentationVariant : {
        SortOrder      : [
            {Property : Component},
            {Property : ComponentName}
        ],
        Visualizations : ['@UI.LineItem']
    },
    Identification      : [{Value : ObjectID}],
    HeaderInfo          : {
        TypeName       : 'Issue',
        TypeNamePlural : 'Issues'
    },
    LineItem            : [
        {
            Value                 : Type,
            Criticality           : Severity,
            ![@HTML5.CssDefaults] : {width : '8rem'},
            ![@UI.Importance]     : #High
        },
        {
            Value                 : Component,
            ![@HTML5.CssDefaults] : {width : '15rem'}
        },
        {
            $Type                 : 'UI.DataFieldWithUrl',
            Value                 : ComponentName,
            Url                   : Path,
            ![@HTML5.CssDefaults] : {width : '25rem'},
            ![@UI.Importance]     : #High
        },
        {
            Value                 : Description,
            ![@HTML5.CssDefaults] : {width : '40rem'},
            ![@UI.Importance]     : #High
        }
    ],
}) {
    Type          @title : 'Type'  @readonly;
    Component     @title : 'Component'  @readonly;
    ComponentName @title : 'Name'  @readonly;
    Severity      @title : ''  @readonly;
    Description   @title : 'Description'  @readonly;
    Path          @title : 'Link (new window)'  @readonly;
};
