/**
 * Straw Hut Media — Google Apps Script File Upload Handler
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
 * This script:
 * - Receives file uploads (base64) from the onboarding form
 * - Creates a folder per company in your Google Drive
 * - Saves each file and makes it viewable via link
 * - Returns the shareable Google Drive links
 */

// Name of the root folder in your Google Drive
var ROOT_FOLDER_NAME = "Straw Hut Onboarding Uploads";

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var company = payload.company || "Unknown";
    var files = payload.files || [];
    var category = payload.category || "general";

    // Get or create the root folder
    var rootFolder = getOrCreateFolder(null, ROOT_FOLDER_NAME);

    // Get or create the company subfolder
    var companyFolder = getOrCreateFolder(rootFolder, company);

    // Get or create the category subfolder (brand, logo, inspo, music)
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

      // Decode base64 and create the file in Drive
      var blob = Utilities.newBlob(Utilities.base64Decode(base64Data), mimeType, fileName);
      var driveFile = categoryFolder.createFile(blob);

      // Make it viewable by anyone with the link
      driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      var fileId = driveFile.getId();
      var viewUrl = "https://drive.google.com/file/d/" + fileId + "/view";
      var thumbUrl = "https://drive.google.com/thumbnail?id=" + fileId + "&sz=w400";

      results.push({
        name: fileName,
        type: mimeType,
        driveId: fileId,
        viewUrl: viewUrl,
        thumbUrl: thumbUrl
      });
    }

    return ContentService
      .createTextOutput(JSON.stringify({ success: true, files: results }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: "ok", message: "Straw Hut upload endpoint is running." }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Gets an existing folder by name inside a parent, or creates it.
 * If parent is null, searches in the root of My Drive.
 */
function getOrCreateFolder(parent, name) {
  var folders;
  if (parent) {
    folders = parent.getFoldersByName(name);
  } else {
    folders = DriveApp.getFoldersByName(name);
  }

  if (folders.hasNext()) {
    return folders.next();
  }

  if (parent) {
    return parent.createFolder(name);
  } else {
    return DriveApp.createFolder(name);
  }
}
