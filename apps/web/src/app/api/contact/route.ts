import { Effect } from "effect";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  enforceContactMessageRateLimit,
  enforceContactVerificationRateLimit,
  getContactRateLimitHeaders,
} from "@/lib/contact/ratelimit";
import { sendContactMessageEmail } from "@/lib/contact/send-message-email";
import { verifyContactTurnstile } from "@/lib/contact/verify-turnstile";
import { contactMessageSchema } from "@/schemas/contact";
import { jsonError } from "@/utils/api-response";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
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

  const token = (body as Record<string, unknown>)["cf-turnstile-response"];

  return Effect.runPromise(
    Effect.gen(function* () {
      yield* enforceContactVerificationRateLimit(request);
      const verified = yield* Effect.promise(() =>
        verifyContactTurnstile(token)
      );
      if (!verified) {
        return jsonError("Verification failed. Please try again.", 403);
      }

      const rateLimit = yield* enforceContactMessageRateLimit(
        request,
        parsed.data.email
      );
      yield* sendContactMessageEmail(parsed.data);

      return NextResponse.json(
        { success: true },
        { headers: getContactRateLimitHeaders(rateLimit) }
      );
    }).pipe(
      Effect.match({
        onFailure: (error) => {
          if (error._tag === "ContactMessageRateLimitExceeded") {
            return NextResponse.json(
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
