import type { BrandKnowledgeRecord } from "@notra/db/types/geo-accuracy";

export type { BrandKnowledgeRecord } from "@notra/db/types/geo-accuracy";

export interface KnowledgeScanSource {
  origin: "github" | "website";
  url: string;
  path?: string;
  markdown: string;
}

export interface KnowledgeScanState {
  websiteUrl: string;
  githubIntegrationId: string | null;
  githubRepos: { id: string; owner: string; repo: string }[];
  records: BrandKnowledgeRecord[];
  syncedAt: string | null;
  syncError: string | null;
  companyName: string | null;
}
