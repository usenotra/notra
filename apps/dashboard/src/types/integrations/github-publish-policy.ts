import type { GitHubConnectionMethod } from "@notra/ai/types/github-connection";

import type { GitHubPublishContentType, GitHubPublishRecovery } from "./github";

export interface GitHubPublishFailureContext {
  installationAccountType?: string | null;
  installationAccountLogin?: string | null;
  organizationId: string;
  repositoryId: string;
  outputId: string;
  outputType: GitHubPublishContentType;
  connectionMethod: GitHubConnectionMethod;
  installationId: string | null;
}

export type GitHubPublishFailurePolicy =
  | {
      failureKind: "authentication" | "permissions";
      recordFailure: false;
      recovery: { message: string; data: GitHubPublishRecovery };
    }
  | {
      failureKind: "rate_limit";
      recordFailure: false;
      recovery?: never;
    }
  | {
      failureKind: "forbidden" | "unknown";
      recordFailure: true;
      recovery?: never;
    };
