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
    onMigrateJMSBroker = async (item) => { };
    // onMigrateValMapSchema= async(item) => { };
    // onMigrateCustomCertificate=async (item) => { };
};
module.exports = { CustomLogic: CustomLogic };
