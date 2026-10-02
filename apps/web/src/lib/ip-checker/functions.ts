import { createServerFn } from "@tanstack/react-start";
import { Effect } from "effect";
import { z } from "zod";

import { parseIp } from "@/lib/ip-checker/cidr";
import {
  buildIpCheckResult,
  loadCrawlerIpLists,
  summarizeCrawlerIpLists,
} from "@/lib/ip-checker/sources";

export const getIpCheckerData = createServerFn({ method: "GET" })
  .validator(z.object({ ip: z.string().optional() }))
  .handler(async ({ data: { ip } }) => {
    const parsedIp = ip ? parseIp(ip) : null;
    const lists = await Effect.runPromise(loadCrawlerIpLists());
    return {
      initialResult: parsedIp ? buildIpCheckResult(lists, parsedIp) : null,
      summaries: summarizeCrawlerIpLists(lists),
    };
  });
