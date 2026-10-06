import { logWarn } from "@notra/ai/utils/server-log";
import { start } from "workflow/api";

import {
  appendContentEmailDigestEvent,
  claimContentEmailDigestWindow,
  getContentEmailDigestKey,
  releaseContentEmailDigestWindow,
} from "@/lib/workflows/shared/content-email-digest";
import type {
  ContentEmailDigestPayload,
  EnqueueContentEmailDigestParams,
} from "@/types/workflows/content-email-digest";
import { contentEmailDigestWorkflow } from "@/workflows/content-email-digest";

export async function enqueueContentEmailDigest({
  organizationId,
  recipientEmails,
  kind,
  event,
  logPrefix,
}: EnqueueContentEmailDigestParams) {
  await Promise.all(
    recipientEmails.map(async (recipientEmail) => {
      const digestKey = getContentEmailDigestKey({
        organizationId,
        recipientEmail,
        kind,
        groupKey:
          kind === "scheduled_content_created" &&
          "contentType" in event &&
          typeof event.contentType === "string"
            ? event.contentType
            : undefined,
      });
      const appended = await appendContentEmailDigestEvent({
        digestKey,
        event,
        kind,
      });

      if (!appended) {
        logWarn("Redis not configured, skipping delayed content email", {
          workflow: logPrefix,
          organizationId,
          kind,
        });
        return;
      }

      const lockToken = await claimContentEmailDigestWindow(digestKey);
      if (!lockToken) {
        return;
      }

      const payload: ContentEmailDigestPayload = {
        digestKey,
        recipientEmail,
        organizationId,
        kind,
        lockToken,
      };

      try {
        await start(contentEmailDigestWorkflow, [payload]);
      } catch (error) {
        await releaseContentEmailDigestWindow(digestKey);
        logWarn("Failed to start delayed content email workflow", {
          workflow: logPrefix,
          organizationId,
          kind,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    })
  );
}
