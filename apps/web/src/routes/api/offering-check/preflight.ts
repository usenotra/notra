import { createFileRoute } from "@tanstack/react-router";
import { Effect } from "effect";

import { readCachedOfferingCheck } from "@/lib/offering-check/cache";
import { ensureOfferingSiteExists } from "@/lib/offering-check/domain-exists";
import {
  enforceOfferingCheckPreflightRateLimit,
  peekOfferingCheckRateLimit,
} from "@/lib/offering-check/ratelimit";
import {
  checkErrorResponse,
  readOfferingCheckRequest,
} from "@/lib/offering-check/request";

async function POST(request: Request) {
  const input = await readOfferingCheckRequest(request);
  if (input instanceof Response) {
    return input;
  }

  return Effect.runPromise(
    Effect.gen(function* () {
      yield* enforceOfferingCheckPreflightRateLimit(request);
      const cached = yield* readCachedOfferingCheck(input);
      if (!cached) {
        yield* ensureOfferingSiteExists(input.domain);
        yield* peekOfferingCheckRateLimit(request, input);
      }
      return Response.json({ ok: true });
    }).pipe(Effect.catch((error) => Effect.succeed(checkErrorResponse(error))))
  );
}

export const Route = createFileRoute("/api/offering-check/preflight")({
  server: {
    handlers: {
      POST: ({ request }) => POST(request),
    },
  },
});
