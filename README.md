[![REUSE status](https://api.reuse.software/badge/github.com/SAP/migration-tool-for-cloud-integration)](https://api.reuse.software/info/github.com/SAP/migration-tool-for-cloud-integration)

# Migration tool for Cloud Integration

## Description

This tool aims to assist SAP customers using SAP Cloud Integration on Neo datacenters who wish to upgrade to SAP Integration Suite on Multi-Cloud datacenters.

**Important:**
There is an official migration pack available via [SAP Note 2937549](https://launchpad.support.sap.com/#/notes/2937549) which leverages a collection of Postman scripts. This Github repository is **not** related with the official migration pack mentioned in the SAP Note. However, the functionality is very similar:

This repo keeps track of versions via Tags:
- Tag v1.0.x: scope similar to Postman collection v1.5.0 (26 Feb 2021)
- Tag v1.1.x: scope similar to Postman collection v1.6.0 (14 Feb 2022)

This Github repository is an alternative tool which aims to achieve the same as the Postman collection while offering greater flexibility and control over your migration project. Areas where this tool provides an advantage over the Postman collection:
- Creation of 'Migration Tasks' which focus on a subset of the content in the tenant;
- Advanced features like script scanning;
- Area for customization to include your own code or migration logic;
- API enabled, to run specific Migration Tasks from external triggers (e.g. CI-CD or Job Scheduling);

This tool is provided as-is and is not covered by SAP Support.

## Requirements

You will need:
- A SAP Cloud Integration tenant on Neo (source system)
- A SAP Integration Suite tenant on Cloud Foundry (target system)

If you don't have a SAP Integration Suite license yet, you can use the BTP Free Tier available at no cost. See https://blogs.sap.com/2021/11/17/sap-integration-suite-free-tier-is-now-available-on-sap-btp/

## Download & Installation

This tool is designed to run locally on your own laptop, server or VM. It is developed using the [SAP Cloud Application Programming Model](https://cap.cloud.sap), using Node.js as server language.

Locally stored data is kept in a local SQLite database file.

### Use Docker

You can use the provided Dockerfile to install and run the application:

In Terminal or Command Prompt, run:
1. Download this tool from git: `git clone https://github.com/SAP/migration-tool-for-cloud-integration.git`
2. Build this tool: `docker build -t migrationtool ./migration-tool-for-cloud-integration`

Now the tool is build and can be started:

1. Start the tool: `docker run -p 4004:4004 migrationtool`
2. Open your local browser to: `http://localhost:4004/home.html`

To stop the tool, in Terminal or Command Prompt, press `control-C`

### Manual Install

It is required to have an active installation of Node.js (version 14.5 or later), available from the [Node.js](https://nodejs.org/) website, including Node Package Manager (NPM). You can verify your installed version via `node -v`.

To install, in Terminal or Command Prompt, run:

1. Install the SAP CAP SDK 'CDS-DK': `npm i -g @sap/cds-dk`
2. Download this tool from git: `git clone https://github.com/SAP/migration-tool-for-cloud-integration.git`
3. Install this tool: `npm install`
4. Prepare/rebuild the SQLite database: `cds deploy --to sqlite --with-mocks`

Now the tool is installed and can be started:

1. Start the tool: `npm start`
2. Open your local browser to: `http://localhost:4004/home.html`

To stop the tool, in Terminal or Command Prompt, press `control-C`

## Documentation

To learn how to use the tool, please refer to the [user documentation](/docs).

## Version Dependencies

### SAP UI5 version info and issue log

- **1.95.0**: (deprecated) Most stable, but does not support showCount=true (manifest) for Task Items table in MigrationTasks > Detail screen
- **1.96.2**: (deprecated) Issue: does not show Integration Artifacts table in Explore Tenant > Integration Packages > Detail screen
- **1.97.0**: (deprecated) Issue: does not show Integration Artifacts table in Explore Tenant > Integration Packages > Detail screen, but solves the showCount issue of 1.95.0
- **1.99.0**: Stable

Specify the version to be used in [/app/home.html](./app/home.html)

Version availability: https://ui5.sap.com/versionoverview.html

### SAP CDS version info and issue log

- **5.5.4**: Works
- **5.6.2**: Issue: UPDATE function to update ExistInSource columns in MigrationTasks has bugs
- **5.7.3**: Stable

More information on changelog: https://cap.cloud.sap/docs/releases

## Known Issues

The very first time that the tool is started, it might not start correctly.
If the following line is **not** shown when starting the script you should restart it for it to function correctly:

`[cds] - mocking IntegrationContent.sap.hci.api { at: '/api' }`

See also: [FAQ](/docs/FAQ.md) and [Limitations](/docs/Limitations.md)

## How to Obtain Support

Please search or create a new Issue in this Github repository to obtain support.

## Contributing

Contributions are certainly welcome, see [ways to contribute](CONTRIBUTING.md).

## Code of Conduct

See [Our Code of Conduct](CODE_OF_CONDUCT.md).

## Licensing

Copyright 2021 SAP SE or an SAP affiliate company and migration-tool-for-cloud-integration contributors. Please see our [LICENSE](LICENSE) for copyright and license information.
