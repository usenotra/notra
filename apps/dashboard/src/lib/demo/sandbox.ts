import { db } from "@notra/db/drizzle";
import { demoSandboxes, members, organizations, users } from "@notra/db/schema";
import type { DemoPersonalization } from "@notra/db/types/demo";
import { normalizeTimeZone } from "@notra/utils/demo-clock";
import { and, asc, count, eq, gt, lt, or } from "drizzle-orm";

import {
  DEMO_ANONYMOUS_ID_LENGTH,
  DEMO_CLEANUP_BATCH_SIZE,
  DEMO_ANONYMOUS_ID_PREFIX,
  DEMO_COMPANY_NAME,
  DEMO_ORG_SLUG_PREFIX,
  DEMO_ORG_SLUG_SUFFIX_LENGTH,
  DEMO_SANDBOX_IDLE_TTL_MS,
  DEMO_SANDBOX_MAX_AGE_MS,
  DEMO_TOUCH_INTERVAL_MS,
  DEMO_USER_EMAIL_DOMAIN,
  DEMO_VISITOR_EMAIL_LOCAL,
  DEMO_VISITOR_NAME,
} from "@/constants/demo";
import {
  createDemoApiKey,
  deleteDemoApiKey,
  updateDemoApiKey,
} from "@/lib/demo/api-key";
import { assertDedicatedDemoDatabase } from "@/lib/demo/database-guard";
import { rebaseDemoSandbox, shouldRebaseDemoSandbox } from "@/lib/demo/rebase";
import { seedDemoWorkspace } from "@/lib/demo/seed/workspace";
import type {
  CreateDemoSandboxInput,
  DemoOrganizationInput,
  CreatedDemoSandbox,
  DemoSandbox,
} from "@/types/demo";
import { demoMaxActiveSandboxes } from "@/utils/demo-limits";

const ID_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

// Largest multiple of the alphabet size below 256: bytes at or above it are
// rejected so every character is equally likely.
const UNBIASED_BYTE_LIMIT = 256 - (256 % ID_ALPHABET.length);

function randomToken(length: number): string {
  let token = "";
  while (token.length < length) {
    for (const byte of crypto.getRandomValues(new Uint8Array(length))) {
      if (byte < UNBIASED_BYTE_LIMIT && token.length < length) {
        token += ID_ALPHABET[byte % ID_ALPHABET.length];
      }
    }
  }
  return token;
}

function createAnonymousId(): string {
  return `${DEMO_ANONYMOUS_ID_PREFIX}${randomToken(DEMO_ANONYMOUS_ID_LENGTH)}`;
}

function sandboxExpiry(createdAt: Date, lastSeenAt: Date): Date {
  return new Date(
    Math.min(
      lastSeenAt.getTime() + DEMO_SANDBOX_IDLE_TTL_MS,
      createdAt.getTime() + DEMO_SANDBOX_MAX_AGE_MS
    )
  );
}

/**
 * Runs `work` for a freshly created organization and deletes the
 * organization again if it fails, so no half-built workspace (which the
 * database guard would treat as a real customer) is ever left behind.
 */
async function withOrganizationRollback<T>(
  organization: { organizationId: string; userId: string },
  work: () => Promise<T>
): Promise<T> {
  try {
    return await work();
  } catch (error) {
    await deleteDemoOrganization(
      organization.organizationId,
      organization.userId
    );
    throw error;
  }
}

/** Creates the organization, owner and seeded data for one sandbox. */
async function createDemoOrganization(input: DemoOrganizationInput) {
  const companyName = input.personalization?.companyName ?? DEMO_COMPANY_NAME;
  const visitorName = input.personalization
    ? `${input.personalization.firstName} ${input.personalization.lastName}`.trim()
    : DEMO_VISITOR_NAME;
  const organizationId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  // Random per organization (not derived from the anonymousId) so a reset
  // can create the new workspace before the old one is deleted.
  const slug = `${DEMO_ORG_SLUG_PREFIX}${randomToken(DEMO_ORG_SLUG_SUFFIX_LENGTH).toLowerCase()}`;

  await db.transaction(async (tx) => {
    await tx.insert(users).values({
      id: userId,
      name: visitorName,
      // Per organization, because a reset creates the new workspace (and its
      // user) before deleting the old one.
      email: `${DEMO_VISITOR_EMAIL_LOCAL}+${organizationId.slice(0, 8)}@${DEMO_USER_EMAIL_DOMAIN}`,
      emailVerified: true,
      createdAt: input.now,
      updatedAt: input.now,
    });
    await tx.insert(organizations).values({
      id: organizationId,
      name: companyName,
      slug,
      createdAt: input.now,
      onboardingCompleted: true,
      onboardingDismissed: true,
      onboardingAgentRan: true,
    });
    await tx.insert(members).values({
      id: crypto.randomUUID(),
      organizationId,
      userId,
      role: "owner",
      createdAt: input.now,
    });
  });

  await withOrganizationRollback({ organizationId, userId }, () =>
    seedDemoWorkspace({
      organizationId,
      companyName,
      ownerUserId: userId,
      timeZone: input.timeZone,
      now: input.now,
    })
  );

  return { organizationId, userId, slug };
}

/**
 * Bounds the demo database: at the cap, expired sandboxes go first, then the
 * least recently used ones, so a traffic spike can't fill the disk.
 */
async function enforceDemoSandboxCap() {
  const cap = demoMaxActiveSandboxes();
  const [{ value: active } = { value: 0 }] = await db
    .select({ value: count() })
    .from(demoSandboxes);
  if (active < cap) {
    return;
  }
  await cleanupExpiredDemoSandboxes(DEMO_CLEANUP_BATCH_SIZE);
  const [{ value: remaining } = { value: 0 }] = await db
    .select({ value: count() })
    .from(demoSandboxes);
  const overflow = remaining - cap + 1;
  if (overflow <= 0) {
    return;
  }
  const oldest = await db.query.demoSandboxes.findMany({
    orderBy: [asc(demoSandboxes.lastSeenAt)],
    limit: overflow,
  });
  await Promise.all(oldest.map(deleteDemoSandbox));
}

export async function createDemoSandbox(
  input: CreateDemoSandboxInput
): Promise<CreatedDemoSandbox> {
  await assertDedicatedDemoDatabase();
  await enforceDemoSandboxCap();
  const anonymousId = createAnonymousId();
  const timeZone = normalizeTimeZone(input.timeZone);
  const now = new Date();
  const expiresAt = sandboxExpiry(now, now);

  const organization = await createDemoOrganization({
    anonymousId,
    timeZone,
    now,
    personalization: null,
  });
  const { organizationId, userId, slug } = organization;
  // The key is optional (the dashboard works without it), the sandbox row is
  // not: without it the organization would look like a real customer.
  const apiKey = await createDemoApiKey({
    organizationId,
    anonymousId,
    expiresAt: new Date(now.getTime() + DEMO_SANDBOX_MAX_AGE_MS),
  }).catch((error: unknown) => {
    console.error("[demo] Failed to create sandbox API key", error);
    return null;
  });

  await withOrganizationRollback(organization, () =>
    db.insert(demoSandboxes).values({
      anonymousId,
      organizationId,
      userId,
      apiKey: apiKey?.key ?? null,
      apiKeyId: apiKey?.keyId ?? null,
      timeZone,
      anchorAt: now,
      ipHash: input.ipHash,
      createdAt: now,
      lastSeenAt: now,
      expiresAt,
    })
  );

  return { anonymousId, organizationId, slug };
}

export async function loadDemoSandbox(
  anonymousId: string
): Promise<DemoSandbox | null> {
  const sandbox = await db.query.demoSandboxes.findFirst({
    where: and(
      eq(demoSandboxes.anonymousId, anonymousId),
      gt(demoSandboxes.expiresAt, new Date())
    ),
  });
  return sandbox ?? null;
}

/**
 * Records activity and keeps the data current: extends the idle TTL and, on
 * the first request of a new local day, shifts every timestamp forward.
 */
export async function touchDemoSandbox(
  sandbox: DemoSandbox
): Promise<DemoSandbox> {
  const now = new Date();
  let current = sandbox;

  if (shouldRebaseDemoSandbox(current, now)) {
    current = await rebaseDemoSandbox(current, now);
  }

  if (now.getTime() - current.lastSeenAt.getTime() < DEMO_TOUCH_INTERVAL_MS) {
    return current;
  }

  const expiresAt = sandboxExpiry(current.createdAt, now);
  await db
    .update(demoSandboxes)
    .set({ lastSeenAt: now, expiresAt })
    .where(eq(demoSandboxes.anonymousId, current.anonymousId));
  return { ...current, lastSeenAt: now, expiresAt };
}

/**
 * Throws away everything the visitor changed and reseeds a fresh workspace,
 * keeping the anonymousId and API key so snippets keep working. The
 * visitor's personalization (name, company) is reapplied unless replaced.
 */
export async function resetDemoSandbox(
  sandbox: DemoSandbox,
  personalization: DemoPersonalization | null = sandbox.personalization
): Promise<{ slug: string }> {
  const now = new Date();
  const next = await createDemoOrganization({
    anonymousId: sandbox.anonymousId,
    timeZone: sandbox.timeZone,
    now,
    personalization,
  });
  const { organizationId: nextOrganizationId, userId, slug } = next;

  await withOrganizationRollback(next, () =>
    db
      .update(demoSandboxes)
      .set({
        organizationId: nextOrganizationId,
        userId,
        anchorAt: now,
        personalization,
        lastSeenAt: now,
        expiresAt: sandboxExpiry(sandbox.createdAt, now),
      })
      .where(eq(demoSandboxes.anonymousId, sandbox.anonymousId))
  );

  await deleteDemoOrganization(sandbox.organizationId, sandbox.userId);

  if (sandbox.apiKeyId) {
    await updateDemoApiKey({
      keyId: sandbox.apiKeyId,
      organizationId: nextOrganizationId,
    }).catch((error: unknown) => {
      console.error("[demo] Failed to move sandbox API key", error);
    });
  }

  return { slug };
}

async function deleteDemoOrganization(organizationId: string, userId: string) {
  // Organization cascades every org-scoped row; the user is global.
  await db.delete(organizations).where(eq(organizations.id, organizationId));
  await db.delete(users).where(eq(users.id, userId));
}

async function deleteDemoSandbox(sandbox: DemoSandbox) {
  if (sandbox.apiKeyId) {
    await deleteDemoApiKey(sandbox.apiKeyId).catch((error: unknown) => {
      console.error("[demo] Failed to delete sandbox API key", error);
    });
  }
  await deleteDemoOrganization(sandbox.organizationId, sandbox.userId);
}

/** Deletes expired sandboxes. Returns how many were removed. */
export async function cleanupExpiredDemoSandboxes(
  limit: number
): Promise<number> {
  const now = new Date();
  const expired = await db.query.demoSandboxes.findMany({
    where: or(
      lt(demoSandboxes.expiresAt, now),
      lt(
        demoSandboxes.createdAt,
        new Date(now.getTime() - DEMO_SANDBOX_MAX_AGE_MS)
      )
    ),
    limit,
  });

  await Promise.all(expired.map(deleteDemoSandbox));

  return expired.length;
}
