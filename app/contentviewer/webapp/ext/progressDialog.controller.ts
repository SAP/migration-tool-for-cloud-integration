import ControllerExtension from 'sap/ui/core/mvc/ControllerExtension'
import ExtensionAPI from 'sap/fe/core/ExtensionAPI'

import Event from 'sap/ui/base/Event'
import ODataModel from 'sap/ui/model/odata/v4/ODataModel'
import JSONModel from 'sap/ui/model/json/JSONModel'
import V4Context from 'sap/ui/model/odata/v4/Context'
import CoreElement from 'sap/ui/core/Element'
import jQuery from 'sap/ui/thirdparty/jquery'

import Button from 'sap/m/Button'
import Dialog from 'sap/m/Dialog'
import { ButtonType, DialogType } from 'sap/m/library'
import MessageBox from 'sap/m/MessageBox'
import ProgressIndicator from 'sap/m/ProgressIndicator'
import Text from 'sap/m/Text'
import VerticalLayout from 'sap/ui/layout/VerticalLayout'

import { TIntegrationContentStatus } from '#cds-models/migrationtool'

const interval = 1500
const checkboxeNames = [
    'getIntegrationPackages',
    'getKeyStoreEntries',
    'getUserCredentials',
    'getOAuth2ClientCredentials',
    'getCertificateUserMappings',
    'getDataStores',
    'getVariables',
    'getNumberRanges',
    'getCustomTagConfigurations',
    'getAccessPolicies',
    'getJMSBrokers'
]

/**
 * @namespace contentviewer.ext
 * @controller
 */
export default class progressDialog extends ControllerExtension {
    static overrides = {
        onInit(): void { }
    }
    base = { getExtensionAPI: () => new ExtensionAPI }

    timeout?: NodeJS.Timeout
    serviceUrl?: string
    context?: V4Context
    progressDialog?: Dialog
    selectionDialog?: Promise<Dialog>

    public enabledForSingleSelect(oBindingContext?: V4Context, aSelectedContexts?: V4Context[]): boolean {
        return aSelectedContexts?.length == 1 || false
    }

    public openSelectionDialog(oEvent: Event, aSelectedContexts: V4Context[]) {
        this.context = aSelectedContexts[0] || oEvent
        this.serviceUrl = (this.getView()?.getModel() as ODataModel)?.getServiceUrl();

        (this.base.getExtensionAPI().loadFragment({
            id: "selectContentDialog",
            name: "contentviewer.ext.selectContent",
            controller: this,
            initialBindingContext: this.context
        }) as Promise<Dialog>)
            .then(dialog => {
                dialog.attachEventOnce("afterClose", () => {
                    dialog.destroy()
                })
                dialog.setModel(
                    new JSONModel({
                        // Include:
                        getIntegrationPackages_include: true,
                        getKeyStoreEntries_include: true,
                        getUserCredentials_include: true,
                        getOAuth2ClientCredentials_include: true,
                        getCertificateUserMappings_include: true,
                        getDataStores_include: true,
                        getVariables_include: true,
                        getNumberRanges_include: true,
                        getCustomTagConfigurations_include: true,
                        getAccessPolicies_include: true,
                        getJMSBrokers_include: true,
                        // Discover:
                        getIntegrationPackages_discover: false,
                        getKeyStoreEntries_discover: false,
                        getUserCredentials_discover: false,
                        getOAuth2ClientCredentials_discover: false,
                        getCertificateUserMappings_discover: false,
                        getDataStores_discover: false,
                        getVariables_discover: false,
                        getNumberRanges_discover: false,
                        getCustomTagConfigurations_discover: false,
                        getAccessPolicies_discover: false
                    }),
                    'selection')
                dialog.open()
            })
            .catch(err => {
                throw err
            })
    }
    public closeSelectionDialog(oEvent: Event) {
        const dialog = oEvent.getSource().getEventingParent() as Dialog
        dialog.close()
    }
    public onClickAll(oEvent: Event) {
        const dialog = oEvent.getSource().getEventingParent() as Dialog
        const oModel = dialog.getModel('selection') as JSONModel
        checkboxeNames.forEach(x => oModel.setProperty(`/${x}_include`, true))
        checkboxeNames.forEach(x => oModel.setProperty(`/${x}_discover`, false))
    }
    public onClickNew(oEvent: Event) {
        const dialog = oEvent.getSource().getEventingParent() as Dialog
        const oModel = dialog.getModel('selection') as JSONModel
        checkboxeNames.forEach(x => oModel.setProperty(`/${x}_include`, true))
        checkboxeNames.forEach(x => oModel.setProperty(`/${x}_discover`, true))
    }
    public onClickNone(oEvent: Event) {
        const dialog = oEvent.getSource().getEventingParent() as Dialog
        const oModel = dialog.getModel('selection') as JSONModel
        checkboxeNames.forEach(x => oModel.setProperty(`/${x}_include`, false))
        checkboxeNames.forEach(x => oModel.setProperty(`/${x}_discover`, false))
    }
    public async submitSelectionDialog(oEvent: Event) {
        const dialog = oEvent.getSource().getEventingParent() as Dialog
        const data = (dialog.getModel('selection') as JSONModel).getData() as Record<string, boolean | string[]>

        const count = checkboxeNames.reduce((p, c: keyof typeof data) => p += data[`${c}_include`] == true ? 1 : 0, 0)
        if (count == 0) {
            MessageBox.error('No items selected', { title: 'Error' })
            return
        }

        dialog.setBusy(true)

        if (data.getIntegrationPackages_discover)
            data.getIntegrationPackages_filter = await this.getExpandedDataIdentifiers('toIntegrationPackages', 'Id')
        if (data.getUserCredentials_discover)
            data.getUserCredentials_filter = await this.getExpandedDataIdentifiers('toUserCredentials', 'Name')
        if (data.getKeyStoreEntries_discover)
            data.getKeyStoreEntries_filter = await this.getExpandedDataIdentifiers('toKeyStoreEntries', 'Alias')
        if (data.getOAuth2ClientCredentials_discover)
            data.getOAuth2ClientCredentials_filter = await this.getExpandedDataIdentifiers('toOAuth2ClientCredentials', 'Name')
        if (data.getCertificateUserMappings_discover)
            data.getCertificateUserMappings_filter = await this.getExpandedDataIdentifiers('toCertificateUserMappings', 'Id')
        if (data.getNumberRanges_discover)
            data.getNumberRanges_filter = await this.getExpandedDataIdentifiers('toNumberRanges', 'Name')
        if (data.getAccessPolicies_discover)
            data.getAccessPolicies_filter = await this.getExpandedDataIdentifiers('toAccessPolicies', 'Id')
        if (data.getVariables_discover)
            data.getVariables_filter = await this.getExpandedDataIdentifiers('toVariables', 'VariableName')
        if (data.getDataStores_discover)
            data.getDataStores_filter = await this.getExpandedDataIdentifiers('toDataStores', 'DataStoreName')
        if (data.getCustomTagConfigurations_discover)
            data.getCustomTagConfigurations_filter = await this.getExpandedDataIdentifiers('toCustomTagConfigurations', 'tagName')

        this.createProgressDialog()
        this.base.getExtensionAPI()
            .getEditFlow()
            .invokeAction(`ConfigService.getSelectedIntegrationContent`, {
                contexts: this.context,
                parameterValues: [
                    { name: 'filter', value: data }
                ],
                skipParameterDialog: true
            })
            .then((): void => {
                this.progressDialog?.open()
                this.refreshProgressStatus()
            })
            .catch(err => {
                if (this.timeout) clearTimeout(this.timeout)
                this.progressDialog?.close()
                this.progressDialog?.destroy()
                throw err
            })

        dialog.close()

    }
    private async getExpandedDataIdentifiers(association: string, key: string): Promise<string[]> {
        const data = await this.context?.requestObject(association) as Record<string, string>[]
        if (data) {
            return data.map(x => x[key]) || []
        } else {
            const context = this.context?.getModel()
                .bindContext(association, this.context, { $select: [key] })
                .getBoundContext() as V4Context
            const d = (await context?.requestObject() as { value: Record<string, string>[] }) || []
            return d?.value?.map(x => x[key]) || []
        }
    }

    public startGetIntegrationContent(oEvent: Event, aSelectedContexts: V4Context[]) {
        this.context = aSelectedContexts[0] || oEvent
        this.serviceUrl = (this.getView()?.getModel() as ODataModel)?.getServiceUrl()

        this.createProgressDialog()
        this.base.getExtensionAPI()
            .getEditFlow()
            .invokeAction(`ConfigService.getIntegrationContent`, { contexts: this.context })
            .then((): void => {
                this.progressDialog?.open()
                this.refreshProgressStatus()
            })
            .catch(err => {
                if (this.timeout) clearTimeout(this.timeout)
                this.progressDialog?.close()
                this.progressDialog?.destroy()
                throw err
            })
    }

    private createProgressDialog() {
        if (!this.progressDialog)
            this.progressDialog = new Dialog({
                type: DialogType.Message,
                title: 'Progress',
                contentWidth: '600px',
                contentHeight: '200px',
                content: [
                    new VerticalLayout('vl', {
                        width: '100%',
                        content: [
                            new Text('textTop', { text: 'Initializing ...' }),
                            new ProgressIndicator('progressPackages', {
                                displayValue: '0%',
                                displayOnly: true,
                                percentValue: 0
                            }),
                            new Text('textBottom1', { text: '' }),
                            new Text('textBottom2', { text: '' })
                        ]
                    }).addStyleClass('sapUiContentPadding')
                ],
                buttons: [
                    new Button('btnRefresh', {
                        text: 'Try Refresh Status',
                        visible: false,
                        type: ButtonType.Success,
                        tooltip: 'Trigger the progress status request again after it has failed (e.g. browser / internet disruption).',
                        press: (): void => {
                            this.coreById<Button>('btnClose').setVisible(false)
                            this.coreById<Button>('btnRefresh').setVisible(false)
                            this.coreById<ProgressIndicator>('progressPackages').setState('None')
                            this.refreshProgressStatus()
                        }
                    }),
                    new Button('btnClose', {
                        text: 'Close',
                        visible: false,
                        press: (): void => {
                            this.progressDialog?.close()
                        }
                    })
                ],
                escapeHandler: function (oPromise): void {
                    // https://github.com/SAP/ui5-typescript/issues/502
                    (oPromise as { resolve: () => void; reject: () => void }).reject()
                },
                afterClose: (): void => {
                    if (this.timeout) clearTimeout(this.timeout)
                    this.progressDialog?.destroy()
                    this.progressDialog = undefined
                }
            })
    }

    private coreById<T>(id: string): T {
        return CoreElement.getElementById(id) as T
    }

    private setProgressStatus(value: number, top: string, bottom1: string, bottom2: string): void {
        this.coreById<ProgressIndicator>('progressPackages').setDisplayValue(value + '%')
        this.coreById<ProgressIndicator>('progressPackages').setPercentValue(+value)
        this.coreById<Text>('textTop').setText(top)
        this.coreById<Text>('textBottom1').setText(bottom1)
        this.coreById<Text>('textBottom2').setText(bottom2)
    }

    private refreshProgressStatus(): void {
        jQuery.ajax({
            url: this.serviceUrl + 'getIntegrationContentStatus()',
            type: 'GET',
            success: (data: TIntegrationContentStatus) => {
                if (!data.ErrorState) {
                    if (data.Running) {
                        this.setProgressStatus(data.Progress!, `Downloading content for ${data.Tenant} ...`, data.Topic!, data.Item!)
                        this.timeout = setTimeout(this.refreshProgressStatus.bind(this), interval)
                    } else {
                        this.setProgressStatus(100, `Downloading content for ${data.Tenant} ...`, data.Topic!, data.Item!)
                        this.base.getExtensionAPI()
                            .getEditFlow()
                            .invokeAction('ConfigService.getIntegrationContentRefresh', { contexts: this.context })
                            .then((): void => {
                                this.coreById<ProgressIndicator>('progressPackages').setState('Success')
                                this.coreById<Button>('btnClose').setVisible(true)
                            })
                            .catch(err => { throw err })
                    }
                } else {
                    this.coreById<ProgressIndicator>('progressPackages').setState('Error')
                    this.coreById<Text>('textBottom1').setText('Unexpected error: ' + data.Item)
                    this.coreById<Button>('btnClose').setVisible(true)
                }
            },
            error: (request, status, error): void => {
                console.error(error)
                this.coreById<ProgressIndicator>('progressPackages').setState('Error')
                this.coreById<Text>('textBottom1').setText('Error: ' + error)
                this.coreById<Button>('btnClose').setVisible(true)
                this.coreById<Button>('btnRefresh').setVisible(true)
            }
        })
    }

}
