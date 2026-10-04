import type {
  BrewContactCustomFields,
  BrewContactFieldType,
  BrewEmailCategory,
} from "../types/brew";

export const BREW_API_BASE_URL = "https://brew.new/api/v1";

export const BREW_REQUEST_TIMEOUT_MS = 15_000;

export const HTTP_NOT_FOUND = 404;
export const HTTP_TOO_MANY_REQUESTS = 429;

/**
 * Hex chars of the SHA-256 kept in idempotency keys. Brew caps keys at 100
 * chars and the longest `notra:<category>:` prefix takes 31.
 */
export const BREW_IDEMPOTENCY_HASH_LENGTH = 48;

export const BREW_MAX_RETRIES = 3;
export const BREW_RETRY_BASE_DELAY_MS = 1000;
export const BREW_RETRY_JITTER_MS = 1000;
/** Brew rate limits are per 60 s window, so a full `Retry-After` fits. */
export const BREW_RETRY_MAX_DELAY_MS = 60_000;

/** Largest page Brew serves for list endpoints. */
export const BREW_CONTACTS_PAGE_SIZE = 100;

/**
 * Sending domain for marketing email. Turning marketing off in the Notra
 * settings puts the address on this domain's unsubscribe list, which (unlike
 * a brand-wide footer unsubscribe) can be lifted again via the API.
 */
export const BREW_MARKETING_DOMAIN = "marketing.usenotra.com";

/** Privacy policy in force when consent is given; bump with the policy date. */
export const BREW_MARKETING_CONSENT_POLICY_VERSION = "privacy-2026-10-04";

/** Brew caps contact upserts at 1000 rows per request. */
export const BREW_CONTACTS_BATCH_SIZE = 1000;

/**
 * Trigger ids minted by `bun run brew:setup`. Each trigger feeds one published
 * automation that sends the pre-rendered React Email HTML in
 * `payload.message.html`.
 */
export const BREW_EMAIL_TRIGGERS: Record<BrewEmailCategory, string> = {
  welcome: "ayD08rx64b1SF7hnAbS1M",
  feedback: "sEeQ703D_wRSSm3yR6GZ3",
  contact: "r1MxgPng6-YHle9vk7ylH",
  "ai-credits-depleted": "9jkjQ15qF3aVVX9tFY__n",
  "workflow-paused": "ZA2K1RSssSuMOsN2fKVw-",
  "schedule-content-created": "8htvKr7d3bI0aegXCS02G",
  "schedule-content-failed": "hiNXrpnX6BD141tryFm-C",
  "schedule-content-skipped": "rKk15uBNuX4u538jGTofd",
  "daily-summary": "ZNAUEsBwkQIE5XQzFaWpJ",
};

/** Contact fields kept in sync by the app; created by `bun run brew:setup`. */
export const BREW_CONTACT_FIELD_TYPES: Record<
  keyof BrewContactCustomFields,
  BrewContactFieldType
> = {
  notraUserId: "string",
  signedUpAt: "date",
  marketingEmails: "bool",
  dailySummaryEmails: "bool",
  contentCreatedEmails: "bool",
  contentFailedEmails: "bool",
  contentSkippedEmails: "bool",
};
