import { db } from "@notra/db/drizzle";
import {
  contentTriggers,
  demoRequestLog,
  geoScans,
  posts,
} from "@notra/db/schema";
import { and, count, eq, gt } from "drizzle-orm";

import {
  DEMO_API_PROMPT_PATH,
  DEMO_POSTS_READ_PATH,
  DEMO_SCHEDULE_RUN_PATH,
} from "@/constants/demo-missions";
import type { DemoMissionId, DemoSandbox } from "@/types/demo";

const SUCCESS_STATUS_LIMIT = 300;

/**
 * Mission progress is derived from what actually happened in the sandbox
 * (rows created after it was seeded, requests in the feed) rather than
 * stored, so it can never drift from the data.
 */
export async function loadDemoMissions(
  sandbox: DemoSandbox
): Promise<Record<DemoMissionId, boolean>> {
  const since = sandbox.anchorAt;
  const [scans, newPosts, triggers, requests] = await Promise.all([
    db
      .select({ value: count() })
      .from(geoScans)
      .where(
        and(
          eq(geoScans.organizationId, sandbox.organizationId),
          gt(geoScans.startedAt, since)
        )
      ),
    db
      .select({ value: count() })
      .from(posts)
      .where(
        and(
          eq(posts.organizationId, sandbox.organizationId),
          gt(posts.createdAt, since)
        )
      ),
    db
      .select({ value: count() })
      .from(contentTriggers)
      .where(
        and(
          eq(contentTriggers.organizationId, sandbox.organizationId),
          gt(contentTriggers.createdAt, since)
        )
      ),
    db.query.demoRequestLog.findMany({
      columns: { source: true, method: true, path: true, status: true },
      where: eq(demoRequestLog.anonymousId, sandbox.anonymousId),
    }),
  ]);

  const ok = requests.filter(
    (request) => request.status < SUCCESS_STATUS_LIMIT
  );
  const fromApi = ok.filter(
    (request) => request.source === "api" || request.source === "console"
  );

  return {
    scan: (scans[0]?.value ?? 0) > 0,
    apiPrompt: fromApi.some(
      (request) =>
        request.method === "POST" && DEMO_API_PROMPT_PATH.test(request.path)
    ),
    agentPost:
      (newPosts[0]?.value ?? 0) > 0 &&
      fromApi.some(
        (request) =>
          request.method === "GET" && DEMO_POSTS_READ_PATH.test(request.path)
      ),
    schedule:
      (triggers[0]?.value ?? 0) > 0 ||
      ok.some((request) => request.path === DEMO_SCHEDULE_RUN_PATH),
    externalClient: ok.some((request) => request.source === "api"),
  };
}
