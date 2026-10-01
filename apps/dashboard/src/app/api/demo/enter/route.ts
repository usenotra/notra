import { isDemoMode } from "@notra/utils/demo-mode";
import { headers } from "next/headers";
import { after, type NextRequest } from "next/server";

import { DEMO_CLEANUP_BATCH_SIZE, DEMO_START_PATH } from "@/constants/demo";
import { assertDedicatedDemoDatabase } from "@/lib/demo/database-guard";
import {
  claimPooledSandbox,
  cleanupExpiredDemoSandboxes,
  refillDemoSandboxPool,
} from "@/lib/demo/sandbox";
import { getCurrentDemoSandbox, writeDemoSession } from "@/lib/demo/session";
import { getDemoClientIp, hashDemoClientIp } from "@/utils/demo-ip-hash";
import { resolveDemoLanding, safeDemoReturnTo } from "@/utils/demo-return-to";
import { ratelimit } from "@/utils/ratelimit";

export const maxDuration = 60;

/**
 * Relative redirect: behind a proxy (e.g. Railway) request.url carries the
 * bind address instead of the public host, so absolute URLs would leak it.
 */
function redirectTo(location: string) {
  return new Response(null, { status: 307, headers: { location } });
}

function topUpPool() {
  after(async () => {
    await cleanupExpiredDemoSandboxes(DEMO_CLEANUP_BATCH_SIZE);
    await refillDemoSandboxPool();
  });
}

/**
 * Entry point for visitors without a sandbox: hands them a ready one and
 * redirects straight into it, so the demo opens without a loading screen.
 * Only an empty pool falls back to the start page, which seeds one.
 */
export async function GET(request: NextRequest) {
  if (!isDemoMode()) {
    return new Response(null, { status: 404 });
  }
  const target = safeDemoReturnTo(request.nextUrl.searchParams.get("returnTo"));
  if (await getCurrentDemoSandbox()) {
    return redirectTo(target ?? "/");
  }

  await assertDedicatedDemoDatabase();
  const ipHash = hashDemoClientIp(getDemoClientIp(await headers()));
  const { success } = await ratelimit.demoSandboxCreate.limit(ipHash);
  const sandbox = success
    ? await claimPooledSandbox({ timeZone: null, ipHash })
    : null;
  // Denied requests must not buy pool maintenance (cleanup, rebase, seeding).
  if (success) {
    topUpPool();
  }

  if (!sandbox?.slug) {
    const query = target ? `?${new URLSearchParams({ returnTo: target })}` : "";
    return redirectTo(`${DEMO_START_PATH}${query}`);
  }

  await writeDemoSession(sandbox.anonymousId);
  return redirectTo(resolveDemoLanding(target, sandbox.slug));
}
