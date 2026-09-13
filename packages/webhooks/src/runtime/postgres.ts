import { Config, Effect, Layer, Redacted } from "effect";
import { Pool } from "pg";

import { WebhookStorageError } from "../errors/webhooks";
import { WebhookDatabase } from "../services/database";

export const postgresDatabaseLayer = Layer.effect(
  WebhookDatabase,
  Effect.gen(function* () {
    const databaseUrl = yield* Config.redacted("DATABASE_URL");
    const pool = yield* Effect.acquireRelease(
      Effect.sync(
        () =>
          new Pool({
            connectionString: Redacted.value(databaseUrl),
            max: 3,
            connectionTimeoutMillis: 10_000,
          })
      ),
      (client) => Effect.promise(() => client.end())
    );
    return WebhookDatabase.of({
      query: (sql, parameters) =>
        Effect.tryPromise({
          try: () => pool.query(sql, [...parameters]),
          catch: (cause) =>
            new WebhookStorageError({ operation: "postgres.query", cause }),
        }).pipe(Effect.map((result) => result.rows)),
    });
  })
);
