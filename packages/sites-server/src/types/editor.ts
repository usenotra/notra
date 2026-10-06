import type { siteDrafts } from "@notra/db/schema";

export type SiteDraft = typeof siteDrafts.$inferSelect;

export type SiteDraftPublishMode = "direct" | "pull_request";

export interface SiteSourceEntry {
  path: string;
  sha: string;
  size: number;
}

export interface SiteSourceListing {
  commitSha: string;
  files: SiteSourceEntry[];
}

export interface SiteSourceFileContent {
  content: string;
  sha: string;
}

export interface RepositoryFileRef {
  path: string;
  ref: string;
}

export interface RepositoryBranchInput {
  name: string;
  sha: string;
}

export interface CreateCommitOnBranchResponse {
  createCommitOnBranch: { commit: { oid: string } };
}

export interface SaveSiteDraftInput {
  path: string;
  content: string;
  baseBlobSha: string | null;
  baseCommitSha: string | null;
  deleted?: boolean;
  userId: string;
}

export interface PublishSiteDraftsInput {
  message: string;
  mode: SiteDraftPublishMode;
  userId: string;
}

export interface PublishSiteDraftsResult {
  mode: SiteDraftPublishMode;
  commitSha: string;
  pullRequestUrl: string | null;
}

export interface RepositoryCommitInput {
  branch: string;
  headline: string;
  expectedHeadOid: string;
  additions: Array<{ path: string; content: string }>;
  deletions: string[];
}

export interface RepositoryPullRequestInput {
  title: string;
  head: string;
  base: string;
  body: string;
}
