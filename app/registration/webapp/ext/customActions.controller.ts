import ControllerExtension from 'sap/ui/core/mvc/ControllerExtension'

import V4Context from 'sap/ui/model/odata/v4/Context'
import { ValueState } from 'sap/ui/core/library'
import CoreElement from 'sap/ui/core/Element'

import { ButtonType, DialogType } from 'sap/m/library'
import Button from 'sap/m/Button'
import Dialog from 'sap/m/Dialog'
import Label from 'sap/m/Label'
import MessageBox from 'sap/m/MessageBox'
import MessageToast from 'sap/m/MessageToast'
import TextArea, { TextArea$LiveChangeEvent } from 'sap/m/TextArea'

const placeholderText = "\\{\n  \"oauth\": \\{\n     \"clientid\":     \"...\",\n     \"clientsecret\": \"...\",\n     \"tokenurl\":     \"...\",\n     \"url\":          \"...\"\n  \\}\n\\}"

type TServiceKey = {
    oauth: {
        clientid: string
        clientsecret: string
        tokenurl: string
        url: string
    }
}

/**
 * @namespace registration.ext
 * @controller
*/
export default class customActions extends ControllerExtension {
    static overrides = {
        onInit(): void { }
    }

    inputDialog?: Dialog

    public downloadTenants(): Window | null {
        return window.open('/downloadTenants', 'blank')
    }

    public downloadDatabase(): Window | null {
        return window.open('/downloadDatabase', 'blank')
    }

    public isLocalDeployment(): boolean {
        const regex = /.*(.com|.cloud|.net|.sap)$/
        const hostname = window.location.hostname
        const isCloud = regex.test(hostname)

        console.info(`Deployed on '${hostname}', so Dev Tools menu is ${isCloud ? 'disabled' : 'enabled'}.`)
        return !isCloud
    }

    public isEditing(oBindingContext?: V4Context): boolean {
        if (oBindingContext) {
            return oBindingContext.getPath().match(/(IsActiveEntity=false)/) != null
        }
        return false
    }

    public setValues() {
        if (!document) return

        const environmentField = '#registration\\:\\:TenantsObjectPage--fe\\:\\:FormContainer\\:\\:FieldGroup\\:\\:Basic_type\\:\\:FormElement\\:\\:DataField\\:\\:Environment\\:\\:Field-edit-inner-inner'
        if (this.querySelector(environmentField).value == 'Neo') {
            MessageBox.warning('Importing JSON configuration is only possible for Cloud Foundry tenants. Please set Environment to \'Cloud Foundry\' first')
        } else {
            this.inputDialog = new Dialog({
                type: DialogType.Message,
                title: 'Import Settings',
                content: [
                    new Label({
                        text: 'Paste here the JSON configuration of your Service Key',
                        labelFor: 'inputJSON'
                    }),
                    new TextArea('inputJSON', {
                        width: '100%',
                        rows: 10,
                        placeholder: placeholderText,
                        liveChange: (oEvent: TextArea$LiveChangeEvent): void => {
                            const sText = oEvent.getParameter('value') ?? ''
                            const isValid = this.isValidJson(sText, [
                                'url',
                                'tokenurl',
                                'clientid',
                                'clientsecret'
                            ])
                            this.inputDialog?.getBeginButton().setEnabled(isValid)
                            oEvent.getSource().setValueState(isValid ? ValueState.None : ValueState.Error)
                        }
                    })
                ],
                beginButton: new Button({
                    type: ButtonType.Emphasized,
                    text: 'Import',
                    enabled: false,
                    press: (): void => {
                        this.copyValues()
                        this.coreById<TextArea>('inputJSON').setValue('')
                        MessageToast.show('Import successful')
                        this.inputDialog?.close()
                    }
                }),
                endButton: new Button({
                    text: 'Cancel',
                    press: (): void => {
                        this.inputDialog?.close()
                    }
                }),
                afterClose: (): void => {
                    this.inputDialog?.destroy()
                }
            })
            this.inputDialog.open()
        }
    }

    private isValidJson(json: string, requiredProperties: (keyof TServiceKey['oauth'])[]): boolean {
        let isValid = (json.length > 0)
        try {
            const parsed = JSON.parse(json) as TServiceKey
            requiredProperties.forEach(p => {
                const hasValue = parsed?.oauth?.[p]?.length > 0
                if (!hasValue) console.warn(`Missing value for property 'oauth/${p}'`)
                isValid = isValid && hasValue
            })
        } catch (e) {
            console.warn(String(e))
            isValid = false
        }
        return isValid
    }

    private copyValues() {
        const regexHost = /^https:\/\/([^/]*)/
        const imported = JSON.parse(this.coreById<TextArea>('inputJSON').getValue()) as TServiceKey
        const values = [
            {
                field: '#registration\\:\\:TenantsObjectPage--fe\\:\\:FormContainer\\:\\:FieldGroup\\:\\:Connection_gen\\:\\:FormElement\\:\\:DataField\\:\\:Host\\:\\:Field-edit-inner',
                value: imported.oauth?.url?.match(regexHost)?.at(1)
            },
            {
                field: '#registration\\:\\:TenantsObjectPage--fe\\:\\:FormContainer\\:\\:FieldGroup\\:\\:Connection_auth\\:\\:FormElement\\:\\:DataField\\:\\:Token_host\\:\\:Field-edit-inner',
                value: imported.oauth?.tokenurl?.match(regexHost)?.at(1)
            },
            {
                field: '#registration\\:\\:TenantsObjectPage--fe\\:\\:FormContainer\\:\\:FieldGroup\\:\\:Connection_auth\\:\\:FormElement\\:\\:DataField\\:\\:Oauth_clientid\\:\\:Field-edit-inner',
                value: imported.oauth?.clientid
            },
            {
                field: '#registration\\:\\:TenantsObjectPage--fe\\:\\:FormContainer\\:\\:FieldGroup\\:\\:Connection_auth\\:\\:FormElement\\:\\:DataField\\:\\:Oauth_secret\\:\\:Field-edit-inner',
                value: imported.oauth?.clientsecret
            },
            {
                field: '#registration\\:\\:TenantsObjectPage--fe\\:\\:FormContainer\\:\\:FieldGroup\\:\\:Basic_type\\:\\:FormElement\\:\\:DataField\\:\\:Environment\\:\\:Field-edit-inner-inner',
                value: 'Cloud Foundry'
            }
        ]
        values.forEach(e => {
            this.querySelector(e.field).focus()
            this.querySelector(e.field).value = e.value!
            this.querySelector(e.field).blur()
        })
    }

    private coreById<T>(id: string): T { return CoreElement.getElementById(id) as T }
    private querySelector(id: string): HTMLInputElement { return document.querySelector(id) as HTMLInputElement }

}