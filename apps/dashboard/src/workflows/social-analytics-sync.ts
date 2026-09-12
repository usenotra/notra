import { socialAnalyticsSyncPayloadSchema } from "@notra/schemas/dashboard/analytics";
import { flattenError } from "zod";

import {
  WORKFLOW_ANALYTICS_NAMES,
  WORKFLOW_OUTCOMES,
} from "@/constants/workflow-analytics";
import type {
  SocialAnalyticsSyncPayload,
  SocialAnalyticsSyncResult,
} from "@/types/analytics";

import {
  listSyncableAccounts,
  snapshotAccountDimensions,
  syncTwitterAnalytics,
} from "./steps/social-analytics-steps";
import { trackWorkflowOutcome } from "./steps/workflow-lifecycle-steps";

export async function socialAnalyticsSyncWorkflow(
  payload: SocialAnalyticsSyncPayload
): Promise<SocialAnalyticsSyncResult> {
  "use workflow";

  const parseResult = socialAnalyticsSyncPayloadSchema.safeParse(payload);
  if (!parseResult.success) {
    console.error(
      "[Social Analytics] Invalid payload:",
      flattenError(parseResult.error)
    );
    return { status: "invalid_payload" };
  }

  const workflowStartedAt = Date.now();
  const accounts = await listSyncableAccounts(parseResult.data.organizationId);
  if (accounts.length === 0) {
    await trackWorkflowOutcome({
      workflow: WORKFLOW_ANALYTICS_NAMES.SOCIAL_ANALYTICS_SYNC,
      outcome: WORKFLOW_OUTCOMES.COMPLETED,
      organizationId: parseResult.data.organizationId,
      startedAt: workflowStartedAt,
      properties: { synced_accounts: 0, synced_posts: 0 },
    });
    return { status: "completed", syncedAccounts: 0, syncedPosts: 0 };
  }

  const syncedAccounts = await snapshotAccountDimensions(accounts);
  const twitterResult = await syncTwitterAnalytics(accounts);

  await trackWorkflowOutcome({
    workflow: WORKFLOW_ANALYTICS_NAMES.SOCIAL_ANALYTICS_SYNC,
    outcome: WORKFLOW_OUTCOMES.COMPLETED,
    organizationId: parseResult.data.organizationId,
    startedAt: workflowStartedAt,
    properties: {
      synced_accounts: syncedAccounts,
      synced_posts: twitterResult.posts,
    },
  });

  return {
    status: "completed",
    syncedAccounts,
    syncedPosts: twitterResult.posts,
  };
}
