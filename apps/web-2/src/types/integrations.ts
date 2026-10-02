import type { ReactNode } from "react";

export interface IntegrationTool {
  name: string;
  title: string | null;
  description: string | null;
}

export interface Integration {
  id: string;
  name: string;
  description: string | null;
  author: string | null;
  websiteUrl: string | null;
  brandColor: string | null;
  logoLightUrl: string | null;
  logoDarkUrl: string | null;
  bannerUrl: string | null;
  slug: string | null;
  category: string | null;
  featuredAt: string | null;
  authType: string;
  indexedToolCount: number;
  tools: IntegrationTool[];
}

export interface IntegrationCategoryFilter {
  id: string;
  label: string;
}

export interface IntegrationsMarketplaceProps {
  integrations: Integration[];
  categories: IntegrationCategoryFilter[];
}

export interface IntegrationsViewProps {
  integrations: Integration[];
  categories: IntegrationCategoryFilter[];
  query: string;
  activeCategory: string;
  filtered: Integration[];
  featured: Integration[];
  showFeatured: boolean;
  onQueryChange?: (value: string) => void;
  onCategoryChange?: (id: string) => void;
}

export interface IntegrationCardProps {
  integration: Integration;
}

export interface IntegrationConnectButtonProps {
  integration: Integration;
  className?: string;
  label?: string;
}

export interface FeaturedIntegrationCardProps {
  integration: Integration;
}

export interface IntegrationModalProps {
  integration: Integration;
}

export interface IntegrationBannerProps {
  integration: Integration;
  className?: string;
  priority?: boolean;
}

export interface IntegrationAuthorMetaProps {
  integration: Integration;
  tail: string;
  className?: string;
}

export interface IntegrationLogoProps {
  integration: Integration;
  size: number;
  className?: string;
  fill?: boolean;
}

export interface IntegrationToolsGridProps {
  tools: IntegrationTool[];
  totalCount: number;
}

export interface IntegrationDetailViewProps {
  integration: Integration;
}

export interface IntegrationMarkdownEntry {
  id: string;
  title: string;
  description: string;
}
