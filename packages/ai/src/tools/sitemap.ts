import type { SitemapToolsConfig } from "@notra/ai/types/geo-writer";
import { crawlSitemap, fetchWebpage } from "@notra/ai/utils/context-dev";
import { toolDescription } from "@notra/ai/utils/description";
import { db } from "@notra/db/drizzle";
import {
  brandSettings,
  brandSitemapPages,
  brandSitemaps,
} from "@notra/db/schema";
import { type Tool, tool } from "ai";
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";

import { isWebSearchAvailable } from "./web-search";

const DEFAULT_PAGE_LIMIT = 40;
const MAX_PAGE_LIMIT = 100;
const MAX_FETCHED_MARKDOWN_CHARS = 6000;
const FETCH_TIMEOUT_MS = 20_000;
const DEFAULT_CRAWL_MAX_LINKS = 100;
const MAX_CRAWL_LINKS = 500;

export const CRAWL_SITEMAP_TOOL_NAME = "crawlSitemap";
export const GET_SITEMAP_PAGES_TOOL_NAME = "getSitemapPages";
export const FETCH_SITEMAP_PAGE_TOOL_NAME = "fetchSitemapPage";

export const GET_SITEMAP_PAGES_TOOL_DESCRIPTION =
  "**Sitemap**: List the brand's crawled pages with getSitemapPages before adding internal links. Fetch one listed URL with fetchSitemapPage when you need its content. If the sitemap is empty, crawl a live domain with crawlSitemap, then read pages with fetchWebpage.";

async function resolveBrandSettingsId(
  config: SitemapToolsConfig
): Promise<string | undefined> {
  if (config.brandSettingsId) {
    return config.brandSettingsId;
  }
  if (!config.organizationId) {
    return undefined;
  }

  const identity = await db.query.brandSettings.findFirst({
    where: eq(brandSettings.organizationId, config.organizationId),
    columns: { id: true },
    orderBy: [desc(brandSettings.isDefault), desc(brandSettings.createdAt)],
  });
  return identity?.id;
}

async function listSitemapIds(config: SitemapToolsConfig): Promise<string[]> {
  const brandSettingsId = await resolveBrandSettingsId(config);
  if (!brandSettingsId) {
    return [];
  }

  const rows = await db
    .select({ id: brandSitemaps.id })
    .from(brandSitemaps)
    .where(eq(brandSitemaps.brandSettingsId, brandSettingsId));
  return rows.map((row) => row.id);
}

export function createGetSitemapPagesTool(config: SitemapToolsConfig): Tool {
  return tool({
    description: toolDescription({
      toolName: "getSitemapPages",
      intro:
        "Lists pages from the brand's crawled sitemap so you can link to real pages on the brand's own website.",
      whenToUse:
        "Before adding any internal link, and when you want to know which product, pricing, docs, or comparison pages exist.",
      usageNotes:
        "Only URLs returned here may be used as internal links. Filter with query, which matches the title or path. Returns an empty list when no sitemap has been crawled; in that case, use no internal links.",
    }),
    inputSchema: z.object({
      query: z
        .string()
        .trim()
        .max(120)
        .optional()
        .describe("Case-insensitive match against the page title or path"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(MAX_PAGE_LIMIT)
        .default(DEFAULT_PAGE_LIMIT),
    }),
    execute: async ({ query, limit }) => {
      const sitemapIds = await listSitemapIds(config);
      if (sitemapIds.length === 0) {
        return { pages: [], total: 0, hasSitemap: false };
      }

      const filters = [
        inArray(brandSitemapPages.sitemapId, sitemapIds),
        eq(brandSitemapPages.category, "crawled"),
      ];
      if (query) {
        const pattern = `%${query}%`;
        filters.push(
          or(
            ilike(brandSitemapPages.title, pattern),
            ilike(brandSitemapPages.path, pattern)
          ) ?? ilike(brandSitemapPages.path, pattern)
        );
      }
      const rows = await db
        .select({
          url: brandSitemapPages.url,
          path: brandSitemapPages.path,
          title: brandSitemapPages.title,
          category: brandSitemapPages.category,
          wordCount: brandSitemapPages.wordCount,
        })
        .from(brandSitemapPages)
        .where(and(...filters))
        .orderBy(sql`${brandSitemapPages.wordCount} desc nulls last`)
        .limit(limit);

      return { pages: rows, total: rows.length, hasSitemap: true };
    },
  });
}

export function createFetchSitemapPageTool(config: SitemapToolsConfig): Tool {
  return tool({
    description: toolDescription({
      toolName: "fetchSitemapPage",
      intro:
        "Fetches the main content of one page from the brand's own sitemap as markdown.",
      whenToUse:
        "When you plan to link to a page and want to describe it accurately, or when you need a product detail from the brand's site.",
      usageNotes:
        "The URL must come from getSitemapPages. Content is truncated. Use it on at most a handful of pages.",
    }),
    inputSchema: z.object({
      url: z.string().url().describe("A URL returned by getSitemapPages"),
    }),
    execute: async ({ url }) => {
      const sitemapIds = await listSitemapIds(config);
      if (sitemapIds.length === 0) {
        return { error: "This brand has no crawled sitemap." };
      }

      const page = await db
        .select({ url: brandSitemapPages.url })
        .from(brandSitemapPages)
        .where(
          and(
            inArray(brandSitemapPages.sitemapId, sitemapIds),
            eq(brandSitemapPages.url, url),
            eq(brandSitemapPages.category, "crawled")
          )
        )
        .limit(1);

      if (page.length === 0) {
        return {
          error:
            "That URL is not part of the brand sitemap. Call getSitemapPages and pick a listed URL.",
        };
      }

      try {
        const result = await fetchWebpage({
          url,
          onlyMainContent: true,
          includeLinks: false,
          timeoutMS: FETCH_TIMEOUT_MS,
        });
        return {
          url: result.url,
          title: result.metadata?.title ?? null,
          description: result.metadata?.description ?? null,
          markdown: result.markdown.slice(0, MAX_FETCHED_MARKDOWN_CHARS),
          truncated: result.markdown.length > MAX_FETCHED_MARKDOWN_CHARS,
        };
      } catch (error) {
        return {
          error:
            error instanceof Error
              ? `Failed to fetch the page: ${error.message}`
              : "Failed to fetch the page.",
        };
      }
    },
  });
}

const crawlSitemapInputSchema = z.object({
  domain: z
    .string()
    .trim()
    .min(1)
    .describe("Hostname or domain, for example example.com"),
  urlRegex: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe("Optional regex to keep matching URLs, for example /blog/"),
  maxLinks: z
    .number()
    .int()
    .min(1)
    .max(MAX_CRAWL_LINKS)
    .default(DEFAULT_CRAWL_MAX_LINKS),
});

export function createCrawlSitemapTool(): Tool {
  return tool({
    description: toolDescription({
      toolName: CRAWL_SITEMAP_TOOL_NAME,
      intro:
        "Discovers public URLs from a website's live sitemap via Context.dev.",
      whenToUse:
        "When getSitemapPages is empty, when researching a competitor or company domain, or when you need a fresh list of blog, docs, pricing, or product pages before writing.",
      usageNotes:
        "Pass a domain like example.com, not a full article URL. Filter with urlRegex when you only need a section of the site. Then read interesting URLs with fetchWebpage. Do not invent URLs that were not returned.",
    }),
    inputSchema: crawlSitemapInputSchema,
    execute: async ({ domain, urlRegex, maxLinks }) => {
      try {
        const result = await crawlSitemap({ domain, urlRegex, maxLinks });
        return {
          domain: result.domain,
          urls: result.urls,
          total: result.urls.length,
        };
      } catch (error) {
        return {
          error:
            error instanceof Error
              ? `Failed to crawl the sitemap: ${error.message}`
              : "Failed to crawl the sitemap.",
        };
      }
    },
  });
}

export function createUnavailableCrawlSitemapTool(): Tool {
  return tool({
    description: toolDescription({
      toolName: CRAWL_SITEMAP_TOOL_NAME,
      intro:
        "Explain that live sitemap crawling is unavailable because Context.dev is not configured.",
      whenToUse:
        "Use when the user asks to crawl a sitemap and Context.dev API credentials are missing.",
      usageNotes:
        "Return the configuration error. Do not claim that no sitemap tool exists.",
    }),
    inputSchema: crawlSitemapInputSchema,
    execute: async () => ({
      error:
        "Context.dev is not configured. Set CONTEXT_DEV_API_KEY to crawl sitemaps.",
    }),
  });
}

export function registerSitemapTools(
  tools: Record<string, Tool>,
  descriptions: string[],
  config: SitemapToolsConfig
) {
  tools[GET_SITEMAP_PAGES_TOOL_NAME] = createGetSitemapPagesTool(config);
  tools[FETCH_SITEMAP_PAGE_TOOL_NAME] = createFetchSitemapPageTool(config);
  tools[CRAWL_SITEMAP_TOOL_NAME] = isWebSearchAvailable()
    ? createCrawlSitemapTool()
    : createUnavailableCrawlSitemapTool();
  descriptions.push(GET_SITEMAP_PAGES_TOOL_DESCRIPTION);
}
