import { MAX_ATTEMPTS, RETRY_DELAYS_SECONDS } from "../constants/delivery";
import type { DeliveryOutcome } from "../types/webhooks";

export function shouldRetry(
  outcome: DeliveryOutcome,
  attempt: number,
  limit = MAX_ATTEMPTS
) {
  if (attempt >= limit || outcome.error === "unsafe_url") {
    return false;
  }
  return (
    outcome.statusCode === null ||
    outcome.statusCode === 408 ||
    outcome.statusCode === 429 ||
    outcome.statusCode >= 500
  );
}

export function retryDelaySeconds(
  attempt: number,
  retryAfterSeconds: number | null
) {
  const delay = RETRY_DELAYS_SECONDS[Math.max(0, attempt - 1)] ?? 21600;
  return Math.min(86400, Math.max(delay, retryAfterSeconds ?? 0));
}

export function parseRetryAfter(value: string | null, now: number) {
  if (value === null) {
    return null;
  }
  const seconds = /^\d+$/.test(value)
    ? Number(value)
    : (Date.parse(value) - now) / 1000;
  return Number.isFinite(seconds)
    ? Math.max(0, Math.min(86400, Math.ceil(seconds)))
    : null;
}
