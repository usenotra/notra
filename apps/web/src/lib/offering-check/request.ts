import {
  OFFERING_CHECK_INVALID_REQUEST_MESSAGE,
  OFFERING_CHECK_KILL_SWITCH_ENV,
} from "@/constants/offering-check";
import { offeringCheckRequestSchema } from "@/schemas/offering-check";
import type { OfferingCheckInput } from "@/types/offering-check";
import { jsonError } from "@/utils/api-response";

import type { OfferingCheckUnknownSite } from "./domain-exists";
import type {
  OfferingCheckRateLimitExceeded,
  OfferingCheckRateLimitUnavailable,
} from "./ratelimit";

const MS_PER_SECOND = 1000;

function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host =
    (process.env.VERCEL && request.headers.get("x-forwarded-host")) ||
    request.headers.get("host");
  const protocol =
    (process.env.VERCEL &&
      request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim()) ||
    new URL(request.url).protocol.replace(":", "");
  if (!(origin && host)) {
    return false;
  }
  const requestOrigin = URL.parse(`${protocol}://${host}`)?.origin;
  return Boolean(requestOrigin && URL.parse(origin)?.origin === requestOrigin);
}

/**
 * Gate shared by the check and preflight endpoints: kill switch, same-origin
 * and body validation. Returns the parsed input or the response to send.
 */
export async function readOfferingCheckRequest(
  request: Request
): Promise<OfferingCheckInput | Response> {
  if (process.env[OFFERING_CHECK_KILL_SWITCH_ENV] === "off") {
    return jsonError("The checker is paused", 503);
  }
  if (!isSameOriginRequest(request)) {
    return jsonError("Forbidden", 403);
  }
  const parsed = offeringCheckRequestSchema.safeParse(
    await request.json().catch(() => null)
  );
  return parsed.success
    ? parsed.data
    : jsonError(OFFERING_CHECK_INVALID_REQUEST_MESSAGE, 400);
}

/** Maps the typed failures of both endpoints to HTTP responses. */
export function checkErrorResponse(
  error:
    | OfferingCheckRateLimitExceeded
    | OfferingCheckRateLimitUnavailable
    | OfferingCheckUnknownSite
): Response {
  if (error._tag === "OfferingCheckUnknownSite") {
    return jsonError("Website not found", 422);
  }
  if (error._tag === "OfferingCheckRateLimitUnavailable") {
    return jsonError("Rate limit service unavailable", 503);
  }
  const retryAfter = Math.max(
    0,
    Math.ceil((error.reset - Date.now()) / MS_PER_SECOND)
  );
  return Response.json(
    { error: "Rate limit exceeded", scope: error.scope },
    { headers: { "Retry-After": String(retryAfter) }, status: 429 }
  );
}
