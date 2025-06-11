using migrationtool as db from '../db/schema';

@requires: 'MigrationUser'
service RegistrationService {

    @odata.draft.enabled
    entity Tenants        as
        projection on db.Tenants
        excluding {
            toMigrationTasks
        }
        actions {

            @Core.OperationAvailable: in.IsActiveEntity
            action testConnection() returns Boolean;

            action duplicate()      returns Tenants;
        };

    entity MigrationTasks as projection on db.MigrationTasks;

    @readonly
    entity CodeLists      as projection on db.CodeLists;

    entity SystemRoles    as projection on CodeLists[List = 'SystemRoles'];
    entity Landscapes     as projection on CodeLists[List = 'Landscapes'];

    @Common.IsActionCritical: true
    action exportTenants();
};
