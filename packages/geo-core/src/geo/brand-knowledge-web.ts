import { crawlSitemap, fetchWebpage } from "@notra/ai/utils/context-dev";
import { db } from "@notra/db/drizzle";
import { brandSitemapPages, brandSitemaps } from "@notra/db/schema";
import { and, eq } from "drizzle-orm";

import {
  KNOWLEDGE_MAX_PAGES,
  KNOWLEDGE_SOURCE_CHARS,
} from "../constants/brand-knowledge";
import type { KnowledgeScanSource } from "../types/brand-knowledge";
import { pickKnowledgeUrls } from "../utils/brand-knowledge";

async function sitemapUrlsForVoice(voiceId: string): Promise<string[]> {
  const rows = await db
    .select({ url: brandSitemapPages.url })
    .from(brandSitemapPages)
    .innerJoin(brandSitemaps, eq(brandSitemapPages.sitemapId, brandSitemaps.id))
    .where(
      and(
        eq(brandSitemaps.brandSettingsId, voiceId),
        eq(brandSitemaps.status, "ready"),
        eq(brandSitemapPages.category, "crawled")
      )
    );
  return rows.map((row) => row.url);
}

export async function collectWebsiteKnowledgeSources(
  websiteUrl: string,
  voiceId: string
): Promise<KnowledgeScanSource[]> {
  const stored = await sitemapUrlsForVoice(voiceId);
  let sitemapUrls = stored;
  if (sitemapUrls.length === 0) {
    try {
      const crawled = await crawlSitemap({
        domain: new URL(websiteUrl).hostname.replace(/^www\./, ""),
        maxLinks: 250,
        timeoutMS: 30_000,
      });
      sitemapUrls = crawled.urls ?? [];
    } catch {
      sitemapUrls = [];
    }
  }
  const urls = pickKnowledgeUrls(websiteUrl, sitemapUrls, KNOWLEDGE_MAX_PAGES);
  const pages = await Promise.allSettled(
    (urls.length > 0 ? urls : [websiteUrl]).map((url) =>
      fetchWebpage({
        url,
        includeImages: false,
        includeLinks: false,
        onlyMainContent: true,
        timeoutMS: 20_000,
      })
    )
  );
  return pages.flatMap((result) => {
    if (result.status !== "fulfilled") {
      return [];
    }
    const markdown = result.value.markdown?.trim() ?? "";
    if (!markdown) {
      return [];
    }
    return [
      {
        origin: "website" as const,
        url: result.value.url,
        markdown: markdown.slice(0, KNOWLEDGE_SOURCE_CHARS),
      },
    ];
  });
}
