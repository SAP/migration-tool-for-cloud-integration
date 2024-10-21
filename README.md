[![REUSE status](https://api.reuse.software/badge/github.com/SAP/migration-tool-for-cloud-integration)](https://api.reuse.software/info/github.com/SAP/migration-tool-for-cloud-integration)

# Migration tool for Cloud Integration

## Description

This tool aims to assist SAP customers using SAP Cloud Integration on Neo datacenters who wish to upgrade to SAP Integration Suite on Multi-Cloud datacenters.

**Important:**
There is an official migration pack available via [SAP Note 2937549](https://launchpad.support.sap.com/#/notes/2937549) which leverages a collection of Postman scripts. This Github repository is **not** related with the official migration pack mentioned in the SAP Note. However, the functionality is very similar:

This repo keeps track of versions via Tags:
- Tag v1.0.x: scope similar to Postman collection v1.5.0 (26 Feb 2021)
- Tag v1.1.x: scope similar to Postman collection v1.6.0 (14 Feb 2022) (Variables)
- Tag v1.2.x: scope similar to Postman collection v1.7.1 (30 May 2022) (Certificate-to-User Mapping)
- Tag v1.3.x: scope similar to Postman collection v1.8.0 (12 Dec 2022) (Data Stores)

This Github repository is an alternative tool which aims to achieve the same as the Postman collection while offering greater flexibility and control over your migration project. Areas where this tool provides an advantage over the Postman collection:
- Creation of 'Migration Tasks' which focus on a subset of the content in the tenant;
- Advanced features like script scanning;
- Area for customization to include your own code or migration logic;
- API enabled, to run specific Migration Tasks from external triggers (e.g. CI-CD or Job Scheduling);

This tool is provided as-is and is not covered by SAP Support.
A write-up about this tool can be found here: [SAP Blog: Getting Grips on your Cloud Integration Migration from Neo to Cloud Foundry](https://blogs.sap.com/2022/07/27/getting-grips-on-your-cloud-integration-migration-from-neo-to-cloud-foundry/)

## Requirements

You will need:
- A SAP Cloud Integration tenant on Neo (source system)
- A SAP Integration Suite tenant on Cloud Foundry (target system)

If you don't have a SAP Integration Suite license yet, you can use the BTP Free Tier available at no cost. See https://blogs.sap.com/2021/11/17/sap-integration-suite-free-tier-is-now-available-on-sap-btp/

## Download & Installation

This tool is designed to run locally on your own laptop, server or VM. It is developed using the [SAP Cloud Application Programming Model](https://cap.cloud.sap), using Node.js as server language. It can also be hosted on SAP Business Technology Platform natively via CF, HC and Work Zone, or via Docker.

Locally stored data is kept in a local SQLite database file.

### Use Docker

You can use the provided Dockerfile to install and run the application:

In Terminal or Command Prompt, run:
1. Download this tool from git: `git clone https://github.com/SAP/migration-tool-for-cloud-integration.git --depth 1`
2. Navigate into the root project folder: `cd migration-tool-for-cloud-integration`
3. Install this tool: `npm install`
4. Prepare/rebuild the SQLite database: `cds deploy --to sqlite`
5. Build this tool: `docker build -t migrationtool .` (in case you receive an error on the Sqlite3 package, delete the package-lock.json file and try the build again)

Now the tool is built and can be started:

1. Start the tool: `docker run -p 4004:4004 migrationtool`
2. Open your local browser to: `http://localhost:4004/home.html`

To stop the tool, in Terminal or Command Prompt, press `control-C`

### Locally on laptop

It is required to have an active installation of Node.js (version 20 or later), available from the [Node.js](https://nodejs.org/) website, including Node Package Manager (NPM). You can verify your installed version via `node -v`.

To install, in Terminal or Command Prompt, run:

1. Install the SAP CAP SDK 'CDS-DK': `npm i -g @sap/cds-dk`
2. Download this tool from git: `git clone https://github.com/SAP/migration-tool-for-cloud-integration.git --depth 1`
3. Navigate into the root project folder: `cd migration-tool-for-cloud-integration`
4. Install this tool: `npm install`
5. Prepare/rebuild the SQLite database: `cds deploy --to sqlite`

Now the tool is installed and can be started:

1. Start the tool: `npm start`
2. Open your local browser to: `http://localhost:4004/home.html`

To stop the tool, in Terminal or Command Prompt, press `control-C`

### Natively on BTP using Cloud Foundry, HANA Cloud/PostgresSQL and Work Zone

This option requires you to have a HANA Cloud database (or you can use Postgres), and a subscription to SAP Work Zone (standard edition)

*Optional: The default MTA.yaml configuration specifies HANA Cloud. To switch to Postgres, do the following:*
*1. Change package.json hybrid > db > kind to 'postgres'*
*2. Change mta.yaml and change the 'requires' section of the srv module + disable the db-deployer in favor of the postgres-deployer, as well as the postgres db resource.*

To install, in Terminal or Command Prompt, run:

1. Install the SAP CAP SDK 'CDS-DK': `npm i -g @sap/cds-dk`
2. Download this tool from git: `git clone https://github.com/SAP/migration-tool-for-cloud-integration.git --depth 1`
3. Navigate into the root project folder: `cd migration-tool-for-cloud-integration`
4. Install this tool: `npm install`
5. Build the project: `mbt build`
6. Deploy the project: `cf deploy ./mta_archives/migrationtool_1.3.0.mtar`

Now you can add the Fiori applications to your Work Zone site via the Work Zone Admin site:
1. Sync your HTML5 repository
2. Add the HTML5 apps to your content
3. Assign the apps to a Group and Role
4. Create a Site containing the Role

Now you can grant users access to the application via the BTP Cockpit Role Collections
1. Assign the CF role `CPI Migration Tool User`
2. Assign the front-end role created by you in the previous step

Now the tool can be accessed via Work Zone:
To locally monitor the application logs, run the following command in Terminal: `cf logs migrationtool-srv | grep -v RTR`

To enable Hybrid mode, excute `cds bind -2 migrationtool-db` to use the HANA database and run your local application via `cds watch --profile hybrid`.

## Documentation

To learn how to use the tool, please refer to the [user documentation](/docs).

## Version Dependencies

### SAP UI5 version info and issue log

- **1.95.0**: (deprecated) Most stable, but does not support showCount=true (manifest) for Task Items table in MigrationTasks > Detail screen
- **1.96.2**: (deprecated) Issue: does not show Integration Artifacts table in Explore Tenant > Integration Packages > Detail screen
- **1.97.0**: (deprecated) Issue: does not show Integration Artifacts table in Explore Tenant > Integration Packages > Detail screen, but solves the showCount issue of 1.95.0
- **1.99.0**: Deprecated
- **1.108.2**: Stable
- **1.126.2**: Stable
- **1.129.2**: Stable

Specify the version to be used in [/app/home.html](./app/home.html)

Version availability: https://ui5.sap.com/versionoverview.html

### SAP CDS version info and issue log

- **5.5.4**: Works
- **5.6.2**: Issue: UPDATE function to update ExistInSource columns in MigrationTasks has bugs
- **5.7.3**: Stable
- **5.8.3**: Stable
- **6.3.2**: Stable
- **6.8.4**: Stable
- **7.0.2**: Stable (new major release, so some codeline was migrated)
- **7.9.3**: Stable
- **8.3.1**: Stable

More information on changelog: https://cap.cloud.sap/docs/releases

## Known Issues

None so far, but please also refer to [FAQ](/docs/FAQ.md) and [Limitations](/docs/Limitations.md)

## How to Obtain Support

Please search or create a new Issue in this Github repository to obtain support.

## Contributing

Contributions are certainly welcome, see [ways to contribute](CONTRIBUTING.md).

## Code of Conduct

See [Our Code of Conduct](CODE_OF_CONDUCT.md).

## Licensing

Copyright 2021 SAP SE or an SAP affiliate company and migration-tool-for-cloud-integration contributors. Please see our [LICENSE](LICENSE) for copyright and license information.
