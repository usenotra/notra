import "@tanstack/react-start/server-only";
import { crawlSitemap } from "@notra/ai/utils/context-dev";

import {
  CONTEXT_DEV_SITEMAP_ID_PREFIX,
  CONTEXT_DEV_SITEMAP_MAX_LINKS,
  CONTEXT_DEV_SITEMAP_TIMEOUT_MS,
} from "@/constants/sitemap";
import type { Sitemap, SitemapPage } from "@/types/hooks/brand-sitemaps";

import {
  getHostname,
  getRegistrableHost,
  normalizeSitemapUrl,
} from "./sitemap-url";

// Scoped to the brand identity: the id is the primary key, so a URL-only id
// let another workspace adding the same sitemap take over this row.
function encodeSitemapId(brandSettingsId: string, url: string) {
  const encodedUrl = Buffer.from(url, "utf8").toString("base64url");
  return `${CONTEXT_DEV_SITEMAP_ID_PREFIX}:${brandSettingsId}:${encodedUrl}`;
}

function getPathFromUrl(url: string) {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

function toSitemapPage(sitemapId: string, url: string): SitemapPage {
  return {
    id: `${sitemapId}:${Buffer.from(url, "utf8").toString("base64url")}`,
    sitemapId,
    url,
    path: getPathFromUrl(url),
    title: null,
    category: "crawled",
    statusCode: null,
    redirectTarget: null,
    wordCount: null,
    textRatio: null,
    internalLinks: null,
    externalLinks: null,
    crawledAt: new Date().toISOString(),
  };
}

function getUniqueUrls(urls: string[]) {
  return Array.from(new Set(urls));
}

function getFailedPageCount(input: {
  errors: number;
  sitemapsSkipped: number;
  urlCount: number;
}) {
  if (input.urlCount > 0) {
    return input.errors;
  }

  return Math.max(input.errors + input.sitemapsSkipped, 1);
}

export async function getContextDevSitemap(input: {
  brandSettingsId: string;
  url: string;
  label?: string;
}): Promise<{ sitemap: Sitemap; pages: SitemapPage[] }> {
  const normalizedUrl = normalizeSitemapUrl(input.url);
  const hostname = getHostname(normalizedUrl);

  if (!hostname) {
    throw new Error("Invalid sitemap URL");
  }

  const response = await crawlSitemap({
    domain: hostname,
    maxLinks: CONTEXT_DEV_SITEMAP_MAX_LINKS,
    timeoutMS: CONTEXT_DEV_SITEMAP_TIMEOUT_MS,
  });

  const now = new Date().toISOString();
  const sitemapId = encodeSitemapId(input.brandSettingsId, normalizedUrl);
  const urls = getUniqueUrls(response.urls);
  const pages = urls.map((url) => toSitemapPage(sitemapId, url));
  const failedPages = getFailedPageCount({
    errors: response.meta.errors,
    sitemapsSkipped: response.meta.sitemapsSkipped,
    urlCount: urls.length,
  });
  const totalPages = urls.length + failedPages;
  const isReady = urls.length > 0;

  return {
    sitemap: {
      id: sitemapId,
      brandSettingsId: input.brandSettingsId,
      label:
        input.label?.trim() || getRegistrableHost(normalizedUrl) || hostname,
      url: normalizedUrl,
      hostname,
      status: isReady ? "ready" : "failed",
      totalPages,
      indexedPages: urls.length,
      failedPages,
      contextDevMeta: response.meta,
      lastCrawlError: isReady ? null : "No crawlable sitemap URLs found",
      lastCrawlStartedAt: now,
      lastCrawledAt: now,
      createdAt: now,
      updatedAt: now,
    },
    pages,
  };
}
