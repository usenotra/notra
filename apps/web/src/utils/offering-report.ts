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
  if (input.description.length > 0) {
    params.set(OFFERING_CHECK_QUERY_KEYS.description, input.description);
  }
  return `${OFFERING_REPORT_PATH}?${params.toString()}`;
}
