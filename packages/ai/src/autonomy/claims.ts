import { CLAIM_REAP_GRACE_SECONDS } from "@notra/ai/constants/autonomy";
import { logError, logWarn } from "@notra/ai/utils/server-log";
import { db } from "@notra/db/drizzle";
import { autonomyClaims, autonomyControllerLeases } from "@notra/db/schema";
import { and, eq, lt, or } from "drizzle-orm";
import { Data, Effect } from "effect";

import type {
  AcquireAutonomyClaimInput,
  AutonomyClaimResult,
  ReapExpiredClaimsResult,
  ReleaseAutonomyClaimInput,
} from "../types/autonomy";

const MILLISECONDS_PER_SECOND = 1000;

class AutonomyClaimError extends Data.TaggedError("AutonomyClaimError")<{
  readonly message: string;
  readonly cause: unknown;
}> {}

const acquireClaimEffect = Effect.fn("acquireAutonomyClaim")(function* (
  input: AcquireAutonomyClaimInput
) {
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + input.ttlSeconds * MILLISECONDS_PER_SECOND
  );
  const organizationId = input.organizationId ?? null;

  const rows = yield* Effect.tryPromise({
    try: () =>
      db
        .insert(autonomyClaims)
        .values({
          id: crypto.randomUUID(),
          organizationId,
          scope: input.scope,
          claimKey: input.claimKey,
          ownerToken: input.ownerToken,
          expiresAt,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [autonomyClaims.scope, autonomyClaims.claimKey],
          set: {
            organizationId,
            ownerToken: input.ownerToken,
            expiresAt,
            updatedAt: now,
          },
          setWhere: or(
            lt(autonomyClaims.expiresAt, now),
            eq(autonomyClaims.ownerToken, input.ownerToken)
          ),
        })
        .returning({ id: autonomyClaims.id }),
    catch: (cause) =>
      new AutonomyClaimError({
        message: "Failed to acquire autonomy claim",
        cause,
      }),
  });

  return { claimed: rows.length > 0 };
});

const releaseClaimEffect = Effect.fn("releaseAutonomyClaim")(function* (
  input: ReleaseAutonomyClaimInput
) {
  yield* Effect.tryPromise({
    try: () =>
      db
        .delete(autonomyClaims)
        .where(
          and(
            eq(autonomyClaims.scope, input.scope),
            eq(autonomyClaims.claimKey, input.claimKey),
            eq(autonomyClaims.ownerToken, input.ownerToken)
          )
        ),
    catch: (cause) =>
      new AutonomyClaimError({
        message: "Failed to release autonomy claim",
        cause,
      }),
  });
});

const reapExpiredClaimsEffect = Effect.fn("iris.claims.reap")(function* () {
  const cutoff = new Date(
    Date.now() - CLAIM_REAP_GRACE_SECONDS * MILLISECONDS_PER_SECOND
  );

  const [claims, leases] = yield* Effect.all([
    Effect.tryPromise({
      try: () =>
        db
          .delete(autonomyClaims)
          .where(lt(autonomyClaims.expiresAt, cutoff))
          .returning({ id: autonomyClaims.id }),
      catch: (cause) =>
        new AutonomyClaimError({
          message: "Failed to reap expired autonomy claims",
          cause,
        }),
    }),
    Effect.tryPromise({
      try: () =>
        db
          .delete(autonomyControllerLeases)
          .where(lt(autonomyControllerLeases.expiresAt, cutoff))
          .returning({ id: autonomyControllerLeases.id }),
      catch: (cause) =>
        new AutonomyClaimError({
          message: "Failed to reap expired controller leases",
          cause,
        }),
    }),
  ]);

  const result: ReapExpiredClaimsResult = {
    claims: claims.length,
    leases: leases.length,
  };

  yield* Effect.annotateLogs(Effect.logDebug("iris.claims.reaped"), {
    claims: result.claims,
    leases: result.leases,
  });

  return result;
});

export async function reapExpiredClaims(): Promise<ReapExpiredClaimsResult> {
  return await Effect.runPromise(
    reapExpiredClaimsEffect().pipe(
      Effect.catch((error) =>
        Effect.gen(function* () {
          yield* Effect.annotateLogs(
            Effect.logWarning("iris.claims.reapFailed"),
            { message: error.message }
          );
          return { claims: 0, leases: 0 };
        })
      )
    )
  );
}

export async function acquireClaim(
  input: AcquireAutonomyClaimInput
): Promise<AutonomyClaimResult> {
  try {
    return await Effect.runPromise(acquireClaimEffect(input));
  } catch (error) {
    logError("[autonomy-claims] Failed to acquire claim", error, {
      scope: input.scope,
      claimKey: input.claimKey,
    });
    return { claimed: false };
  }
}

export async function releaseClaim(
  input: ReleaseAutonomyClaimInput
): Promise<void> {
  try {
    await Effect.runPromise(releaseClaimEffect(input));
  } catch (error) {
    logWarn("[autonomy-claims] Failed to release claim", {
      scope: input.scope,
      claimKey: input.claimKey,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
