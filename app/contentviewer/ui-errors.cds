using ConfigService from '../../srv/service';

annotate ConfigService.Errors with @(UI : {
    Identification : [{Value : ObjectID}],
    HeaderInfo     : {
        TypeName       : 'Issue',
        TypeNamePlural : 'Issues'
    },
    LineItem       : [
        {
            Value       : Type,
            Criticality : Severity
        },
        {Value : Component},
        {
            $Type : 'UI.DataFieldWithUrl',
            Value : ComponentName,
            Url   : Path
        },
        {Value : Description}
    ],
}) {
    Type          @title : 'Type' @readonly;
    Component     @title : 'Component' @readonly;
    ComponentName @title : 'Name' @readonly;
    Severity      @title : '' @readonly;
    Description   @title : 'Description' @readonly;
    Path          @title : 'Link (new window)' @readonly;
};
