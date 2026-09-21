import type { ContentType } from "@notra/ai/schemas/content";
import type { ContentPublicationStatus } from "@notra/db/types/content";

export interface ContentPublication {
  id: string;
  postId: string;
  repositoryId: string;
  owner: string;
  repo: string;
  path: string;
  branch: string;
  pullRequestNumber: number;
  pullRequestUrl: string;
  headSha: string | null;
  status: ContentPublicationStatus;
  contentType: ContentType | null;
  title: string | null;
  markdown: string | null;
}

export interface RecordContentPublicationParams {
  organizationId: string;
  postId: string;
  repositoryId: string;
  owner: string;
  repo: string;
  path: string;
  branch: string;
  pullRequestNumber: number;
  pullRequestUrl: string;
  headSha?: string | null;
  status?: ContentPublicationStatus;
}

export interface PublicationSyncRepair {
  organizationId: string;
  publicationId: string;
  postId: string;
  baselineHeadSha: string | null;
  /** GitHub head used as the parent of commitSha. */
  expectedHeadSha: string;
  commitSha: string;
  branch: string;
  markdown: string;
  title?: string;
  imageMapping?: {
    owner: string;
    repo: string;
    path: string;
    headSha: string;
    markdown: string;
  };
}

export type PublicationSyncResult =
  | { status: "synchronized"; markdown: string }
  | { status: "superseded" }
  | { status: "retry" };

export type PublicationCommitSyncStatus =
  | { status: "synchronized"; markdown: string }
  | { status: "superseded" }
  | { status: "pending" }
  | { status: "failed"; error: string };

export type PublicationAncestryValidator = (
  ancestorSha: string,
  descendantSha: string
) => Promise<boolean>;

export type PublicationRepairScheduler = (
  repair: PublicationSyncRepair
) => Promise<void>;

export interface ReconcileContentPublicationParams {
  publication: RecordContentPublicationParams;
  publishedAt: string;
}
