sap.ui.define([
    "sap/ui/core/Core",
    "sap/ui/layout/VerticalLayout",
    "sap/m/library"
], function (Core, VerticalLayout, library) {
    const interval = 1500;
    return {
        enabledForSingleSelect: function (oBindingContext, aSelectedContexts) {
            return (aSelectedContexts && aSelectedContexts.length === 1);
        },
        startGetIntegrationContent: function (oEvent, aSelectedContexts) {
            this.context = oEvent || aSelectedContexts[0];
            const that = this;

            this.progressDialog = new library.Dialog({
                type: library.DialogType.Message,
                title: "Progress",
                contentWidth: "600px",
                contentHeight: "200px",
                content: [
                    new VerticalLayout("vl", {
                        width: "100%",
                        content: [
                            new library.Text("textTop", { text: "Initializing ..." }),
                            new library.ProgressIndicator("progressPackages", {
                                displayValue: "0%",
                                displayOnly: true,
                                percentValue: 0
                            }),
                            new library.Text("textBottom1", { text: "" }),
                            new library.Text("textBottom2", { text: "" })
                        ]
                    }).addStyleClass('sapUiContentPadding')
                ],
                endButton: new library.Button("btnClose", {
                    text: "Close",
                    visible: false,
                    press: function () {
                        this.progressDialog.close();
                    }.bind(this)
                }),
                escapeHandler: function (oPromise) {
                    oPromise.reject();
                },
                afterClose: function () {
                    that.timeout && clearTimeout(that.timeout);
                    this.destroy();
                }
            });
            this.setProgressStatus = function (value, top, bottom1, bottom2) {
                Core.byId("progressPackages").setDisplayValue(value + "%");
                Core.byId("progressPackages").setPercentValue(+value);
                Core.byId("textTop").setText(top);
                Core.byId("textBottom1").setText(bottom1);
                Core.byId("textBottom2").setText(bottom2);
            };
            this.refresh = function () {
                $.ajax({
                    // url: "/odata/v4/config/getIntegrationContentStatus()",
                    url: `${that.getModel().getServiceUrl()}getIntegrationContentStatus()`,
                    type: "GET",
                    success: data => {
                        if (!data.ErrorState) {
                            if (data.Running) {
                                that.setProgressStatus(data.Progress, `Downloading content for ${data.Tenant} ...`, data.Topic, data.Item);
                                that.timeout = setTimeout(that.refresh, interval);
                            } else {
                                that.setProgressStatus(100, `Downloading content for ${data.Tenant} ...`, data.Topic, data.Item);
                                that.editFlow.invokeAction("ConfigService.Tenant_getIntegrationContentRefresh", { contexts: that.context })
                                    .then(r => {
                                        Core.byId("progressPackages").setState('Success');
                                        Core.byId("btnClose").setVisible(true);
                                    });
                            }
                        } else {
                            Core.byId("progressPackages").setState('Error');
                            Core.byId("textBottom1").setText('Unexpected error: ' + data.Item);
                            Core.byId("btnClose").setVisible(true);
                        }
                    },
                    error: (request, status, error) => {
                        Core.byId("progressPackages").setState('Error');
                        Core.byId("textBottom1").setText(status);
                        Core.byId("btnClose").setVisible(true);
                    }
                });
            }
            this.editFlow.invokeAction("ConfigService.Tenant_getIntegrationContent", { contexts: this.context })
                .then(r => {
                    this.progressDialog.open();
                    that.refresh();
                });
        }
    }
});