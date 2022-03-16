# Documentation

See also: [FAQ](FAQ.md) and [Limitations](Limitations.md)

## General Concept

The general concept of this tool is quite straight-forward. Start by opening the /home.html webpage where you will see the 4 tiles / applications.
In a typical migration scenario you would:
1. Use the **Register Tenants** app to register all your tenant systems (source, target) from your Dev or QA landscape (see [Registering Tenants](#registering-tenants));
2. Use the **Explore Tenants** app for each of the tenants to download all the integration content implemented on the tenants (see [Exploring Tenants](#exploring-tenants));
3. Use the **Explore Tenants** app to open the Source Tenant of your migration project and create a new migration task (see [Creating Migration Task](#creating-migration-tasks));
4. Navigate into the migration task, or use the **Migration Tasks** app to configure the migration task to your needs (see [Configuring Migration Tasks](#configuring-migration-tasks));
5. Run the migration task and follow the job progress via the **Migration Jobs** app (see [Browsing the Job Log](#browsing-the-job-log));

## Step-by-Step Walkthrough
### Registering Tenants

Use the **Register Tenants** app to register all your tenant systems (source, target) from your Dev or QA landscape. Use the Create button to create a new tenant and complete the details. To get the connection details for your tenant, make sure you have the details of your oAuth Client (see below).

For Cloud Foundry based tenants, you can use the Import button where you can paste the JSON of the Service Key to automatically fill in all fields.

The flag 'Source-only system' indicates if this tenant will be available as a migration target. If the flag is true, you won't be able to edit or post any content on this tenant with the migration tool as any call which is not a GET call will be blocked. This is purely a safety setting.

Once a tenant is created / saved, you can use **Test Connection** to validate the settings. This will reach out to the Authentication Server to generate a token, and use this token on the Integration Tenant for a generic call to test the access.

### Creating oAuth Clients on Source and Target systems

- On the **Neo (source)** tenant:
    1. Navigate to your SAP BTP cockpit of the Neo subaccount, go to 'Security' > 'OAuth' and open the 'Clients' tab.
    2. Register a new oAuth Client with 'Client Credentials' grant type.
    3. Assign the following Roles to user 'oauth_client_*\<client ID\>*':
        - AuthGroup.IntegrationDeveloper
        - AuthGroup.Administrator
        - AuthGroup.BusinessExpert (required for Variables)
    4. Copy the Token Endpoint (see branding tab), Client ID, and Client Secret to use in the migration application.

    If you are not familiar with the process, please follow the steps here: [see Neo documentation](https://help.sap.com/viewer/368c481cd6954bdfa5d0435479fd4eaf/Cloud/en-US/040d8110293d44b1bfaa75674530d395.html), go to 'OAuth with Client Credentials Grant' and follow steps 1 and 2.

- On the **Cloud Foundry (target)** tenant:
  1. Navigate to your SAP BTP cockpit of the Cloud Foundry subaccount, go to 'Services', then 'Service Marketplace' and select 'Process Integration'
  2. Create a new instance with service plan 'api' and with the following configuration:
       - Grant-types: 'client_credentials'
       - Roles:
         - AuthGroup_IntegrationDeveloper
         - AuthGroup_Administrator
  3. Create a Service Key and copy the entire JSON text to your clipboard to use in the migration application (use the 'Import JSON' button).

    If you are not familiar with the process, please follow the steps here: [see CF documentation](https://help.sap.com/viewer/368c481cd6954bdfa5d0435479fd4eaf/Cloud/en-US/20e26a837a8449c4b8b934b07f71cb76.html) and follow the steps in 'Define a Service Instance and Service Key for the API Client'.

### Exploring Tenants

Use the **Explore Tenants** app for each of the tenants to download all the integration content implemented on the tenants. Use the button **Get Integration Content** to download the integration content. This process might take several minutes depending on the amount of content and the speed of your connection.

All downloaded content is then populated in the different sections: Integration Packages, Security Artifacts and Other Artifacts. All this information is read-only and for informational purposes only. This data is **not** used to perform the actual migration.

### Creating Migration Tasks

Use the **Explore Tenants** app to open the Source Tenant of your migration project. Go to Migration Tasks and click on Create  Migration Task. You will have to select a Target migration tenant, but this can be changed later.

After the creation of the task, click on the task name in the list to navigate to the details of the task in order to configure it for use (see next section). The same task details can be accessed via the **Migration Tasks** app.

### Configuring Migration Tasks

This is a very important step in the entire migration process. The **Migration Tasks** app allows you to do a variety of things: select which items are in or out of scope of the migration, as well as specify custom properties to steer the migration process.

1. Selecting the scope of the migration

    In **Migration Content** you have a list of all items which have been downloaded from the Source tenant (see: Get Integration Content). They are divided in 3 categories based on the 'Content Type' column:
    - Integration Packages;
    - Security Artifacts (User Credentials, Certificates, oAuth Credentials and Access Policies);
    - Other Artifacts (Number Ranges, Custom Tags, Variables and JMS Brokers)

    This table has the following extra columns:
    - In Source: this should always be YES to signal that the item is present in the source tenant. If this value is NO, or there are items present in the source tenant which are not shown in the list, you can use the **Reset / Regenerated Content List** button to rebuild the list.
    - In Target: identifies if the item is also present in the target tenant or not.
    - Selected for Migration: here you can specify if an item is in (INCLUDE) or out (SKIP) of scope for the migration. To change the value, select the line item via the checkbox and click the 'Include selection' or 'Skip selection' buttons
    - Configuration (only available for items of type 'Integration Package'): You can toggle between doing a 'full copy' of the integration package, or 'configuration only'.
      - A full copy will delete any existing package with the same ID from the target tenant and copy the package from the source tenant, together with all configurations.
      - With Configuration Only, it is expected that the target tenant already has the integration package available and the migration tool will only copy over the configurations of the individual flows/value mappings to the target tenant.
      - Use the 'Configure ...' button to toggle between the 2 modes. A full copy is mainly used in migrations between DEV systems, and Configuration only is mainly used in migration between TEST/PROD systems.

    Upon creation of the migration task, or after resetting/regenerating the content list, all items which are present on the source but not on the target will be pre-set to be included for migration.

2. Changing the Custom Configuration

    Custom configuration can be specified in the **Parameters** section. Use the Edit button at the top of the page to change the value. This value has to be in valid JSON format to be accepted. You can specify any new parameters to your liking.

    The custom configuration is used for custom behavior which can be written/leveraged by changing the code in the [customLogic.js](../srv/customizing/customLogic.js) file.

3. Running the Migration Task

    To execute the migration task, click on Run Now. This will create a new migration job which will be visible in the list of Executions. Running a migration job might take anything between 10 seconds and multiple minutes, depending on the number of items in scope.

4. Changing the Target

    To map this migration task to a different target tenant, use the 'Change Target ...' button.

### Browsing the Job Log

Use the **Migration Jobs** app to see the list of task executions. Select an execution to see the details, which include the entire log of the execution as well as a list of errors/warnings that were generated.

## API Usage

The tool is based on APIs so they can also be used stand-alone. For examples of some of the most common API calls, please refer to the [sample API file](../api/sample%20APIs.http)
