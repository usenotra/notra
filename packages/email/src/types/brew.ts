import type { ReactElement } from "react";

/**
 * One Brew trigger + automation per email type, so Brew analytics split by
 * email type.
 */
export type BrewEmailCategory =
  | "welcome"
  | "feedback"
  | "contact"
  | "ai-credits-depleted"
  | "workflow-paused"
  | "schedule-content-created"
  | "schedule-content-failed"
  | "schedule-content-skipped"
  | "daily-summary";

export interface SendBrewEmailOptions {
  category: BrewEmailCategory;
  to: string;
  subject: string;
  react: ReactElement;
  /** Any stable string; hashed before sending. Brew dedupes for 24 hours. */
  idempotencyKey: string;
}

export interface BrewRequestInit {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  idempotencyKey?: string;
}

export interface BrewEmailError {
  name: string;
  message: string;
  /** HTTP status when Brew answered; absent for network and local errors. */
  status?: number;
  retryable: boolean;
  /** Wait Brew asked for via `Retry-After` on a 429. */
  retryAfterMs?: number;
}

export type BrewResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: BrewEmailError };

export interface EmailResult {
  data: { id: string } | null;
  error: BrewEmailError | null;
}

export interface BrewErrorBody {
  error?: {
    code?: string;
    message?: string;
  };
}

export interface BrewTriggerFireResponse {
  triggerInstanceId: string;
  status: "triggered" | "replayed";
  automationRunIds: string[];
  notStarted: { automationId: string; reason: string }[];
  counts: { automations: number; skipped: number };
}

export type BrewContactFieldType = "string" | "date" | "bool";

/**
 * What Brew knows about a Notra user. Email preferences are stored per
 * organization, so each flag is true when any organization the user owns has
 * it on (only owners receive these emails).
 */
export interface BrewContactCustomFields {
  notraUserId: string;
  signedUpAt: string;
  marketingEmails: boolean;
  dailySummaryEmails: boolean;
  contentCreatedEmails: boolean;
  contentFailedEmails: boolean;
  contentSkippedEmails: boolean;
}

export interface BrewContactInput {
  email: string;
  firstName?: string;
  lastName?: string;
  customFields: BrewContactCustomFields;
}

export interface BrewContactsBatchResponse {
  summary?: Record<string, number>;
  errors?: { email?: string; code?: string; message?: string }[];
}
