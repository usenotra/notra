/** Locale pair SerpApi's Google engine expects (`hl` language, `gl` country). */
export interface GeoAiOverviewLocale {
  hl: string;
  gl: string;
}

export interface GeoAiOverviewSource {
  title: string;
  url: string;
  domain: string;
}

/**
 * Parsed Google AI Overview only. Organic results and other SERP modules are
 * dropped on purpose — GEO tracks the overview, not the rest of the page.
 *
 * `absent` is reserved for a recognized successful search with no overview.
 * Malformed envelopes must not be stored as a visibility miss.
 */
export type GeoAiOverviewParse =
  | {
      status: "present";
      text: string;
      sources: GeoAiOverviewSource[];
    }
  | {
      status: "absent";
      pageToken: string | null;
    }
  | {
      status: "invalid";
      reason: string;
    };

export interface GeoAiOverviewResult {
  present: boolean;
  text: string;
  sources: GeoAiOverviewSource[];
}
