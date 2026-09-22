import type { SitemapPageCategory } from "@/types/hooks/brand-sitemaps";

export const PAGE_FILTER_TABS: {
  value: SitemapPageCategory;
  label: string;
}[] = [
  { value: "crawled", label: "Crawled Pages" },
  { value: "failed", label: "Failed" },
];

export const SITEMAP_PAGES_PER_PAGE = 25;
