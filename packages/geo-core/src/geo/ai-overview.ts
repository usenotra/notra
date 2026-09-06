import { requireApiKey } from "@notra/utils/require-api-key";
import { Effect } from "effect";

import { GEO_SERPAPI_API_KEY_ENV } from "../constants/geo";
import {
  GEO_SERPAPI_AI_OVERVIEW_ENGINE,
  GEO_SERPAPI_BASE_URL,
  GEO_SERPAPI_GOOGLE_ENGINE,
  GEO_SERPAPI_JSON_RESTRICTOR,
  geoAiOverviewLocale,
} from "../constants/geo-ai-overview";
import type {
  GeoAiOverviewParse,
  GeoAiOverviewResult,
} from "../types/geo-ai-overview";
import {
  parseGoogleAiOverview,
  serpApiErrorMessage,
} from "../utils/geo-ai-overview";

interface SerpApiQuery {
  engine: string;
  q?: string;
  page_token?: string;
  hl?: string;
  gl?: string;
}

async function fetchSerpApiJson(
  query: SerpApiQuery,
  signal: AbortSignal
): Promise<unknown> {
  const apiKey = requireApiKey(GEO_SERPAPI_API_KEY_ENV);
  const url = new URL(GEO_SERPAPI_BASE_URL);
  url.searchParams.set("engine", query.engine);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("json_restrictor", GEO_SERPAPI_JSON_RESTRICTOR);
  url.searchParams.set("device", "desktop");
  if (query.q) {
    url.searchParams.set("q", query.q);
  }
  if (query.page_token) {
    url.searchParams.set("page_token", query.page_token);
  }
  if (query.hl) {
    url.searchParams.set("hl", query.hl);
  }
  if (query.gl) {
    url.searchParams.set("gl", query.gl);
  }

  const response = await fetch(url, {
    signal,
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`SerpApi responded with ${response.status}`);
  }
  return response.json();
}

function requirePayload(payload: unknown): void {
  const error = serpApiErrorMessage(payload);
  if (error) {
    throw new Error(error);
  }
}

function requireGoogleAiOverview(
  payload: unknown
): Exclude<GeoAiOverviewParse, { status: "invalid" }> {
  const parsed = parseGoogleAiOverview(payload);
  if (parsed.status === "invalid") {
    throw new Error(parsed.reason);
  }
  return parsed;
}

/**
 * Fetch only Google's AI Overview for a GEO prompt. A missing overview is a
 * valid outcome (the query simply did not trigger one), not an engine failure.
 *
 * When the first Google search returns a short-lived `page_token`, SerpApi
 * requires a follow-up `google_ai_overview` call within a minute.
 */
export function fetchGoogleAiOverview(promptText: string, language: string) {
  return Effect.tryPromise(async (signal) => {
    const locale = geoAiOverviewLocale(language);
    const searchPayload = await fetchSerpApiJson(
      {
        engine: GEO_SERPAPI_GOOGLE_ENGINE,
        q: promptText,
        hl: locale.hl,
        gl: locale.gl,
      },
      signal
    );
    requirePayload(searchPayload);

    const first = requireGoogleAiOverview(searchPayload);
    if (first.status === "present") {
      const result: GeoAiOverviewResult = {
        present: true,
        text: first.text,
        sources: first.sources,
      };
      return result;
    }
    if (!first.pageToken) {
      const result: GeoAiOverviewResult = {
        present: false,
        text: "",
        sources: [],
      };
      return result;
    }

    const overviewPayload = await fetchSerpApiJson(
      {
        engine: GEO_SERPAPI_AI_OVERVIEW_ENGINE,
        page_token: first.pageToken,
      },
      signal
    );
    requirePayload(overviewPayload);
    const second = requireGoogleAiOverview(overviewPayload);
    if (second.status === "present") {
      const result: GeoAiOverviewResult = {
        present: true,
        text: second.text,
        sources: second.sources,
      };
      return result;
    }
    const result: GeoAiOverviewResult = {
      present: false,
      text: "",
      sources: [],
    };
    return result;
  });
}
