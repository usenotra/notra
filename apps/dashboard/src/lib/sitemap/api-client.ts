import { SITEMAP_PAGES_FETCH_LIMIT } from "@/constants/sitemap";
import { dashboardOrpcClient } from "@/lib/orpc/client";
import type {
  SitemapPage,
  SitemapPagesResponse,
} from "@/types/hooks/brand-sitemaps";

export async function fetchAllSitemapPages(
  organizationId: string,
  voiceId: string,
  sitemapId: string
): Promise<SitemapPagesResponse> {
  const pages: SitemapPage[] = [];
  let counts: SitemapPagesResponse["counts"];
  let cursor: string | undefined;

  do {
    const result = await dashboardOrpcClient.brand.sitemaps.pages({
      cursor,
      limit: SITEMAP_PAGES_FETCH_LIMIT,
      organizationId,
      sitemapId,
      voiceId,
    });

    for (const page of result.pages) {
      pages.push(page);
    }
    counts = result.counts;
    cursor = result.hasMore ? (result.nextCursor ?? undefined) : undefined;
  } while (cursor);

  return { counts, pages };
}
