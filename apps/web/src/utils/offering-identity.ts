import { OFFERING_WHITESPACE_RUN } from "@/constants/offering-check";
import type { OfferingCheckInput } from "@/types/offering-check";

function normalizeOfferingCheckText(input: string): string {
  return input.trim().toLowerCase().replace(OFFERING_WHITESPACE_RUN, " ");
}

/** Same brand and feature, whatever the casing or spacing. Used for limits. */
export function getOfferingCheckBrandFeatureIdentity(
  input: OfferingCheckInput
): string {
  return JSON.stringify([
    input.domain.toLowerCase(),
    normalizeOfferingCheckText(input.feature),
  ]);
}

/** Everything that changes the answer, normalized. Used for the cache key. */
export function getOfferingCheckCacheIdentity(
  input: OfferingCheckInput
): string {
  return JSON.stringify([
    input.domain.toLowerCase(),
    normalizeOfferingCheckText(input.feature),
    normalizeOfferingCheckText(input.problem),
  ]);
}
