import { Context, Effect, Layer, Schema } from "effect";

import { WebhookStorageError } from "../errors/webhooks";
import type { WebhookDatabaseService } from "../types/services";

export class WebhookDatabase extends Context.Service<
  WebhookDatabase,
  WebhookDatabaseService
>()("@notra/webhooks/Database") {}

export const databaseLayer = (
  query: (sql: string, parameters: readonly unknown[]) => Promise<unknown>
) =>
  Layer.succeed(
    WebhookDatabase,
    WebhookDatabase.of({
      query: (sql, parameters) =>
        Effect.tryPromise({
          try: () => query(sql, parameters),
          catch: (cause) =>
            new WebhookStorageError({ operation: "query", cause }),
        }),
    })
  );

export const queryRows = Effect.fn("webhooks.queryRows")(function* <
  S extends Schema.Top & { readonly DecodingServices: never },
>(schema: S, sql: string, parameters: readonly unknown[] = []) {
  const database = yield* WebhookDatabase;
  const rows = yield* database.query(sql, parameters);
  return yield* Schema.decodeUnknownEffect(Schema.Array(schema))(rows).pipe(
    Effect.mapError(
      (cause) => new WebhookStorageError({ operation: "decodeRows", cause })
    )
  );
});
