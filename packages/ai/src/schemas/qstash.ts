import { Schema } from "effect";

/**
 * The scheduler is not set up for this environment, so schedules cannot be
 * registered. Callers surface this as a setup problem instead of a 500.
 */
export class QstashScheduleSetupError extends Schema.TaggedError<QstashScheduleSetupError>()(
  "QstashScheduleSetupError",
  {
    reason: Schema.Literals([
      "missing_token",
      "missing_app_url",
      "invalid_destination",
    ]),
    cause: Schema.optional(Schema.Defect()),
  }
) {
  override get message() {
    switch (this.reason) {
      case "missing_token":
        return "QSTASH_TOKEN is not configured";
      case "missing_app_url":
        return "App URL not configured. Set NEXT_PUBLIC_APP_URL, APP_URL, or VERCEL_URL.";
      default:
        return "QStash cannot reach the schedule destination";
    }
  }
}
