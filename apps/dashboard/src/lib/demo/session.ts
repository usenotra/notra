import { db } from "@notra/db/drizzle";
import { users } from "@notra/db/schema";
import { eq } from "drizzle-orm";
import { cache } from "react";

import {
  DEMO_SESSION_COOKIE,
  DEMO_SESSION_COOKIE_MAX_AGE_SECONDS,
} from "@/constants/demo";
import { readSignedCookie, storeSignedCookie } from "@/lib/auth/signed-cookie";
import { assertDedicatedDemoDatabase } from "@/lib/demo/database-guard";
import { loadDemoSandbox, touchDemoSandbox } from "@/lib/demo/sandbox";
import { demoSessionPayloadSchema } from "@/schemas/demo";
import type { AuthIdentityData } from "@/types/auth/session";
import type { DemoSandbox } from "@/types/demo";

export async function writeDemoSession(anonymousId: string) {
  await storeSignedCookie(
    DEMO_SESSION_COOKIE,
    { anonymousId },
    DEMO_SESSION_COOKIE_MAX_AGE_SECONDS
  );
}

/**
 * The visitor's sandbox, resolved once per request from the signed cookie.
 * The anonymousId alone is public; only a valid signature opens the sandbox.
 */
export const getCurrentDemoSandbox = cache(
  async (): Promise<DemoSandbox | null> => {
    const payload = await readSignedCookie(
      DEMO_SESSION_COOKIE,
      demoSessionPayloadSchema
    );
    if (!payload) {
      return null;
    }
    const sandbox = await loadDemoSandbox(payload.anonymousId);
    if (!sandbox) {
      return null;
    }
    return touchDemoSandbox(sandbox);
  }
);

export async function loadDemoIdentity(): Promise<AuthIdentityData | null> {
  await assertDedicatedDemoDatabase();
  const sandbox = await getCurrentDemoSandbox();
  if (!sandbox) {
    return null;
  }
  const user = await db.query.users.findFirst({
    where: eq(users.id, sandbox.userId),
  });
  return user ? { user, impersonatedBy: null } : null;
}
