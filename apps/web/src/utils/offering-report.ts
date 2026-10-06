import type {
  OfferingFailureStatus,
  OfferingRateLimitScope,
} from "@/types/offering-check";

const FAILURE_BY_SCOPE: Record<OfferingRateLimitScope, OfferingFailureStatus> =
  {
    visitor: "rate-limited",
    site: "site-limited",
    busy: "busy",
  };

function readScope(body: unknown): OfferingRateLimitScope {
  const scope =
    typeof body === "object" && body !== null && "scope" in body
      ? body.scope
      : null;
  return scope === "site" || scope === "busy" ? scope : "visitor";
}

/** Maps a failed API response to what the visitor should be told. */
export async function failureStatusFor(
  response: Response | null
): Promise<OfferingFailureStatus> {
  if (response?.status === 429) {
    const body: unknown = await response.json().catch(() => null);
    return FAILURE_BY_SCOPE[readScope(body)];
  }
  if (response?.status === 422) {
    return "unknown-site";
  }
  return response?.status === 503 ? "unavailable" : "error";
}
