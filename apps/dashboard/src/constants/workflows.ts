import type { LookbackWindow } from "@notra/schemas/dashboard/integrations";

export const DEFAULT_LOOKBACK_WINDOW: LookbackWindow = "last_7_days";
export const GITHUB_RATE_LIMIT_RETRY_DELAY = "30m";
export const SCHEDULE_RATE_LIMIT_MAX_ATTEMPTS = 3;
export const GITHUB_RATE_LIMIT_RETRY_DELAY_SECONDS = 30 * 60;
export const SCHEDULE_AI_CREDIT_LOCK_TTL_MS = 3 * 60 * 60 * 1000;
export const EVENT_MAX_LISTED_COMMITS = 10;
export const CONTENT_EMAIL_DIGEST_DELAY = "5m";
export const CONTENT_EMAIL_DIGEST_TTL_SECONDS = 15 * 60;
// Brew's idempotency window: a flush retried within it never sends twice.
export const CONTENT_EMAIL_DIGEST_BATCH_TTL_SECONDS = 24 * 60 * 60;
export const CONTENT_EMAIL_DIGEST_BATCH_SENT = "sent";
/**
 * Pins a flush to the events listed on its first attempt and renews the
 * window. Returns the batch (an event count or the sent marker), or nil when
 * another run took the window over after it expired.
 * KEYS: list, lock, batch. ARGV: lock token ("" for old runs), lock ttl,
 * batch ttl.
 */
export const PIN_CONTENT_EMAIL_DIGEST_SCRIPT = `
if ARGV[1] ~= "" then
  if redis.call("GET", KEYS[2]) ~= ARGV[1] then
    return nil
  end
  redis.call("SET", KEYS[2], ARGV[1], "EX", ARGV[2])
end
redis.call("SET", KEYS[3], redis.call("LLEN", KEYS[1]), "EX", ARGV[3], "NX")
return redis.call("GET", KEYS[3])
`;
/**
 * Acknowledges a sent batch in one step, so a retry can't trim twice: drops
 * the batch's events once and marks it sent. Keeps the window (returns 1)
 * when events arrived meanwhile, otherwise releases it (returns 0). A run
 * that lost the window trims nothing: the new owner may resend its events,
 * but none get dropped.
 * KEYS: list, lock, batch. ARGV: lock token ("" for old runs), lock ttl,
 * batch ttl, sent marker.
 */
export const ACK_CONTENT_EMAIL_DIGEST_SCRIPT = `
local owner = ARGV[1] == "" or redis.call("GET", KEYS[2]) == ARGV[1]
local size = redis.call("GET", KEYS[3])
if size and size ~= ARGV[4] then
  if owner then
    redis.call("LTRIM", KEYS[1], tonumber(size), -1)
  end
  redis.call("SET", KEYS[3], ARGV[4], "EX", ARGV[3])
end
if not owner then
  return 0
end
if redis.call("LLEN", KEYS[1]) > 0 then
  redis.call("SET", KEYS[2], ARGV[1] == "" and "1" or ARGV[1], "EX", ARGV[2])
  return 1
end
redis.call("DEL", KEYS[2])
return 0
`;
export const AUTOMATED_WORKFLOW_FAILURE_PAUSE_THRESHOLD = 3;
export const AUTOMATED_WORKFLOW_FAILURE_STATE_TTL_SECONDS = 30 * 24 * 60 * 60;
