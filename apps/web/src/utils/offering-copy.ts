import {
  OFFERING_CHECK_INVALID_MESSAGES,
  OFFERING_CHECK_MODEL_LABEL,
  OFFERING_NOTICE_FIELD,
  OFFERING_PENDING_HERO_BODY,
  OFFERING_REPORT_FAILURE_MESSAGES,
  OFFERING_VERDICTS,
} from "@/constants/offering-check";
import type {
  OfferingCheckResult,
  OfferingFormProblem,
  OfferingHeroCopy,
  OfferingNoticeDescription,
  OfferingThread,
} from "@/types/offering-check";

/**
 * The hero leads with the problem question when one was asked, since buyers
 * who do not know the feature name are the harder audience to reach.
 */
export function getOfferingHeroCopy(
  result: OfferingCheckResult | null,
  hasFeature: boolean
): OfferingHeroCopy {
  const headline =
    result?.answers.find((answer) => answer.kind === "problem") ??
    result?.answers[0];
  if (!headline) {
    return {
      lead: `Asking ${OFFERING_CHECK_MODEL_LABEL} about `,
      body: OFFERING_PENDING_HERO_BODY,
    };
  }
  const copy = OFFERING_VERDICTS[headline.verdict];
  if (headline.kind === "problem") {
    return { lead: copy.problemLead, body: copy.problemBody };
  }
  return {
    lead: copy.heroLead,
    body: hasFeature ? copy.featureBody : copy.companyBody,
  };
}

export function getOfferingActivityLabel(thread: OfferingThread): string {
  if (thread.seconds !== null) {
    return "Grading the answer";
  }
  if (thread.answer.length > 0) {
    return "Writing the answer";
  }
  if (thread.domains.length > 0) {
    const sites = thread.domains.length === 1 ? "site" : "sites";
    return `Searching the web · ${thread.domains.length} ${sites}`;
  }
  return thread.queries.length > 0 ? "Searching the web" : "Thinking";
}

/** The message for a form notice, and the field it belongs to if any. */
export function describeOfferingNotice(
  notice: OfferingFormProblem
): OfferingNoticeDescription {
  const message =
    notice === "invalid-domain" ||
    notice === "invalid-feature" ||
    notice === "invalid-problem"
      ? OFFERING_CHECK_INVALID_MESSAGES[notice]
      : OFFERING_REPORT_FAILURE_MESSAGES[notice];
  return { field: OFFERING_NOTICE_FIELD[notice] ?? null, message };
}
