(function () {
  const SUPPORTED_LANGUAGE_CODES = [
    "af", "am", "ar", "az", "be", "bg", "bn", "ca", "ceb", "cs", "cy", "da", "de",
    "el", "en", "eo", "es", "et", "eu", "fa", "fi", "fil", "fr", "ga", "gl", "gu",
    "ha", "he", "hi", "hr", "hu", "hy", "id", "is", "it", "ja", "jv", "ka", "kk",
    "km", "kn", "ko", "ky", "la", "lo", "lt", "lv", "mg", "mi", "mk", "ml", "mn",
    "mr", "ms", "mt", "my", "ne", "nl", "no", "pa", "pl", "pt", "pt-BR", "pt-PT",
    "ro", "ru", "si", "sk", "sl", "so", "sq", "sr", "su", "sv", "sw", "ta", "te",
    "th", "tr", "uk", "ur", "uz", "vi", "xh", "yi", "yo", "zh-Hans", "zh-Hant", "zu"
  ];

  const DISPLAY_NAME_LOCALES = [
    "en", "ko", "ja", "es", "fr", "de", "pt", "ru",
    "zh-CN", "zh-TW", "ar", "hi", "id", "vi", "th", "tr", "it", "nl", "pl"
  ];

  const LANGUAGE_CODE_ALIASES = {
    "zh-Hans": ["zh-Hans", "zh-CN", "zh-SG", "zh"],
    "zh-Hant": ["zh-Hant", "zh-TW", "zh-HK", "zh-MO", "zh"],
    "pt-BR": ["pt-BR", "pt", "pt-PT"],
    "pt-PT": ["pt-PT", "pt", "pt-BR"],
    "pt": ["pt", "pt-BR", "pt-PT"],
    "fil": ["fil", "tl"],
    "he": ["he", "iw"],
    "jv": ["jv", "jw"],
    "no": ["no", "nb", "nn"]
  };

  const MANUAL_LANGUAGE_NAMES = {
    "zh-Hans": ["Chinese (Simplified)", "Simplified Chinese"],
    "zh-Hant": ["Chinese (Traditional)", "Traditional Chinese"],
    "pt-BR": ["Portuguese (Brazil)", "Brazilian Portuguese"],
    "pt-PT": ["Portuguese (Portugal)"],
    "fil": ["Filipino", "Tagalog"],
    "no": ["Norwegian", "Norwegian Bokmal", "Norsk"],
    "he": ["Hebrew"],
    "jv": ["Javanese", "Basa Jawa"]
  };

  const CANONICAL_CODE_MAP = {
    "zh-cn": "zh-Hans",
    "zh-sg": "zh-Hans",
    "zh-tw": "zh-Hant",
    "zh-hk": "zh-Hant",
    "zh-mo": "zh-Hant",
    "iw": "he",
    "jw": "jv",
    "tl": "fil",
    "nb": "no",
    "nn": "no"
  };

  function normalizeText(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function dedupe(values) {
    return Array.from(new Set(values.filter(Boolean)));
  }

  function canonicalizeLanguageCode(code) {
    const normalized = String(code || "").trim();
    if (!normalized) return "";

    const lower = normalized.toLowerCase();
    if (CANONICAL_CODE_MAP[lower]) {
      return CANONICAL_CODE_MAP[lower];
    }

    const directMatch = SUPPORTED_LANGUAGE_CODES.find((item) => item.toLowerCase() === lower);
    if (directMatch) return directMatch;

    return normalized;
  }

  function expandLanguageCodeAliases(code) {
    const canonical = canonicalizeLanguageCode(code);
    if (!canonical) return [];

    const aliases = new Set(LANGUAGE_CODE_ALIASES[canonical] || [canonical]);
    aliases.add(canonical);

    const lower = canonical.toLowerCase();
    if (lower.includes("-")) {
      aliases.add(canonical.split("-")[0]);
    }

    return Array.from(aliases);
  }

  function getDisplayNameSafe(code, locale) {
    try {
      const display = new Intl.DisplayNames([locale], { type: "language" });
      return display.of(code) || "";
    } catch (err) {
      return "";
    }
  }

  function getBestDisplayName(code, locale) {
    const aliases = expandLanguageCodeAliases(code);
    for (const alias of aliases) {
      const name = getDisplayNameSafe(alias, locale);
      if (name) return name;
    }
    return "";
  }

  function getNativeLocale(code) {
    const canonical = canonicalizeLanguageCode(code);
    if (!canonical) return "en";

    if (canonical === "zh-Hans") return "zh-CN";
    if (canonical === "zh-Hant") return "zh-TW";
    if (canonical === "pt-BR") return "pt-BR";
    if (canonical === "pt-PT") return "pt-PT";

    const aliases = expandLanguageCodeAliases(canonical);
    for (const alias of aliases) {
      if (alias.length >= 2) return alias;
    }

    return "en";
  }

  function getLanguageSearchTokens(code, uiLocale) {
    const canonical = canonicalizeLanguageCode(code);

    const tokens = new Set([
      canonical,
      ...expandLanguageCodeAliases(canonical),
      getBestDisplayName(canonical, "en"),
      getBestDisplayName(canonical, uiLocale),
      getBestDisplayName(canonical, getNativeLocale(canonical)),
      ...(MANUAL_LANGUAGE_NAMES[canonical] || [])
    ]);

    for (const locale of DISPLAY_NAME_LOCALES) {
      const name = getBestDisplayName(canonical, locale);
      if (name) tokens.add(name);
    }

    return dedupe(Array.from(tokens));
  }

  function getLanguageMatchCandidates(code) {
    const canonical = canonicalizeLanguageCode(code);
    const rawTokens = new Set([...(MANUAL_LANGUAGE_NAMES[canonical] || [])]);

    for (const locale of DISPLAY_NAME_LOCALES) {
      const name = getBestDisplayName(canonical, locale);
      if (name) rawTokens.add(name);
    }

    const normalizedTokens = new Set();
    for (const token of rawTokens) {
      const normalized = normalizeText(token);
      if (normalized.length >= 3) normalizedTokens.add(normalized);
    }

    return Array.from(normalizedTokens);
  }

  function buildLanguageCatalog(uiLocale) {
    const locale = uiLocale || "en";
    const catalog = SUPPORTED_LANGUAGE_CODES.map((code) => {
      const canonical = canonicalizeLanguageCode(code);
      const localizedName = getBestDisplayName(canonical, locale);
      const englishName = getBestDisplayName(canonical, "en");
      const nativeName = getBestDisplayName(canonical, getNativeLocale(canonical));

      const primary = localizedName || nativeName || englishName || canonical;
      const secondary = [];

      // Keep English visible whenever it is not the same as the primary label.
      if (englishName && normalizeText(englishName) !== normalizeText(primary)) {
        secondary.push(englishName);
      }

      // Also keep native name when it adds extra clarity.
      if (
        nativeName &&
        normalizeText(nativeName) !== normalizeText(primary) &&
        normalizeText(nativeName) !== normalizeText(englishName)
      ) {
        secondary.push(nativeName);
      }

      const label = secondary.length > 0 ? `${primary} (${secondary.join(" / ")})` : primary;

      const searchTokens = getLanguageSearchTokens(canonical, locale);
      const searchIndex = normalizeText(searchTokens.join(" "));

      return {
        code: canonical,
        label,
        searchTokens,
        searchIndex
      };
    });

    catalog.sort((a, b) => a.label.localeCompare(b.label));
    return catalog;
  }

  globalThis.YTLanguageData = {
    SUPPORTED_LANGUAGE_CODES,
    normalizeText,
    canonicalizeLanguageCode,
    buildLanguageCatalog,
    getLanguageMatchCandidates
  };
})();
