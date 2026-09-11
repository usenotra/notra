import { Effect } from "effect";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { IP_CHECKER_QUERY_KEY } from "@/constants/ip-checker";
import { parseIp } from "@/lib/ip-checker/cidr";
import { enforceIpCheckRateLimit } from "@/lib/ip-checker/ratelimit";
import {
  buildIpCheckResult,
  loadCrawlerIpLists,
} from "@/lib/ip-checker/sources";
import { ipCheckRequestSchema } from "@/schemas/ip-checker";
import { jsonError } from "@/utils/api-response";

export const runtime = "nodejs";

export function GET(request: NextRequest) {
  return respond(request, {
    ip: request.nextUrl.searchParams.get(IP_CHECKER_QUERY_KEY) ?? "",
  });
}

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON payload", 400);
  }

  return respond(request, body);
}

function respond(request: NextRequest, body: unknown) {
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
      return NextResponse.json(buildIpCheckResult(lists, ip));
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
          return NextResponse.json(
            { error: "Rate limit exceeded" },
            { headers: { "Retry-After": String(retryAfter) }, status: 429 }
          );
        },
        onSuccess: (response) => response,
      })
    )
  );
}
