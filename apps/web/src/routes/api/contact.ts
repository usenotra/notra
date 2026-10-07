import { createFileRoute } from "@tanstack/react-router";
import { Effect } from "effect";

import { CONTACT_TURNSTILE_ACTION } from "@/constants/turnstile";
import { isContactSpam } from "@/lib/contact/classify-spam";
import {
  enforceContactMessageRateLimit,
  enforceContactVerificationRateLimit,
  getContactRateLimitHeaders,
} from "@/lib/contact/ratelimit";
import { sendContactMessageEmail } from "@/lib/contact/send-message-email";
import { verifyTurnstile } from "@/lib/turnstile/verify";
import { contactMessageSchema } from "@/schemas/contact";
import { jsonError } from "@/utils/api-response";

async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON payload", 400);
  }

  const parsed = contactMessageSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError("Invalid contact message", 400);
  }

  const token =
    typeof body === "object" && body !== null && "cf-turnstile-response" in body
      ? body["cf-turnstile-response"]
      : undefined;

  return Effect.runPromise(
    Effect.gen(function* () {
      yield* enforceContactVerificationRateLimit(request);
      const verified = yield* Effect.promise(() =>
        verifyTurnstile(token, CONTACT_TURNSTILE_ACTION)
      );
      if (!verified) {
        return jsonError("Verification failed. Please try again.", 403);
      }

      const rateLimit = yield* enforceContactMessageRateLimit(
        request,
        parsed.data.email
      );
      const spam = yield* Effect.promise(() => isContactSpam(parsed.data));
      if (!spam) {
        yield* sendContactMessageEmail(parsed.data);
      }

      return Response.json(
        { success: true },
        { headers: getContactRateLimitHeaders(rateLimit) }
      );
    }).pipe(
      Effect.match({
        onFailure: (error) => {
          if (error._tag === "ContactMessageRateLimitExceeded") {
            return Response.json(
              { error: "Rate limit exceeded" },
              { headers: getContactRateLimitHeaders(error, true), status: 429 }
            );
          }

          console.error("Failed to send contact message email", error);
          return jsonError("Failed to send message", 500);
        },
        onSuccess: (response) => response,
      })
    )
  );
}

export const Route = createFileRoute("/api/contact")({
  server: {
    handlers: {
      POST: ({ request }) => POST(request),
    },
  },
});
