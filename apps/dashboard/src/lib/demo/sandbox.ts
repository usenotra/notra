import { redis } from "@notra/ai/utils/redis";
import {
  DEMO_ORG_SLUG_PREFIX,
  DEMO_SEEDING_GRACE_MINUTES,
} from "@notra/db/constants/demo";
import { db } from "@notra/db/drizzle";
import {
  demoRequestLog,
  demoSandboxes,
  members,
  organizations,
  users,
} from "@notra/db/schema";
import type { DemoPersonalization } from "@notra/db/types/demo";
import { normalizeTimeZone } from "@notra/utils/demo-clock";
import {
  and,
  asc,
  count,
  eq,
  gt,
  inArray,
  like,
  lt,
  notExists,
  notLike,
  type SQL,
  TransactionRollbackError,
} from "drizzle-orm";

import {
  DEMO_ANONYMOUS_ID_LENGTH,
  DEMO_CLEANUP_BATCH_SIZE,
  DEMO_ANONYMOUS_ID_PREFIX,
  DEMO_COMPANY_NAME,
  DEMO_POOL_FRESH_MS,
  DEMO_POOL_ID_PREFIX,
  DEMO_POOL_REFILL_LOCK_KEY,
  DEMO_POOL_REFILL_LOCK_SECONDS,
  DEMO_POOL_REFILL_RELEASE_SCRIPT,
  DEMO_ORG_SLUG_SUFFIX_LENGTH,
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
import { afterResponse as after } from "@/lib/framework/after-response";
import type {
  CreateDemoSandboxInput,
  DemoOrganizationInput,
  CreatedDemoSandbox,
  DemoSandbox,
  DemoTransaction,
} from "@/types/demo";
import { demoMaxActiveSandboxes, demoPoolSize } from "@/utils/demo-limits";

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

function sandboxExpiry(createdAt: Date): Date {
  return new Date(createdAt.getTime() + DEMO_SANDBOX_MAX_AGE_MS);
}

const POOLED_ID_PATTERN = `${DEMO_POOL_ID_PREFIX}%`;

async function countDemoSandboxes(where?: SQL): Promise<number> {
  const [{ value } = { value: 0 }] = await db
    .select({ value: count() })
    .from(demoSandboxes)
    .where(where);
  return value;
}

/**
 * Locks the oldest unexpired pooled sandbox, optionally only one anchored
 * after `anchoredAfter`. SKIP LOCKED lets concurrent visitors each take a
 * different one; expired ones are skipped because cleanup could delete them
 * right after the claim.
 */
async function lockNextPooledSandbox(
  tx: DemoTransaction,
  now: Date,
  anchoredAfter?: Date
) {
  const [pooled] = await tx
    .select({
      anonymousId: demoSandboxes.anonymousId,
      organizationId: demoSandboxes.organizationId,
      userId: demoSandboxes.userId,
      apiKeyId: demoSandboxes.apiKeyId,
      anchorAt: demoSandboxes.anchorAt,
      slug: organizations.slug,
    })
    .from(demoSandboxes)
    .innerJoin(
      organizations,
      eq(organizations.id, demoSandboxes.organizationId)
    )
    .where(
      and(
        like(demoSandboxes.anonymousId, POOLED_ID_PATTERN),
        gt(demoSandboxes.expiresAt, now),
        anchoredAfter ? gt(demoSandboxes.anchorAt, anchoredAfter) : undefined
      )
    )
    .orderBy(asc(demoSandboxes.createdAt))
    .limit(1)
    .for("update", { of: demoSandboxes, skipLocked: true });
  return pooled ?? null;
}

/**
 * Runs `work` for a freshly created organization and deletes the
 * organization again if it fails, so no half-built workspace (which the
 * database guard would treat as a real customer) is ever left behind.
 */
async function withOrganizationRollback<T>(
  organization: { organizationId: string },
  work: () => Promise<T>
): Promise<T> {
  try {
    return await work();
  } catch (error) {
    await deleteDemoOrganization(organization.organizationId);
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

  await withOrganizationRollback({ organizationId }, () =>
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
  if ((await countDemoSandboxes()) < cap) {
    return;
  }
  await cleanupExpiredDemoSandboxes(DEMO_CLEANUP_BATCH_SIZE);
  const overflow = (await countDemoSandboxes()) - cap + 1;
  if (overflow <= 0) {
    return;
  }
  // Visitors' sandboxes go first: the few waiting in the pool look idle but
  // are what keeps the next visitor from waiting.
  const oldest = await db.query.demoSandboxes.findMany({
    where: notLike(demoSandboxes.anonymousId, POOLED_ID_PATTERN),
    orderBy: [asc(demoSandboxes.lastSeenAt)],
    limit: overflow,
  });
  await Promise.all(oldest.map(deleteDemoSandbox));
}

async function seedDemoSandbox(
  anonymousId: string,
  input: CreateDemoSandboxInput
): Promise<CreatedDemoSandbox> {
  const timeZone = normalizeTimeZone(input.timeZone);
  const now = new Date();
  const expiresAt = sandboxExpiry(now);

  const organization = await createDemoOrganization({
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
    expiresAt,
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

/**
 * Hands a ready, pre-seeded sandbox to a new visitor: re-keys it to a fresh
 * anonymousId and shifts its data to the present. Null when the pool is
 * empty.
 */
export async function claimPooledSandbox(
  input: CreateDemoSandboxInput
): Promise<CreatedDemoSandbox | null> {
  const anonymousId = createAnonymousId();
  const now = new Date();
  const claimed = await db.transaction(async (tx) => {
    const pooled = await lockNextPooledSandbox(tx, now);
    if (!pooled) {
      return null;
    }
    // A fresh sandbox only needs its anchor moved; shifting every timestamp
    // is the slow path, left for a pool that went stale.
    const fresh =
      now.getTime() - pooled.anchorAt.getTime() < DEMO_POOL_FRESH_MS;
    // The request log references the old id without ON UPDATE CASCADE; a
    // pooled key is not handed out, but stray rows would block the re-key.
    await tx
      .delete(demoRequestLog)
      .where(eq(demoRequestLog.anonymousId, pooled.anonymousId));
    const [row] = await tx
      .update(demoSandboxes)
      .set({
        anonymousId,
        timeZone: normalizeTimeZone(input.timeZone),
        ipHash: input.ipHash,
        createdAt: now,
        lastSeenAt: now,
        expiresAt: sandboxExpiry(now),
        ...(fresh ? { anchorAt: now } : {}),
      })
      .where(eq(demoSandboxes.anonymousId, pooled.anonymousId))
      .returning();
    return row ? { row, slug: pooled.slug, fresh } : null;
  });
  if (!claimed) {
    return null;
  }
  if (!claimed.fresh) {
    await rebaseDemoSandbox(claimed.row, now);
  }
  const keyId = claimed.row.apiKeyId;
  if (keyId) {
    after(() =>
      updateDemoApiKey({ keyId, expiresAt: sandboxExpiry(now) }).catch(
        (error: unknown) => {
          console.error("[demo] Failed to extend claimed sandbox key", error);
        }
      )
    );
  }
  return {
    anonymousId,
    organizationId: claimed.row.organizationId,
    slug: claimed.slug,
  };
}

/** A sandbox for a new visitor: from the pool when one is ready. */
export async function createDemoSandbox(
  input: CreateDemoSandboxInput
): Promise<CreatedDemoSandbox> {
  await assertDedicatedDemoDatabase();
  const pooled = await claimPooledSandbox(input);
  if (pooled) {
    return pooled;
  }
  await enforceDemoSandboxCap();
  return seedDemoSandbox(createAnonymousId(), input);
}

/**
 * Tops the pool of ready sandboxes back up. Runs after a visitor is served,
 * so nobody waits on it; each sandbox is seeded in the server's time zone
 * and adopts the visitor's when claimed.
 */
async function refillDemoSandboxPool(): Promise<void> {
  // Refills run after every visit; serialize them so the pool doesn't
  // overshoot. Without Redis, concurrent refills only waste a seed or two.
  // The token keeps a refill that outlived its lock from releasing the next
  // holder's.
  const token = crypto.randomUUID();
  const locked = redis
    ? await redis.set(DEMO_POOL_REFILL_LOCK_KEY, token, {
        nx: true,
        ex: DEMO_POOL_REFILL_LOCK_SECONDS,
      })
    : "OK";
  if (!locked) {
    return;
  }
  try {
    await refillPool();
  } finally {
    await redis?.eval(
      DEMO_POOL_REFILL_RELEASE_SCRIPT,
      [DEMO_POOL_REFILL_LOCK_KEY],
      [token]
    );
  }
}

/**
 * Clears expired sandboxes and tops the pool back up once the response is
 * sent. Piggybacks on new visitors instead of a cron: the demo shares
 * vercel.json with production, where a demo cron would only 404.
 */
export function maintainDemoSandboxPool(): void {
  after(async () => {
    await cleanupExpiredDemoSandboxes(DEMO_CLEANUP_BATCH_SIZE);
    await refillDemoSandboxPool();
  });
}

async function refillPool(): Promise<void> {
  const target = demoPoolSize();
  // Keep waiting sandboxes current so claiming one never has to shift data.
  const now = new Date();
  const stale = await db.query.demoSandboxes.findMany({
    where: and(
      like(demoSandboxes.anonymousId, POOLED_ID_PATTERN),
      lt(
        demoSandboxes.anchorAt,
        new Date(now.getTime() - DEMO_POOL_FRESH_MS / 2)
      )
    ),
  });
  await Promise.all(stale.map((sandbox) => rebaseDemoSandbox(sandbox, now)));
  // Recount before each seed: refills run after every visit, and a count
  // taken once would let concurrent refills overshoot the target.
  while (
    (await countDemoSandboxes(
      like(demoSandboxes.anonymousId, POOLED_ID_PATTERN)
    )) < target
  ) {
    await enforceDemoSandboxCap();
    await seedDemoSandbox(
      `${DEMO_POOL_ID_PREFIX}${randomToken(DEMO_ANONYMOUS_ID_LENGTH)}`,
      { timeZone: null, ipHash: null }
    );
  }
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
 * Records activity and keeps the data current: on the first request of a new
 * local day, shifts every timestamp forward.
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

  await db
    .update(demoSandboxes)
    .set({ lastSeenAt: now })
    .where(eq(demoSandboxes.anonymousId, current.anonymousId));
  return { ...current, lastSeenAt: now };
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
  // An un-customized reset takes a ready workspace from the pool; a
  // personalized one has to be seeded with the visitor's names.
  const swapped = personalization
    ? null
    : await swapInPooledWorkspace(sandbox, now);
  if (swapped === "conflict") {
    return { slug: await currentDemoSlug(sandbox.anonymousId) };
  }
  const next =
    swapped ?? (await seedReplacementWorkspace(sandbox, personalization, now));
  if (!next) {
    return { slug: await currentDemoSlug(sandbox.anonymousId) };
  }

  // The key follows the workspace before the old one disappears; if it
  // can't be moved, a fresh key replaces it so API access never dangles.
  await moveDemoApiKey(sandbox, next.organizationId, now);
  // The old feed describes records that no longer exist.
  await db
    .delete(demoRequestLog)
    .where(eq(demoRequestLog.anonymousId, sandbox.anonymousId));
  await deleteDemoOrganization(sandbox.organizationId);

  return { slug: next.slug };
}

/**
 * Moves a fresh pooled workspace under the visitor's sandbox in one
 * transaction: the pool row is consumed and the visitor's row re-pointed
 * with a compare-and-set on its old organization. Null when no fresh pooled
 * workspace is waiting.
 */
async function swapInPooledWorkspace(
  sandbox: DemoSandbox,
  now: Date
): Promise<{ organizationId: string; slug: string } | "conflict" | null> {
  const result = await db
    .transaction(async (tx) => {
      const pooled = await lockNextPooledSandbox(
        tx,
        now,
        new Date(now.getTime() - DEMO_POOL_FRESH_MS)
      );
      if (!pooled) {
        return null;
      }
      await tx
        .delete(demoSandboxes)
        .where(eq(demoSandboxes.anonymousId, pooled.anonymousId));
      const moved = await tx
        .update(demoSandboxes)
        .set({
          organizationId: pooled.organizationId,
          userId: pooled.userId,
          anchorAt: now,
          personalization: null,
          lastSeenAt: now,
        })
        .where(
          and(
            eq(demoSandboxes.anonymousId, sandbox.anonymousId),
            eq(demoSandboxes.organizationId, sandbox.organizationId)
          )
        )
        .returning({ anonymousId: demoSandboxes.anonymousId });
      if (moved.length === 0) {
        // A concurrent reset won; give the pooled workspace back untouched.
        tx.rollback();
      }
      return pooled;
    })
    .catch((error: unknown) => {
      if (error instanceof TransactionRollbackError) {
        return "conflict" as const;
      }
      throw error;
    });
  if (result === null || result === "conflict") {
    return result;
  }
  const pooledKeyId = result.apiKeyId;
  if (pooledKeyId) {
    after(() =>
      deleteDemoApiKey(pooledKeyId).catch((error: unknown) => {
        console.error("[demo] Failed to delete pooled sandbox key", error);
      })
    );
  }
  return { organizationId: result.organizationId, slug: result.slug };
}

/**
 * Seeds a new workspace for the visitor and claims it with a compare-and-set
 * on the old organization. Null when a concurrent reset won.
 */
async function seedReplacementWorkspace(
  sandbox: DemoSandbox,
  personalization: DemoPersonalization | null,
  now: Date
): Promise<{ organizationId: string; slug: string } | null> {
  const next = await createDemoOrganization({
    timeZone: sandbox.timeZone,
    now,
    personalization,
  });
  const claimed = await withOrganizationRollback(next, () =>
    db
      .update(demoSandboxes)
      .set({
        organizationId: next.organizationId,
        userId: next.userId,
        anchorAt: now,
        personalization,
        lastSeenAt: now,
      })
      .where(
        and(
          eq(demoSandboxes.anonymousId, sandbox.anonymousId),
          eq(demoSandboxes.organizationId, sandbox.organizationId)
        )
      )
      .returning({ anonymousId: demoSandboxes.anonymousId })
  );
  if (claimed.length === 0) {
    await deleteDemoOrganization(next.organizationId);
    return null;
  }
  return { organizationId: next.organizationId, slug: next.slug };
}

/** The workspace a concurrent reset just finished building. */
async function currentDemoSlug(anonymousId: string): Promise<string> {
  const [row] = await db
    .select({ slug: organizations.slug })
    .from(demoSandboxes)
    .innerJoin(
      organizations,
      eq(organizations.id, demoSandboxes.organizationId)
    )
    .where(eq(demoSandboxes.anonymousId, anonymousId));
  if (!row) {
    throw new Error("Demo sandbox disappeared during reset");
  }
  return row.slug;
}

async function moveDemoApiKey(
  sandbox: DemoSandbox,
  organizationId: string,
  now: Date
) {
  if (sandbox.apiKeyId) {
    const moved = await updateDemoApiKey({
      keyId: sandbox.apiKeyId,
      organizationId,
    }).then(
      () => true,
      (error: unknown) => {
        console.error("[demo] Failed to move sandbox API key", error);
        return false;
      }
    );
    if (moved) {
      return;
    }
    await deleteDemoApiKey(sandbox.apiKeyId).catch(() => undefined);
  }
  const replacement = await createDemoApiKey({
    organizationId,
    anonymousId: sandbox.anonymousId,
    expiresAt: sandboxExpiry(sandbox.createdAt),
  }).catch((error: unknown) => {
    console.error("[demo] Failed to replace sandbox API key", error);
    return null;
  });
  await db
    .update(demoSandboxes)
    .set({
      apiKey: replacement?.key ?? null,
      apiKeyId: replacement?.keyId ?? null,
      lastSeenAt: now,
    })
    .where(eq(demoSandboxes.anonymousId, sandbox.anonymousId));
}

/**
 * Deletes a demo organization and every user in it. Users are global rows,
 * but in the demo database each one (owner and seeded teammates) belongs to
 * exactly one sandbox.
 */
async function deleteDemoOrganization(organizationId: string) {
  const memberRows = await db
    .select({ userId: members.userId })
    .from(members)
    .where(eq(members.organizationId, organizationId));
  // Organization cascades every org-scoped row, memberships included.
  await db.delete(organizations).where(eq(organizations.id, organizationId));
  const userIds = memberRows.map((row) => row.userId);
  if (userIds.length > 0) {
    await db.delete(users).where(inArray(users.id, userIds));
  }
}

async function deleteDemoSandbox(sandbox: DemoSandbox) {
  if (sandbox.apiKeyId) {
    await deleteDemoApiKey(sandbox.apiKeyId).catch((error: unknown) => {
      console.error("[demo] Failed to delete sandbox API key", error);
    });
  }
  await deleteDemoOrganization(sandbox.organizationId);
}

/**
 * Demo organizations whose sandbox row was never written, e.g. because the
 * request was killed mid-seed. Past the seeding grace window they can't
 * belong to a request that is still running.
 */
async function cleanupOrphanedDemoOrganizations(limit: number, now: Date) {
  const orphans = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(
      and(
        like(organizations.slug, `${DEMO_ORG_SLUG_PREFIX}%`),
        lt(
          organizations.createdAt,
          new Date(now.getTime() - DEMO_SEEDING_GRACE_MINUTES * 60_000)
        ),
        notExists(
          db
            .select({ id: demoSandboxes.anonymousId })
            .from(demoSandboxes)
            .where(eq(demoSandboxes.organizationId, organizations.id))
        )
      )
    )
    .limit(limit);
  await Promise.all(orphans.map((org) => deleteDemoOrganization(org.id)));
  return orphans.length;
}

/** Deletes expired sandboxes. Returns how many were removed. */
async function cleanupExpiredDemoSandboxes(limit: number): Promise<number> {
  const now = new Date();
  const expired = await db.query.demoSandboxes.findMany({
    where: lt(demoSandboxes.expiresAt, now),
    limit,
  });

  const [, orphaned] = await Promise.all([
    Promise.all(expired.map(deleteDemoSandbox)),
    cleanupOrphanedDemoOrganizations(limit, now),
  ]);

  return expired.length + orphaned;
}
