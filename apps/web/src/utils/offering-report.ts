import {
  OFFERING_CHECK_QUERY_KEYS,
  OFFERING_REPORT_PATH,
} from "@/constants/offering-check";
import type { OfferingCheckInput } from "@/types/offering-check";

export function offeringReportHref(input: OfferingCheckInput): string {
  const params = new URLSearchParams({
    [OFFERING_CHECK_QUERY_KEYS.domain]: input.domain,
  });
  if (input.feature.length > 0) {
    params.set(OFFERING_CHECK_QUERY_KEYS.feature, input.feature);
  }
  return `${OFFERING_REPORT_PATH}?${params.toString()}`;
}

export function storeOfferingReportDescription(
  input: OfferingCheckInput
): void {
  try {
    sessionStorage.setItem(offeringReportHref(input), input.description);
  } catch {
    // The report still works without optional context when storage is blocked.
  }
}

export function readOfferingReportDescription(
  input: OfferingCheckInput
): string {
  try {
    return sessionStorage.getItem(offeringReportHref(input)) ?? "";
  } catch {
    return "";
  }
}
