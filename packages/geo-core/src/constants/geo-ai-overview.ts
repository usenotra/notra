import type { GeoAiOverviewLocale } from "../types/geo-ai-overview";

export const GEO_SERPAPI_BASE_URL = "https://serpapi.com/search.json";
export const GEO_SERPAPI_GOOGLE_ENGINE = "google";
export const GEO_SERPAPI_AI_OVERVIEW_ENGINE = "google_ai_overview";
/**
 * Restrict the payload to the overview, errors, and enough envelope to tell a
 * real miss from a malformed response. Never request organic results.
 */
export const GEO_SERPAPI_JSON_RESTRICTOR = "ai_overview,error,search_metadata";
/** Opt-in live SerpApi checks. The unit suite stays offline without this. */
export const GEO_SERPAPI_LIVE_ENV = "GEO_SERPAPI_LIVE";

export const GEO_AI_OVERVIEW_INVALID_ENVELOPE =
  "Unrecognized SerpApi Google response";
export const GEO_AI_OVERVIEW_INVALID_OVERVIEW = "Malformed AI Overview payload";
export const GEO_AI_OVERVIEW_INVALID_SHAPE = "Unrecognized AI Overview shape";

export const GEO_AI_OVERVIEW_ABSENT_ANSWER =
  "No AI Overview was shown for this query.";

const DEFAULT_LOCALE: GeoAiOverviewLocale = { hl: "en", gl: "us" };

/**
 * GEO stores languages as English names. SerpApi wants Google `hl`/`gl` codes.
 * Unknown names fall back to English/US rather than guessing a country.
 */
export const GEO_AI_OVERVIEW_LOCALES: Readonly<
  Record<string, GeoAiOverviewLocale>
> = {
  English: DEFAULT_LOCALE,
  Spanish: { hl: "es", gl: "es" },
  French: { hl: "fr", gl: "fr" },
  German: { hl: "de", gl: "de" },
  Portuguese: { hl: "pt", gl: "br" },
  Dutch: { hl: "nl", gl: "nl" },
  Italian: { hl: "it", gl: "it" },
  Japanese: { hl: "ja", gl: "jp" },
  Korean: { hl: "ko", gl: "kr" },
  Chinese: { hl: "zh-cn", gl: "cn" },
  Arabic: { hl: "ar", gl: "sa" },
  Hindi: { hl: "hi", gl: "in" },
  Russian: { hl: "ru", gl: "ru" },
  Turkish: { hl: "tr", gl: "tr" },
  Polish: { hl: "pl", gl: "pl" },
  Swedish: { hl: "sv", gl: "se" },
  Danish: { hl: "da", gl: "dk" },
  Norwegian: { hl: "no", gl: "no" },
  Finnish: { hl: "fi", gl: "fi" },
  Czech: { hl: "cs", gl: "cz" },
  Romanian: { hl: "ro", gl: "ro" },
  Hungarian: { hl: "hu", gl: "hu" },
  Greek: { hl: "el", gl: "gr" },
  Thai: { hl: "th", gl: "th" },
  Vietnamese: { hl: "vi", gl: "vn" },
  Indonesian: { hl: "id", gl: "id" },
  Ukrainian: { hl: "uk", gl: "ua" },
  Hebrew: { hl: "iw", gl: "il" },
};

export function geoAiOverviewLocale(language: string): GeoAiOverviewLocale {
  return GEO_AI_OVERVIEW_LOCALES[language] ?? DEFAULT_LOCALE;
}
