import { isDemoMode } from "@notra/utils/demo-mode";
import { headers } from "next/headers";
import { after } from "next/server";

import { DEMO_CLEANUP_BATCH_SIZE } from "@/constants/demo";
import {
  cleanupExpiredDemoSandboxes,
  createDemoSandbox,
} from "@/lib/demo/sandbox";
import { writeDemoSession } from "@/lib/demo/session";
import { demoSandboxCreateInputSchema } from "@/schemas/demo";
import type { DemoSandboxCreateResponse } from "@/types/demo";
import { hashDemoClientIp } from "@/utils/demo-ip-hash";
import { getClientIpFromHeaders, ratelimit } from "@/utils/ratelimit";

export const maxDuration = 60;

export async function POST(request: Request) {
  if (!isDemoMode()) {
    return new Response(null, { status: 404 });
  }

  const ipHash = hashDemoClientIp(getClientIpFromHeaders(await headers()));
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
  await writeDemoSession(sandbox.anonymousId);
  // Piggyback cleanup on new visitors instead of a cron: the demo shares
  // vercel.json with production, where a demo cron would only 404.
  after(() => cleanupExpiredDemoSandboxes(DEMO_CLEANUP_BATCH_SIZE));

  const body: DemoSandboxCreateResponse = {
    anonymousId: sandbox.anonymousId,
    slug: sandbox.slug,
  };
  return Response.json(body, { status: 201 });
}
