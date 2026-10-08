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

export interface FindSiteGitHubPublishTargetParams {
  organizationId: string;
  contentType: GitHubPublishContentType;
  repository: {
    id: string;
    githubRepositoryId: string | null;
    owner: string;
    repo: string;
  };
}

export interface ReadSiteRepositoryTextFileParams {
  owner: string;
  repo: string;
  path: string;
  ref: string;
}

export interface ResolveSiteEntryAuthorParams {
  token: string;
  owner: string;
  repo: string;
  target: SiteGitHubPublishTarget;
  publisherUserId: string | undefined;
  existingEntry: { branchName: string; path: string } | undefined;
}

export interface ResolveSiteEntrySlugParams {
  contentId: string;
  slug: string | null;
  title: string;
}
