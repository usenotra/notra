import { db } from "@notra/db/drizzle";
import { members } from "@notra/db/schema";
import { and, eq, sql } from "drizzle-orm";

import { MEMBERSHIP_CONFLICT_TARGET_RETRY_MS } from "@/constants/auth/membership";
import type {
  MembershipUpsertInput,
  MembershipUpsertStrategies,
} from "@/types/auth/membership";

/** Postgres `invalid_column_reference`: no unique index matches ON CONFLICT. */
const MISSING_CONFLICT_TARGET_CODE = "42P10";
/** Postgres `unique_violation`: concurrent insert for the same membership key. */
const UNIQUE_VIOLATION_CODE = "23505";

let conflictTargetRetryAt = 0;

function hasPostgresErrorCode(error: unknown, code: string): boolean {
  let current: unknown = error;
  while (current && typeof current === "object") {
    if ("code" in current && (current as { code?: unknown }).code === code) {
      return true;
    }
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

function hasMissingConflictTargetCode(error: unknown): boolean {
  return hasPostgresErrorCode(error, MISSING_CONFLICT_TARGET_CODE);
}

async function withMembershipAdvisoryLock<T>(
  input: MembershipUpsertInput,
  run: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>
): Promise<T> {
  return db.transaction(
    async (tx) => {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtext(${input.organizationId}), hashtext(${input.userId}))`
      );
      return run(tx);
    },
    { isolationLevel: "read committed" }
  );
}

async function upsertMembershipAtomically(
  input: MembershipUpsertInput
): Promise<void> {
  await withMembershipAdvisoryLock(input, async (tx) => {
    await tx
      .insert(members)
      .values({
        id: crypto.randomUUID(),
        organizationId: input.organizationId,
        userId: input.userId,
        role: input.role,
        createdAt: input.createdAt,
      })
      .onConflictDoUpdate({
        target: [members.organizationId, members.userId],
        set: {
          role: sql`CASE WHEN ${members.role} = 'owner' THEN ${members.role} ELSE excluded.role END`,
        },
        // Skip the UPDATE when the row already matches: every login hits this
        // path, and owners keep their role regardless of the incoming value.
        setWhere: sql`${members.role} <> 'owner' AND ${members.role} <> excluded.role`,
      });
  });
}

async function updateMembershipRoleIfNeeded(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  input: MembershipUpsertInput,
  existing: { id: string; role: string }
): Promise<void> {
  if (existing.role !== input.role && existing.role !== "owner") {
    await tx
      .update(members)
      .set({ role: input.role })
      .where(eq(members.id, existing.id));
  }
}

/** Pre-0085 path: serialize reads and writes for each membership. */
async function upsertMembershipReadThenWrite(
  input: MembershipUpsertInput
): Promise<void> {
  await withMembershipAdvisoryLock(input, async (tx) => {
    const existing = await tx.query.members.findFirst({
      where: and(
        eq(members.userId, input.userId),
        eq(members.organizationId, input.organizationId)
      ),
      columns: { id: true, role: true },
    });

    if (!existing) {
      try {
        await tx.insert(members).values({
          id: crypto.randomUUID(),
          organizationId: input.organizationId,
          userId: input.userId,
          role: input.role,
          createdAt: input.createdAt,
        });
      } catch (error) {
        if (!hasPostgresErrorCode(error, UNIQUE_VIOLATION_CODE)) {
          throw error;
        }
        const raced = await tx.query.members.findFirst({
          where: and(
            eq(members.userId, input.userId),
            eq(members.organizationId, input.organizationId)
          ),
          columns: { id: true, role: true },
        });
        if (raced) {
          await updateMembershipRoleIfNeeded(tx, input, raced);
        }
      }
      return;
    }

    await updateMembershipRoleIfNeeded(tx, input, existing);
  });
}

/**
 * Runs the atomic upsert and, if Postgres reports that no unique index matches
 * the ON CONFLICT target (migration 0085 not applied yet), the legacy path.
 * Cache a missing index for 60 seconds to avoid a failed statement on every login.
 * The next call after expiry retries the atomic upsert so warm processes recover
 * after the migration without restarting.
 */
async function runMembershipUpsert(
  strategies: MembershipUpsertStrategies,
  input: MembershipUpsertInput
): Promise<void> {
  if (Date.now() < conflictTargetRetryAt) {
    await strategies.readThenWrite(input);
    return;
  }

  try {
    await strategies.atomic(input);
    conflictTargetRetryAt = 0;
  } catch (error) {
    if (!hasMissingConflictTargetCode(error)) {
      throw error;
    }
    conflictTargetRetryAt = Date.now() + MEMBERSHIP_CONFLICT_TARGET_RETRY_MS;
    strategies.onFallback?.();
    await strategies.readThenWrite(input);
  }
}

function warnConflictTargetMissing(): void {
  console.warn(
    "[auth] members(organization_id, user_id) unique index missing; apply migration 0085. Falling back to read-then-write membership sync."
  );
}

const productionStrategies: MembershipUpsertStrategies = {
  atomic: upsertMembershipAtomically,
  readThenWrite: upsertMembershipReadThenWrite,
  onFallback: warnConflictTargetMissing,
};

/**
 * Upserts a membership keyed by (organization_id, user_id).
 * TODO: drop the read-then-write fallback once 0085 is confirmed in production.
 */
export function upsertMembership(input: MembershipUpsertInput): Promise<void> {
  return runMembershipUpsert(productionStrategies, input);
}
