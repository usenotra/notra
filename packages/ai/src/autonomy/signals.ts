import { SignalIngestError } from "@notra/ai/autonomy/errors";
import { SIGNAL_INSERT_BATCH_SIZE } from "@notra/ai/constants/autonomy-signals";
import type {
  AutonomySignalRow,
  CoalesceSignalsInput,
  CoalesceSignalsResult,
  RecordSignalInput,
  RecordSignalResult,
  RecordSignalsInput,
  SignalSummary,
} from "@notra/ai/types/autonomy";
import { db } from "@notra/db/drizzle";
import { autonomySignals } from "@notra/db/schema";
import { and, asc, eq, inArray } from "drizzle-orm";
import { Effect } from "effect";

const toSummary = (row: AutonomySignalRow): SignalSummary => ({
  signalId: row.id,
  source: row.source,
  kind: row.kind,
  sourceEventId: row.sourceEventId,
  occurredAt: row.occurredAt,
  payload: row.payload,
});

export const recordSignal = Effect.fn("iris.signals.record")(function* (
  input: RecordSignalInput
) {
  const now = new Date();
  const signalId = crypto.randomUUID();

  const inserted = yield* Effect.tryPromise({
    try: () =>
      db
        .insert(autonomySignals)
        .values({
          id: signalId,
          organizationId: input.organizationId,
          source: input.source,
          sourceEventId: input.sourceEventId ?? null,
          kind: input.kind,
          payload: input.payload,
          dedupeHash: input.dedupeHash,
          status: "pending",
          occurredAt: input.occurredAt,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing({
          target: [autonomySignals.organizationId, autonomySignals.dedupeHash],
        })
        .returning({ id: autonomySignals.id }),
    catch: (cause) =>
      new SignalIngestError({ message: "Failed to record signal", cause }),
  });

  const insertedId = inserted.at(0)?.id;
  if (insertedId !== undefined) {
    yield* Effect.annotateLogs(Effect.logDebug("iris.signal.recorded"), {
      organizationId: input.organizationId,
      signalId: insertedId,
      kind: input.kind,
    });
    return {
      signalId: insertedId,
      deduplicated: false,
    } satisfies RecordSignalResult;
  }

  const existing = yield* Effect.tryPromise({
    try: () =>
      db
        .select({ id: autonomySignals.id })
        .from(autonomySignals)
        .where(
          and(
            eq(autonomySignals.organizationId, input.organizationId),
            eq(autonomySignals.dedupeHash, input.dedupeHash)
          )
        )
        .limit(1),
    catch: (cause) =>
      new SignalIngestError({
        message: "Failed to load deduplicated signal",
        cause,
      }),
  });

  const existingId = existing.at(0)?.id;
  if (existingId === undefined) {
    return yield* Effect.fail(
      new SignalIngestError({
        message: "Signal insert conflicted but no existing row was found",
        cause: null,
      })
    );
  }

  yield* Effect.annotateLogs(Effect.logDebug("iris.signal.deduplicated"), {
    organizationId: input.organizationId,
    signalId: existingId,
    kind: input.kind,
  });

  return {
    signalId: existingId,
    deduplicated: true,
  } satisfies RecordSignalResult;
});

export const recordSignals = Effect.fn("iris.signals.recordBatch")(function* (
  input: RecordSignalsInput
) {
  const results: RecordSignalResult[] = [];
  for (
    let offset = 0;
    offset < input.signals.length;
    offset += SIGNAL_INSERT_BATCH_SIZE
  ) {
    const chunk = input.signals.slice(
      offset,
      offset + SIGNAL_INSERT_BATCH_SIZE
    );
    if (chunk.length === 1) {
      const item = chunk[0];
      if (item) {
        results.push(
          yield* recordSignal({ ...item, organizationId: input.organizationId })
        );
      }
      continue;
    }

    let readyToCommit = false;
    let usedFallback = false;
    const recorded = yield* Effect.tryPromise({
      try: () =>
        db.transaction(async (tx) => {
          // Let PostgreSQL validate every item, including duplicate hashes.
          // ON CONFLICT DO NOTHING retains the first inserted payload.
          const values = chunk.map((item) => {
            const now = new Date();
            return {
              id: crypto.randomUUID(),
              organizationId: input.organizationId,
              source: item.source,
              sourceEventId: item.sourceEventId ?? null,
              kind: item.kind,
              occurredAt: item.occurredAt,
              payload: item.payload,
              dedupeHash: item.dedupeHash,
              status: "pending",
              createdAt: now,
              updatedAt: now,
            } satisfies typeof autonomySignals.$inferInsert;
          });
          const inserted = await tx
            .insert(autonomySignals)
            .values(values)
            .onConflictDoNothing({
              target: [
                autonomySignals.organizationId,
                autonomySignals.dedupeHash,
              ],
            })
            .returning({
              id: autonomySignals.id,
              dedupeHash: autonomySignals.dedupeHash,
            });
          const insertedHashes = new Set(inserted.map((row) => row.dedupeHash));
          const conflicts = [
            ...new Set(chunk.map((item) => item.dedupeHash)),
          ].filter((hash) => !insertedHashes.has(hash));
          const existing = conflicts.length
            ? await tx
                .select({
                  id: autonomySignals.id,
                  dedupeHash: autonomySignals.dedupeHash,
                })
                .from(autonomySignals)
                .where(
                  and(
                    eq(autonomySignals.organizationId, input.organizationId),
                    inArray(autonomySignals.dedupeHash, conflicts)
                  )
                )
            : [];
          const ids = new Map(
            [...inserted, ...existing].map((row) => [row.dedupeHash, row.id])
          );
          const batchResults = chunk.map((item) => {
            const signalId = ids.get(item.dedupeHash);
            if (signalId === undefined) {
              throw new SignalIngestError({
                message:
                  "Signal insert conflicted but no existing row was found",
                cause: null,
              });
            }
            return {
              signalId,
              deduplicated: !insertedHashes.delete(item.dedupeHash),
            };
          });
          readyToCommit = true;
          return batchResults;
        }),
      catch: (cause) =>
        new SignalIngestError({ message: "Failed to record signals", cause }),
    }).pipe(
      Effect.catch((error) => {
        if (readyToCommit) {
          // A failed commit acknowledgement is ambiguous; do not replay it.
          return Effect.fail(error);
        }
        // The failed chunk rolled back. Reuse the serial path so a bad item
        // still leaves exactly the successfully recorded prefix behind.
        usedFallback = true;
        return Effect.forEach(
          chunk,
          (item) =>
            recordSignal({ ...item, organizationId: input.organizationId }),
          { concurrency: 1 }
        );
      })
    );
    results.push(...recorded);
    if (!usedFallback) {
      for (const [index, result] of recorded.entries()) {
        yield* Effect.annotateLogs(
          Effect.logDebug(
            result.deduplicated
              ? "iris.signal.deduplicated"
              : "iris.signal.recorded"
          ),
          {
            organizationId: input.organizationId,
            signalId: result.signalId,
            kind: chunk[index]?.kind,
          }
        );
      }
    }
  }
  return results;
});

export const listPendingSignals = Effect.fn("iris.signals.listPending")(
  function* (organizationId: string, limit: number) {
    return yield* Effect.tryPromise({
      try: () =>
        db
          .select()
          .from(autonomySignals)
          .where(
            and(
              eq(autonomySignals.organizationId, organizationId),
              eq(autonomySignals.status, "pending")
            )
          )
          .orderBy(asc(autonomySignals.occurredAt))
          .limit(limit),
      catch: (cause) =>
        new SignalIngestError({
          message: "Failed to list pending signals",
          cause,
        }),
    });
  }
);

export const coalesceSignals = Effect.fn("iris.signals.coalesce")(function* (
  input: CoalesceSignalsInput
) {
  if (input.signalIds.length === 0) {
    return yield* Effect.fail(
      new SignalIngestError({
        message: "Cannot coalesce an empty signal set",
        cause: null,
      })
    );
  }

  const rows = yield* Effect.tryPromise({
    try: () =>
      db
        .select()
        .from(autonomySignals)
        .where(
          and(
            eq(autonomySignals.organizationId, input.organizationId),
            inArray(autonomySignals.id, [...input.signalIds])
          )
        )
        .orderBy(asc(autonomySignals.occurredAt)),
    catch: (cause) =>
      new SignalIngestError({
        message: "Failed to load signals for coalescing",
        cause,
      }),
  });

  const primary = rows.at(-1);
  if (primary === undefined) {
    return yield* Effect.fail(
      new SignalIngestError({
        message: "No signals found for the requested ids",
        cause: null,
      })
    );
  }

  const coalescedSignalIds: string[] = [];
  for (const row of rows) {
    if (row.id !== primary.id) {
      coalescedSignalIds.push(row.id);
    }
  }

  if (coalescedSignalIds.length > 0) {
    const now = new Date();
    yield* Effect.tryPromise({
      try: () =>
        db
          .update(autonomySignals)
          .set({
            status: "coalesced",
            coalescedIntoSignalId: primary.id,
            updatedAt: now,
          })
          .where(
            and(
              eq(autonomySignals.organizationId, input.organizationId),
              inArray(autonomySignals.id, coalescedSignalIds)
            )
          ),
      catch: (cause) =>
        new SignalIngestError({ message: "Failed to coalesce signals", cause }),
    });
  }

  yield* Effect.annotateLogs(Effect.logInfo("iris.signals.coalesced"), {
    organizationId: input.organizationId,
    primarySignalId: primary.id,
    coalescedCount: coalescedSignalIds.length,
  });

  return {
    primarySignalId: primary.id,
    primarySignal: primary,
    coalescedSignalIds,
    summaries: rows.map(toSummary),
  } satisfies CoalesceSignalsResult;
});

export const restoreSignalsToPending = Effect.fn("iris.signals.restorePending")(
  function* (organizationId: string, signalIds: readonly string[]) {
    if (signalIds.length === 0) {
      return;
    }

    const now = new Date();
    const rows = yield* Effect.tryPromise({
      try: () =>
        db
          .update(autonomySignals)
          .set({
            status: "pending",
            coalescedIntoSignalId: null,
            updatedAt: now,
          })
          .where(
            and(
              eq(autonomySignals.organizationId, organizationId),
              eq(autonomySignals.status, "coalesced"),
              inArray(autonomySignals.id, [...signalIds])
            )
          )
          .returning({ id: autonomySignals.id }),
      catch: (cause) =>
        new SignalIngestError({
          message: "Failed to restore signals to pending",
          cause,
        }),
    });

    yield* Effect.annotateLogs(Effect.logWarning("iris.signals.restored"), {
      organizationId,
      signalCount: rows.length,
    });
  }
);

export const markSignalsProcessed = Effect.fn("iris.signals.markProcessed")(
  function* (organizationId: string, signalIds: readonly string[]) {
    if (signalIds.length === 0) {
      return;
    }

    const now = new Date();
    yield* Effect.tryPromise({
      try: () =>
        db
          .update(autonomySignals)
          .set({ status: "processed", processedAt: now, updatedAt: now })
          .where(
            and(
              eq(autonomySignals.organizationId, organizationId),
              inArray(autonomySignals.id, [...signalIds])
            )
          ),
      catch: (cause) =>
        new SignalIngestError({
          message: "Failed to mark signals processed",
          cause,
        }),
    });

    yield* Effect.annotateLogs(Effect.logDebug("iris.signals.processed"), {
      organizationId,
      signalCount: signalIds.length,
    });
  }
);
