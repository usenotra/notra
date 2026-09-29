import {
  DEFAULT_LANGUAGE,
  type SupportedLanguage,
} from "@notra/ai/constants/languages";

import { GEO_LOCALE_LANGUAGES } from "../constants/geo-languages";

const ACCEPT_LANGUAGE_SEPARATOR = ",";
const LOCALE_SUBTAG_PATTERN = /[-_;]/;

/** "de-DE" → "German". Null for locales we cannot track. */
export function geoLanguageFromLocale(
  locale: string
): SupportedLanguage | null {
  const code =
    locale.trim().split(LOCALE_SUBTAG_PATTERN)[0]?.toLowerCase() ?? "";
  return GEO_LOCALE_LANGUAGES[code] ?? null;
}

/**
 * First trackable language in a browser's preference list (navigator.languages
 * or an Accept-Language header, whose entries are already sorted by weight in
 * practice). Falls back to English.
 */
export function preferredGeoLanguage(
  locales: readonly string[] | string | null | undefined
): SupportedLanguage {
  const list =
    typeof locales === "string"
      ? locales.split(ACCEPT_LANGUAGE_SEPARATOR)
      : (locales ?? []);
  for (const locale of list) {
    const language = geoLanguageFromLocale(locale);
    if (language) {
      return language;
    }
  }
  return DEFAULT_LANGUAGE;
}
