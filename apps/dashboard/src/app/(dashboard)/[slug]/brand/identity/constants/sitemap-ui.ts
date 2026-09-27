import type { SitemapPageCategory } from "@/types/hooks/brand-sitemaps";

export const PAGE_FILTER_TABS: {
  value: SitemapPageCategory;
}[] = [{ value: "crawled" }, { value: "failed" }];

export const SITEMAP_PAGES_PER_PAGE = 25;
