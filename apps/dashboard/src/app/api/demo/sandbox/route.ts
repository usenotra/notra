import { isDemoMode } from "@notra/utils/demo-mode";
import { getRequestHeaders as headers } from "@tanstack/react-start/server";

import { createDemoSandbox, maintainDemoSandboxPool } from "@/lib/demo/sandbox";
import { writeDemoSession } from "@/lib/demo/session";
import { demoSandboxCreateInputSchema } from "@/schemas/demo";
import type { DemoSandboxCreateResponse } from "@/types/demo";
import { getDemoClientIp, hashDemoClientIp } from "@/utils/demo-ip-hash";
import { ratelimit } from "@/utils/ratelimit";

export async function POST(request: Request) {
  if (!isDemoMode()) {
    return new Response(null, { status: 404 });
  }

  const ipHash = hashDemoClientIp(getDemoClientIp(await headers()));
  const { success } = await ratelimit.demoSandboxCreate.limit(ipHash);
  if (!success) {
    return Response.json(
      { error: "Too many demo workspaces from this network" },
      { status: 429 }
    );
  }

  const parsed = demoSandboxCreateInputSchema.safeParse(
    await request.json().catch(() => ({}))
  );
  const sandbox = await createDemoSandbox({
    timeZone: parsed.success ? (parsed.data.timeZone ?? null) : null,
    ipHash,
  });
  if (!sandbox) {
    return Response.json(
      { error: "Demo workspace creation is busy. Please try again." },
      { status: 503, headers: { "Retry-After": "3" } }
    );
  }
  await writeDemoSession(sandbox.anonymousId);
  maintainDemoSandboxPool();

  const body: DemoSandboxCreateResponse = { slug: sandbox.slug };
  return Response.json(body, { status: 201 });
}
