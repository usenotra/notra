export const CHAT_GENERATION_RATE_LIMIT = {
  requests: 30,
  window: "1m",
  windowLabel: "1 minute",
} as const;

export const CHAT_GENERATION_USER_RATE_LIMIT = {
  requests: 20,
  window: "1m",
} as const;

/**
 * Mention runs one organization may start in a window. People type mentions by
 * hand, so this only catches a loop or a script; every run costs credits, and a
 * runaway would drain a month's allowance in minutes.
 */
export const GITHUB_MENTION_RATE_LIMIT = {
  requests: 20,
  windowMs: 10 * 60 * 1000,
  windowLabel: "10 minutes",
} as const;
