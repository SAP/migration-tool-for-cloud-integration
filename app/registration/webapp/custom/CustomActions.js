sap.ui.define([
    "sap/ui/core/Core",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/m/library"
], function (Core, MessageToast, MessageBox, library) {
    return {
        isEditing: function (oBindingContext) {
            return oBindingContext?.sPath?.match(/(IsActiveEntity=false)/) != null ?? false;
        },
        setValues: function () {
            const requireValidJSON = (text, required = []) => {
                var isValid = text.length > 0;
                try {
                    const json = JSON.parse(text);
                    for (const require of required) {
                        isValid = isValid && json['oauth'][require].length > 0;
                    }
                } catch (e) { isValid = false }
                return isValid;
            };

            const environmentField = '#registration\\:\\:TenantsObjectPage--fe\\:\\:FormContainer\\:\\:FieldGroup\\:\\:Basic_type\\:\\:FormElement\\:\\:DataField\\:\\:Environment\\:\\:Field-edit-inner-inner';
            if (document.querySelector(environmentField).value == 'Neo') {
                MessageBox.warning('Importing JSON configuration is only possible for Cloud Foundry tenants. Please set Environment to \'Cloud Foundry\' first');
            } else {
                this.oInputJSONDialog = new library.Dialog({
                    type: library.DialogType.Message,
                    title: "Import Settings",
                    content: [
                        new library.Label({
                            text: "Paste here the JSON configuration of your Service Key",
                            labelFor: "inputJSON"
                        }),
                        new library.TextArea("inputJSON", {
                            width: "100%",
                            rows: 10,
                            placeholder: "\\{\n  \"oauth\": \\{\n     \"clientid\":     \"...\",\n     \"clientsecret\": \"...\",\n     \"tokenurl\":     \"...\",\n     \"url\":          \"...\"\n  \\}\n\\}",
                            liveChange: function (oEvent) {
                                const sText = oEvent.getParameter("value");
                                const isValid = requireValidJSON(sText, [
                                    'url',
                                    'tokenurl',
                                    'clientid',
                                    'clientsecret'
                                ]);
                                this.oInputJSONDialog.getBeginButton().setEnabled(isValid);
                                oEvent.getSource().setValueState(isValid ? sap.ui.core.ValueState.None : sap.ui.core.ValueState.Error);
                            }.bind(this)
                        })
                    ],
                    beginButton: new library.Button({
                        type: library.ButtonType.Emphasized,
                        text: "Import",
                        enabled: false,
                        press: function () {
                            const regexHost = /^https:\/\/([^\/]*)/;
                            const imported = JSON.parse(Core.byId("inputJSON").getValue());
                            const values = [
                                {
                                    field: '#registration\\:\\:TenantsObjectPage--fe\\:\\:FormContainer\\:\\:FieldGroup\\:\\:Connection_gen\\:\\:FormElement\\:\\:DataField\\:\\:Host\\:\\:Field-edit-inner',
                                    value: imported.oauth.url.match(regexHost)[1]
                                },
                                {
                                    field: '#registration\\:\\:TenantsObjectPage--fe\\:\\:FormContainer\\:\\:FieldGroup\\:\\:Connection_auth\\:\\:FormElement\\:\\:DataField\\:\\:Token_host\\:\\:Field-edit-inner',
                                    value: imported.oauth.tokenurl.match(regexHost)[1]
                                },
                                {
                                    field: '#registration\\:\\:TenantsObjectPage--fe\\:\\:FormContainer\\:\\:FieldGroup\\:\\:Connection_auth\\:\\:FormElement\\:\\:DataField\\:\\:Oauth_clientid\\:\\:Field-edit-inner',
                                    value: imported.oauth.clientid
                                },
                                {
                                    field: '#registration\\:\\:TenantsObjectPage--fe\\:\\:FormContainer\\:\\:FieldGroup\\:\\:Connection_auth\\:\\:FormElement\\:\\:DataField\\:\\:Oauth_secret\\:\\:Field-edit-inner',
                                    value: imported.oauth.clientsecret
                                },
                                {
                                    field: '#registration\\:\\:TenantsObjectPage--fe\\:\\:FormContainer\\:\\:FieldGroup\\:\\:Basic_type\\:\\:FormElement\\:\\:DataField\\:\\:Environment\\:\\:Field-edit-inner-inner',
                                    value: 'Cloud Foundry'
                                }
                            ];
                            values.forEach(e => {
                                document.querySelector(e.field).focus();
                                document.querySelector(e.field).value = e.value;
                                document.querySelector(e.field).blur();
                            });
                            MessageToast.show("Import successful");
                            Core.byId("inputJSON").setValue('');
                            this.oInputJSONDialog.close();
                        }.bind(this)
                    }),
                    endButton: new library.Button({
                        text: "Cancel",
                        press: function () {
                            this.oInputJSONDialog.close();
                        }.bind(this)
                    }),
                    afterClose: function () {
                        this.destroy();
                    }
                });
                this.oInputJSONDialog.open();
            }
        },
        downloadTenants: function () { return window.open('/downloadTenants', 'blank') },
        downloadDatabase: function () { return window.open('/downloadDatabase', 'blank') }
    };
});