/* ============================================
   Straw Hut Media — Podcast Onboarding App
   ============================================ */

(function () {
  "use strict";

  // ---- State ----
  var currentSection = 1;
  var totalSections = 10;
  var approvedCompany = "";
  var uploadedFiles = { brand: [], inspo: [], logo: [], music: [] };
  var MAX_INSPO_FILES = 10;
  var completedSections = {};

  // ---- DOM refs ----
  var gateScreen = document.getElementById("gate");
  var onboardingScreen = document.getElementById("onboarding");
  var successScreen = document.getElementById("success");
  var companyInput = document.getElementById("company-name");
  var gateError = document.getElementById("gate-error");
  var gateSubmit = document.getElementById("gate-submit");
  var displayCompany = document.getElementById("display-company");
  var displayCompanyMobile = document.getElementById("display-company-mobile");
  var form = document.getElementById("onboarding-form");
  var prevBtn = document.getElementById("prev-btn");
  var nextBtn = document.getElementById("next-btn");
  var submitBtn = document.getElementById("submit-btn");
  var progressFill = document.getElementById("form-progress");
  var progressLabel = document.getElementById("progress-label");
  var sidebarProgressFill = document.getElementById("sidebar-progress-fill");
  var sidebarProgressText = document.getElementById("sidebar-progress-text");
  var formSummary = document.getElementById("form-summary");

  // ---- Helpers ----
  function show(el) { el.classList.remove("hidden"); }
  function hide(el) { el.classList.add("hidden"); }

  function switchScreen(target) {
    [gateScreen, onboardingScreen, successScreen].forEach(function (s) {
      s.classList.remove("active");
    });
    target.classList.add("active");
    window.scrollTo(0, 0);
  }

  function isApproved(name) {
    var lower = name.trim().toLowerCase();
    return APPROVED_COMPANIES.some(function (c) {
      return c.toLowerCase() === lower;
    });
  }

  // ---- Gate ----
  gateSubmit.addEventListener("click", function () {
    var name = companyInput.value.trim();
    if (!name) {
      companyInput.classList.add("input-error");
      return;
    }
    companyInput.classList.remove("input-error");
    if (isApproved(name)) {
      approvedCompany = name;
      hide(gateError);
      displayCompany.textContent = approvedCompany;
      displayCompanyMobile.textContent = approvedCompany;
      switchScreen(onboardingScreen);
      updateProgress();
      updateSidebar();
    } else {
      show(gateError);
    }
  });

  companyInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); gateSubmit.click(); }
  });
  companyInput.addEventListener("input", function () {
    hide(gateError);
    companyInput.classList.remove("input-error");
  });

  // ---- Sidebar navigation (click to jump) ----
  var sidebarItems = document.querySelectorAll(".sidebar-checklist li");
  sidebarItems.forEach(function (li) {
    li.addEventListener("click", function () {
      var sectionNum = parseInt(li.dataset.sidebar);
      if (sectionNum && sectionNum !== currentSection) {
        // Mark current section as completed if it has content
        checkSectionCompletion(currentSection);
        showSection(sectionNum);
      }
    });
  });

  // ---- Multi-step form navigation ----
  function showSection(n) {
    currentSection = n;
    document.querySelectorAll(".form-section").forEach(function (s) {
      s.classList.remove("active");
    });
    var target = document.querySelector('.form-section[data-section="' + n + '"]');
    if (target) target.classList.add("active");

    prevBtn.disabled = n === 1;
    if (n === totalSections) {
      hide(nextBtn);
      show(submitBtn);
      buildSummary();
    } else {
      show(nextBtn);
      hide(submitBtn);
    }
    updateProgress();
    updateSidebar();
    window.scrollTo(0, 0);
  }

  function updateProgress() {
    var pct = ((currentSection - 1) / (totalSections - 1)) * 100;
    progressFill.style.width = pct + "%";
    progressLabel.textContent = "Section " + currentSection + " of " + totalSections;

    // Sidebar progress based on completed sections
    var completedCount = Object.keys(completedSections).length;
    var sidebarPct = Math.round((completedCount / totalSections) * 100);
    sidebarProgressFill.style.width = sidebarPct + "%";
    sidebarProgressText.textContent = sidebarPct + "% complete";
  }

  function updateSidebar() {
    sidebarItems.forEach(function (li) {
      var num = parseInt(li.dataset.sidebar);
      li.classList.remove("active");
      if (num === currentSection) {
        li.classList.add("active");
      }
      if (completedSections[num]) {
        li.classList.add("completed");
      } else {
        li.classList.remove("completed");
      }
    });
  }

  // ---- Section completion checking ----
  // Check if a section has any meaningful content filled in
  function checkSectionCompletion(sectionNum) {
    var section = document.querySelector('.form-section[data-section="' + sectionNum + '"]');
    if (!section) return;

    var hasContent = false;

    // Check text inputs, emails, urls, dates
    var textInputs = section.querySelectorAll('input[type="text"], input[type="email"], input[type="url"], input[type="date"], textarea');
    textInputs.forEach(function (input) {
      if (input.value.trim()) hasContent = true;
    });

    // Check radio buttons
    var radioGroups = {};
    var radios = section.querySelectorAll('input[type="radio"]');
    radios.forEach(function (r) {
      if (!radioGroups[r.name]) radioGroups[r.name] = false;
      if (r.checked) radioGroups[r.name] = true;
    });
    Object.keys(radioGroups).forEach(function (name) {
      if (radioGroups[name]) hasContent = true;
    });

    // Check checkboxes (non-confirm)
    var checkboxes = section.querySelectorAll('input[type="checkbox"]:not(#confirm-submit)');
    checkboxes.forEach(function (cb) {
      if (cb.checked) hasContent = true;
    });

    // Check selects
    var selects = section.querySelectorAll("select");
    selects.forEach(function (sel) {
      if (sel.value) hasContent = true;
    });

    // Check file uploads related to this section
    if (sectionNum === 3 && (uploadedFiles.brand.length > 0 || uploadedFiles.logo.length > 0)) hasContent = true;
    if (sectionNum === 4 && uploadedFiles.inspo.length > 0) hasContent = true;
    if (sectionNum === 5 && uploadedFiles.music.length > 0) hasContent = true;

    if (hasContent) {
      completedSections[sectionNum] = true;
    }

    updateProgress();
    updateSidebar();
  }

  // Listen for any input changes to auto-check completion
  form.addEventListener("input", function () {
    checkSectionCompletion(currentSection);
  });
  form.addEventListener("change", function () {
    checkSectionCompletion(currentSection);
  });

  function validateCurrentSection() {
    var section = document.querySelector('.form-section[data-section="' + currentSection + '"]');
    var inputs = section.querySelectorAll("[required]");
    var valid = true;
    inputs.forEach(function (input) {
      if (input.type === "radio") {
        var group = section.querySelectorAll('input[name="' + input.name + '"]');
        var checked = Array.prototype.some.call(group, function (r) { return r.checked; });
        if (!checked) {
          valid = false;
          group.forEach(function (r) {
            var label = r.closest(".radio-label");
            if (label) label.style.outline = "1px solid var(--color-error)";
          });
        } else {
          group.forEach(function (r) {
            var label = r.closest(".radio-label");
            if (label) label.style.outline = "none";
          });
        }
      } else {
        if (!input.value.trim()) {
          valid = false;
          input.classList.add("input-error");
        } else {
          input.classList.remove("input-error");
        }
      }
    });
    return valid;
  }

  nextBtn.addEventListener("click", function () {
    if (!validateCurrentSection()) return;
    checkSectionCompletion(currentSection);
    if (currentSection < totalSections) showSection(currentSection + 1);
  });

  prevBtn.addEventListener("click", function () {
    checkSectionCompletion(currentSection);
    if (currentSection > 1) showSection(currentSection - 1);
  });

  // ---- Conditional visibility ----
  document.querySelectorAll('input[name="podcastStatus"]').forEach(function (r) {
    r.addEventListener("change", function () {
      var details = document.getElementById("takeover-details");
      if (r.value === "takeover" && r.checked) show(details); else hide(details);
    });
  });

  document.querySelectorAll('input[name="hasBrandGuidelines"]').forEach(function (r) {
    r.addEventListener("change", function () {
      var upload = document.getElementById("brand-guidelines-upload");
      if ((r.value === "yes" || r.value === "partial") && r.checked) show(upload); else hide(upload);
    });
  });

  document.querySelectorAll('input[name="recordingLocation"]').forEach(function (r) {
    r.addEventListener("change", function () {
      var details = document.getElementById("client-location-details");
      if (r.value === "client-location" && r.checked) show(details); else hide(details);
    });
  });

  document.querySelectorAll('input[name="needsMusic"]').forEach(function (r) {
    r.addEventListener("change", function () {
      var upload = document.getElementById("existing-music-upload");
      if (r.value === "have-some" && r.checked) show(upload); else hide(upload);
    });
  });

  // ---- File uploads ----
  function setupFileUpload(inputId, listId, storageKey, maxFiles) {
    var input = document.getElementById(inputId);
    if (!input) return;
    var list = document.getElementById(listId);
    var dropZone = input.closest(".file-upload-area");

    function renderList() {
      list.innerHTML = "";
      uploadedFiles[storageKey].forEach(function (f, i) {
        var li = document.createElement("li");
        li.innerHTML =
          '<span>' + escapeHtml(f.name) + ' <small>(' + formatSize(f.size) + ')</small></span>' +
          '<button class="remove-file" data-idx="' + i + '">&times;</button>';
        list.appendChild(li);
      });
      list.querySelectorAll(".remove-file").forEach(function (btn) {
        btn.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          uploadedFiles[storageKey].splice(parseInt(btn.dataset.idx), 1);
          renderList();
          checkSectionCompletion(currentSection);
        });
      });
    }

    function addFiles(files) {
      var limitError = document.getElementById("inspo-limit-error");
      for (var i = 0; i < files.length; i++) {
        if (maxFiles && uploadedFiles[storageKey].length >= maxFiles) {
          if (limitError) show(limitError);
          break;
        }
        uploadedFiles[storageKey].push(files[i]);
      }
      renderList();
      checkSectionCompletion(currentSection);
    }

    input.addEventListener("change", function () {
      addFiles(input.files);
      input.value = "";
    });

    dropZone.addEventListener("dragover", function (e) {
      e.preventDefault();
      dropZone.classList.add("drag-over");
    });
    dropZone.addEventListener("dragleave", function () {
      dropZone.classList.remove("drag-over");
    });
    dropZone.addEventListener("drop", function (e) {
      e.preventDefault();
      dropZone.classList.remove("drag-over");
      addFiles(e.dataTransfer.files);
    });
  }

  setupFileUpload("brand-guidelines-file", "brand-file-list", "brand", null);
  setupFileUpload("brand-logos-file", "logo-file-list", "logo", null);
  setupFileUpload("inspiration-files", "inspo-file-list", "inspo", MAX_INSPO_FILES);
  setupFileUpload("music-files", "music-file-list", "music", null);

  // ---- Summary builder ----
  function buildSummary() {
    var data = getFormData();
    var html = "";

    // Contact
    html += '<h4>Contact Information</h4><dl>';
    html += row("Name", (data.contactFirstName || "") + " " + (data.contactLastName || ""));
    html += row("Email", data.contactEmail || "—");
    html += row("Phone", data.contactPhone || "—");
    html += row("Role", data.contactRole || "—");
    html += row("Timezone", data.contactTimezone || "—");
    html += row("Preferred Contact", data.preferredContact || "—");
    html += "</dl>";

    // Podcast Basics
    html += '<h4>Podcast Basics</h4><dl>';
    html += row("Podcast Name", data.podcastName || "—");
    html += row("Description", data.podcastDescription || "—");
    html += row("Status", data.podcastStatus === "new" ? "New podcast" : data.podcastStatus === "takeover" ? "Taking over existing" : "—");
    html += row("Brand", data.brandStatus === "existing" ? "Existing brand" : data.brandStatus === "new" ? "New brand" : "—");
    if (data.podcastStatus === "takeover") {
      html += row("Existing URL", data.existingPodcastUrl || "—");
    }
    html += row("Genre", data.podcastGenre || "—");
    html += row("Format", data.podcastFormat || "—");
    html += row("Target Audience", data.targetAudience || "—");
    html += "</dl>";

    // Branding
    html += '<h4>Branding</h4><dl>';
    var guidelineLabels = { yes: "Yes", no: "Need creation", partial: "Partial" };
    html += row("Has Guidelines", guidelineLabels[data.hasBrandGuidelines] || "—");
    html += row("Brand Colors", data.brandColors || "—");
    html += row("Fonts", data.brandFonts || "—");
    html += row("Voice / Tone", data.brandVoice || "—");
    if (uploadedFiles.brand.length) {
      html += row("Guideline Files", uploadedFiles.brand.map(function (f) { return escapeHtml(f.name); }).join(", "));
    }
    if (uploadedFiles.logo.length) {
      html += row("Logo Files", uploadedFiles.logo.map(function (f) { return escapeHtml(f.name); }).join(", "));
    }
    html += "</dl>";

    // Inspiration
    html += '<h4>Inspiration</h4><dl>';
    if (uploadedFiles.inspo.length) {
      html += row("Images", uploadedFiles.inspo.map(function (f) { return escapeHtml(f.name); }).join(", "));
    }
    html += row("Podcasts Admired", data.inspoPodcasts || "—");
    html += row("Brands Admired", data.inspoBrands || "—");
    html += row("Visual Notes", data.inspoNotes || "—");
    html += "</dl>";

    // Music & Audio
    html += '<h4>Music &amp; Audio</h4><dl>';
    var musicLabels = { yes: "Create from scratch", "have-some": "Have some music", no: "Handle separately", undecided: "TBD" };
    html += row("Needs Music", musicLabels[data.needsMusic] || "—");
    html += row("Music Vibe", data.musicVibe || "—");
    html += row("Music References", data.musicReferences || "—");
    var sfxLabels = { yes: "Yes", minimal: "Minimal", no: "No", undecided: "TBD" };
    html += row("Sound Effects", sfxLabels[data.wantsSFX] || "—");
    if (uploadedFiles.music.length) {
      html += row("Audio Files", uploadedFiles.music.map(function (f) { return escapeHtml(f.name); }).join(", "));
    }
    html += "</dl>";

    // Social Media
    html += '<h4>Social Media &amp; Web</h4><dl>';
    html += row("Website", data.socialWebsite || "—");
    html += row("Instagram", data.socialInstagram || "—");
    html += row("X (Twitter)", data.socialTwitter || "—");
    html += row("TikTok", data.socialTiktok || "—");
    html += row("YouTube", data.socialYoutube || "—");
    html += row("LinkedIn", data.socialLinkedin || "—");
    var socialLabels = { yes: "Full management", partial: "Create content only", no: "Handle ourselves" };
    html += row("Social Mgmt", socialLabels[data.manageSocial] || "—");
    var clipLabels = { yes: "Yes", no: "No", undecided: "TBD" };
    html += row("Short-form Clips", clipLabels[data.wantsClips] || "—");
    html += "</dl>";

    // Recording & Logistics
    html += '<h4>Recording &amp; Logistics</h4><dl>';
    var locLabels = { studio: "Straw Hut Studio", virtual: "Virtual / Remote", "client-location": "Client location", undecided: "TBD" };
    html += row("Location", locLabels[data.recordingLocation] || "—");
    if (data.recordingLocation === "client-location") {
      html += row("Address", data.locationAddress || "—");
    }
    html += row("Frequency", data.episodeFrequency || "—");
    html += row("Episode Length", data.episodeLength || "—");
    html += row("Host(s)", data.hostsInfo || "—");
    var guestLabels = { yes: "Yes, regularly", sometimes: "Sometimes", no: "No", undecided: "TBD" };
    html += row("Guests", guestLabels[data.hasGuests] || "—");
    var videoLabels = { yes: "Audio + Video", "audio-only": "Audio only", undecided: "TBD" };
    html += row("Video", videoLabels[data.isVideo] || "—");
    html += row("Launch Date", data.launchDate || "—");
    html += "</dl>";

    // Distribution & Monetization
    html += '<h4>Distribution &amp; Monetization</h4><dl>';
    var platforms = getCheckedValues("platforms");
    html += row("Platforms", platforms.length ? platforms.join(", ") : "—");
    var monLabels = { yes: "Help find sponsors", self: "Own sponsors", later: "Maybe later", no: "Not a goal" };
    html += row("Monetization", monLabels[data.wantsMonetization] || "—");
    html += row("Monetization Notes", data.monetizationNotes || "—");
    var webLabels = { yes: "Build one", "have-one": "Already have one", no: "No" };
    html += row("Podcast Website", webLabels[data.wantsWebsite] || "—");
    html += "</dl>";

    // Marketing & Launch
    html += '<h4>Marketing &amp; Launch</h4><dl>';
    var epLabels = { "1": "1 episode", "3": "3 episodes", "5+": "5+ episodes", undecided: "TBD" };
    html += row("Launch Episodes", epLabels[data.launchEpisodes] || "—");
    var trailerLabels = { yes: "Create one", "have-one": "Already have one", no: "None" };
    html += row("Trailer", trailerLabels[data.wantsTrailer] || "—");
    var pressLabels = { yes: "Yes", no: "No", undecided: "TBD" };
    html += row("Press Kit", pressLabels[data.wantsPressKit] || "—");
    html += row("Marketing Notes", data.marketingNotes || "—");
    html += row("Goals", data.goals || "—");
    html += "</dl>";

    formSummary.innerHTML = html;
  }

  function row(label, value) {
    return "<dt>" + escapeHtml(label) + "</dt><dd>" + escapeHtml(value) + "</dd>";
  }

  function getFormData() {
    var data = {};
    var elements = form.elements;
    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];
      if (!el.name) continue;
      if (el.type === "radio") {
        if (el.checked) data[el.name] = el.value;
      } else if (el.type === "checkbox") {
        // Skip platform checkboxes (handled separately)
        if (el.name !== "platforms") {
          data[el.name] = el.checked;
        }
      } else if (el.type !== "file") {
        data[el.name] = el.value;
      }
    }
    return data;
  }

  function getCheckedValues(name) {
    var values = [];
    var checkboxes = form.querySelectorAll('input[name="' + name + '"]');
    checkboxes.forEach(function (cb) {
      if (cb.checked) values.push(cb.value);
    });
    return values;
  }

  // ---- Submit ----
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var confirmBox = document.getElementById("confirm-submit");
    if (!confirmBox.checked) {
      confirmBox.closest(".checkbox-label").style.outline = "1px solid var(--color-error)";
      return;
    }
    confirmBox.closest(".checkbox-label").style.outline = "none";

    // Mark all sections as completed
    for (var i = 1; i <= totalSections; i++) {
      completedSections[i] = true;
    }
    updateSidebar();
    updateProgress();

    var data = getFormData();
    data.company = approvedCompany;
    data.submittedAt = new Date().toISOString();
    data.platforms = getCheckedValues("platforms");
    data.brandFiles = uploadedFiles.brand.map(function (f) { return f.name; });
    data.logoFiles = uploadedFiles.logo.map(function (f) { return f.name; });
    data.inspoFiles = uploadedFiles.inspo.map(function (f) { return f.name; });
    data.musicFiles = uploadedFiles.music.map(function (f) { return f.name; });

    // In production, POST this to your backend. For now, log it.
    console.log("=== ONBOARDING SUBMISSION ===");
    console.log(JSON.stringify(data, null, 2));

    // Show success screen
    switchScreen(successScreen);
  });

  // ---- Utils ----
  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  }

})();
