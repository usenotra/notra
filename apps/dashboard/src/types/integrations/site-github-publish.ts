import type { GitHubPublishContentType } from "@/types/integrations/github";

export interface SiteGitHubPublishTarget {
  siteId: string;
  rootDirectory: string;
  productionBranch: string;
  sectionMounted: boolean;
}

export type SiteConfigAuthorNames = Record<string, string>;

export interface BuildSiteEntryMarkdownParams {
  contentType: GitHubPublishContentType;
  markdown: string;
  title: string;
  date: Date;
  author?: string | null;
}

export interface SiteMarkdownNode {
  alt?: string | null;
  children?: SiteMarkdownNode[];
  depth?: number;
  type: string;
  url?: string;
  value?: string;
}
