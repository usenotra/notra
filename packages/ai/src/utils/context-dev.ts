import type {
  ContextDevBrandRetrieveResponse,
  ContextDevBrandSearchResponse,
  ContextDevCompetitorsResponse,
  ContextDevCrawlSitemapInput,
  ContextDevCrawlSitemapResponse,
  ContextDevErrorResponse,
  ContextDevFetchWebpageInput,
  ContextDevFetchWebpageResponse,
  ContextDevScrapingResult,
  ContextDevScreenshotInput,
  ContextDevScreenshotResponse,
  ContextDevSearchResponse,
  ContextDevSearchResult,
  ContextDevStyleguideResponse,
  ContextDevWebSearchInput,
  ContextDevWebSearchResponse,
} from "@notra/ai/types/context-dev";
import type { OperationalLogEvent } from "@notra/ai/types/operational-log";

import {
  BRAND_ANALYSIS_EXCLUDED_PATH_PARTS,
  BRAND_ANALYSIS_MAX_CONTENT_LENGTH,
  BRAND_ANALYSIS_MAX_PAGES,
  BRAND_ANALYSIS_PAGE_SEPARATOR,
  BRAND_ANALYSIS_PAGE_WEIGHTS,
  BRAND_ANALYSIS_SITEMAP_MAX_LINKS,
  BRAND_ANALYSIS_SITEMAP_TIMEOUT_MS,
  BRAND_ANALYSIS_WWW_PREFIX,
  BRAND_SEARCH_TYPO_TOLERANCE,
  COMPETITORS_TIMEOUT_MS,
} from "../constants/context-dev";
import { httpErrorKind } from "./http-error-kind";
import { logOperationalEvent } from "./operational-log";

const CONTEXT_DEV_API_BASE_URL = "https://api.context.dev/v1";
const HTTP_PROTOCOL_REGEX = /^https?:\/\//i;

class ContextDevApiError extends Error {
  readonly code?: string;
  readonly status: number;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.code = code;
    this.name = "ContextDevApiError";
    this.status = status;
  }
}

function getContextDevApiKey(): string {
  const apiKey = process.env.CONTEXT_DEV_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("CONTEXT_DEV_API_KEY is not configured.");
  }
  return apiKey;
}

function getContextDevErrorMessage(
  payload: ContextDevErrorResponse | undefined,
  status: number
) {
  if (typeof payload?.message === "string" && payload.message.length > 0) {
    return payload.message;
  }

  if (payload?.message !== undefined) {
    try {
      return JSON.stringify(payload.message);
    } catch {
      // Fall through to the generic message below.
    }
  }

  return `Website data request failed with status ${status}`;
}

async function parseContextDevError(response: Response): Promise<never> {
  let payload: ContextDevErrorResponse | undefined;
  try {
    payload = (await response.json()) as ContextDevErrorResponse;
  } catch {
    payload = undefined;
  }

  throw new ContextDevApiError(
    getContextDevErrorMessage(payload, response.status),
    response.status,
    payload?.error_code
  );
}

async function requestContextDev<TResponse>(
  path: string,
  init: RequestInit
): Promise<TResponse> {
  const startedAt = performance.now();
  let status: number | undefined;
  let outcome: "success" | "error" = "error";
  let errorName: string | undefined;
  let errorKind: OperationalLogEvent["errorKind"] = "operation_error";
  try {
    const apiKey = getContextDevApiKey();
    errorKind = "transport_error";
    const response = await fetch(`${CONTEXT_DEV_API_BASE_URL}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
    status = response.status;
    errorKind = httpErrorKind(status) ?? "operation_error";
    if (!response.ok) {
      return await parseContextDevError(response);
    }
    // Fetch resolves at headers; body reads can still fail. Keep the native
    // JSON decoder and distinguish its SyntaxError from a transport failure.
    errorKind = "transport_error";
    const payload = (await response.json()) as TResponse;
    outcome = "success";
    return payload;
  } catch (error) {
    if (error instanceof SyntaxError) {
      errorKind = "operation_error";
    }
    errorName = error instanceof Error ? error.name : "UnknownError";
    throw error;
  } finally {
    logOperationalEvent({
      event: "integration.request.completed",
      surface: "context-dev",
      provider: "context.dev",
      routeId: path.split("?")[0] ?? path,
      method: init.method ?? "GET",
      durationMs: Math.round(performance.now() - startedAt),
      status,
      outcome,
      errorName,
      errorKind: outcome === "error" ? errorKind : undefined,
    });
  }
}

function truncateContent(content: string): string {
  if (content.length <= BRAND_ANALYSIS_MAX_CONTENT_LENGTH) {
    return content;
  }

  return `${content.slice(0, BRAND_ANALYSIS_MAX_CONTENT_LENGTH)}\n\n[Content truncated for brand analysis]`;
}

function mapContextDevError(error: unknown): ContextDevScrapingResult {
  if (error instanceof ContextDevApiError) {
    if (
      error.code === "INPUT_VALIDATION_ERROR" ||
      error.message.includes("Invalid URL")
    ) {
      return { success: false, error: "Invalid URL", fatal: true };
    }

    if (
      error.status === 403 ||
      error.status === 404 ||
      error.status === 415 ||
      error.code === "WEBSITE_ACCESS_ERROR" ||
      error.code === "UNSUPPORTED_CONTENT" ||
      error.code === "NOT_FOUND"
    ) {
      return {
        success: false,
        error:
          error.code === "NOT_FOUND"
            ? "Website URL not found"
            : "Unsupported website URL",
        fatal: true,
      };
    }

    return {
      success: false,
      error: error.message || "Failed to scrape website",
      fatal: false,
    };
  }

  return {
    success: false,
    error:
      error instanceof Error
        ? error.message
        : "Unknown error attempting to scrape website",
    fatal: false,
  };
}

function getDomainFromUrl(url: string): string {
  return new URL(url).hostname;
}

function normalizeBrandHostname(hostname: string): string {
  return hostname.startsWith(BRAND_ANALYSIS_WWW_PREFIX)
    ? hostname.slice(BRAND_ANALYSIS_WWW_PREFIX.length)
    : hostname;
}

function normalizeUrl(url: string): string {
  const parsed = new URL(url);
  parsed.hash = "";
  return parsed.toString();
}

function normalizeContextDevWebsiteUrl(url: string): string {
  const trimmed = url.trim();
  return HTTP_PROTOCOL_REGEX.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function getCanonicalUrlKey(url: string): string {
  const parsed = new URL(url);
  parsed.hash = "";
  parsed.hostname = normalizeBrandHostname(parsed.hostname);
  return parsed.toString();
}

function dedupeUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const url of urls) {
    try {
      const normalized = normalizeUrl(url);
      const key = getCanonicalUrlKey(normalized);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      result.push(normalized);
    } catch {
      // Ignore malformed sitemap entries returned by external crawlers.
    }
  }

  return result;
}

function shouldSkipBrandAnalysisUrl(url: string): boolean {
  try {
    const { pathname } = new URL(url);
    const lowerPath = pathname.toLowerCase();
    const segments = lowerPath.split("/").filter(Boolean);
    return BRAND_ANALYSIS_EXCLUDED_PATH_PARTS.some((part) => {
      const blockedSegment = part.replace(/^\/|\/$/g, "");
      return segments.includes(blockedSegment);
    });
  } catch {
    return true;
  }
}

function scoreBrandAnalysisUrl(url: string, sourceUrl: string): number {
  try {
    const parsed = new URL(url);
    const source = new URL(sourceUrl);

    if (
      normalizeBrandHostname(parsed.hostname) !==
      normalizeBrandHostname(source.hostname)
    ) {
      return -1;
    }

    if (shouldSkipBrandAnalysisUrl(url)) {
      return -1;
    }

    const path = parsed.pathname.endsWith("/")
      ? parsed.pathname
      : `${parsed.pathname}/`;
    const pathDepth = path.split("/").filter(Boolean).length;
    const weightedScore =
      BRAND_ANALYSIS_PAGE_WEIGHTS.find(({ pattern }) => pattern.test(path))
        ?.weight ?? Math.max(10, 45 - pathDepth * 10);

    return weightedScore - parsed.search.length * 0.1;
  } catch {
    return -1;
  }
}

function pickBrandAnalysisUrls(sourceUrl: string, sitemapUrls: string[]) {
  const [source, ...candidates] = dedupeUrls([sourceUrl, ...sitemapUrls]);
  if (!source) {
    return [];
  }

  const rankedCandidates = candidates
    .map((url) => ({ score: scoreBrandAnalysisUrl(url, source), url }))
    .filter(({ score }) => score >= 0)
    .sort((a, b) => b.score - a.score)
    .map(({ url }) => url);

  return dedupeUrls([source, ...rankedCandidates]).slice(
    0,
    BRAND_ANALYSIS_MAX_PAGES
  );
}

function formatScrapedPagesForBrandAnalysis(
  pages: ContextDevFetchWebpageResponse[]
) {
  return pages
    .map((page) => {
      const title = page.metadata?.title
        ? `\nTitle: ${page.metadata.title}`
        : "";
      return `Source URL: ${page.url}${title}\n\n${page.markdown}`;
    })
    .join(BRAND_ANALYSIS_PAGE_SEPARATOR);
}

export async function scrapeWebsiteForBrandAnalysis(
  url: string
): Promise<ContextDevScrapingResult> {
  const websiteUrl = normalizeContextDevWebsiteUrl(url);

  try {
    const sitemapResult = await crawlSitemapForBrandAnalysis(websiteUrl).catch(
      (error) => {
        console.warn("[Context.dev] Sitemap crawl failed for brand analysis", {
          error: error instanceof Error ? error.message : "Unknown error",
          url: websiteUrl,
        });
        return null;
      }
    );

    const urls = pickBrandAnalysisUrls(websiteUrl, sitemapResult?.urls ?? []);
    const scrapeResult = await scrapeBrandAnalysisPages(
      urls.length > 0 ? urls : [websiteUrl]
    );
    const { pages } = scrapeResult;

    if (pages.length === 0) {
      return scrapeResult.firstError
        ? mapContextDevError(scrapeResult.firstError)
        : {
            success: false,
            error: "Failed to scrape website",
            fatal: false,
          };
    }

    return {
      success: true,
      content: truncateContent(formatScrapedPagesForBrandAnalysis(pages)),
    };
  } catch (error) {
    console.error("Error scraping website:", error);
    return mapContextDevError(error);
  }
}

async function scrapeBrandAnalysisPages(urls: string[]) {
  const settledPages = await Promise.allSettled(
    urls.map((pageUrl) =>
      fetchWebpage({
        includeImages: false,
        includeLinks: true,
        onlyMainContent: true,
        timeoutMS: 20_000,
        url: pageUrl,
      })
    )
  );

  const firstError = settledPages.find(
    (result) => result.status === "rejected"
  )?.reason;

  return {
    firstError,
    pages: settledPages.flatMap((result) =>
      result.status === "fulfilled" ? [result.value] : []
    ),
  };
}

async function crawlSitemapForBrandAnalysis(url: string) {
  return crawlSitemap({
    domain: getDomainFromUrl(url),
    maxLinks: BRAND_ANALYSIS_SITEMAP_MAX_LINKS,
    timeoutMS: BRAND_ANALYSIS_SITEMAP_TIMEOUT_MS,
  });
}

export async function fetchWebpage(
  input: ContextDevFetchWebpageInput
): Promise<ContextDevFetchWebpageResponse> {
  const url = normalizeContextDevWebsiteUrl(input.url);
  const params = new URLSearchParams({
    includeImages: String(input.includeImages ?? false),
    includeLinks: String(input.includeLinks ?? true),
    shortenBase64Images: "true",
    useMainContentOnly: String(input.onlyMainContent ?? true),
    url,
  });

  if (input.maxAgeMs !== undefined) {
    params.set("maxAgeMs", String(input.maxAgeMs));
  }
  if (input.waitForMs !== undefined) {
    params.set("waitForMs", String(input.waitForMs));
  }
  if (input.timeoutMS !== undefined) {
    params.set("timeoutMS", String(input.timeoutMS));
  }

  const response = await requestContextDev<{
    markdown: string;
    metadata?: ContextDevFetchWebpageResponse["metadata"];
    url: string;
  }>(`/web/scrape/markdown?${params.toString()}`, { method: "GET" });

  return {
    success: true,
    markdown: response.markdown,
    metadata: response.metadata,
    url: response.url,
  };
}

export async function crawlSitemap(
  input: ContextDevCrawlSitemapInput
): Promise<ContextDevCrawlSitemapResponse> {
  const params = new URLSearchParams({
    domain: input.domain,
  });

  if (input.maxLinks !== undefined) {
    params.set("maxLinks", String(input.maxLinks));
  }
  if (input.timeoutMS !== undefined) {
    params.set("timeoutMS", String(input.timeoutMS));
  }
  if (input.urlRegex !== undefined) {
    params.set("urlRegex", input.urlRegex);
  }

  return requestContextDev<ContextDevCrawlSitemapResponse>(
    `/web/scrape/sitemap?${params.toString()}`,
    { method: "GET" }
  );
}

export async function retrieveBrand(
  domain: string
): Promise<ContextDevBrandRetrieveResponse> {
  const params = new URLSearchParams({ domain });

  return requestContextDev<ContextDevBrandRetrieveResponse>(
    `/brand/retrieve?${params.toString()}`,
    { method: "GET" }
  );
}

export async function extractCompetitors(
  domain: string,
  numCompetitors: number
): Promise<ContextDevCompetitorsResponse> {
  const params = new URLSearchParams({
    domain,
    numCompetitors: String(numCompetitors),
    timeoutMS: String(COMPETITORS_TIMEOUT_MS),
  });

  return requestContextDev<ContextDevCompetitorsResponse>(
    `/web/competitors?${params.toString()}`,
    { method: "GET" }
  );
}

export async function searchBrands(
  query: string
): Promise<ContextDevBrandSearchResponse> {
  const params = new URLSearchParams({
    query,
    autocomplete: "true",
    typoTolerance: String(BRAND_SEARCH_TYPO_TOLERANCE),
  });

  return requestContextDev<ContextDevBrandSearchResponse>(
    `/brand/search?${params.toString()}`,
    { method: "GET" }
  );
}

export async function retrieveStyleguide(
  domain: string
): Promise<ContextDevStyleguideResponse> {
  const params = new URLSearchParams({
    domain,
    timeoutMS: "30000",
  });

  return requestContextDev<ContextDevStyleguideResponse>(
    `/web/styleguide?${params.toString()}`,
    { method: "GET" }
  );
}

export async function captureScreenshot(
  input: ContextDevScreenshotInput
): Promise<ContextDevScreenshotResponse> {
  const { directUrl, domain } = input;
  const hasDomain = domain !== undefined;
  const hasDirectUrl = directUrl !== undefined;

  if (!(hasDomain || hasDirectUrl)) {
    throw new Error("Screenshot capture requires a domain or directUrl.");
  }
  if (hasDomain && hasDirectUrl) {
    throw new Error("Screenshot capture accepts either domain or directUrl.");
  }

  const params = new URLSearchParams();

  if (hasDomain) {
    params.set("domain", domain);
  }
  if (hasDirectUrl) {
    params.set("directUrl", directUrl);
  }

  if (input.viewport !== undefined) {
    params.set("viewport[width]", String(input.viewport.width));
    params.set("viewport[height]", String(input.viewport.height));
  }
  if (input.format !== undefined) {
    params.set("format", input.format);
  }
  if (input.fullScreenshot !== undefined) {
    params.set("fullScreenshot", String(input.fullScreenshot));
  }
  if (input.handleCookiePopup !== undefined) {
    params.set("handleCookiePopup", String(input.handleCookiePopup));
  }
  if (input.maxAgeMs !== undefined) {
    params.set("maxAgeMs", String(input.maxAgeMs));
  }
  if (input.scrollOffset !== undefined) {
    params.set("scrollOffset", String(input.scrollOffset));
  }
  if (input.waitForMs !== undefined) {
    params.set("waitForMs", String(input.waitForMs));
  }
  if (input.timeoutMS !== undefined) {
    params.set("timeoutMS", String(input.timeoutMS));
  }

  return requestContextDev<ContextDevScreenshotResponse>(
    `/web/screenshot?${params.toString()}`,
    { method: "GET" }
  );
}

function shouldScrapeMarkdown(input: ContextDevWebSearchInput): boolean {
  return Boolean(input.scrapeOptions?.formats?.includes("markdown"));
}

function toMaxAgeMs(maxAge?: number) {
  return typeof maxAge === "number" ? maxAge : undefined;
}

function normalizeSearchResult(
  result: ContextDevSearchResult
): ContextDevSearchResult {
  return {
    ...result,
    markdown: result.markdown ?? {
      code: "NOT_REQUESTED",
      markdown: null,
    },
  };
}

export async function searchWeb(
  input: ContextDevWebSearchInput
): Promise<ContextDevWebSearchResponse> {
  const response = await requestContextDev<ContextDevSearchResponse>(
    "/web/search",
    {
      body: JSON.stringify({
        query: input.query,
        includeDomains: input.includeDomains,
        excludeDomains: input.excludeDomains,
        freshness: input.freshness,
        queryFanout: input.queryFanout,
        timeoutMS: input.timeoutMS,
        markdownOptions: {
          enabled: shouldScrapeMarkdown(input),
          includeLinks: true,
          includeImages:
            input.scrapeOptions?.formats?.includes("images") ?? false,
          shortenBase64Images: true,
          useMainContentOnly: input.scrapeOptions?.onlyMainContent ?? true,
          maxAgeMs: toMaxAgeMs(input.scrapeOptions?.maxAge),
        },
      }),
      method: "POST",
    }
  );

  const results = response.results
    .slice(0, input.limit ?? 5)
    .map(normalizeSearchResult);
  return {
    success: true,
    data: { web: results },
    results,
    query: response.query,
  };
}
