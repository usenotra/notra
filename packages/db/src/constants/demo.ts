export const DEMO_REQUEST_SOURCES = [
  "api",
  "console",
  "ui",
  "webhook",
] as const;

export const DEMO_REQUEST_LOG_MAX_ROWS = 500;
export const DEMO_REQUEST_BODY_MAX_CHARS = 8000;

/**
 * Every sandbox organization's slug starts with this. It marks workspaces
 * the demo created, including ones orphaned by an interrupted seed.
 */
export const DEMO_ORG_SLUG_PREFIX = "demo-";

/** How long a fresh organization may exist before its sandbox row. */
export const DEMO_SEEDING_GRACE_MINUTES = 10;
