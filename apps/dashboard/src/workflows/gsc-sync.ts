import { gscSyncPayloadSchema } from "@notra/geo-core/schemas/google-search-console";
import type {
  GscSyncPayload,
  GscSyncResult,
} from "@notra/geo-core/types/google-search-console";
import { FatalError } from "workflow";
import { flattenError } from "zod";

import {
  appendAutomationLogBestEffort,
  fetchLogRetention,
} from "./steps/content-generation-steps";
import {
  listGscSyncProjectsStep,
  runGscProjectSyncStep,
  trackGscSyncStep,
} from "./steps/gsc-sync-steps";

export async function gscSyncWorkflow(
  payload: GscSyncPayload
): Promise<GscSyncResult> {
  "use workflow";

  const parseResult = gscSyncPayloadSchema.safeParse(payload);
  if (!parseResult.success) {
    console.error("[GSC] Invalid payload:", flattenError(parseResult.error));
    return { status: "invalid_payload" };
  }

  const { organizationId } = parseResult.data;
  const retentionDays = await fetchLogRetention(organizationId);

  let result: GscSyncResult;
  try {
    const { projectIds, startedAt } =
      await listGscSyncProjectsStep(organizationId);
    let keywords = 0;
    let suggestionsAdded = 0;
    let completed = 0;
    let failed = 0;
    let skippedReason: string | undefined;
    // The shared OAuth integration row is a compare-and-swap sync lease.
    // Sequential durable steps retry only the failed project.
    for (const projectId of projectIds) {
      try {
        const outcome = await runGscProjectSyncStep(organizationId, projectId);
        if (outcome.status === "completed") {
          completed++;
          keywords += outcome.keywords ?? 0;
          suggestionsAdded += outcome.suggestionsAdded ?? 0;
        } else {
          skippedReason =
            outcome.reason === "reauth_required"
              ? outcome.reason
              : (skippedReason ?? outcome.reason);
        }
      } catch (error) {
        failed++;
        console.error(`[GSC] Failed to sync project ${projectId}:`, error);
      }
    }
    if (failed || (completed && completed < projectIds.length)) {
      result = {
        status: "failed",
        reason: `Search Console did not sync ${projectIds.length - completed} of ${projectIds.length} selected projects${skippedReason ? `: ${skippedReason}` : ""}`,
        keywords,
        suggestionsAdded,
      };
    } else if (completed) {
      result = { status: "completed", keywords, suggestionsAdded };
    } else {
      result = {
        status: "skipped",
        reason: skippedReason ?? "no_site_selected",
      };
    }
    await trackGscSyncStep(organizationId, result, startedAt);
  } catch (error) {
    await appendAutomationLogBestEffort({
      organizationId,
      integrationId: organizationId,
      integrationType: "search-console",
      title: "Search Console sync failed",
      status: "failed",
      errorMessage: "Workflow failed unexpectedly",
      retentionDays,
    });
    throw error;
  }
  if (result.status === "invalid_payload") {
    return result;
  }
  await appendAutomationLogBestEffort({
    organizationId,
    integrationId: organizationId,
    integrationType: "search-console",
    title: `Search Console sync ${result.status}`,
    status: result.status === "completed" ? "success" : result.status,
    payload: {
      keywords: result.keywords ?? 0,
      suggestionsAdded: result.suggestionsAdded ?? 0,
    },
    ...(result.reason ? { errorMessage: result.reason } : {}),
    retentionDays,
  });

  if (result.status === "failed") {
    // Each project step has already retried independently. Do not replay the
    // whole workflow and replace suggestions committed by successful projects.
    throw new FatalError(result.reason ?? "Search Console sync failed");
  }

  return result;
}
