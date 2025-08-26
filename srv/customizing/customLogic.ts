import {
    extAccessPolicy,
    extArtifactReference,
    extConfiguration,
    extCustomTagConfiguration,
    extDataStore,
    extDataStoreEntry,
    extIntegrationPackage,
    extJMSBroker,
    extNumberRange,
    extOAuth2ClientCredential,
    extUserCredential,
    TKeyValuePair
} from "#cds-models/migrationtool"

export default class CustomLogic {
    customConfiguration: Record<string, any>
    Logger: Function
    Warning: Function
    Error: Function

    constructor(config: string, logger: Function, warning: Function, error: Function) {
        try {
            this.customConfiguration = JSON.parse(config)
        } catch (e: any) {
            logger(1, 'Could not parse custom configuration of Task: ' + String(e))
            this.customConfiguration = {}
        }
        this.Logger = logger    // usage: await this.Logger(indent || 0, 'my log text')
        this.Warning = warning  // usage: await this.Warning('Number Range', item.Name, 'This is a custom warning for this number range')
        this.Error = error      // usage: await this.Error('Number Range', item.Name, 'This is a custom error for this number range')
    }

    onMigrateSAPPackage = async (item: extIntegrationPackage): Promise<extIntegrationPackage> => {
        if (this.customConfiguration.subscription_suffix && this.customConfiguration.subscription_suffix.length > 0) {
            // item.Id = item.Id + '.' + this.customConfiguration.subscription_suffix
            // above is NOT possible yet without changes in the ValMaps etc.
        }
        return item
    }
    /**
     * Mutates the provided item via custom coding
     * @param item information about the integration package
     * @param base64Data base64 of the binary content
     * @returns the base64 of the mutated object
     */
    onMigrateCustomPackage = async (item: extIntegrationPackage, base64Data: string): Promise<string> => {
        // not much we can do here as we can't change the zip binary
        return base64Data
    }
    /**
     * Mutates the provided item via custom coding
     * @param item
     */
    onMigrateConfiguration = async (item: extConfiguration): Promise<void> => {
        if (this.customConfiguration.name_prefix && item.ParameterKey == 'sourceURL') { // the name of the parameter might be different from its name in the design tool!
            item.ParameterValue = this.customConfiguration.name_prefix + item.ParameterValue
        }
    }
    /**
     * Mutates the provided item via custom coding
     * @param item
     */
    onMigrateNumberRange = async (item: extNumberRange): Promise<void> => {
        this.customConfiguration.name_prefix && (item.Name = this.customConfiguration.name_prefix + item.Name)
        item.MinValue = item.CurrentValue
        await this.Logger(3, 'Number Range has been set to initial value: ' + item.CurrentValue)
    }
    /**
     * Mutates the provided items via custom coding
     * @param items 
     */
    onMigrateCustomTagConfigurations = async (items: extCustomTagConfiguration[]): Promise<void> => {
        this.customConfiguration.name_prefix && (items.forEach(item => item.tagName = this.customConfiguration.name_prefix + item.tagName))
    }
    /**
     * Mutates the provided item via custom coding
     * @param item 
     */
    onMigrateUserCredential = async (item: extUserCredential): Promise<void> => {
        this.customConfiguration.name_prefix && (item.Name = this.customConfiguration.name_prefix + item.Name)
    }
    /**
     * Mutates the provided item via custom coding
     * @param item 
     */
    onMigrateOAuth2ClientCredential = async (item: extOAuth2ClientCredential): Promise<void> => {
        this.customConfiguration.name_prefix && (item.Name = this.customConfiguration.name_prefix + item.Name)
    }
    /**
     * Mutates the provided item via custom coding
     * @param item 
     */
    onMigrateAccessPolicy = async (item: extAccessPolicy): Promise<void> => {
        this.customConfiguration.name_prefix && (item.RoleName = this.customConfiguration.name_prefix + item.RoleName)
    }
    /**
     * Mutates the provided item via custom coding
     * @param item 
     */
    onMigrateAccessPolicyReference = async (item: extArtifactReference): Promise<void> => {
        this.customConfiguration.name_prefix && (item.Name = this.customConfiguration.name_prefix + item.Name)
    }
    /**
     * Mutates the provided item via custom coding
     * @param item
     */
    onMigrateGlobalVariable = async (item: TKeyValuePair): Promise<void> => {
        this.customConfiguration.name_prefix && (item.key = this.customConfiguration.name_prefix + item.key)
    }
    /**
     * Mutates the provided item via custom coding
     * @param item 
     */
    onMigrateLocalVariable = async (item: TKeyValuePair): Promise<void> => {
        this.customConfiguration.name_prefix && (item.key = this.customConfiguration.name_prefix + item.key)
    }
    /**
     * Mutates the provided item via custom coding
     * @param item 
     */
    onMigrateJMSBroker = async (item: extJMSBroker): Promise<void> => { }

    /**
     * Read the script file in custom coding
     * @param file technical filename in the package
     * @param artifact name of the script file
     * @param script (readonly) script contents
     */
    onMigrateScript = async (file: string, artifact: string, script: string): Promise<void> => {
        // Note: script variable is readonly!
        const re = /(system\.getenv\(.*\))/gmi //or any other string you are looking for
        const matches = script.match(re)
        if (matches && matches.length > 0) {
            await this.Logger(3, 'Script lines in ' + artifact + ':')
            matches.forEach(async (x) => await this.Logger(4, file + ' contains line: ' + x))
        }
    }

    /**
     * Mutates the provided items via custom coding
     * @param store Contains the data store information
     * @param entries Contains an array of objects part of the data store (store property changes need to be done on the store object)
     */
    onMigrateDataStore = async (store: extDataStore, entries: extDataStoreEntry[]): Promise<void> => {
        this.customConfiguration.name_prefix && (store.DataStoreName = this.customConfiguration.name_prefix + store.DataStoreName)
    }
}
