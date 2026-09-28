import { postGitHubSyncResponseSchema } from "@notra/schemas/api/post-github-sync";

import { POST_GITHUB_SYNC_TIMEOUT_MS } from "../constants/post-github-sync";
import {
  callDashboardInternal,
  getInternalWorkflowUrl,
} from "./internal-workflow";

export async function syncPostGitHub(
  env: { WORKFLOW_BASE_URL?: string },
  organizationId: string,
  postId: string,
  actorId: string
) {
  const url = getInternalWorkflowUrl(env, "/api/internal/content/sync-github");
  if (!url) {
    throw new Error("WORKFLOW_BASE_URL is not configured");
  }
  await callDashboardInternal(
    url,
    { organizationId, postId, actorId },
    postGitHubSyncResponseSchema,
    POST_GITHUB_SYNC_TIMEOUT_MS
  );
}
