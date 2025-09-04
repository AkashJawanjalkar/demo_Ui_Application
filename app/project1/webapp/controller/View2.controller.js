sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/ui/table/Table",
    "sap/ui/table/Column"
], function (Controller, MessageToast, JSONModel, MessageBox, Table, Column) {
    "use strict";

    return Controller.extend("project1.controller.View2", {

        onInit: function () {
            // Preview data + view state
            var oViewModel = new JSONModel({
                data: [],
                isFileUploaded: false   // <-- add this flag
            });

            this.getView().setModel(oViewModel, "preview");
            this.getView().setModel(oViewModel, "viewModel"); // bind for button
            this._selectedFile = null;
        },

        onDownloadSample: function () {
            var sampleData = [
                { "BatchNo": "B001", "ComponentCode": "CMP@01", "PackingSite": "SITE01", "PackingDate": "01/09/2025", "ReleaseDate": "05/09/2025", "Comments": "Sample comment" },
                { "BatchNo": "B002", "ComponentCode": "CMP#O2", "PackingSite": "SITE02", "PackingDate": "02/09/2025", "ReleaseDate": "06/09/2025", "Comments": "Sample comment 2" }
            ];

            if (typeof XLSX === "undefined") {
                var that = this;
                $.getScript("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js")
                    .done(function () { that._generateSampleExcel(sampleData); })
                    .fail(function () { MessageToast.show("Failed to load XLSX library!"); });
            } else {
                this._generateSampleExcel(sampleData);
            }
        },

        _generateSampleExcel: function (data) {
            var wb = XLSX.utils.book_new();
            var ws = XLSX.utils.json_to_sheet(data);
            XLSX.utils.book_append_sheet(wb, ws, "SampleData");
            XLSX.writeFile(wb, "SampleData.xlsx");
            MessageToast.show("Sample Excel downloaded!");
        },

        onFileChange: function (oEvent) {
            var aFiles = oEvent.getParameter("files");
            if (!aFiles || aFiles.length === 0) {
                MessageToast.show("No file selected");
                this._selectedFile = null;
                return;
            }
            this._selectedFile = aFiles[0];
        },

        onUploadPress: function () {
            if (!this._selectedFile) {
                MessageToast.show("Please choose a file first");
                return;
            }

            var that = this;
            if (typeof XLSX === "undefined") {
                $.getScript("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js")
                    .done(function () { that._readExcel(that._selectedFile); })
                    .fail(function () { MessageToast.show("Failed to load XLSX library!"); });
            } else {
                this._readExcel(this._selectedFile);
            }
        },

        _readExcel: function (oFile) {
            var that = this;
            var reader = new FileReader();



            // Clear old data before reading new file
            var oModel = that.getView().getModel("preview");
            oModel.setProperty("/data", []);
            that.byId("previewTable").setVisible(false);
            that.getView().getModel("viewModel").setProperty("/isFileUploaded", false);

            reader.onload = function (e) {
                var data = new Uint8Array(e.target.result);
                var workbook = XLSX.read(data, { type: "array" });
                var firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                var jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });

                // Validations
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

                var batchCol = "BatchNo",
                    compCol = "ComponentCode",
                    siteCol = "PackingSite",
                    packDateCol = "PackingDate",
                    relDateCol = "ReleaseDate",
                    commentsCol = "Comments";


                jsonData.forEach(function (row) {
                    var rowErrors = [];

                    var batchVal = (row[batchCol] || "").toString().trim();
                    var compVal = (row[compCol] || "").toString().trim();
                    var siteVal = (row[siteCol] || "").toString().trim();
                    var packDateVal = (row[packDateCol] || "").toString().trim();
                    var relDateVal = (row[relDateCol] || "").toString().trim();

                    // Batch Number
                    console.log("Batch Value:", batchVal);  // Debugging
                    if (!batchVal) {
                        rowErrors.push("Batch Number is required.");
                    } else if (!/^[a-zA-Z0-9]+$/.test(batchVal)) {
                        rowErrors.push("Batch Number must be alphanumeric");
                    }


                    // Component Code
                    if (!compVal) {
                        rowErrors.push("Component Code is required.");
                    } else if (!/^[a-zA-Z0-9@#\\-_\\/]*$/.test(compVal)) {
                        rowErrors.push("Component Code contains invalid characters.");
                    }

                    // Packing Site
                    if (!siteVal) {
                        rowErrors.push("Packing Site ID is required.");
                    } else if (!/^[a-zA-Z0-9]*$/.test(siteVal)) {
                        rowErrors.push("Packing Site ID must be alphanumeric.");
                    }

                    // Dates
                    if (!packDateVal && !relDateVal) {
                        rowErrors.push("At least one of Packing Date or Release Date");
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



                var oModel = that.getView().getModel("preview");
                oModel.setProperty("/data", processedData);

                var oTable = that.byId("previewTable");
                oTable.setModel(oModel, "preview");

                // ✅ sap.ui.table.Table → bindRows
                oTable.bindRows("preview>/data");
                oTable.setVisible(true);

                that.getView().getModel("viewModel").setProperty("/isFileUploaded", true);
                MessageToast.show("File processed with validations!");
            };

            reader.readAsArrayBuffer(oFile);
        }
        ,

        onDownloadUploadedData: function () {
            var oModel = this.getView().getModel("preview");
            if (!oModel || !oModel.getData().data.length) {
                MessageToast.show("No data available to download");
                return;
            }

            var data = oModel.getData().data;
            if (typeof XLSX === "undefined") {
                var that = this;
                $.getScript("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js")
                    .done(function () { that._generateUploadedDataExcel(data); })
                    .fail(function () { MessageToast.show("Failed to load XLSX library!"); });
            } else {
                this._generateUploadedDataExcel(data);
            }
        },

        _generateUploadedDataExcel: function (data) {
            var wb = XLSX.utils.book_new();
            var ws = XLSX.utils.json_to_sheet(data);
            XLSX.utils.book_append_sheet(wb, ws, "UploadedData");
            XLSX.writeFile(wb, "UploadedData.xlsx");
            MessageToast.show("Uploaded data downloaded!");
        },




        onReset: function () {
    // Clear uploaded file and table
    this._selectedFile = null;

    var oPreviewModel = this.getView().getModel("preview");
    oPreviewModel.setProperty("/data", []);
    
    var oViewModel = this.getView().getModel("viewModel");
    oViewModel.setProperty("/isFileUploaded", false);

    // Hide table
    this.byId("previewTable").setVisible(false);

    // Disable Submit button
    this.byId("submitBtn").setEnabled(false);

    MessageToast.show("Form reset successfully!");
},

onSubmitData: function () {
    var oPreviewModel = this.getView().getModel("preview");
    var aData = oPreviewModel.getProperty("/data");

    if (!aData || aData.length === 0) {
        MessageToast.show("No data to submit!");
        return;
    }

    // Example: filter out rows with errors before submission
    var validData = aData.filter(function (row) {
        return !row.Error || row.Error.trim() === "";
    });

    if (validData.length === 0) {
        MessageBox.error("All rows have errors. Please fix them before submitting.");
        return;
    }

    // TODO: Implement actual submission logic (e.g., OData, REST API)
    MessageToast.show(validData.length + " rows submitted successfully!");

    // After submit, optionally reset the form
    this.onReset();
},

    });
});