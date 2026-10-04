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
        console.warn(
          `[${logPrefix}] Redis not configured, skipping delayed ${kind} email for ${recipientEmail}`
        );
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
        console.warn(
          `[${logPrefix}] Failed to start delayed ${kind} email workflow for ${recipientEmail}:`,
          error
        );
        throw error;
      }
    })
  );
}
