/**
 * Straw Hut Media — Onboarding Configuration
 */

/* Notification email — submissions are sent here via FormSubmit.co */
var SHM_NOTIFICATION_EMAIL = "onboarding@strawhutmedia.com";

/*
 * Google Drive upload endpoint (Google Apps Script Web App URL).
 * See google-apps-script.gs for setup instructions.
 * After deploying, paste your Web App URL below.
 */
var SHM_UPLOAD_ENDPOINT = "";

/* Approved Companies (managed via Admin Portal) */
var APPROVED_COMPANIES = (function () {
  var STORAGE_KEY = "shm_approved_companies";
  var fallback = [
    "Acme Corp",
    "Example Company",
    "Demo Client",
  ];

  try {
    var stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      var parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) { /* ignore */ }

  return fallback;
})();
