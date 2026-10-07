import { Data } from "effect";

export function getSocialConnectStatusCode(cause: unknown): number | null {
  if (!(cause instanceof Error)) {
    return null;
  }
  if ("statusCode" in cause && typeof cause.statusCode === "number") {
    return cause.statusCode;
  }
  if ("status" in cause && typeof cause.status === "number") {
    return cause.status;
  }
  return null;
}

export class SocialConnectConfigError extends Data.TaggedError(
  "SocialConnectConfigError"
)<{
  readonly message: string;
}> {}

export class SocialConnectRequestError extends Data.TaggedError(
  "SocialConnectRequestError"
)<{
  readonly message: string;
  readonly cause: unknown;
}> {}

/**
 * The create request may have reached the platform: it timed out, the
 * connection dropped, or the provider answered with a server error. Sending
 * again could post twice, so a person has to check the account first.
 */
export class SocialConnectDeliveryUnknownError extends Data.TaggedError(
  "SocialConnectDeliveryUnknownError"
)<{
  readonly message: string;
  readonly cause: unknown;
}> {}

/** A create that failed without a definite rejection may still have posted. */
export function isSocialDeliveryUnknown(cause: unknown) {
  const status = getSocialConnectStatusCode(cause);
  return status === null || status === 408 || status >= 500;
}

export class SocialConnectCallbackError extends Data.TaggedError(
  "SocialConnectCallbackError"
)<{
  readonly code: string;
  readonly cause?: unknown;
}> {}
