import { gscSyncPayloadSchema } from "@notra/geo-core/schemas/google-search-console";
import type {
  GscSyncPayload,
  GscSyncResult,
} from "@notra/geo-core/types/google-search-console";
import { flattenError } from "zod";

import {
  appendAutomationLogBestEffort,
  fetchLogRetention,
} from "./steps/content-generation-steps";
import { runGscSyncStep } from "./steps/gsc-sync-steps";

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
    result = await runGscSyncStep(organizationId);
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
    title:
      result.status === "completed"
        ? "Search Console sync completed"
        : "Search Console sync skipped",
    status: result.status === "completed" ? "success" : "skipped",
    payload: {
      keywords: result.keywords ?? 0,
      suggestionsAdded: result.suggestionsAdded ?? 0,
    },
    ...(result.reason ? { errorMessage: result.reason } : {}),
    retentionDays,
  });

  return result;
}
