import { createFileRoute } from "@tanstack/react-router";
import { Effect } from "effect";

import { IP_CHECKER_QUERY_KEY } from "@/constants/ip-checker";
import { parseIp } from "@/lib/ip-checker/cidr";
import { enforceIpCheckRateLimit } from "@/lib/ip-checker/ratelimit";
import {
  buildIpCheckResult,
  loadCrawlerIpLists,
} from "@/lib/ip-checker/sources";
import { ipCheckRequestSchema } from "@/schemas/ip-checker";
import { jsonError } from "@/utils/api-response";

function GET(request: Request) {
  return respond(request, {
    ip: new URL(request.url).searchParams.get(IP_CHECKER_QUERY_KEY) ?? "",
  });
}

async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON payload", 400);
  }

  return respond(request, body);
}

function respond(request: Request, body: unknown) {
  const parsed = ipCheckRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Enter an IP address", 400);
  }

  const ip = parseIp(parsed.data.ip);
  if (!ip) {
    return jsonError("That is not a valid IPv4 or IPv6 address", 422);
  }

  return Effect.runPromise(
    Effect.gen(function* () {
      yield* enforceIpCheckRateLimit(request);
      const lists = yield* loadCrawlerIpLists();
      return Response.json(buildIpCheckResult(lists, ip));
    }).pipe(
      Effect.match({
        onFailure: (error) => {
          if (error._tag === "IpCheckRateLimitUnavailable") {
            return jsonError("Rate limit service unavailable", 503);
          }
          const retryAfter = Math.max(
            0,
            Math.ceil((error.reset - Date.now()) / 1000)
          );
          return Response.json(
            { error: "Rate limit exceeded" },
            { headers: { "Retry-After": String(retryAfter) }, status: 429 }
          );
        },
        onSuccess: (response) => response,
      })
    )
  );
}

export const Route = createFileRoute("/api/ip-checker")({
  server: {
    handlers: {
      GET: ({ request }) => GET(request),
      POST: ({ request }) => POST(request),
    },
  },
});
