using migrationtool as my from '../db/schema';

service RegistrationService {
    @odata.draft.enabled
    entity Tenants                         as projection on my.Tenants actions {

        @cds.odata.bindingparameter.name: '_it'
        @Core.OperationAvailable        : _it.IsActiveEntity
        action Tenant_testConnection() returns Boolean;

        action Tenant_duplicate()      returns Tenants;
    };

    @readonly
    entity SystemRoles                     as projection on my.SystemRoles;

    @readonly
    entity Landscapes                      as projection on my.Landscapes;

    @Common.IsActionCritical: true
    action Tenant_export();
};