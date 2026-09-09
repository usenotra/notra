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

let conflictTargetRetryAt = 0;

export function hasMissingConflictTargetCode(error: unknown): boolean {
  let current: unknown = error;
  while (current && typeof current === "object") {
    if (
      "code" in current &&
      (current as { code?: unknown }).code === MISSING_CONFLICT_TARGET_CODE
    ) {
      return true;
    }
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

async function upsertMembershipAtomically(
  input: MembershipUpsertInput
): Promise<void> {
  await db
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
    });
}

/**
 * Pre-0083 path: read then insert/update. Not race-safe, but it is exactly the
 * behaviour shipped before the unique index existed.
 */
async function upsertMembershipReadThenWrite(
  input: MembershipUpsertInput
): Promise<void> {
  const existing = await db.query.members.findFirst({
    where: and(
      eq(members.userId, input.userId),
      eq(members.organizationId, input.organizationId)
    ),
    columns: { id: true, role: true },
  });

  if (!existing) {
    await db.insert(members).values({
      id: crypto.randomUUID(),
      organizationId: input.organizationId,
      userId: input.userId,
      role: input.role,
      createdAt: input.createdAt,
    });
    return;
  }

  if (existing.role !== input.role && existing.role !== "owner") {
    await db
      .update(members)
      .set({ role: input.role })
      .where(eq(members.id, existing.id));
  }
}

/**
 * Runs the atomic upsert and, if Postgres reports that no unique index matches
 * the ON CONFLICT target (migration 0083 not applied yet), the legacy path.
 * Cache a missing index for 60 seconds to avoid a failed statement on every login.
 * The next call after expiry retries the atomic upsert so warm processes recover
 * after the migration without restarting.
 */
export async function runMembershipUpsert(
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
    "[auth] members(organization_id, user_id) unique index missing; apply migration 0083. Falling back to read-then-write membership sync."
  );
}

const productionStrategies: MembershipUpsertStrategies = {
  atomic: upsertMembershipAtomically,
  readThenWrite: upsertMembershipReadThenWrite,
  onFallback: warnConflictTargetMissing,
};

/**
 * Upserts a membership keyed by (organization_id, user_id).
 * TODO: drop the read-then-write fallback once 0083 is confirmed in production.
 */
export function upsertMembership(input: MembershipUpsertInput): Promise<void> {
  return runMembershipUpsert(productionStrategies, input);
}

/** Test seam: forget the cached "index missing" decision. */
export function resetMembershipUpsertState(): void {
  conflictTargetRetryAt = 0;
}
