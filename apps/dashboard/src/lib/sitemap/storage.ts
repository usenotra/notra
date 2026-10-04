import "@tanstack/react-start/server-only";
import { db } from "@notra/db/drizzle";
import { brandSitemapPages, brandSitemaps } from "@notra/db/schema";
import { and, count, desc, eq, ne, sql } from "drizzle-orm";

import type {
  Sitemap,
  SitemapPage,
  SitemapPageCategory,
} from "@/types/hooks/brand-sitemaps";

const DEFAULT_PAGE_LIMIT = 50;
const MAX_PAGE_LIMIT = 100;

function toIsoString(value: Date | null) {
  return value ? value.toISOString() : null;
}

function toDate(value: string | null) {
  return value ? new Date(value) : null;
}

function toSitemap(row: typeof brandSitemaps.$inferSelect): Sitemap {
  return {
    brandSettingsId: row.brandSettingsId,
    contextDevMeta: row.contextDevMeta,
    createdAt: row.createdAt.toISOString(),
    failedPages: row.failedPages,
    hostname: row.hostname,
    id: row.id,
    indexedPages: row.indexedPages,
    label: row.label,
    lastCrawlError: row.lastCrawlError,
    lastCrawlStartedAt: toIsoString(row.lastCrawlStartedAt),
    lastCrawledAt: toIsoString(row.lastCrawledAt),
    status: row.status,
    totalPages: row.totalPages,
    updatedAt: row.updatedAt.toISOString(),
    url: row.url,
  };
}

function toSitemapPage(
  row: typeof brandSitemapPages.$inferSelect
): SitemapPage {
  return {
    category: row.category,
    crawledAt: toIsoString(row.crawledAt),
    externalLinks: row.externalLinks,
    id: row.id,
    internalLinks: row.internalLinks,
    path: row.path,
    redirectTarget: row.redirectTarget,
    sitemapId: row.sitemapId,
    statusCode: row.statusCode,
    textRatio: row.textRatio,
    title: row.title,
    url: row.url,
    wordCount: row.wordCount,
  };
}

function toPageInsert(page: SitemapPage) {
  return {
    category: page.category,
    crawledAt: toDate(page.crawledAt),
    externalLinks: page.externalLinks,
    id: page.id,
    internalLinks: page.internalLinks,
    path: page.path,
    redirectTarget: page.redirectTarget,
    sitemapId: page.sitemapId,
    statusCode: page.statusCode,
    textRatio: page.textRatio,
    title: page.title,
    url: page.url,
    wordCount: page.wordCount,
  };
}

function getSitemapCountsFromSnapshot(sitemap: Sitemap) {
  return {
    crawled: sitemap.indexedPages,
    failed: sitemap.failedPages,
    queued: 0,
    redirect: 0,
  } satisfies Record<SitemapPageCategory, number>;
}

export async function listStoredSitemaps(
  _organizationId: string,
  voiceId: string
) {
  const rows = await db.query.brandSitemaps.findMany({
    orderBy: [desc(brandSitemaps.updatedAt)],
    where: eq(brandSitemaps.brandSettingsId, voiceId),
  });

  return rows.map(toSitemap);
}

export async function getStoredSitemapPages(
  _organizationId: string,
  voiceId: string,
  sitemapId: string,
  options: {
    category?: SitemapPageCategory;
    cursor?: string;
    limit?: number;
    query?: string;
  } = {}
) {
  const sitemapRow = await db.query.brandSitemaps.findFirst({
    where: and(
      eq(brandSitemaps.id, sitemapId),
      eq(brandSitemaps.brandSettingsId, voiceId)
    ),
  });

  if (!sitemapRow) {
    return null;
  }

  const limit = Math.min(
    Math.max(options.limit ?? DEFAULT_PAGE_LIMIT, 1),
    MAX_PAGE_LIMIT
  );
  const filters = [
    eq(brandSitemapPages.sitemapId, sitemapId),
    options.category
      ? eq(brandSitemapPages.category, options.category)
      : undefined,
    options.query
      ? sql`(${brandSitemapPages.url} ilike ${`%${options.query}%`} or ${brandSitemapPages.title} ilike ${`%${options.query}%`})`
      : undefined,
    options.cursor
      ? sql`${brandSitemapPages.id} > ${options.cursor}`
      : undefined,
  ].filter(Boolean);
  const where = and(...filters);

  const [rows, countRows] = await Promise.all([
    db
      .select()
      .from(brandSitemapPages)
      .where(where)
      .orderBy(brandSitemapPages.id)
      .limit(limit + 1),
    db
      .select({
        category: brandSitemapPages.category,
        total: count(),
      })
      .from(brandSitemapPages)
      .where(eq(brandSitemapPages.sitemapId, sitemapId))
      .groupBy(brandSitemapPages.category),
  ]);

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const categoryCounts = getSitemapCountsFromSnapshot(toSitemap(sitemapRow));

  for (const row of countRows) {
    categoryCounts[row.category] = row.total;
  }

  return {
    counts: categoryCounts,
    hasMore,
    nextCursor: hasMore ? (pageRows.at(-1)?.id ?? null) : null,
    pages: pageRows.map(toSitemapPage),
  };
}

export async function saveStoredSitemap(input: {
  organizationId: string;
  voiceId: string;
  sitemap: Sitemap;
  pages: SitemapPage[];
}) {
  await db.transaction(async (tx) => {
    // Re-adding a URL replaces this identity's earlier row, including rows
    // saved before ids were scoped to the identity.
    await tx
      .delete(brandSitemaps)
      .where(
        and(
          eq(brandSitemaps.brandSettingsId, input.voiceId),
          eq(brandSitemaps.url, input.sitemap.url),
          ne(brandSitemaps.id, input.sitemap.id)
        )
      );
    await tx
      .insert(brandSitemaps)
      .values({
        brandSettingsId: input.voiceId,
        contextDevMeta: input.sitemap.contextDevMeta,
        failedPages: input.sitemap.failedPages,
        hostname: input.sitemap.hostname,
        id: input.sitemap.id,
        indexedPages: input.sitemap.indexedPages,
        label: input.sitemap.label,
        lastCrawlError: input.sitemap.lastCrawlError ?? null,
        lastCrawlStartedAt: toDate(input.sitemap.lastCrawlStartedAt ?? null),
        lastCrawledAt: toDate(input.sitemap.lastCrawledAt),
        status: input.sitemap.status,
        totalPages: input.sitemap.totalPages,
        url: input.sitemap.url,
      })
      .onConflictDoUpdate({
        set: {
          contextDevMeta: input.sitemap.contextDevMeta,
          failedPages: input.sitemap.failedPages,
          hostname: input.sitemap.hostname,
          indexedPages: input.sitemap.indexedPages,
          label: input.sitemap.label,
          lastCrawlError: input.sitemap.lastCrawlError ?? null,
          lastCrawlStartedAt: toDate(input.sitemap.lastCrawlStartedAt ?? null),
          lastCrawledAt: toDate(input.sitemap.lastCrawledAt),
          status: input.sitemap.status,
          totalPages: input.sitemap.totalPages,
          updatedAt: new Date(),
          url: input.sitemap.url,
        },
        target: brandSitemaps.id,
      });

    await tx
      .delete(brandSitemapPages)
      .where(eq(brandSitemapPages.sitemapId, input.sitemap.id));

    if (input.pages.length > 0) {
      await tx.insert(brandSitemapPages).values(input.pages.map(toPageInsert));
    }
  });
}

export async function deleteStoredSitemap(input: {
  organizationId: string;
  voiceId: string;
  sitemapId: string;
}) {
  const deleted = await db
    .delete(brandSitemaps)
    .where(
      and(
        eq(brandSitemaps.id, input.sitemapId),
        eq(brandSitemaps.brandSettingsId, input.voiceId)
      )
    )
    .returning({ id: brandSitemaps.id });

  return deleted.length > 0;
}
