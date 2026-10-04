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
 * What Brew knows about a Notra user. Notification preferences are stored per
 * organization, so each of those flags is true when any organization the user
 * owns has it on (only owners receive these emails). `marketingEmails` is the
 * user's own opt-in; opting out lives in Brew's unsubscribe lists.
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

/** Provenance of a marketing opt-in, kept by Brew as proof of consent. */
export interface BrewContactConsent {
  source: "api" | "form" | "import";
  capturedAt: string;
  policyVersion: string;
  evidence: string;
}

export interface BrewContactInput {
  email: string;
  firstName?: string;
  lastName?: string;
  customFields: BrewContactCustomFields;
  consent?: BrewContactConsent;
}

export interface BrewContact {
  email: string;
  subscribed?: boolean;
  /** Hosts of the marketing domains the contact unsubscribed from. */
  unsubscribedDomains?: string[];
  customFields?: Partial<BrewContactCustomFields>;
}

/**
 * Whether Brew lets marketing email reach a contact. `unknown` covers a
 * missing Brew key, an unsynced contact and an unreachable API.
 */
export type BrewMarketingStatus =
  | "subscribed"
  | "domain_unsubscribed"
  | "globally_unsubscribed"
  | "unknown";

export interface BrewContactsPage {
  data: BrewContact[];
  pagination: { cursor: string | null };
}

export interface BrewDomain {
  domainId: string;
  name: string;
}

export interface BrewDomainsPage {
  data: BrewDomain[];
  pagination: { cursor: string | null };
}

export interface BrewUnsubscribeRemoval {
  removed: boolean;
  globallyUnsubscribed: boolean;
}

export interface BrewContactsBatchResponse {
  summary?: Record<string, number>;
  errors?: { email?: string; code?: string; message?: string }[];
}
