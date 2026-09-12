import type { SitemapToolsConfig } from "@notra/ai/types/geo-writer";
import { fetchWebpage } from "@notra/ai/utils/context-dev";
import { toolDescription } from "@notra/ai/utils/description";
import { db } from "@notra/db/drizzle";
import { brandSitemapPages, brandSitemaps } from "@notra/db/schema";
import { type Tool, tool } from "ai";
import { and, eq, ilike, inArray, or, sql } from "drizzle-orm";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";

const DEFAULT_PAGE_LIMIT = 40;
const MAX_PAGE_LIMIT = 100;
const MAX_FETCHED_MARKDOWN_CHARS = 6000;
const FETCH_TIMEOUT_MS = 20_000;

async function listSitemapIds(brandSettingsId: string): Promise<string[]> {
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
      const sitemapIds = await listSitemapIds(config.brandSettingsId);
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
      const sitemapIds = await listSitemapIds(config.brandSettingsId);
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
