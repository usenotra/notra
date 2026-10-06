import type { OfferingFailureStatus } from "@/types/offering-check";

const FAILURE_BY_HTTP_STATUS: Partial<Record<number, OfferingFailureStatus>> = {
  429: "rate-limited",
  503: "unavailable",
};

export function failureStatusFor(
  httpStatus: number | undefined
): OfferingFailureStatus {
  return FAILURE_BY_HTTP_STATUS[httpStatus ?? 0] ?? "error";
}
