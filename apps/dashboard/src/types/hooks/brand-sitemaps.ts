import type { ReactNode } from "react";

export type SitemapStatus = "queued" | "crawling" | "ready" | "failed";

export type SitemapPageCategory = "crawled" | "redirect" | "queued" | "failed";

export interface Sitemap {
  id: string;
  brandSettingsId: string;
  label: string;
  url: string;
  hostname: string;
  status: SitemapStatus;
  totalPages: number;
  indexedPages: number;
  failedPages: number;
  contextDevMeta?: unknown;
  lastCrawlStartedAt?: string | null;
  lastCrawlError?: string | null;
  lastCrawledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SitemapsQueryOptions {
  enabled?: boolean;
}

export interface SitemapPage {
  id: string;
  sitemapId: string;
  url: string;
  path: string;
  title: string | null;
  category: SitemapPageCategory;
  statusCode: number | null;
  redirectTarget: string | null;
  wordCount: number | null;
  textRatio: number | null;
  internalLinks: number | null;
  externalLinks: number | null;
  crawledAt: string | null;
}

export interface SitemapListResponse {
  sitemaps: Sitemap[];
}

export interface SitemapPagesResponse {
  pages: SitemapPage[];
  counts?: Record<SitemapPageCategory, number>;
  hasMore?: boolean;
  nextCursor?: string | null;
}

export interface SitemapListProps {
  organizationId: string;
  voiceId: string;
  voiceWebsiteUrl: string | null;
  dialogOpen: boolean;
  onDialogOpenChange: (open: boolean) => void;
}

export interface AddSitemapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  voiceId: string;
  voiceWebsiteUrl: string | null;
}

export interface SitemapSelectorProps {
  sitemaps: Sitemap[];
  selectedSitemapId: string | null;
  onSelect: (sitemapId: string) => void;
}

export interface SitemapPagesTableProps {
  children?: ReactNode;
  sitemapId: string;
  organizationId: string;
  voiceId: string;
}
