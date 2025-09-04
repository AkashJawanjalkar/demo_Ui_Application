sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast"
], function (Controller, MessageToast) {
    "use strict";

    return Controller.extend("project1.controller.View1", {

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
         this.getOwnerComponent().getRouter().navTo("RouteView2");
          }


    });
});
