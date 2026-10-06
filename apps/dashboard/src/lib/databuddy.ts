import { Databuddy } from "@databuddy/sdk/node";
import { logWarn } from "@notra/ai/utils/server-log";
import type {
  ContentCreatedTrackingEvent,
  ContentFailedTrackingEvent,
  ContentSkippedTrackingEvent,
} from "@notra/content-generation/databuddy";
import {
  buildContentCreatedDatabuddyProperties,
  buildContentFailedDatabuddyProperties,
  buildContentSkippedDatabuddyProperties,
  CONTENT_CREATED_DATABUDDY_EVENT,
  CONTENT_FAILED_DATABUDDY_EVENT,
  CONTENT_SKIPPED_DATABUDDY_EVENT,
} from "@notra/content-generation/databuddy";

const apiKey = process.env.DATABUDDY_API_KEY;
const websiteId = process.env.NEXT_PUBLIC_DATABUDDY_DASHBOARD_WEBSITE_ID;

if (!apiKey) {
  logWarn(
    "DATABUDDY_API_KEY not configured. Server-side Databuddy tracking will be disabled."
  );
}

if (!websiteId) {
  logWarn(
    "NEXT_PUBLIC_DATABUDDY_DASHBOARD_WEBSITE_ID not configured. Server-side Databuddy tracking will be disabled."
  );
}

export const databuddy =
  apiKey && websiteId
    ? new Databuddy({
        websiteId,
        apiKey,
        enableBatching: false,
      })
    : null;

const isDevelopment = process.env.NODE_ENV === "development";

export async function trackScheduledContentCreated(
  event: ContentCreatedTrackingEvent
): Promise<void> {
  if (!databuddy) {
    return;
  }

  try {
    const result = await databuddy.track({
      name: CONTENT_CREATED_DATABUDDY_EVENT,
      namespace: "workflows",
      source: event.source ?? "schedule",
      properties: buildContentCreatedDatabuddyProperties(event),
    });

    if (!result.success && isDevelopment) {
      logWarn("[Databuddy] scheduled_content_created failed", {
        triggerId: event.triggerId,
        postId: event.postId,
        error: result.error,
      });
    }
  } catch (error) {
    if (isDevelopment) {
      logWarn("[Databuddy] scheduled_content_created error", {
        triggerId: event.triggerId,
        postId: event.postId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export async function trackScheduledContentFailed(
  event: ContentFailedTrackingEvent
): Promise<void> {
  if (!databuddy) {
    return;
  }

  try {
    const result = await databuddy.track({
      name: CONTENT_FAILED_DATABUDDY_EVENT,
      namespace: "workflows",
      source: event.source ?? "schedule",
      properties: buildContentFailedDatabuddyProperties(event),
    });

    if (!result.success && isDevelopment) {
      logWarn("[Databuddy] scheduled_content_failed failed", {
        triggerId: event.triggerId,
        error: result.error,
      });
    }
  } catch (error) {
    if (isDevelopment) {
      logWarn("[Databuddy] scheduled_content_failed error", {
        triggerId: event.triggerId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export async function trackScheduledContentSkipped(
  event: ContentSkippedTrackingEvent
): Promise<void> {
  if (!databuddy) {
    return;
  }

  try {
    const result = await databuddy.track({
      name: CONTENT_SKIPPED_DATABUDDY_EVENT,
      namespace: "workflows",
      source: event.source ?? "schedule",
      properties: buildContentSkippedDatabuddyProperties(event),
    });

    if (!result.success && isDevelopment) {
      logWarn("[Databuddy] scheduled_content_skipped failed", {
        triggerId: event.triggerId,
        error: result.error,
      });
    }
  } catch (error) {
    if (isDevelopment) {
      logWarn("[Databuddy] scheduled_content_skipped error", {
        triggerId: event.triggerId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
