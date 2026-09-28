import { postGitHubSyncResponseSchema } from "@notra/schemas/api/post-github-sync";

import {
  callDashboardInternal,
  getInternalWorkflowUrl,
  SYNCHRONOUS_INTERNAL_CALL_TIMEOUT_MS,
} from "./internal-workflow";

export async function syncPostGitHub(
  env: { WORKFLOW_BASE_URL?: string },
  organizationId: string,
  postId: string
) {
  const url = getInternalWorkflowUrl(env, "/api/internal/content/sync-github");
  if (!url) {
    throw new Error("WORKFLOW_BASE_URL is not configured");
  }
  await callDashboardInternal(
    url,
    { organizationId, postId },
    postGitHubSyncResponseSchema,
    SYNCHRONOUS_INTERNAL_CALL_TIMEOUT_MS
  );
}
