/**
 * Kept byte-identical to the dashboard's `AGENT_FEEDBACK_PLAN_REQUIRED_MESSAGE`
 * so a client sees the same 402 copy whichever surface it hit.
 */
export const FEEDBACK_PLAN_REQUIRED_ERROR =
  "Feedback is not enabled on this plan";
export const FEEDBACK_NOT_FOUND_ERROR = "Feedback not found";
export const FEEDBACK_PROJECT_NOT_FOUND_ERROR = "Project not found";
export const FEEDBACK_ORGANIZATION_NOT_FOUND_ERROR =
  "Feedback endpoint not found";
export const FEEDBACK_TOKEN_INVALID_ERROR = "Invalid feedback token";
export const FEEDBACK_TOKEN_REVOKED_ERROR = "Feedback token revoked";
export const FEEDBACK_TOKEN_SCOPE_ERROR =
  "Feedback tokens can only submit feedback";
export const FEEDBACK_TOKEN_UNAVAILABLE_ERROR =
  "Feedback ingestion unavailable";
export const FEEDBACK_INGEST_SCOPE = "feedback.write";
export const FEEDBACK_TOKEN_GENERATION_MISSING = "missing";
