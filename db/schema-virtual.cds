/**
 * Additional elements to generate the correct types of the incoming API payloads,
 * but they won't be stored in our database, hence they are virtual
 */

using migrationtool from './schema';

extend migrationtool.extIntegrationPackages with {
    virtual IntegrationDesigntimeArtifacts : Map;
}

extend migrationtool.extIntegrationDesigntimeArtifacts with {
    virtual Configurations : Map;
    virtual Resources      : Map;
}

extend migrationtool.extValueMappingDesigntimeArtifacts with {
    virtual ValMapSchema : Map;
}

extend migrationtool.extValMapSchemas with {
    virtual ValMaps        : Map;
    virtual DefaultValMaps : Map;
}

extend migrationtool.extCertificateUserMappings with {
    virtual Certificate : LargeString;
}

extend migrationtool.extDataStoreEntries with {
    virtual content     : {
                headers : many {
                    ![key] : String(255);
                    value  : String(255);
                };
                body    : String(255);
            };
}
