import {
  DEMO_COMPETITORS,
  DEMO_SCREENSHOT_SIZE,
  DEMO_SCREENSHOT_URL,
  DEMO_SEARCH_RESULTS,
  DEMO_SITEMAP_PATHS,
  DEMO_STYLEGUIDE,
} from "@notra/ai/constants/demo-context-dev";
import { DEMO_BRAND_WEBSITE_CONTENT } from "@notra/ai/constants/demo-responses";

const DEMO_DOMAIN = "fieldnote.example";

function hostOf(value: string | null): string {
  if (!value) {
    return DEMO_DOMAIN;
  }
  try {
    return new URL(value.includes("://") ? value : `https://${value}`).hostname;
  } catch {
    return DEMO_DOMAIN;
  }
}

function searchQuery(init: RequestInit): string {
  if (typeof init.body !== "string") {
    return "";
  }
  try {
    const body: unknown = JSON.parse(init.body);
    return typeof body === "object" &&
      body !== null &&
      "query" in body &&
      typeof body.query === "string"
      ? body.query
      : "";
  } catch {
    return "";
  }
}

/**
 * Answers context.dev requests in the public demo with fixed data about the
 * fictional brand, so website analysis, guidelines, sitemaps, competitor
 * lookups and web research all complete without a key or network access.
 * Returns the JSON body the real endpoint would.
 */
export function demoContextDevResponse(
  path: string,
  init: RequestInit
): unknown {
  const url = new URL(path, "https://api.context.dev");
  const params = url.searchParams;
  const endpoint = url.pathname;
  const target =
    params.get("url") ?? params.get("directUrl") ?? params.get("domain");
  const domain = hostOf(target);

  switch (endpoint) {
    case "/web/scrape/markdown":
      return {
        url: target ?? `https://${domain}/`,
        markdown: DEMO_BRAND_WEBSITE_CONTENT,
        metadata: { title: "Fieldnote: AI meeting notes your team can search" },
      };
    case "/web/scrape/sitemap":
      return {
        success: true,
        domain,
        urls: DEMO_SITEMAP_PATHS.map((page) => `https://${domain}${page}`),
        meta: {
          sitemapsDiscovered: 1,
          sitemapsFetched: 1,
          sitemapsSkipped: 0,
          errors: 0,
        },
      };
    case "/brand/retrieve":
      return { status: "ok", brand: { domain, logos: [] } };
    case "/web/competitors":
      return {
        status: "ok",
        domain,
        target: { companyName: "Fieldnote", websiteUrl: `https://${domain}` },
        competitors: DEMO_COMPETITORS,
      };
    case "/brand/search": {
      const query = (params.get("query") ?? "").toLowerCase();
      return {
        results: DEMO_COMPETITORS.filter((competitor) =>
          competitor.name.toLowerCase().includes(query)
        ).map((competitor) => ({
          domain: competitor.domain,
          name: competitor.name,
          logo: "",
        })),
      };
    }
    case "/web/styleguide":
      return { status: "ok", domain, styleguide: DEMO_STYLEGUIDE };
    case "/web/screenshot":
      return {
        status: "ok",
        domain,
        screenshot: { url: DEMO_SCREENSHOT_URL, ...DEMO_SCREENSHOT_SIZE },
      };
    case "/web/search":
      return { query: searchQuery(init), results: DEMO_SEARCH_RESULTS };
    default:
      throw new Error(`Demo has no data for ${endpoint}`);
  }
}
