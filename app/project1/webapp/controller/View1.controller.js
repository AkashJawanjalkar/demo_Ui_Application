sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast"
], function (Controller, MessageToast) {
    "use strict";

    return Controller.extend("project1.controller.View1", {
        onInit: function () {
            // Attach route matched event
            this.getOwnerComponent().getRouter().getRoute("RouteView1")
                .attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            // Reset input box
            this.byId("siteInput").setValue("");

            // Reset table selection (if needed)
            var oTable = this.byId("siteTable");
            if (oTable) {
                oTable.removeSelections();
            }
        },

        // when user clicks F4 help
        onValueHelpRequest: function () {
            this.byId("siteDialog").open();
        },

        // when user presses OK
        onDialogOk: function () {
            var oTable = this.byId("siteTable");
            var oSelected = oTable.getSelectedItem();

            if (oSelected) {
                var oCells = oSelected.getCells();
                var sSiteId = oCells[0].getText();   // First column (Site ID)
                var sSiteName = oCells[1].getText(); // Second column (Site Name)

                // Set value into Input box
                this.byId("siteInput").setValue(sSiteId);

                // Optional toast message
                MessageToast.show("Selected: " + sSiteId + " - " + sSiteName);
            }

            this.byId("siteDialog").close();
        },

        onDialogCancel: function () {
            this.byId("siteDialog").close();
        },

        onSubmitPress: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            var sPackingSite = this.byId("siteInput").getValue();

    if (!sPackingSite) {
        sap.m.MessageToast.show("Please select a Packing Site");
        return;
    }
            this.getOwnerComponent().getRouter().navTo("RouteView2",{
        query: {
            site: sPackingSite
        }
    });
        }
    });
});
