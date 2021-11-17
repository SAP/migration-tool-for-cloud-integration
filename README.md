# Migration tool for Cloud Integration

## Description

This tool aims to assist in migration projects for SAP customers using SAP Cloud Integration on Neo datacenters who wish to move to SAP Integration Suite on Multi-Cloud datacenters.

**Important:**
There is an official migration pack available via [SAP Note 2937549](https://launchpad.support.sap.com/#/notes/2937549) which leverages a collection of Postman scripts. This Github repository is **not** related with the official migration pack mentioned in the SAP Note. However, the functionality is very similar (as compared to Postman collection version 1.5.0 (Feb 2021)).

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
- Node.js v14.5 or higher

If you don't have a SAP Integration Suite license yet, you can use a trial account. See https://www.sap.com/products/business-technology-platform/trial.html

## Download & Installation

This tool is designed to run locally on your own laptop, server or VM. It is developed using the [SAP Cloud Application Programming Model](https://cap.cloud.sap), using Node.js as server language.

Locally stored data is kept in a local SQLite database file.

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

## Known Issues

The very first time that the tool is started, it might not start correctly.
If the following line is **not** shown when starting the script you should restart it for it to function correctly:

`[cds] - mocking IntegrationContent.sap.hci.api { at: '/api' }`

See also: [FAQ](/docs/FAQ.md)

## How to Obtain Support

Please search or create a new Issue in this Github repository to obtain support.

## Contributing

Contributions are certainly welcome, see [ways to contribute](CONTRIBUTING.md).

## Code of Conduct

See [Our Code of Conduct](CODE_OF_CONDUCT.md).

## Licensing

Copyright 2021 SAP SE or an SAP affiliate company and migration-tool-for-cloud-integration contributors. Please see our [LICENSE](LICENSE) for copyright and license information.
