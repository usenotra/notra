import { Duration, Effect, Schedule } from "effect";
import type { Resend } from "resend";

import {
  EMAIL_MAX_RETRIES,
  EMAIL_RETRY_BASE_DELAY_MS,
  EMAIL_RETRY_JITTER_MS,
  EMAIL_RETRY_MAX_DELAY_MS,
} from "@/constants/email/send";
import type {
  EmailPayload,
  EmailResult,
  EmailRetryFailure,
} from "@/types/email/send";

function isRetryable(error: { name: string; message: string }): boolean {
  const name = error.name.toLowerCase();
  const message = error.message.toLowerCase();

  return (
    name.includes("rate_limit") ||
    name.includes("internal_server") ||
    message.includes("429") ||
    message.includes("500") ||
    message.includes("502") ||
    message.includes("503") ||
    message.includes("504") ||
    message.includes("timeout") ||
    message.includes("network") ||
    message.includes("econnreset") ||
    message.includes("econnrefused")
  );
}

const exponentialSchedule: Schedule.Schedule<
  Duration.Duration,
  EmailRetryFailure
> = Schedule.exponential(Duration.millis(EMAIL_RETRY_BASE_DELAY_MS));

const retrySchedule = exponentialSchedule.pipe(
  Schedule.passthrough,
  Schedule.modifyDelay(({ duration }) =>
    Effect.sync(() =>
      Duration.millis(
        Math.min(
          Duration.toMillis(duration) + Math.random() * EMAIL_RETRY_JITTER_MS,
          EMAIL_RETRY_MAX_DELAY_MS
        )
      )
    )
  ),
  Schedule.upTo({ times: EMAIL_MAX_RETRIES }),
  Schedule.while(({ input }) => Effect.succeed(input.retryable))
);

export function sendEmailWithRetryEffect(
  resend: Resend,
  payload: EmailPayload,
  idempotencyKey: string
): Effect.Effect<EmailResult> {
  const attempt = Effect.tryPromise({
    try: () => resend.emails.send(payload, { idempotencyKey }),
    catch: (cause): EmailRetryFailure => ({
      result: {
        data: null,
        error: {
          name: "network_error",
          message: cause instanceof Error ? cause.message : String(cause),
        },
      },
      retryable: true,
    }),
  }).pipe(
    Effect.flatMap(({ data, error }) => {
      if (data) {
        return Effect.succeed<EmailResult>({ data, error: null });
      }

      if (error) {
        return Effect.fail<EmailRetryFailure>({
          result: { data: null, error },
          retryable: isRetryable(error),
        });
      }

      return Effect.succeed<EmailResult>({
        data: null,
        error: {
          name: "unknown_error",
          message: "No data or error returned from Resend",
        },
      });
    })
  );

  return Effect.retry(attempt, retrySchedule).pipe(
    Effect.catch((failure) => Effect.succeed(failure.result))
  );
}

export function sendEmailWithRetry(
  resend: Resend,
  payload: EmailPayload,
  idempotencyKey: string
): Promise<EmailResult> {
  return Effect.runPromise(
    sendEmailWithRetryEffect(resend, payload, idempotencyKey)
  );
}
