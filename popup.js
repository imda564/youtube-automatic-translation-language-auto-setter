document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-i18n]").forEach((elem) => {
    const key = elem.getAttribute("data-i18n");
    const message = chrome.i18n.getMessage(key);
    if (message) elem.textContent = message;
  });

  const languageData = globalThis.YTLanguageData;
  if (!languageData) {
    console.error("[YT Auto-Translate] language-data.js is not loaded.");
    return;
  }

  const searchLabel = document.getElementById("lang-search-label");
  const langSearch = document.getElementById("lang-search");
  const langSelect = document.getElementById("lang-select");
  const noResults = document.getElementById("no-results");
  const statusDiv = document.getElementById("status");
  const appliedLanguage = document.getElementById("applied-language");

  searchLabel.textContent = chrome.i18n.getMessage("popupSearchLabel") || "Search Language:";
  langSearch.placeholder = chrome.i18n.getMessage("popupSearchPlaceholder") || "Search language...";
  noResults.textContent = chrome.i18n.getMessage("popupNoSearchResult") || "No languages found.";

  const uiLocale = (chrome.i18n.getUILanguage && chrome.i18n.getUILanguage()) || "en";
  const catalog = languageData.buildLanguageCatalog(uiLocale);

  let selectedCode = "ko";
  let filteredCatalog = catalog;
  const languageByCode = new Map(catalog.map((language) => [language.code, language]));

  function updateAppliedLanguage(code) {
    const canonicalCode = languageData.canonicalizeLanguageCode(code || selectedCode || "ko");
    const applied = languageByCode.get(canonicalCode);
    const label = applied ? applied.label : canonicalCode;
    appliedLanguage.textContent = `✓ ${label} [${canonicalCode}]`;
  }

  function renderOptions(preferredCode) {
    langSelect.innerHTML = "";

    filteredCatalog.forEach((language) => {
      const option = document.createElement("option");
      option.value = language.code;
      option.textContent = language.label;
      langSelect.appendChild(option);
    });

    noResults.hidden = filteredCatalog.length !== 0;

    if (filteredCatalog.length === 0) {
      return;
    }

    const targetCode = languageData.canonicalizeLanguageCode(preferredCode || selectedCode || "ko");
    const exists = filteredCatalog.some((language) => language.code === targetCode);

    if (exists) {
      langSelect.value = targetCode;
    } else {
      langSelect.value = filteredCatalog[0].code;
    }

    updateAppliedLanguage(targetCode);
  }

  function saveLanguage(code) {
    chrome.storage.sync.set({ targetLanguage: code }, () => {
      statusDiv.textContent = chrome.i18n.getMessage("savedMessage") || "Saved.";
      setTimeout(() => {
        statusDiv.textContent = "";
      }, 2000);
    });
  }

  chrome.storage.sync.get(["targetLanguage"], (result) => {
    if (result.targetLanguage) {
      selectedCode = languageData.canonicalizeLanguageCode(result.targetLanguage);
    }
    renderOptions(selectedCode);
    updateAppliedLanguage(selectedCode);
  });

  langSearch.addEventListener("input", () => {
    const query = languageData.normalizeText(langSearch.value);
    filteredCatalog = !query
      ? catalog
      : catalog.filter((language) => language.searchIndex.includes(query));

    renderOptions(selectedCode);
  });

  langSelect.addEventListener("change", () => {
    selectedCode = langSelect.value;
    saveLanguage(selectedCode);
    updateAppliedLanguage(selectedCode);
  });
});
