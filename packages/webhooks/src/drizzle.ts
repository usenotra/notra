import { sql, type SQL } from "drizzle-orm";
import { Cause, Effect, Exit } from "effect";

import {
  EVENT_INSERT_QUERY,
  EVENT_SELECT_BY_SOURCE_QUERY,
} from "./constants/events";
import { WebhookStorageError } from "./errors/webhooks";
import { buildEventRecord } from "./programs/events";
import type { DrizzleExecutor } from "./types/drizzle";
import {
  eventInsertParameters,
  eventSelectBySourceParameters,
} from "./utils/events";

const toDrizzleSql = (query: string, parameters: readonly unknown[]): SQL => {
  const chunks: SQL[] = [];
  let lastIndex = 0;
  for (const match of query.matchAll(/\$(\d+)/g)) {
    if (match.index > lastIndex) {
      chunks.push(sql.raw(query.slice(lastIndex, match.index)));
    }
    const parameter = parameters[Number(match[1]) - 1];
    chunks.push(sql`${parameter}`);
    lastIndex = match.index + match[0].length;
  }
  chunks.push(sql.raw(query.slice(lastIndex)));
  return sql.join(chunks, sql.raw(""));
};

const rowsOf = <T>(result: unknown): T[] => {
  if (Array.isArray(result)) {
    return result as T[];
  }
  if (typeof result === "object" && result !== null && "rows" in result) {
    const { rows } = result as { rows: unknown };
    if (Array.isArray(rows)) {
      return rows as T[];
    }
  }
  return [];
};

export const publishEventInTransaction = async (
  tx: DrizzleExecutor,
  input: unknown
): Promise<string> => {
  const exit = Effect.runSyncExit(buildEventRecord(input));
  if (Exit.isFailure(exit)) {
    throw Cause.squash(exit.cause);
  }
  const record = exit.value;
  const [inserted] = rowsOf<{ id: string }>(
    await tx.execute(
      toDrizzleSql(EVENT_INSERT_QUERY, eventInsertParameters(record))
    )
  );
  const existing =
    inserted ??
    rowsOf<{ id: string }>(
      await tx.execute(
        toDrizzleSql(
          EVENT_SELECT_BY_SOURCE_QUERY,
          eventSelectBySourceParameters(record)
        )
      )
    )[0];
  if (!existing) {
    throw new WebhookStorageError({
      operation: "publishEventInTransaction",
      cause: "Event insert returned no row",
    });
  }
  return existing.id;
};
