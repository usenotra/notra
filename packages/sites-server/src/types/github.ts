import type { githubIntegrations } from "@notra/db/schema";

export interface SiteRepository {
  organizationId: string;
  integrationId: string | null;
  githubRepositoryId: string | null;
  installationId: string;
  owner: string;
  repo: string;
}

export interface OrganizationRepository {
  integration: typeof githubIntegrations.$inferSelect;
  repository: SiteRepository;
}

export interface SiteRepositoryAccess {
  repository: SiteRepository;
  token: string;
}

export interface SiteRepositoryColumns {
  id: string;
  organizationId: string;
  repositoryId: string | null;
  githubRepositoryId: string | null;
  githubInstallationId: string | null;
  repositoryOwner: string | null;
  repositoryName: string | null;
}

export interface SiteRepositoryPermissions {
  contents?: "read" | "write";
  checks?: "write";
  pull_requests?: "read" | "write";
}

export interface BranchHead {
  sha: string;
  protected: boolean;
  message: string | null;
  author: string | null;
}

export type CheckRunConclusion =
  | "success"
  | "failure"
  | "cancelled"
  | "neutral"
  | "skipped";

export interface CreateCheckRunParams {
  name: string;
  headSha: string;
  detailsUrl: string;
  externalId: string;
  title: string;
  summary: string;
}

export interface CheckRunAnnotation {
  path: string;
  start_line: number;
  end_line: number;
  annotation_level: "failure" | "warning" | "notice";
  message: string;
}

export interface CompleteCheckRunParams {
  checkRunId: string;
  conclusion: CheckRunConclusion;
  title: string;
  summary: string;
  text?: string;
  detailsUrl?: string;
  annotations?: CheckRunAnnotation[];
}

export interface RepositorySuggestions {
  branches: string[];
  defaultBranch: string | null;
  configDirectories: string[];
  contentCounts: Record<string, RepositoryContentCount>;
  truncated: boolean;
}

export interface RepositoryContentCount {
  blog: number;
  changelog: number;
}

export interface RepositoryTreeScan {
  directories: string[];
  contentCounts: Record<string, RepositoryContentCount>;
  truncated: boolean;
}
