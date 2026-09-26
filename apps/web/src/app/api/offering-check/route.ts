import { Effect } from "effect";
import type { NextRequest } from "next/server";

import {
  OFFERING_CHECK_KILL_SWITCH_ENV,
  OFFERING_CHECK_TIMEOUT_MS,
} from "@/constants/offering-check";
import {
  readCachedOfferingCheck,
  writeCachedOfferingCheck,
} from "@/lib/offering-check/cache";
import { enforceOfferingCheckRateLimit } from "@/lib/offering-check/ratelimit";
import { isSameOriginRequest } from "@/lib/offering-check/same-origin";
import { runOfferingCheck } from "@/lib/offering-check/scan";
import { offeringCheckRequestSchema } from "@/schemas/offering-check";
import type {
  OfferingCheckInput,
  OfferingCheckResult,
  OfferingStreamEvent,
} from "@/types/offering-check";
import { jsonError } from "@/utils/api-response";

export const runtime = "nodejs";

export const maxDuration = 60;

const STREAM_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "application/x-ndjson; charset=utf-8",
  "X-Accel-Buffering": "no",
};

function streamEvents(
  request: NextRequest,
  input: OfferingCheckInput,
  cached: OfferingCheckResult | null
): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: OfferingStreamEvent) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };
      if (cached) {
        emit({ type: "result", result: cached });
        controller.close();
        return;
      }
      try {
        const result = await runOfferingCheck(
          input,
          emit,
          AbortSignal.any([
            request.signal,
            AbortSignal.timeout(OFFERING_CHECK_TIMEOUT_MS),
          ])
        );
        await Effect.runPromise(writeCachedOfferingCheck(input, result));
        emit({ type: "result", result });
      } catch {
        if (!request.signal.aborted) {
          emit({ type: "error" });
        }
      }
      if (!request.signal.aborted) {
        controller.close();
      }
    },
  });
  return new Response(body, { headers: STREAM_HEADERS });
}

export async function POST(request: NextRequest) {
  if (process.env[OFFERING_CHECK_KILL_SWITCH_ENV] === "off") {
    return jsonError("The checker is paused", 503);
  }
  if (!isSameOriginRequest(request)) {
    return jsonError("Forbidden", 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON payload", 400);
  }

  const parsed = offeringCheckRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Enter a website and a feature name", 400);
  }
  const input = parsed.data;

  return Effect.runPromise(
    Effect.gen(function* () {
      const cached = yield* readCachedOfferingCheck(input);
      if (!cached) {
        yield* enforceOfferingCheckRateLimit(request, input);
      }
      return streamEvents(request, input, cached);
    }).pipe(
      Effect.catchTags({
        OfferingCheckRateLimitUnavailable: () =>
          Effect.succeed(jsonError("Rate limit service unavailable", 503)),
        OfferingCheckRateLimitExceeded: (error) => {
          const retryAfter = Math.max(
            0,
            Math.ceil((error.reset - Date.now()) / 1000)
          );
          return Effect.succeed(
            Response.json(
              { error: "Rate limit exceeded" },
              { headers: { "Retry-After": String(retryAfter) }, status: 429 }
            )
          );
        },
      })
    )
  );
}
