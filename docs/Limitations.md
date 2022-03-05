# Limitations
*Last updated: 5 Mar 2022*

This tool has limitations on which content can be migrated and which not. Some limitations are set by the availability of suitable APIs, while other limitations are defined by security constraints.

Below is an overview of all limitations of this migration tool.

Generic limitations of SAP Integration Suite on Multi Cloud are also documented in [SAP Note 2752867](https://launchpad.support.sap.com/#/notes/2752867).

## Integration Packages

|Limitation|Reason|Solution
|-|-|-
|Version history can not be migrated|No suitable API to export history
|Draft items can not be migrated|No suitable API to export draft items|Save item as new version first
|Custom Groovy and Javascript code is analyzed for usage of Environment Variables, which may generate alerts in the tool but the custom code is not modified/corrected|Can not automatically correct custom code|Manually review the alerts and make appropriate changes. See [SAP Help page](https://help.sap.com/viewer/368c481cd6954bdfa5d0435479fd4eaf/Cloud/en-US/fb24f52d522b4a3b84c762ff7e085861.html)

## Security Material

|Limitation|Reason|Solution
|-|-|-
|User Credentials of type 'Default' and 'Successfactors' can be migrated but will be created without the correct password/secret. User Credentials of type 'open connectors' can not be migrated|Security reasons|Set password/secret manually after migration
|Only OAuth credentials of type 'Client Credentials' can be migrated, not 'SAML Bearer Assertion' or 'Authorization Code'|Security reasons|Re-create the item manually
|Only Keystore entries of type 'Certificate' can be migrated, not 'Key Pair', 'SSH Key' or 'Keystore'. Also entries indicated with 'Maintained by SAP' can not be migrated|Security reasons|Re-create the item manually
|Secure Parameters can not be migrated|No suitable API available|Re-create the item manually
|Known Hosts can not be migrated|No suitable API available|Re-create the item manually
|PGP Keyrings can not be migrated|No suitable API available|Re-create the item manually
|Certificate-to-User Mappings can not be migrated|Not relevant in Multi Cloud tenants|Create a Service Key via the BTP Cockpit

## Stores

|Limitation|Reason|Solution
|-|-|-
|Data Stores can not be migrated|Tool roadmap item
|~~Variables can not be migrated~~|~~Tool roadmap item~~|Delivered in v1.1.0
|JDBC Material can not be migrated|No suitable API available
|Message Store can not be migrated|No suitable API available
|JMS Queue Entries can not be migrated|Not necessary|Empty queue on Neo tenant before migration

## Other Artifacts

|Limitation|Reason|Solution
|-|-|-
|Custom Adapters can not be migrated|No suitable API available|Re-create the item manually
|Partner Directory can not be migrated|No suitable API available|Re-create the item manually
|Idempotent Repository for XI, AS2, SFTP and FTP adapters|No suitable API available
