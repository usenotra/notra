import { Context, Effect, Layer, Schema } from "effect";

import { WebhookStorageError } from "../errors/webhooks";
import type { SqlStatement, WebhookDatabaseService } from "../types/services";

export class WebhookDatabase extends Context.Service<
  WebhookDatabase,
  WebhookDatabaseService
>()("@notra/webhooks/Database") {}

export const databaseLayer = (client: {
  readonly query: (
    sql: string,
    parameters: readonly unknown[]
  ) => Promise<unknown>;
  readonly transaction: (
    statements: readonly SqlStatement[]
  ) => Promise<readonly unknown[]>;
}) =>
  Layer.succeed(
    WebhookDatabase,
    WebhookDatabase.of({
      query: Effect.fn("webhooks.database.query")((sql, parameters) =>
        Effect.tryPromise({
          try: () => client.query(sql, parameters),
          catch: (cause) =>
            new WebhookStorageError({ operation: "query", cause }),
        })
      ),
      transaction: Effect.fn("webhooks.database.transaction")((statements) =>
        Effect.tryPromise({
          try: () => client.transaction(statements),
          catch: (cause) =>
            new WebhookStorageError({ operation: "transaction", cause }),
        })
      ),
    })
  );

export const decodeRows = <
  S extends Schema.Top & { readonly DecodingServices: never },
>(
  schema: S,
  rows: unknown
) =>
  Schema.decodeUnknownEffect(Schema.Array(schema))(rows).pipe(
    Effect.mapError(
      (cause) => new WebhookStorageError({ operation: "decodeRows", cause })
    )
  );

export const queryRows = Effect.fn("webhooks.queryRows")(function* <
  S extends Schema.Top & { readonly DecodingServices: never },
>(schema: S, sql: string, parameters: readonly unknown[] = []) {
  const database = yield* WebhookDatabase;
  const rows = yield* database.query(sql, parameters);
  return yield* decodeRows(schema, rows);
});
