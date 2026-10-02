import { createFileRoute } from "@tanstack/react-router";
import { Effect } from "effect";

import { IP_CHECKER_QUERY_KEY } from "@/constants/ip-checker";
import { parseIp } from "@/lib/ip-checker/cidr";
import { buildIpCheckerMarkdown } from "@/lib/ip-checker/markdown";
import { enforceIpCheckRateLimit } from "@/lib/ip-checker/ratelimit";
import {
  buildIpCheckResult,
  loadCrawlerIpLists,
  summarizeCrawlerIpLists,
} from "@/lib/ip-checker/sources";
import { ipCheckRequestSchema } from "@/schemas/ip-checker";
import { markdownResponse } from "@/utils/http";

const INPUT_PREVIEW_LENGTH = 64;

function markdownError(title: string, body: string, status: number) {
  return markdownResponse(`# ${title}\n\n${body}\n`, status);
}

function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const rawIp = params.has(IP_CHECKER_QUERY_KEY)
    ? (params.get(IP_CHECKER_QUERY_KEY) ?? "")
    : null;
  const parsedInput =
    rawIp === null ? null : ipCheckRequestSchema.safeParse({ ip: rawIp });
  const ip = parsedInput?.success ? parseIp(parsedInput.data.ip) : null;
  const hasInvalidInput = rawIp !== null && !ip;
  const invalidInput = hasInvalidInput
    ? rawIp.slice(0, INPUT_PREVIEW_LENGTH)
    : null;

  return Effect.runPromise(
    Effect.gen(function* () {
      if (ip) {
        yield* enforceIpCheckRateLimit(request);
      }
      const lists = yield* loadCrawlerIpLists();
      const result = ip ? buildIpCheckResult(lists, ip) : null;
      const markdown = buildIpCheckerMarkdown(
        summarizeCrawlerIpLists(lists),
        result,
        invalidInput
      );
      return markdownResponse(markdown, hasInvalidInput ? 422 : 200);
    }).pipe(
      Effect.match({
        onFailure: (error) => {
          if (error._tag === "IpCheckRateLimitUnavailable") {
            return markdownError(
              "Rate limit service unavailable",
              "Try again in a moment.",
              503
            );
          }
          return markdownError(
            "Rate limit exceeded",
            "Too many checks in a row. Try again later.",
            429
          );
        },
        onSuccess: (response) => response,
      })
    )
  );
}

export const Route = createFileRoute("/ip-checker.md")({
  server: {
    handlers: {
      GET: ({ request }) => GET(request),
    },
  },
});
