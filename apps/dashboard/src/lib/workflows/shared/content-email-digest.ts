import { redis } from "@notra/ai/utils/redis";
import type { EmailResult } from "@notra/email/types/brew";

import { CONTENT_EMAIL_DIGEST_TTL_SECONDS } from "@/constants/workflows";
import {
  sendAiCreditsDepletedEmail,
  sendScheduledContentCreatedEmail,
  sendScheduledContentFailedEmail,
  sendScheduledContentSkippedEmail,
} from "@/lib/email/send";
import type {
  ContentEmailDigestEvent,
  ContentEmailDigestKind,
  ContentEmailDigestPayload,
  EnqueueContentEmailDigestEvent,
} from "@/types/workflows/content-email-digest";

const DIGEST_KEY_PREFIX = "content-email-digest";
const DIGEST_LOCK_KEY_PREFIX = "content-email-digest-lock";

export function getContentEmailDigestKey({
  organizationId,
  recipientEmail,
  kind,
  groupKey,
}: {
  organizationId: string;
  recipientEmail: string;
  kind: ContentEmailDigestKind;
  groupKey?: string;
}) {
  const recipientKey = encodeURIComponent(recipientEmail.toLowerCase());
  const groupSuffix = groupKey ? `:${encodeURIComponent(groupKey)}` : "";

  return `${DIGEST_KEY_PREFIX}:${organizationId}:${kind}:${recipientKey}${groupSuffix}`;
}

function getContentEmailDigestLockKey(digestKey: string) {
  return `${DIGEST_LOCK_KEY_PREFIX}:${digestKey}`;
}

export async function appendContentEmailDigestEvent({
  digestKey,
  event,
  kind,
}: {
  digestKey: string;
  event: EnqueueContentEmailDigestEvent;
  kind: ContentEmailDigestKind;
}) {
  if (!redis) {
    return false;
  }

  await redis.rpush(digestKey, JSON.stringify({ ...event, kind }));
  await redis.expire(digestKey, CONTENT_EMAIL_DIGEST_TTL_SECONDS);
  return true;
}

export async function claimContentEmailDigestWindow(digestKey: string) {
  if (!redis) {
    return false;
  }

  const claimed = await redis.set(
    getContentEmailDigestLockKey(digestKey),
    "1",
    {
      ex: CONTENT_EMAIL_DIGEST_TTL_SECONDS,
      nx: true,
    }
  );

  return claimed === "OK";
}

export async function releaseContentEmailDigestWindow(digestKey: string) {
  if (!redis) {
    return;
  }

  await redis.del(getContentEmailDigestLockKey(digestKey));
}

function parseDigestEvents(
  rawEvents: string[],
  kind: ContentEmailDigestKind
): ContentEmailDigestEvent[] {
  return rawEvents.flatMap((rawEvent) => {
    try {
      const parsed = JSON.parse(rawEvent) as ContentEmailDigestEvent;
      return parsed.kind === kind ? [parsed] : [];
    } catch {
      return [];
    }
  });
}

function summarizeNames(names: string[], fallback: string) {
  const uniqueNames = Array.from(new Set(names.map((name) => name.trim())))
    .filter(Boolean)
    .slice(0, 4);

  if (uniqueNames.length === 0) {
    return fallback;
  }

  if (uniqueNames.length === 1) {
    return uniqueNames[0] ?? fallback;
  }

  if (uniqueNames.length === 2) {
    return `${uniqueNames[0]} and ${uniqueNames[1]}`;
  }

  return `${uniqueNames.slice(0, -1).join(", ")}, and ${uniqueNames.at(-1)}`;
}

function summarizeReasons(
  events: Array<{ scheduleName: string; reason: string }>
) {
  return events
    .map((event) => `${event.scheduleName}: ${event.reason}`)
    .join("\n");
}

function assertEmailSent({
  result,
  recipientEmail,
  kind,
}: {
  result: EmailResult;
  recipientEmail: string;
  kind: ContentEmailDigestKind;
}) {
  if (!result.error) {
    return;
  }

  console.warn(
    `[ContentEmailDigest] Failed to send ${kind} notification to ${recipientEmail}:`,
    result.error
  );

  throw new Error(
    `Failed to send ${kind} notification to ${recipientEmail}: ${result.error.message}`
  );
}

export async function flushContentEmailDigest({
  digestKey,
  recipientEmail,
  kind,
}: ContentEmailDigestPayload) {
  "use step";

  if (!redis) {
    return;
  }

  const rawEvents = await redis.lrange<string>(digestKey, 0, -1);
  const events = parseDigestEvents(rawEvents, kind);
  if (events.length === 0) {
    await redis.ltrim(digestKey, rawEvents.length, -1);
    await redis.del(getContentEmailDigestLockKey(digestKey));
    return;
  }

  const firstEvent = events[0];
  if (!firstEvent) {
    return;
  }

  // The batch only changes once it is trimmed after a successful send, so a
  // retried step reuses this key and Brew replays instead of sending twice.
  const digestBatchKey = [digestKey, ...rawEvents].join("\n");

  if (kind === "ai_credits_depleted") {
    const creditEvents = events.filter(
      (event) => event.kind === "ai_credits_depleted"
    );
    const automationName = summarizeNames(
      creditEvents.map((event) => event.automationName),
      "your content automations"
    );
    const limitLabel = creditEvents.find(
      (event) => event.limitLabel
    )?.limitLabel;

    assertEmailSent({
      result: await sendAiCreditsDepletedEmail({
        digestBatchKey,
        recipientEmail,
        organizationName: firstEvent.organizationName,
        organizationSlug: firstEvent.organizationSlug,
        automationName,
        limitLabel,
      }),
      recipientEmail,
      kind,
    });
    await redis.ltrim(digestKey, rawEvents.length, -1);
    await redis.del(getContentEmailDigestLockKey(digestKey));
    return;
  }

  if (kind === "scheduled_content_created") {
    const createdEvents = events.filter(
      (event) => event.kind === "scheduled_content_created"
    );
    const firstCreatedEvent = createdEvents[0];
    if (!firstCreatedEvent) {
      return;
    }

    const scheduleName = summarizeNames(
      createdEvents.map((event) => event.scheduleName),
      "your content automations"
    );
    const createdContent = createdEvents.flatMap(
      (event) => event.createdContent
    );

    assertEmailSent({
      result: await sendScheduledContentCreatedEmail({
        digestBatchKey,
        recipientEmail,
        organizationName: firstCreatedEvent.organizationName,
        organizationSlug: firstCreatedEvent.organizationSlug,
        scheduleName,
        createdContent,
        contentType: firstCreatedEvent.contentType,
        contentOverviewLink: firstCreatedEvent.contentOverviewLink,
        subject:
          createdEvents.length > 1
            ? "Your Notra automations created new content"
            : firstCreatedEvent.subject,
      }),
      recipientEmail,
      kind,
    });
    await redis.ltrim(digestKey, rawEvents.length, -1);
    await redis.del(getContentEmailDigestLockKey(digestKey));
    return;
  }

  if (kind === "scheduled_content_failed") {
    const failedEvents = events.filter(
      (event) => event.kind === "scheduled_content_failed"
    );
    const firstFailedEvent = failedEvents[0];
    if (!firstFailedEvent) {
      return;
    }

    assertEmailSent({
      result: await sendScheduledContentFailedEmail({
        digestBatchKey,
        recipientEmail,
        organizationName: firstFailedEvent.organizationName,
        organizationSlug: firstFailedEvent.organizationSlug,
        scheduleName: summarizeNames(
          failedEvents.map((event) => event.scheduleName),
          "your content automations"
        ),
        reason: summarizeReasons(failedEvents),
        subject:
          failedEvents.length > 1
            ? "Your Notra automations failed to generate content"
            : firstFailedEvent.subject,
      }),
      recipientEmail,
      kind,
    });
    await redis.ltrim(digestKey, rawEvents.length, -1);
    await redis.del(getContentEmailDigestLockKey(digestKey));
    return;
  }

  const skippedEvents = events.filter(
    (event) => event.kind === "scheduled_content_skipped"
  );
  const firstSkippedEvent = skippedEvents[0];
  if (!firstSkippedEvent) {
    return;
  }

  assertEmailSent({
    result: await sendScheduledContentSkippedEmail({
      digestBatchKey,
      recipientEmail,
      organizationName: firstSkippedEvent.organizationName,
      organizationSlug: firstSkippedEvent.organizationSlug,
      scheduleName: summarizeNames(
        skippedEvents.map((event) => event.scheduleName),
        "your content automations"
      ),
      reason: summarizeReasons(skippedEvents),
      subject:
        skippedEvents.length > 1
          ? "Your Notra automations skipped content generation"
          : firstSkippedEvent.subject,
    }),
    recipientEmail,
    kind,
  });
  await redis.ltrim(digestKey, rawEvents.length, -1);
  await redis.del(getContentEmailDigestLockKey(digestKey));
}
