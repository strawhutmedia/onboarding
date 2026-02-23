/**
 * Straw Hut Media — Google Apps Script Backend
 *
 * SETUP INSTRUCTIONS:
 * 1. Go to https://script.google.com and create a new project
 * 2. Paste this entire file into the Code.gs editor
 * 3. Click Deploy > New deployment
 * 4. Select "Web app" as the type
 * 5. Set "Execute as" to "Me"
 * 6. Set "Who has access" to "Anyone"
 * 7. Click Deploy and authorize the app
 * 8. Copy the Web App URL and paste it into config.js as SHM_UPLOAD_ENDPOINT
 *
 * This script handles:
 * - File uploads to Google Drive (base64 → Drive files with shareable links)
 * - Submission storage in Google Sheets (accessible from any device)
 * - Approved company list management (stored in Sheets)
 *
 * IMPORTANT: After deploying, you must RE-DEPLOY (Manage deployments > edit)
 * every time you change this code for the changes to take effect.
 */

// ---- Configuration ----
var ROOT_FOLDER_NAME = "Straw Hut Onboarding Uploads";
var SPREADSHEET_NAME = "Straw Hut Onboarding Data";
var SUBMISSIONS_SHEET = "Submissions";
var COMPANIES_SHEET = "Approved Companies";

// ============================================================
//  GET requests — read data
// ============================================================
function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "status";

    if (action === "getSubmissions") {
      return jsonResponse({ success: true, submissions: getAllSubmissions() });
    }

    if (action === "getCompanies") {
      return jsonResponse({ success: true, companies: getApprovedCompanies() });
    }

    // Default: health-check
    return jsonResponse({ status: "ok", message: "Straw Hut onboarding backend is running." });

  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

// ============================================================
//  POST requests — write data
// ============================================================
function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action || "upload";

    // ---- File upload (original functionality) ----
    if (action === "upload") {
      return handleFileUpload(payload);
    }

    // ---- Save a new submission ----
    if (action === "saveSubmission") {
      var id = saveSubmission(payload.data);
      return jsonResponse({ success: true, id: id });
    }

    // ---- Update an existing submission ----
    if (action === "updateSubmission") {
      updateSubmission(payload.id, payload.data);
      return jsonResponse({ success: true });
    }

    // ---- Delete a submission ----
    if (action === "deleteSubmission") {
      deleteSubmission(payload.id);
      return jsonResponse({ success: true });
    }

    // ---- Add approved company ----
    if (action === "addCompany") {
      var added = addCompany(payload.name);
      return jsonResponse({ success: true, added: added, companies: getApprovedCompanies() });
    }

    // ---- Remove approved company ----
    if (action === "removeCompany") {
      removeCompany(payload.name);
      return jsonResponse({ success: true, companies: getApprovedCompanies() });
    }

    return jsonResponse({ success: false, error: "Unknown action: " + action });

  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

// ============================================================
//  File Upload Handler (original functionality preserved)
// ============================================================
function handleFileUpload(payload) {
  var company = payload.company || "Unknown";
  var files = payload.files || [];
  var category = payload.category || "general";

  if (files.length === 0) {
    return jsonResponse({ success: true, files: [] });
  }

  var rootFolder = getOrCreateFolder(null, ROOT_FOLDER_NAME);
  var companyFolder = getOrCreateFolder(rootFolder, company);
  var categoryFolder = getOrCreateFolder(companyFolder, category);

  var results = [];

  for (var i = 0; i < files.length; i++) {
    var file = files[i];
    var fileName = file.name || ("file_" + i);
    var mimeType = file.type || "application/octet-stream";
    var base64Data = file.dataUrl || "";

    // Strip the data URL prefix (e.g., "data:image/png;base64,")
    var commaIdx = base64Data.indexOf(",");
    if (commaIdx > -1) {
      base64Data = base64Data.substring(commaIdx + 1);
    }

    if (!base64Data) {
      results.push({ name: fileName, error: "No file data" });
      continue;
    }

    var blob = Utilities.newBlob(Utilities.base64Decode(base64Data), mimeType, fileName);
    var driveFile = categoryFolder.createFile(blob);
    driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    var fileId = driveFile.getId();
    results.push({
      name: fileName,
      type: mimeType,
      driveId: fileId,
      viewUrl: "https://drive.google.com/file/d/" + fileId + "/view",
      thumbUrl: "https://drive.google.com/thumbnail?id=" + fileId + "&sz=w400"
    });
  }

  return jsonResponse({ success: true, files: results });
}

// ============================================================
//  Submissions — Google Sheets CRUD
// ============================================================

/**
 * Save a submission as a new row. Returns a unique ID.
 */
function saveSubmission(data) {
  var sheet = getOrCreateSheet(SUBMISSIONS_SHEET);
  var id = Utilities.getUuid();
  data._id = id;
  data._savedAt = new Date().toISOString();

  // Store the whole submission as JSON in column B, with ID in column A and company in column C for quick reference
  var row = [id, JSON.stringify(data), data.company || "", data.submittedAt || data._savedAt];
  sheet.appendRow(row);
  return id;
}

/**
 * Get all submissions.
 */
function getAllSubmissions() {
  var sheet = getSheet(SUBMISSIONS_SHEET);
  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  var submissions = [];

  // Skip header row if present
  var startRow = 0;
  if (data.length > 0 && data[0][0] === "ID") startRow = 1;

  for (var i = startRow; i < data.length; i++) {
    try {
      var jsonStr = data[i][1];
      if (jsonStr) {
        var sub = JSON.parse(jsonStr);
        sub._rowIndex = i + 1; // 1-based row number for updates
        submissions.push(sub);
      }
    } catch (e) {
      // Skip malformed rows
    }
  }

  return submissions;
}

/**
 * Update a submission by its ID.
 */
function updateSubmission(id, newData) {
  var sheet = getSheet(SUBMISSIONS_SHEET);
  if (!sheet) return;

  var data = sheet.getDataRange().getValues();
  for (var i = 0; i < data.length; i++) {
    if (data[i][0] === id) {
      // Merge existing data with updates
      var existing = {};
      try { existing = JSON.parse(data[i][1]); } catch (e) {}
      for (var key in newData) {
        if (newData.hasOwnProperty(key)) {
          existing[key] = newData[key];
        }
      }
      existing._id = id;
      existing._updatedAt = new Date().toISOString();
      sheet.getRange(i + 1, 2).setValue(JSON.stringify(existing));
      sheet.getRange(i + 1, 3).setValue(existing.company || "");
      return;
    }
  }
}

/**
 * Delete a submission by its ID.
 */
function deleteSubmission(id) {
  var sheet = getSheet(SUBMISSIONS_SHEET);
  if (!sheet) return;

  var data = sheet.getDataRange().getValues();
  for (var i = data.length - 1; i >= 0; i--) {
    if (data[i][0] === id) {
      sheet.deleteRow(i + 1);
      return;
    }
  }
}

// ============================================================
//  Companies — Google Sheets CRUD
// ============================================================

function getApprovedCompanies() {
  var sheet = getSheet(COMPANIES_SHEET);
  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  var companies = [];
  var startRow = 0;
  if (data.length > 0 && data[0][0] === "Company Name") startRow = 1;

  for (var i = startRow; i < data.length; i++) {
    if (data[i][0]) companies.push(data[i][0].toString());
  }
  return companies;
}

function addCompany(name) {
  if (!name || !name.trim()) return false;
  name = name.trim();

  var companies = getApprovedCompanies();
  var isDuplicate = companies.some(function (c) {
    return c.toLowerCase() === name.toLowerCase();
  });
  if (isDuplicate) return false;

  var sheet = getOrCreateSheet(COMPANIES_SHEET);
  sheet.appendRow([name, new Date().toISOString()]);
  return true;
}

function removeCompany(name) {
  var sheet = getSheet(COMPANIES_SHEET);
  if (!sheet) return;

  var data = sheet.getDataRange().getValues();
  for (var i = data.length - 1; i >= 0; i--) {
    if (data[i][0] && data[i][0].toString().toLowerCase() === name.toLowerCase()) {
      sheet.deleteRow(i + 1);
      return;
    }
  }
}

// ============================================================
//  Helpers
// ============================================================

function getOrCreateFolder(parent, name) {
  var folders;
  if (parent) {
    folders = parent.getFoldersByName(name);
  } else {
    folders = DriveApp.getFoldersByName(name);
  }
  if (folders.hasNext()) return folders.next();
  if (parent) return parent.createFolder(name);
  return DriveApp.createFolder(name);
}

/**
 * Get or create the master spreadsheet, then get or create a sheet tab.
 */
function getOrCreateSheet(sheetName) {
  var ss = getOrCreateSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (sheet) return sheet;

  sheet = ss.insertSheet(sheetName);

  // Add header row
  if (sheetName === SUBMISSIONS_SHEET) {
    sheet.appendRow(["ID", "JSON Data", "Company", "Submitted At"]);
    sheet.setFrozenRows(1);
  } else if (sheetName === COMPANIES_SHEET) {
    sheet.appendRow(["Company Name", "Added At"]);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function getSheet(sheetName) {
  var ss = getOrCreateSpreadsheet();
  return ss.getSheetByName(sheetName);
}

function getOrCreateSpreadsheet() {
  // Look for existing spreadsheet by name
  var files = DriveApp.getFilesByName(SPREADSHEET_NAME);
  if (files.hasNext()) {
    return SpreadsheetApp.open(files.next());
  }
  // Create new
  var ss = SpreadsheetApp.create(SPREADSHEET_NAME);
  // Remove the default "Sheet1" if other sheets exist
  return ss;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
