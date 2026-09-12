import type { ScheduledCreatedContentItem } from "@/types/email/send";

export type { ContentEmailDigestPayload } from "@notra/schemas/dashboard/workflows";

export type ContentEmailDigestKind =
  | "ai_credits_depleted"
  | "scheduled_content_created"
  | "scheduled_content_failed"
  | "scheduled_content_skipped";

export interface ContentEmailDigestBaseEvent {
  organizationName: string;
  organizationSlug: string;
}

export interface AiCreditsDepletedDigestEvent extends ContentEmailDigestBaseEvent {
  kind: "ai_credits_depleted";
  automationName: string;
  limitLabel?: string;
}

export interface ScheduledContentCreatedDigestEvent extends ContentEmailDigestBaseEvent {
  kind: "scheduled_content_created";
  scheduleName: string;
  createdContent: ScheduledCreatedContentItem[];
  contentType: string;
  contentOverviewLink: string;
  subject?: string;
}

export interface ScheduledContentFailedDigestEvent extends ContentEmailDigestBaseEvent {
  kind: "scheduled_content_failed";
  scheduleName: string;
  reason: string;
  subject?: string;
}

export interface ScheduledContentSkippedDigestEvent extends ContentEmailDigestBaseEvent {
  kind: "scheduled_content_skipped";
  scheduleName: string;
  reason: string;
  subject?: string;
}

export type ContentEmailDigestEvent =
  | AiCreditsDepletedDigestEvent
  | ScheduledContentCreatedDigestEvent
  | ScheduledContentFailedDigestEvent
  | ScheduledContentSkippedDigestEvent;

export type EnqueueContentEmailDigestEvent =
  ContentEmailDigestEvent extends infer Event
    ? Event extends ContentEmailDigestEvent
      ? Omit<Event, "kind">
      : never
    : never;

export interface EnqueueContentEmailDigestParams {
  organizationId: string;
  recipientEmails: string[];
  kind: ContentEmailDigestKind;
  event: EnqueueContentEmailDigestEvent;
  logPrefix: string;
}
