export const DEMO_SESSION_COOKIE = "notra_demo";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** A sandbox survives this long after the visitor's last request. */
export const DEMO_SANDBOX_IDLE_TTL_MS = DAY_MS;
/** Hard cap regardless of activity. */
export const DEMO_SANDBOX_MAX_AGE_MS = 7 * DAY_MS;
export const DEMO_SESSION_COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
/** `last_seen_at` is only written when it is older than this. */
export const DEMO_TOUCH_INTERVAL_MS = 5 * 60 * 1000;

export const DEMO_ANONYMOUS_ID_PREFIX = "anon_";
export const DEMO_ANONYMOUS_ID_PATTERN = /^anon_[A-Za-z0-9_-]{16}$/;
export const DEMO_ANONYMOUS_ID_LENGTH = 16;

export const DEMO_SANDBOX_CREATE_LIMIT = 5;
export const DEMO_SANDBOX_CREATE_WINDOW = "1 h";

// Lives under the reserved /auth prefix so it can never collide with an
// organization slug route.
export const DEMO_START_PATH = "/auth/demo";
export const DEMO_SIGNUP_URL = "https://app.usenotra.com/signup";
export const DEMO_API_BASE_URL =
  process.env.NEXT_PUBLIC_NOTRA_DEMO_API_URL ?? "https://demo-api.usenotra.com";

export const DEMO_API_KEY_PREFIX = "notra_demo";
export const DEMO_API_KEY_RATE_LIMIT = { limit: 60, durationMs: 60_000 };

export const DEMO_USER_EMAIL_DOMAIN = "fieldnote.example";
export const DEMO_VISITOR_EMAIL_LOCAL = "you";
export const DEMO_VISITOR_NAME = "Demo Visitor";
export const DEMO_COMPANY_NAME = "Fieldnote";
export const DEMO_COMPANY_WEBSITE = "https://fieldnote.example";

export const DEMO_CLEANUP_BATCH_SIZE = 50;

/**
 * Tables that carry organization_id but must not be shifted by the daily
 * rebase: the sandbox row itself owns the anchor and TTL.
 */
export const DEMO_REBASE_EXCLUDED_TABLES: ReadonlySet<string> = new Set([
  "demo_sandboxes",
]);

export const DEMO_SIGNUP_PATH = /^\/signup(?:\/|$)/;
export const DEMO_AUTH_PATH =
  /^\/(?:login|forgot-password|reset-password|callback|auth\/(?:callback|initiate|social|external))(?:\/|$)/;
export const DEMO_ONBOARDING_PATH = /^\/onboarding(?:\/|$)/;
/**
 * Internal design studies that show hard-coded real brands; the demo sends
 * them to the GEO overview. Group 1 is the organization slug.
 */
export const DEMO_HIDDEN_PAGE_PATH = /^\/([^/]+)\/geo\/directions(?:\/|$)/;

export const DEMO_ORG_SLUG_PREFIX = "demo-";
/** A path into some demo workspace; group 1 is everything after the slug. */
export const DEMO_ORG_SLUG_PATH =
  /^\/(?:demo|fieldnote)-[a-z0-9]+((?:[/?#].*)?)$/;
export const DEMO_ORG_SLUG_SUFFIX_LENGTH = 8;

export const DEMO_BILLING_PLAN = {
  id: "growth",
  name: "Growth",
  periodElapsedDays: 18,
} as const;
export const DEMO_BILLING_PERIOD_DAYS = 30;
export const DEMO_BILLING_CREDITS = { granted: 5000, used: 2140 } as const;
export const DEMO_REQUEST_FEED_LIMIT = 100;

export const DEMO_BANNER_HEIGHT = "2.75rem";

/** Shown when an action needs a real account (invites, billing, OAuth). */
export const DEMO_DISABLED_MESSAGE =
  "This is not available in the demo. Start free to use it with your own workspace.";
export const DEMO_EXIT_URL = "https://www.usenotra.com";

/**
 * Flows that would connect real third-party accounts (OAuth, app installs,
 * social logins). Blocked at the proxy with a short explanation page.
 */
export const DEMO_BLOCKED_PATH =
  /^\/(?:api\/integrations\/[^/]+\/(?:authorize|callback|install)|api\/integrations\/mcp\/oauth|connect\/|api\/social-accounts\/)/;

export const DEMO_BLOCKED_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Not available in the demo</title><style>body{font:15px/1.5 system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px;color:#1a1d1f;background:#fafafa}main{max-width:26rem;text-align:center}a,button{font:inherit;border:0;border-radius:8px;padding:8px 14px;margin:4px;cursor:pointer}a{background:#7c5cfc;color:#fff;text-decoration:none}button{background:#eee}</style></head><body><main><h1 style="font-size:18px">Connecting accounts is off in the demo</h1><p>The demo uses sample integrations so nothing leaves this sandbox. Start free to connect your own GitHub, Slack, Linear and more.</p><a href="${DEMO_SIGNUP_URL}" rel="noopener">Start free</a><button onclick="window.opener?window.close():history.back()">Go back</button></main></body></html>`;

/** About 5 MB each, so the default keeps the demo database near 1.5 GB. */
export const DEMO_DEFAULT_MAX_ACTIVE_SANDBOXES = 300;

export const DEMO_PERSONALIZATION_NAME_MAX = 40;
export const DEMO_PERSONALIZATION_COMPANY_MAX = 60;
