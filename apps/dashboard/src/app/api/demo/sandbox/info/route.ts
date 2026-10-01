import { db } from "@notra/db/drizzle";
import { projects } from "@notra/db/schema";
import { asc, eq } from "drizzle-orm";

import { DEMO_API_BASE_URL, DEMO_SIGNUP_URL } from "@/constants/demo";
import { loadDemoMissions } from "@/lib/demo/missions";
import { demoSandboxRoute } from "@/lib/demo/route";
import type { DemoSandboxInfo } from "@/types/demo";

export const GET = demoSandboxRoute(async (sandbox) => {
  const [project, missions] = await Promise.all([
    db.query.projects.findFirst({
      columns: { id: true },
      where: eq(projects.organizationId, sandbox.organizationId),
      orderBy: [asc(projects.createdAt)],
    }),
    loadDemoMissions(sandbox),
  ]);

  const body: DemoSandboxInfo = {
    anonymousId: sandbox.anonymousId,
    organizationId: sandbox.organizationId,
    expiresAt: sandbox.expiresAt.toISOString(),
    timeZone: sandbox.timeZone,
    apiKey: sandbox.apiKey,
    apiBaseUrl: DEMO_API_BASE_URL,
    signupUrl: DEMO_SIGNUP_URL,
    projectId: project?.id ?? null,
    personalization: sandbox.personalization,
    missions,
  };
  return Response.json(body, { headers: { "Cache-Control": "no-store" } });
});
