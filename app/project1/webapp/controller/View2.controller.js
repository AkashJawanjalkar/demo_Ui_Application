sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox"
], function (Controller, MessageToast, JSONModel, MessageBox) {
    "use strict";

    return Controller.extend("project1.controller.View2", {

        onInit: function () {
            // Data models
            this.getView().setModel(new JSONModel({ data: [] }), "preview");
            this.getView().setModel(new JSONModel({ isFileUploaded: false }), "viewModel");
            this.getView().setModel(new JSONModel({}), "edit");      // for edit dialog
            this.getView().setModel(new JSONModel({ PackingSite: "" }), "app"); // route param holder

            this._selectedFile = null;
            this._editRowPath = "";

            // Listen to RouteView2
            this.getOwnerComponent().getRouter()
                .getRoute("RouteView2")
                .attachPatternMatched(this._onRouteMatched, this);
        },

        // Route handler — read query param ?site=... and store in "app" model
        _onRouteMatched: function (oEvent) {
            // Reset the screen (but keep the app model itself)
            this.onReset();

            var oArgs = oEvent.getParameter("arguments") || {};
            var oQuery = oArgs["?query"] || {};
            var sPackingSite = oQuery.site || "";

            this.getView().getModel("app").setProperty("/PackingSite", sPackingSite);
            // Useful for debugging:
            // console.log("Selected Packing Site:", sPackingSite);
        },

        onDownloadSample: function () {
            var sSite = this.getView().getModel("app").getProperty("/PackingSite") || "";
            var sampleData = [
                { "BatchNo": "B001", "ComponentCode": "CMP@01", "PackingSite": sSite || "SITE01", "PackingDate": "01/09/2025", "ReleaseDate": "05/09/2025", "Comments": "Sample comment" },
                { "BatchNo": "B002", "ComponentCode": "CMP#02", "PackingSite": sSite || "SITE02", "PackingDate": "02/09/2025", "ReleaseDate": "06/09/2025", "Comments": "Sample comment 2" }
            ];

            var fnGenerate = function () {
                var wb = XLSX.utils.book_new();
                var ws = XLSX.utils.json_to_sheet(sampleData);
                XLSX.utils.book_append_sheet(wb, ws, "SampleData");
                XLSX.writeFile(wb, "SampleData.xlsx");
                MessageToast.show("Sample Excel downloaded!");
            };

            if (typeof XLSX === "undefined") {
                $.getScript("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js")
                    .done(fnGenerate)
                    .fail(function () { MessageToast.show("Failed to load XLSX library!"); });
            } else {
                fnGenerate();
            }
        },

        onFileChange: function (oEvent) {
            var aFiles = oEvent.getParameter("files");
            this._selectedFile = (aFiles && aFiles.length > 0) ? aFiles[0] : null;
            if (!this._selectedFile) {
                MessageToast.show("No file selected");
            }
        },

        onUploadPress: function () {
            if (!this._selectedFile) {
                MessageToast.show("Please choose a file first");
                return;
            }
            var that = this;
            var fnRead = function () { that._readExcel(that._selectedFile); };

            if (typeof XLSX === "undefined") {
                $.getScript("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js")
                    .done(fnRead)
                    .fail(function () { MessageToast.show("Failed to load XLSX library!"); });
            } else {
                fnRead();
            }
        },

        _readExcel: function (oFile) {
            var that = this;
            var reader = new FileReader();

            // Reset preview state before reading
            this.getView().getModel("preview").setProperty("/data", []);
            this.getView().getModel("viewModel").setProperty("/isFileUploaded", false);

            var oTable = this.byId("previewTable");
            oTable.setVisible(false);
            oTable.unbindRows();

            reader.onload = function (e) {
                var data = new Uint8Array(e.target.result);
                var workbook = XLSX.read(data, { type: "array" });
                var firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                var jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });

                // Validation: row count
                if (jsonData.length > 2500) {
                    MessageBox.error("Maximum 2500 rows are allowed per upload.");
                    return;
                }
                if (jsonData.length === 0) {
                    MessageBox.error("Excel must have at least one row of data!");
                    return;
                }

                var processedData = [];
                var dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
                var sSelectedSite = that.getView().getModel("app").getProperty("/PackingSite") || "";

                jsonData.forEach(function (row) {
                    var rowErrors = [];

                    var batchVal = (row["BatchNo"] || "").trim();
                    var compVal = (row["ComponentCode"] || "").trim();

                    // Always override/inject the PackingSite from View1 selection
                    row["PackingSite"] = sSelectedSite;

                    var packDateVal = (row["PackingDate"] || "").trim();
                    var relDateVal = (row["ReleaseDate"] || "").trim();

                    // Batch Number
                    if (!batchVal) {
                        rowErrors.push("Batch Number is required.");
                    }

                    // Component Code
                    if (!compVal) {
                        rowErrors.push("Component Code is required.");
                    } else if (!/^[a-zA-Z0-9@#\-_\/]*$/.test(compVal)) {
                        rowErrors.push("Component Code contains invalid characters.");
                    }

                    // Packing Site (now injected)
                    if (!sSelectedSite) {
                        rowErrors.push("Packing Site ID is required (from previous screen).");
                    } else if (!/^[a-zA-Z0-9]*$/.test(sSelectedSite)) {
                        rowErrors.push("Packing Site ID must be alphanumeric.");
                    }

                    // Dates
                    if (!packDateVal && !relDateVal) {
                        rowErrors.push("At least one of Packing Date or Release Date required.");
                    }
                    if (packDateVal && !dateRegex.test(packDateVal)) {
                        rowErrors.push("Packing Date must be DD/MM/YYYY.");
                    }
                    if (relDateVal && !dateRegex.test(relDateVal)) {
                        rowErrors.push("Release Date must be DD/MM/YYYY.");
                    }

                    row["Error"] = rowErrors.join(", ");
                    processedData.push(row);
                });

                //  Duplicate check (ignore "Comments" for comparison)
                var seen = {};
                processedData.forEach(function (row, index) {
                    var key = [
                        row["BatchNo"],
                        row["ComponentCode"],
                        row["PackingSite"],
                        row["PackingDate"],
                        row["ReleaseDate"]
                    ].join("|");

                    if (!seen[key]) {
                        seen[key] = [];
                    }

                    // Check if any existing row with same key also has same Comments
                    var isExactDuplicate = seen[key].some(function (existingRow) {
                        return (existingRow["Comments"] || "").trim().toLowerCase() === (row["Comments"] || "").trim().toLowerCase();
                    });

                    if (isExactDuplicate) {
                        row["Error"] = (row["Error"] ? row["Error"] + ", " : "") + "Duplicate record";
                    } else {
                        seen[key].push(row);
                    }
                });




                // Update model + bind table
                that.getView().getModel("preview").setProperty("/data", processedData);

                oTable.bindRows("preview>/data");
                oTable.setVisible(true);

                // Properly refresh binding so the table lays out correctly
                var oBinding = oTable.getBinding("rows");
                if (oBinding) {
                    oBinding.refresh(true);
                }

                that.getView().getModel("viewModel").setProperty("/isFileUploaded", true);
                MessageToast.show("File processed with validations!");
            };

            reader.readAsArrayBuffer(oFile);
        },

        onDownloadUploadedData: function () {
            var oData = this.getView().getModel("preview").getProperty("/data");
            if (!oData || oData.length === 0) {
                MessageToast.show("No data available to download");
                return;
            }

            var fnGenerate = function () {
                var wb = XLSX.utils.book_new();
                var ws = XLSX.utils.json_to_sheet(oData);
                XLSX.utils.book_append_sheet(wb, ws, "UploadedData");
                XLSX.writeFile(wb, "UploadedData.xlsx");
                MessageToast.show("Uploaded data downloaded!");
            };

            if (typeof XLSX === "undefined") {
                $.getScript("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js")
                    .done(fnGenerate)
                    .fail(function () { MessageToast.show("Failed to load XLSX library!"); });
            } else {
                fnGenerate();
            }
        },

        onReset: function () {
            this._selectedFile = null;
            this._editRowPath = "";

            this.getView().getModel("preview").setProperty("/data", []);
            this.getView().getModel("viewModel").setProperty("/isFileUploaded", false);
            this.getView().getModel("edit").setData({});

            var oTable = this.byId("previewTable");
            if (oTable) {
                oTable.unbindRows();
                oTable.setVisible(false);
                var oBinding = oTable.getBinding("rows");
                if (oBinding) { oBinding.refresh(true); }
            }

            var oFileUploader = this.byId("fileUploader");
            if (oFileUploader) {
                // Full reset of the browse field
                oFileUploader.clear && oFileUploader.clear();
                oFileUploader.setValue("");
                oFileUploader.setValueState("None");
            }

            // Do NOT wipe the "app" model here (it holds the selected PackingSite from View1)
            MessageToast.show("Form reset successfully!");
        },

        // ===== Editing Logic =====
        onEditRowPress: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("preview");
            if (!oContext) {
                MessageToast.show("No row selected");
                return;
            }

            var oRowData = Object.assign({}, oContext.getObject());
            this._editRowPath = oContext.getPath(); // e.g., "/data/3"

            this.getView().getModel("edit").setData(oRowData);
            this.byId("editDialog").open();
        },

        onEditCancel: function () {
            this.byId("editDialog").close();
        },

        onEditSave: function () {
            var oEdit = this.getView().getModel("edit").getData();
            var oPreviewModel = this.getView().getModel("preview");

            if (!this._editRowPath) {
                MessageToast.show("Could not determine row to save");
                return;
            }

            // Validation (all fields)
            var dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
            var errors = [];

            if (!oEdit.BatchNo) {
                errors.push("Batch Number is required.");
            }
            if (!oEdit.ComponentCode) {
                errors.push("Component Code is required.");
            } else if (!/^[a-zA-Z0-9@#\-_\/]*$/.test(oEdit.ComponentCode)) {
                errors.push("Component Code contains invalid characters.");
            }

            if (!oEdit.PackingSite) {
                errors.push("Packing Site ID is required.");
            } else if (!/^[a-zA-Z0-9]*$/.test(oEdit.PackingSite)) {
                errors.push("Packing Site ID must be alphanumeric.");
            }

            if (!oEdit.PackingDate && !oEdit.ReleaseDate) {
                errors.push("At least one of Packing Date or Release Date required.");
            }
            if (oEdit.PackingDate && !dateRegex.test(oEdit.PackingDate)) {
                errors.push("Packing Date must be DD/MM/YYYY.");
            }
            if (oEdit.ReleaseDate && !dateRegex.test(oEdit.ReleaseDate)) {
                errors.push("Release Date must be DD/MM/YYYY.");
            }

            oEdit.Error = errors.join(", ");

            // Persist all fields
            ["BatchNo", "ComponentCode", "PackingSite", "PackingDate", "ReleaseDate", "Comments", "Error"].forEach(function (field) {
                oPreviewModel.setProperty(this._editRowPath + "/" + field, oEdit[field] || "");
            }, this);

            // Refresh table binding
            var oTable = this.byId("previewTable");
            var oBinding = oTable.getBinding("rows");
            if (oBinding) {
                oBinding.refresh(true);
            }

            this.byId("editDialog").close();
            MessageToast.show("Row updated");
        },

        onSubmitData: function () {
            var aData = this.getView().getModel("preview").getProperty("/data");

            if (!aData || aData.length === 0) {
                MessageToast.show("No data to submit!");
                return;
            }

            var validData = aData.filter(function (row) {
                return !row.Error || row.Error.trim() === "";
            });

            if (validData.length === 0) {
                MessageBox.error("All rows have errors. Please fix them before submitting.");
                return;
            }

            // TODO: Replace with actual OData / API call
            MessageToast.show(validData.length + " rows submitted successfully!");
            this.onReset();
        }

    });
});
