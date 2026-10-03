import type {
  OfferingCheckInput,
  OfferingFailureStatus,
} from "@/types/offering-check";

import { getOfferingCheckBrandFeatureIdentity } from "./offering-check";

const DESCRIPTION_KEY_PREFIX = "offering-check:description:";

const FAILURE_BY_HTTP_STATUS: Partial<Record<number, OfferingFailureStatus>> = {
  429: "rate-limited",
  503: "unavailable",
};

function descriptionKey(input: OfferingCheckInput): string {
  return `${DESCRIPTION_KEY_PREFIX}${getOfferingCheckBrandFeatureIdentity(input)}`;
}

export function failureStatusFor(
  httpStatus: number | undefined
): OfferingFailureStatus {
  return FAILURE_BY_HTTP_STATUS[httpStatus ?? 0] ?? "error";
}

export function storeOfferingDescription(input: OfferingCheckInput): void {
  try {
    sessionStorage.setItem(descriptionKey(input), input.description);
  } catch {
    // The report still works without optional context when storage is blocked.
  }
}

export function readOfferingDescription(input: OfferingCheckInput): string {
  try {
    return sessionStorage.getItem(descriptionKey(input)) ?? "";
  } catch {
    return "";
  }
}
