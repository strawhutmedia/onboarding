/* ============================================
   Straw Hut Media — Admin Portal
   ============================================ */

(function () {
  "use strict";

  var STORAGE_KEY = "shm_approved_companies";
  var SUBS_KEY = "shm_submissions";
  var CREDENTIALS = {
    username: "strawhutmedia",
    passwordHash: "a]T9#kP2x!mW"
  };

  // ---- DOM refs ----
  var loginScreen = document.getElementById("admin-login");
  var dashboard = document.getElementById("admin-dashboard");
  var usernameInput = document.getElementById("admin-username");
  var passwordInput = document.getElementById("admin-password");
  var loginBtn = document.getElementById("login-btn");
  var loginError = document.getElementById("login-error");
  var logoutBtn = document.getElementById("logout-btn");
  var newCompanyInput = document.getElementById("new-company");
  var addBtn = document.getElementById("add-company-btn");
  var addError = document.getElementById("add-error");
  var companyList = document.getElementById("company-list");
  var companyCount = document.getElementById("company-count");
  var emptyState = document.getElementById("empty-state");
  var submissionsList = document.getElementById("submissions-list");
  var submissionCount = document.getElementById("submission-count");
  var submissionsEmpty = document.getElementById("submissions-empty");

  // ---- Helpers ----
  function show(el) { el.classList.remove("hidden"); }
  function hide(el) { el.classList.add("hidden"); }

  function switchScreen(target) {
    [loginScreen, dashboard].forEach(function (s) {
      s.classList.remove("active");
    });
    target.classList.add("active");
  }

  // ---- Tabs ----
  var tabs = document.querySelectorAll(".admin-tab");
  var tabContents = document.querySelectorAll(".tab-content");

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      var target = tab.dataset.tab;
      tabs.forEach(function (t) { t.classList.remove("active"); });
      tabContents.forEach(function (tc) { tc.classList.remove("active"); });
      tab.classList.add("active");
      document.getElementById("tab-" + target).classList.add("active");
    });
  });

  // ---- Company storage ----
  function getCompanies() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) { /* ignore */ }
    return [];
  }

  function saveCompanies(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  // ---- Submissions storage ----
  function getSubmissions() {
    try {
      var stored = localStorage.getItem(SUBS_KEY);
      if (stored) {
        var parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) { /* ignore */ }
    return [];
  }

  function saveSubmissions(list) {
    localStorage.setItem(SUBS_KEY, JSON.stringify(list));
  }

  // ---- Auth ----
  function checkCredentials(username, password) {
    return username === CREDENTIALS.username && password === "$4ForLife";
  }

  loginBtn.addEventListener("click", function () {
    var user = usernameInput.value.trim();
    var pass = passwordInput.value;

    if (!user || !pass) {
      show(loginError);
      return;
    }

    if (checkCredentials(user, pass)) {
      hide(loginError);
      sessionStorage.setItem("shm_admin_auth", "1");
      switchScreen(dashboard);
      renderCompanies();
      renderSubmissions();
    } else {
      show(loginError);
    }
  });

  passwordInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); loginBtn.click(); }
  });
  usernameInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); loginBtn.click(); }
  });

  usernameInput.addEventListener("input", function () { hide(loginError); });
  passwordInput.addEventListener("input", function () { hide(loginError); });

  logoutBtn.addEventListener("click", function () {
    sessionStorage.removeItem("shm_admin_auth");
    usernameInput.value = "";
    passwordInput.value = "";
    switchScreen(loginScreen);
  });

  if (sessionStorage.getItem("shm_admin_auth") === "1") {
    switchScreen(dashboard);
    renderCompanies();
    renderSubmissions();
  }

  // ---- Company CRUD ----
  function renderCompanies() {
    var companies = getCompanies();
    companyCount.textContent = companies.length;
    companyList.innerHTML = "";

    if (companies.length === 0) {
      show(emptyState);
      return;
    }

    hide(emptyState);

    companies.forEach(function (name, idx) {
      var div = document.createElement("div");
      div.className = "company-item";
      div.innerHTML =
        '<span class="company-name">' + escapeHtml(name) + '</span>' +
        '<button class="company-remove" data-idx="' + idx + '" title="Remove">&times;</button>';
      companyList.appendChild(div);
    });

    companyList.querySelectorAll(".company-remove").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var idx = parseInt(btn.dataset.idx);
        var companies = getCompanies();
        companies.splice(idx, 1);
        saveCompanies(companies);
        renderCompanies();
      });
    });
  }

  addBtn.addEventListener("click", function () {
    addCompany();
  });

  newCompanyInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); addCompany(); }
  });

  newCompanyInput.addEventListener("input", function () {
    hide(addError);
    newCompanyInput.classList.remove("input-error");
  });

  function addCompany() {
    var name = newCompanyInput.value.trim();
    if (!name) {
      newCompanyInput.classList.add("input-error");
      return;
    }

    var companies = getCompanies();
    var duplicate = companies.some(function (c) {
      return c.toLowerCase() === name.toLowerCase();
    });

    if (duplicate) {
      addError.textContent = "\"" + name + "\" is already in the list.";
      show(addError);
      return;
    }

    companies.push(name);
    saveCompanies(companies);
    newCompanyInput.value = "";
    newCompanyInput.classList.remove("input-error");
    hide(addError);
    renderCompanies();
  }

  // ---- Submissions rendering ----
  function renderSubmissions() {
    var submissions = getSubmissions();
    submissionCount.textContent = submissions.length;
    submissionsList.innerHTML = "";

    if (submissions.length === 0) {
      show(submissionsEmpty);
      return;
    }

    hide(submissionsEmpty);

    // Sort by date descending (newest first)
    submissions.sort(function (a, b) {
      return new Date(b.submittedAt) - new Date(a.submittedAt);
    });

    submissions.forEach(function (sub, idx) {
      var card = document.createElement("div");
      card.className = "submission-card";

      var completeness = calcCompleteness(sub);
      var date = sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString("en-US", {
        year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
      }) : "Unknown date";

      var statusClass = completeness >= 80 ? "status-good" : completeness >= 50 ? "status-partial" : "status-low";

      card.innerHTML =
        '<div class="submission-header" data-idx="' + idx + '">' +
          '<div class="submission-info">' +
            '<strong class="submission-company">' + escapeHtml(sub.company || "Unknown Company") + '</strong>' +
            '<span class="submission-meta">' + escapeHtml((sub.contactFirstName || "") + " " + (sub.contactLastName || "")) + ' &middot; ' + escapeHtml(date) + '</span>' +
          '</div>' +
          '<div class="submission-right">' +
            '<span class="submission-completeness ' + statusClass + '">' + completeness + '% complete</span>' +
            '<span class="submission-toggle">&#9660;</span>' +
          '</div>' +
        '</div>' +
        '<div class="submission-details hidden" id="sub-details-' + idx + '">' +
          buildSubmissionDetails(sub, idx) +
          '<div class="submission-actions">' +
            '<button class="btn primary btn-sm save-sub" data-idx="' + idx + '">Save Changes</button>' +
            '<button class="btn secondary btn-sm resend-sub" data-idx="' + idx + '">Resend Email</button>' +
            '<button class="btn secondary btn-sm delete-sub" data-idx="' + idx + '">Delete</button>' +
          '</div>' +
          '<div class="submission-status hidden" id="sub-status-' + idx + '"></div>' +
        '</div>';

      submissionsList.appendChild(card);
    });

    // Toggle expand/collapse
    submissionsList.querySelectorAll(".submission-header").forEach(function (header) {
      header.addEventListener("click", function () {
        var idx = header.dataset.idx;
        var details = document.getElementById("sub-details-" + idx);
        var toggle = header.querySelector(".submission-toggle");
        if (details.classList.contains("hidden")) {
          details.classList.remove("hidden");
          toggle.innerHTML = "&#9650;";
        } else {
          details.classList.add("hidden");
          toggle.innerHTML = "&#9660;";
        }
      });
    });

    // Save buttons
    submissionsList.querySelectorAll(".save-sub").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var idx = parseInt(btn.dataset.idx);
        saveSubmissionEdits(idx);
      });
    });

    // Resend email buttons
    submissionsList.querySelectorAll(".resend-sub").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var idx = parseInt(btn.dataset.idx);
        // Save first, then resend
        saveSubmissionEdits(idx);
        resendEmail(idx);
      });
    });

    // Delete buttons
    submissionsList.querySelectorAll(".delete-sub").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var idx = parseInt(btn.dataset.idx);
        var subs = getSubmissions();
        // Re-sort to match display order
        subs.sort(function (a, b) {
          return new Date(b.submittedAt) - new Date(a.submittedAt);
        });
        subs.splice(idx, 1);
        saveSubmissions(subs);
        renderSubmissions();
      });
    });
  }

  // ---- Save edits from inline fields ----
  function saveSubmissionEdits(idx) {
    var subs = getSubmissions();
    subs.sort(function (a, b) {
      return new Date(b.submittedAt) - new Date(a.submittedAt);
    });

    var container = document.getElementById("sub-details-" + idx);
    var inputs = container.querySelectorAll("[data-field]");
    inputs.forEach(function (input) {
      var key = input.dataset.field;
      subs[idx][key] = input.value;
    });

    saveSubmissions(subs);
    showStatus(idx, "Changes saved.", "success");
  }

  // ---- Resend email notification ----
  function resendEmail(idx) {
    var subs = getSubmissions();
    subs.sort(function (a, b) {
      return new Date(b.submittedAt) - new Date(a.submittedAt);
    });
    var data = subs[idx];

    var notifyEl = document.getElementById("notify-email");
    var email = notifyEl ? notifyEl.textContent : "onboarding@strawhutmedia.com";
    var endpoint = "https://formsubmit.co/ajax/" + email;

    var body = "PODCAST ONBOARDING SUBMISSION (Resent from Admin)\n";
    body += "Company: " + (data.company || "Unknown") + "\n";
    body += "Originally Submitted: " + (data.submittedAt ? new Date(data.submittedAt).toLocaleString() : "Unknown") + "\n\n";

    body += "--- CONTACT INFORMATION ---\n";
    body += "Name: " + (data.contactFirstName || "") + " " + (data.contactLastName || "") + "\n";
    body += "Email: " + (data.contactEmail || "Not provided") + "\n";
    body += "Phone: " + (data.contactPhone || "Not provided") + "\n";
    body += "Role: " + (data.contactRole || "Not provided") + "\n";
    body += "Timezone: " + (data.contactTimezone || "Not provided") + "\n";
    body += "Preferred Contact: " + (data.preferredContact || "Not provided") + "\n\n";

    body += "--- PODCAST BASICS ---\n";
    body += "Podcast Name: " + (data.podcastName || "Not provided") + "\n";
    body += "Description: " + (data.podcastDescription || "Not provided") + "\n";
    body += "Status: " + (data.podcastStatus || "Not provided") + "\n";
    body += "Brand Status: " + (data.brandStatus || "Not provided") + "\n";
    body += "Genre: " + (data.podcastGenre || "Not provided") + "\n";
    body += "Format: " + (data.podcastFormat || "Not provided") + "\n";
    body += "Target Audience: " + (data.targetAudience || "Not provided") + "\n\n";

    body += "--- BRANDING ---\n";
    body += "Has Guidelines: " + (data.hasBrandGuidelines || "Not provided") + "\n";
    body += "Brand Colors: " + (data.brandColors || "Not provided") + "\n";
    body += "Fonts: " + (data.brandFonts || "Not provided") + "\n";
    body += "Voice/Tone: " + (data.brandVoice || "Not provided") + "\n\n";

    body += "--- INSPIRATION ---\n";
    body += "Podcasts Admired: " + (data.inspoPodcasts || "Not provided") + "\n";
    body += "Brands Admired: " + (data.inspoBrands || "Not provided") + "\n";
    body += "Visual Notes: " + (data.inspoNotes || "Not provided") + "\n\n";

    body += "--- MUSIC & AUDIO ---\n";
    body += "Needs Music: " + (data.needsMusic || "Not provided") + "\n";
    body += "Music Vibe: " + (data.musicVibe || "Not provided") + "\n";
    body += "Music References: " + (data.musicReferences || "Not provided") + "\n";
    body += "Sound Effects: " + (data.wantsSFX || "Not provided") + "\n\n";

    body += "--- SOCIAL MEDIA & WEB ---\n";
    body += "Website: " + (data.socialWebsite || "Not provided") + "\n";
    body += "Instagram: " + (data.socialInstagram || "Not provided") + "\n";
    body += "X (Twitter): " + (data.socialTwitter || "Not provided") + "\n";
    body += "TikTok: " + (data.socialTiktok || "Not provided") + "\n";
    body += "YouTube: " + (data.socialYoutube || "Not provided") + "\n";
    body += "LinkedIn: " + (data.socialLinkedin || "Not provided") + "\n";
    body += "Social Management: " + (data.manageSocial || "Not provided") + "\n";
    body += "Short-form Clips: " + (data.wantsClips || "Not provided") + "\n\n";

    body += "--- RECORDING & LOGISTICS ---\n";
    body += "Location: " + (data.recordingLocation || "Not provided") + "\n";
    if (data.locationAddress) body += "Address: " + data.locationAddress + "\n";
    body += "Frequency: " + (data.episodeFrequency || "Not provided") + "\n";
    body += "Episode Length: " + (data.episodeLength || "Not provided") + "\n";
    body += "Host(s): " + (data.hostsInfo || "Not provided") + "\n";
    body += "Guests: " + (data.hasGuests || "Not provided") + "\n";
    body += "Video: " + (data.isVideo || "Not provided") + "\n";
    body += "Launch Date: " + (data.launchDate || "Not provided") + "\n\n";

    body += "--- MARKETING & LAUNCH ---\n";
    body += "Launch Episodes: " + (data.launchEpisodes || "Not provided") + "\n";
    body += "Teaser Ideas: " + (data.teaserIdeas || "Not provided") + "\n";
    body += "Marketing Notes: " + (data.marketingNotes || "Not provided") + "\n";
    body += "Goals: " + (data.goals || "Not provided") + "\n\n";

    body += "--- ADDITIONAL ---\n";
    body += "Anything Else: " + (data.anythingElse || "Not provided") + "\n";

    var formData = new FormData();
    formData.append("_subject", "Onboarding (Resent): " + (data.company || "Unknown Company") + " — " + (data.podcastName || "Unnamed Podcast"));
    formData.append("Company", data.company || "");
    formData.append("Contact", (data.contactFirstName || "") + " " + (data.contactLastName || ""));
    formData.append("Email", data.contactEmail || "");
    formData.append("Phone", data.contactPhone || "");
    formData.append("Podcast Name", data.podcastName || "");
    formData.append("message", body);
    formData.append("_template", "box");

    showStatus(idx, "Sending email...", "info");

    fetch(endpoint, {
      method: "POST",
      body: formData,
      headers: { "Accept": "application/json" }
    }).then(function (res) {
      if (res.ok) {
        showStatus(idx, "Email sent successfully.", "success");
      } else {
        showStatus(idx, "Email failed (status " + res.status + "). Check the email address.", "error");
      }
    }).catch(function (err) {
      showStatus(idx, "Email error: " + err.message, "error");
    });
  }

  function showStatus(idx, message, type) {
    var el = document.getElementById("sub-status-" + idx);
    if (!el) return;
    el.textContent = message;
    el.className = "submission-status status-msg-" + type;
    el.classList.remove("hidden");
    if (type === "success") {
      setTimeout(function () { el.classList.add("hidden"); }, 3000);
    }
  }

  function calcCompleteness(sub) {
    var fields = [
      sub.contactFirstName, sub.contactLastName, sub.contactEmail,
      sub.contactPhone, sub.contactRole, sub.contactTimezone, sub.preferredContact,
      sub.podcastName, sub.podcastDescription, sub.podcastStatus, sub.brandStatus,
      sub.podcastGenre, sub.podcastFormat, sub.targetAudience,
      sub.hasBrandGuidelines, sub.brandColors, sub.brandFonts, sub.brandVoice,
      sub.inspoPodcasts, sub.inspoBrands,
      sub.needsMusic, sub.musicVibe,
      sub.socialWebsite, sub.socialInstagram,
      sub.recordingLocation, sub.episodeFrequency, sub.episodeLength, sub.hostsInfo,
      sub.hasGuests, sub.isVideo,
      sub.launchEpisodes, sub.teaserIdeas,
      sub.goals
    ];
    var filled = 0;
    fields.forEach(function (f) {
      if (f && f.toString().trim()) filled++;
    });
    return Math.round((filled / fields.length) * 100);
  }

  function buildSubmissionDetails(sub, idx) {
    var html = '<div class="sub-detail-grid">';

    html += sectionBlock("Contact Information", [
      ["First Name", "contactFirstName", sub.contactFirstName],
      ["Last Name", "contactLastName", sub.contactLastName],
      ["Email", "contactEmail", sub.contactEmail],
      ["Phone", "contactPhone", sub.contactPhone],
      ["Role", "contactRole", sub.contactRole],
      ["Timezone", "contactTimezone", sub.contactTimezone],
      ["Preferred Contact", "preferredContact", sub.preferredContact]
    ]);

    html += sectionBlock("Podcast Basics", [
      ["Podcast Name", "podcastName", sub.podcastName],
      ["Description", "podcastDescription", sub.podcastDescription, true],
      ["Status", "podcastStatus", sub.podcastStatus],
      ["Brand Status", "brandStatus", sub.brandStatus],
      ["Genre", "podcastGenre", sub.podcastGenre],
      ["Format", "podcastFormat", sub.podcastFormat],
      ["Target Audience", "targetAudience", sub.targetAudience, true]
    ]);

    html += sectionBlock("Branding", [
      ["Has Guidelines", "hasBrandGuidelines", sub.hasBrandGuidelines],
      ["Brand Colors", "brandColors", sub.brandColors],
      ["Fonts", "brandFonts", sub.brandFonts],
      ["Voice / Tone", "brandVoice", sub.brandVoice, true]
    ]);

    html += sectionBlock("Inspiration", [
      ["Podcasts Admired", "inspoPodcasts", sub.inspoPodcasts, true],
      ["Brands Admired", "inspoBrands", sub.inspoBrands, true],
      ["Visual Notes", "inspoNotes", sub.inspoNotes, true]
    ]);

    html += sectionBlock("Music & Audio", [
      ["Needs Music", "needsMusic", sub.needsMusic],
      ["Music Vibe", "musicVibe", sub.musicVibe, true],
      ["Music References", "musicReferences", sub.musicReferences, true],
      ["Sound Effects", "wantsSFX", sub.wantsSFX]
    ]);

    html += sectionBlock("Social Media & Web", [
      ["Website", "socialWebsite", sub.socialWebsite],
      ["Instagram", "socialInstagram", sub.socialInstagram],
      ["X (Twitter)", "socialTwitter", sub.socialTwitter],
      ["TikTok", "socialTiktok", sub.socialTiktok],
      ["YouTube", "socialYoutube", sub.socialYoutube],
      ["LinkedIn", "socialLinkedin", sub.socialLinkedin],
      ["Social Management", "manageSocial", sub.manageSocial],
      ["Short-form Clips", "wantsClips", sub.wantsClips]
    ]);

    html += sectionBlock("Recording & Logistics", [
      ["Location", "recordingLocation", sub.recordingLocation],
      ["Address", "locationAddress", sub.locationAddress],
      ["Frequency", "episodeFrequency", sub.episodeFrequency],
      ["Episode Length", "episodeLength", sub.episodeLength],
      ["Host(s)", "hostsInfo", sub.hostsInfo, true],
      ["Guests", "hasGuests", sub.hasGuests],
      ["Video", "isVideo", sub.isVideo],
      ["Launch Date", "launchDate", sub.launchDate]
    ]);

    html += sectionBlock("Marketing & Launch", [
      ["Launch Episodes", "launchEpisodes", sub.launchEpisodes],
      ["Teaser Ideas", "teaserIdeas", sub.teaserIdeas, true],
      ["Marketing Notes", "marketingNotes", sub.marketingNotes, true],
      ["Goals", "goals", sub.goals, true]
    ]);

    html += sectionBlock("Additional Notes", [
      ["Notes", "anythingElse", sub.anythingElse, true]
    ]);

    html += '</div>';
    return html;
  }

  function sectionBlock(title, fields) {
    var html = '<div class="sub-section">';
    html += '<h4 class="sub-section-title">' + escapeHtml(title) + '</h4>';
    html += '<div class="sub-fields-edit">';
    fields.forEach(function (field) {
      var label = field[0];
      var key = field[1];
      var value = field[2];
      var isTextarea = field[3] || false;
      var safeValue = value ? escapeHtml(value.toString()) : '';
      html += '<div class="sub-field-row">';
      html += '<label class="sub-field-label">' + escapeHtml(label) + '</label>';
      if (isTextarea) {
        html += '<textarea class="sub-field-input" data-field="' + key + '" rows="2">' + safeValue + '</textarea>';
      } else {
        html += '<input type="text" class="sub-field-input" data-field="' + key + '" value="' + safeValue + '">';
      }
      html += '</div>';
    });
    html += '</div></div>';
    return html;
  }

  // ---- Utils ----
  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
  }

})();
