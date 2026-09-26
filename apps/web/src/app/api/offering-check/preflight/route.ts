import { Effect } from "effect";
import type { NextRequest } from "next/server";

import { OFFERING_CHECK_KILL_SWITCH_ENV } from "@/constants/offering-check";
import { readCachedOfferingCheck } from "@/lib/offering-check/cache";
import { peekOfferingCheckRateLimit } from "@/lib/offering-check/ratelimit";
import { isSameOriginRequest } from "@/lib/offering-check/same-origin";
import { offeringCheckRequestSchema } from "@/schemas/offering-check";
import { jsonError } from "@/utils/api-response";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (process.env[OFFERING_CHECK_KILL_SWITCH_ENV] === "off") {
    return jsonError("The checker is paused", 503);
  }
  if (!isSameOriginRequest(request)) {
    return jsonError("Forbidden", 403);
  }

  const parsed = offeringCheckRequestSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return jsonError("Enter a website and a feature name", 400);
  }

  return Effect.runPromise(
    Effect.gen(function* () {
      const cached = yield* readCachedOfferingCheck(parsed.data);
      if (!cached) {
        yield* peekOfferingCheckRateLimit(request, parsed.data);
      }
      return Response.json({ ok: true });
    }).pipe(
      Effect.catchTags({
        OfferingCheckRateLimitUnavailable: () =>
          Effect.succeed(jsonError("Rate limit service unavailable", 503)),
        OfferingCheckRateLimitExceeded: () =>
          Effect.succeed(jsonError("Rate limit exceeded", 429)),
      })
    )
  );
}
