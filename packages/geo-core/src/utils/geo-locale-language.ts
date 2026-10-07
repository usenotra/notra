import {
  DEFAULT_LANGUAGE,
  type SupportedLanguage,
} from "@notra/ai/constants/languages";

import { GEO_LOCALE_LANGUAGES } from "../constants/geo-languages";

const ACCEPT_LANGUAGE_SEPARATOR = ",";
const LOCALE_PARAM_SEPARATOR = ";";
const LOCALE_SUBTAG_PATTERN = /[-_]/;
const QUALITY_PREFIX = "q=";
const DEFAULT_QUALITY = 1;

/** "de-DE" → "German". Null for locales we cannot track. */
export function geoLanguageFromLocale(
  locale: string
): SupportedLanguage | null {
  const code =
    locale.trim().split(LOCALE_SUBTAG_PATTERN)[0]?.toLowerCase() ?? "";
  return Object.hasOwn(GEO_LOCALE_LANGUAGES, code)
    ? (GEO_LOCALE_LANGUAGES[code] ?? null)
    : null;
}

/** Accept-Language entries by descending q weight; q=0 entries are dropped. */
function rankAcceptLanguage(header: string): string[] {
  return header
    .split(ACCEPT_LANGUAGE_SEPARATOR)
    .map((entry, index) => {
      const [locale = "", ...params] = entry.split(LOCALE_PARAM_SEPARATOR);
      const quality = params
        .map((param) => param.trim())
        .find((param) => param.startsWith(QUALITY_PREFIX));
      return {
        locale: locale.trim(),
        index,
        quality: quality
          ? Number(quality.slice(QUALITY_PREFIX.length))
          : DEFAULT_QUALITY,
      };
    })
    .filter(({ quality }) => Number.isFinite(quality) && quality > 0)
    .toSorted((a, b) => b.quality - a.quality || a.index - b.index)
    .map(({ locale }) => locale);
}

/**
 * First trackable language in a browser's preference list (navigator.languages
 * or an Accept-Language header). Falls back to English.
 */
export function preferredGeoLanguage(
  locales: readonly string[] | string | null | undefined
): SupportedLanguage {
  const list =
    typeof locales === "string" ? rankAcceptLanguage(locales) : (locales ?? []);
  for (const locale of list) {
    const language = geoLanguageFromLocale(locale);
    if (language) {
      return language;
    }
  }
  return DEFAULT_LANGUAGE;
}
