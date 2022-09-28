class CustomLogic {
    constructor(config, logger, warning, error) {
        this.customConfiguration = JSON.parse(config);
        this.Logger = logger; // usage: await this.Logger(indent || 0, 'my log text')
        this.Warning = warning; // usage: await this.Warning('Number Range', item.Name, 'This is a custom warning for this number range')
        this.Error = error; // usage: await this.Error('Number Range', item.Name, 'This is a custom error for this number range')
    };
    onMigrateSAPPackage = async (item) => {
        if (this.customConfiguration.subscription_suffix && this.customConfiguration.subscription_suffix.length > 0) {
            // item.Id = item.Id + '.' + this.customConfiguration.subscription_suffix;
            // above is not possible yet without changes in the ValMaps etc.
        }
        return item;
    };
    onMigrateCustomPackage = async (item, itemBinary) => {
        // not much we can do here as we can't change the zip binary
        return itemBinary;
    };
    onMigrateConfiguration = async (item) => {
        if (this.customConfiguration.name_prefix && item.ParameterKey == 'sourceURL') { // the name of the parameter might be different from its name in the design tool!
            item.ParameterValue = this.customConfiguration.name_prefix + item.ParameterValue;
        }
    };
    onMigrateNumberRange = async (item) => {
        this.customConfiguration.name_prefix && (item.Name = this.customConfiguration.name_prefix + item.Name);
        item.MinValue = item.CurrentValue;
        await this.Logger(3, 'Number Range has been set to initial value: ' + item.CurrentValue);

        // await this.Warning('Number Range', item.Name, 'This is a custom warning for this number range');
        // await this.Error('Number Range', item.Name, 'This is a custom error for this number range');
    };
    onMigrateCustomTagConfigurations = async (items) => {
        this.customConfiguration.name_prefix && (items.forEach(item => item.tagName = this.customConfiguration.name_prefix + item.tagName));
    };
    onMigrateUserCredential = async (item) => {
        this.customConfiguration.name_prefix && (item.Name = this.customConfiguration.name_prefix + item.Name);
    };
    onMigrateOAuth2ClientCredential = async (item) => {
        this.customConfiguration.name_prefix && (item.Name = this.customConfiguration.name_prefix + item.Name);
    };
    onMigrateAccessPolicy = async (item) => {
        this.customConfiguration.name_prefix && (item.RoleName = this.customConfiguration.name_prefix + item.RoleName);
    };
    onMigrateAccessPolicyReference = async (item) => {
        this.customConfiguration.name_prefix && (item.Name = this.customConfiguration.name_prefix + item.Name);
    };
    onMigrateGlobalVariable = async (item) => {
        this.customConfiguration.name_prefix && (item.key = this.customConfiguration.name_prefix + item.key);
    };
    onMigrateLocalVariable = async (item) => {
        this.customConfiguration.name_prefix && (item.key = this.customConfiguration.name_prefix + item.key);
    };

    onMigrateJMSBroker = async (item) => { };
    // onMigrateValMapSchema= async(item) => { };
    // onMigrateCustomCertificate=async (item) => { };

    onMigrateScript = async (file, artifact, script /* script is read-only */) => {
        const re = /(system\.getenv\(.*\))/gmi //or any other string you are looking for
        const matches = script.match(re);
        if (matches && matches.length > 0) {
            await this.Logger(3, 'Script lines in ' + artifact + ':');
            matches.forEach(async (x) => await this.Logger(4, file + ' contains line: ' + x));
        }
    };

    onMigrateDataStore = async (store, entries) => {
        // 'store' contains the data store information
        // 'entries' contains an array of objects part of the data store (store property changes need to be done on the store object)
        // sample data:
        //
        // store = {
        //     DataStoreName: 'MyDS01',
        //     IntegrationFlow: '',
        //     Type: '',
        //     Visibility: 'Global',
        //     NumberOfMessages: '1',
        //     NumberOfOverdueMessages: '1',
        //     Entries: {}
        // }
        //
        // entries = [
        //     {
        //       Id: 'myentry56',
        //       DataStoreName: 'MyDS01',
        //       IntegrationFlow: '',
        //       Type: '',
        //       Status: 'Overdue',
        //       MessageId: 'AGMV9MLP7WEtNX45R9ktnck0d2VI',
        //       DueAt: '/Date(1662556098586)/',
        //       CreatedAt: '/Date(1662383298586)/',
        //       RetainUntil: '/Date(1664975298586)/',
        //       content: {
        //         headers: [],
        //         body: 'This is a test message in the datastore. global'
        //       }
        //     }
        //   ]

        this.customConfiguration.name_prefix && (store.DataStoreName = this.customConfiguration.name_prefix + store.DataStoreName);
    }
};
module.exports = { CustomLogic: CustomLogic };
