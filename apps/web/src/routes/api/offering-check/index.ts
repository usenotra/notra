import { createFileRoute } from "@tanstack/react-router";
import { Effect } from "effect";

import { OFFERING_CHECK_TIMEOUT_MS } from "@/constants/offering-check";
import {
  readCachedOfferingCheck,
  writeCachedOfferingCheck,
} from "@/lib/offering-check/cache";
import { enforceOfferingCheckRateLimit } from "@/lib/offering-check/ratelimit";
import {
  rateLimitResponse,
  readOfferingCheckRequest,
} from "@/lib/offering-check/request";
import { runOfferingCheck } from "@/lib/offering-check/scan";
import type {
  OfferingCheckInput,
  OfferingCheckResult,
  OfferingStreamEvent,
} from "@/types/offering-check";

const STREAM_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "application/x-ndjson; charset=utf-8",
  "X-Accel-Buffering": "no",
};

function streamEvents(
  request: Request,
  input: OfferingCheckInput,
  cached: OfferingCheckResult | null
): Response {
  const encoder = new TextEncoder();
  let active = true;
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: OfferingStreamEvent) => {
        if (active) {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        }
      };
      if (cached) {
        emit({ type: "result", result: cached });
        active = false;
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
        // Send the result first; the cache write must not delay what the
        // visitor is waiting for. It still finishes before the stream closes.
        emit({ type: "result", result });
        await Effect.runPromise(writeCachedOfferingCheck(input, result));
      } catch {
        if (!request.signal.aborted) {
          emit({ type: "error" });
        }
      }
      if (active) {
        active = false;
        controller.close();
      }
    },
    cancel() {
      active = false;
    },
  });
  return new Response(body, { headers: STREAM_HEADERS });
}

async function POST(request: Request) {
  const input = await readOfferingCheckRequest(request);
  if (input instanceof Response) {
    return input;
  }

  return Effect.runPromise(
    Effect.gen(function* () {
      const cached = yield* readCachedOfferingCheck(input);
      if (!cached) {
        yield* enforceOfferingCheckRateLimit(request, input);
      }
      return streamEvents(request, input, cached);
    }).pipe(Effect.catch((error) => Effect.succeed(rateLimitResponse(error))))
  );
}

export const Route = createFileRoute("/api/offering-check/")({
  server: {
    handlers: {
      POST: ({ request }) => POST(request),
    },
  },
});
