import { Data } from "effect";

/**
 * Redis is a best-effort accelerator for onboarding lookups. This error marks
 * the one place that decides to fall through to the live lookup instead of
 * failing the request.
 */
export class RedisUnavailableError extends Data.TaggedError(
  "RedisUnavailableError"
)<{
  readonly operation: "read" | "write";
  readonly cause: unknown;
}> {}
