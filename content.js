const DEFAULT_LANGUAGE = "ko";
let targetLanguage = DEFAULT_LANGUAGE;
let isAutoTranslating = false;
let turnOffSubtitlesOnNavigation = false;

const languageData = globalThis.YTLanguageData;

const SUBTITLE_MENU_KEYWORDS = [
  "subtitles", "subtitle", "captions", "caption", "cc", "자막", "字幕", "subtitulos",
  "subtítulos", "sous-titres", "untertitel", "ondertitels", "legendas", "sottotitoli",
  "napisy", "субтитры", "คำบรรยาย", "phu de", "chu thich"
];

const AUTO_TRANSLATE_KEYWORDS = [
  "auto-translate", "auto translate", "자동 번역", "自动翻译", "自動翻譯", "自動翻訳",
  "traduccion automatica", "traducción automática", "traduction automatique", "traduzione automatica",
  "automatische ubersetzung", "automatische übersetzung", "автоперевод", "ترجمة تلقائية",
  "अनुवाद", "dịch tự động", "แปลอัตโนมัติ", "terjemahan otomatis", "traducao automatica",
  "tradução automática"
];

const normalizedSubtitleKeywords = SUBTITLE_MENU_KEYWORDS.map((keyword) => normalizeText(keyword));
const normalizedAutoTranslateKeywords = AUTO_TRANSLATE_KEYWORDS.map((keyword) => normalizeText(keyword));

chrome.storage.sync.get(["targetLanguage", "turnOffSubtitlesOnNavigation"], (result) => {
  if (result.targetLanguage) {
    targetLanguage = canonicalizeCode(result.targetLanguage);
  }
  turnOffSubtitlesOnNavigation = result.turnOffSubtitlesOnNavigation !== false;
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace !== "sync") return;

  if (changes.targetLanguage) {
    targetLanguage = canonicalizeCode(changes.targetLanguage.newValue);
    tryAutoTranslate();
  }

  if (changes.turnOffSubtitlesOnNavigation) {
    turnOffSubtitlesOnNavigation = changes.turnOffSubtitlesOnNavigation.newValue !== false;
  }
});

document.addEventListener("yt-navigate-finish", () => {
  if (turnOffSubtitlesOnNavigation) {
    setTimeout(turnOffSubtitles, 300);
    return;
  }

  setTimeout(tryAutoTranslate, 2000);
});

document.addEventListener("yt-navigate-start", () => {
  closeMenu();
  if (turnOffSubtitlesOnNavigation) {
    turnOffSubtitles();
  }
});

document.addEventListener("yt-page-data-updated", () => {
  setTimeout(tryAutoTranslate, 2000);
});

document.body.addEventListener("click", (event) => {
  if (event.target.closest(".ytp-subtitles-button")) {
    setTimeout(tryAutoTranslate, 500);
  }
});

setTimeout(tryAutoTranslate, 3000);

function normalizeText(value) {
  if (languageData && typeof languageData.normalizeText === "function") {
    return languageData.normalizeText(value);
  }

  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalizeCode(code) {
  if (languageData && typeof languageData.canonicalizeLanguageCode === "function") {
    return languageData.canonicalizeLanguageCode(code);
  }

  return String(code || "").trim() || DEFAULT_LANGUAGE;
}

function getTargetLanguageCandidates(code) {
  if (languageData && typeof languageData.getLanguageMatchCandidates === "function") {
    const candidates = languageData.getLanguageMatchCandidates(code);
    if (candidates.length > 0) return candidates;
  }

  return [normalizeText(code)];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isWatchPage() {
  return window.location.href.includes("watch?v=");
}

function getVisiblePanel() {
  const panels = Array.from(document.querySelectorAll(".ytp-panel"));
  return panels.find((panel) => panel.offsetParent !== null && panel.style.display !== "none") || null;
}

function getMenuItemText(menuItem) {
  const parts = [
    menuItem.querySelector(".ytp-menuitem-label")?.innerText,
    menuItem.querySelector(".ytp-menuitem-content")?.innerText,
    menuItem.innerText
  ].filter(Boolean);

  return Array.from(new Set(parts)).join(" ").trim();
}

function includesAnyKeyword(normalizedText, normalizedKeywords) {
  return normalizedKeywords.some((keyword) => normalizedText.includes(keyword));
}

function isTargetLanguageText(text, targetCandidates) {
  const normalizedText = normalizeText(text);
  return targetCandidates.some((candidate) => normalizedText.includes(candidate));
}

function closeMenu(settingsButton) {
  // Clicking the settings button when its menu is already closed reopens it.
  // Check first so this function is safe to call after a language selection
  // and while YouTube is navigating to the next video.
  if (!getVisiblePanel()) return;

  if (settingsButton && document.body.contains(settingsButton)) {
    settingsButton.click();
    return;
  }

  const player = document.querySelector(".html5-video-player");
  if (player) {
    player.click();
  } else {
    document.body.click();
  }
}

function turnOffSubtitles() {
  const ccButton = document.querySelector(".ytp-subtitles-button");
  if (ccButton?.getAttribute("aria-pressed") === "true") {
    ccButton.click();
  }
}

async function tryAutoTranslate() {
  if (isAutoTranslating) return;
  if (!isWatchPage()) return;

  const player = document.querySelector(".html5-video-player");
  if (!player) return;

  const ccButton = document.querySelector(".ytp-subtitles-button");
  if (ccButton && ccButton.getAttribute("aria-pressed") === "false") {
    console.log("[YT Auto-Translate] Subtitles are OFF. Respecting current user preference.");
    return;
  }

  isAutoTranslating = true;
  try {
    await performAutoTranslate();
  } catch (error) {
    console.log("[YT Auto-Translate] auto-translate step aborted:", error.message);
  } finally {
    isAutoTranslating = false;
  }
}

async function performAutoTranslate() {
  const settingsButton = document.querySelector(".ytp-settings-button");
  if (!settingsButton) throw new Error("Settings button not found");

  const targetCandidates = getTargetLanguageCandidates(targetLanguage);
  if (!targetCandidates.length) throw new Error("No language candidates found for selected target");

  settingsButton.click();
  await sleep(300);

  const menuItems = Array.from(document.querySelectorAll(".ytp-panel-menu .ytp-menuitem"));
  const subtitlesItem = menuItems.find((item) => {
    const normalized = normalizeText(getMenuItemText(item));
    return includesAnyKeyword(normalized, normalizedSubtitleKeywords);
  });

  if (!subtitlesItem) {
    closeMenu(settingsButton);
    throw new Error("Subtitles menu not found");
  }

  const currentSubtitleText = subtitlesItem.querySelector(".ytp-menuitem-content")?.innerText || "";
  if (isTargetLanguageText(currentSubtitleText, targetCandidates)) {
    closeMenu(settingsButton);
    return;
  }

  subtitlesItem.click();
  await sleep(300);

  const subtitlesPanel = getVisiblePanel();
  if (!subtitlesPanel) {
    closeMenu(settingsButton);
    throw new Error("Subtitles panel not found");
  }

  const subtitleItems = Array.from(subtitlesPanel.querySelectorAll(".ytp-menuitem"));

  const nativeTargetTrack = subtitleItems.find((item) => {
    const text = getMenuItemText(item);
    const normalizedText = normalizeText(text);
    const isAutoTranslateEntry = includesAnyKeyword(normalizedText, normalizedAutoTranslateKeywords);
    return !isAutoTranslateEntry && isTargetLanguageText(text, targetCandidates);
  });

  if (nativeTargetTrack) {
    console.log("[YT Auto-Translate] Native subtitle track already exists for target language.");
    closeMenu(settingsButton);
    return;
  }

  const autoTranslateItem = subtitleItems.find((item) => {
    const normalized = normalizeText(getMenuItemText(item));
    return includesAnyKeyword(normalized, normalizedAutoTranslateKeywords);
  });

  if (!autoTranslateItem) {
    closeMenu(settingsButton);
    throw new Error("Auto-translate option not found");
  }

  autoTranslateItem.click();
  await sleep(300);

  const languagePanel = getVisiblePanel();
  if (!languagePanel) {
    closeMenu(settingsButton);
    throw new Error("Language list panel not found");
  }

  const languageItems = Array.from(languagePanel.querySelectorAll(".ytp-menuitem"));
  const targetLanguageItem = languageItems.find((item) => {
    return isTargetLanguageText(getMenuItemText(item), targetCandidates);
  });

  if (!targetLanguageItem) {
    closeMenu(settingsButton);
    throw new Error("Selected target language not found in auto-translate list");
  }

  targetLanguageItem.click();
  await sleep(100);
  closeMenu(settingsButton);
}
