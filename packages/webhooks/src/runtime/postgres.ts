import { Config, Effect, Layer, Redacted } from "effect";
import { Pool } from "pg";

import { WebhookStorageError } from "../errors/webhooks";
import { WebhookDatabase } from "../services/database";

export const postgresDatabaseLayer = Layer.effect(
  WebhookDatabase,
  Effect.gen(function* () {
    const databaseUrl = yield* Config.Redacted("DATABASE_URL");
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
      query: Effect.fn("webhooks.postgres.query")((sql, parameters) =>
        Effect.tryPromise({
          try: () => pool.query(sql, [...parameters]),
          catch: (cause) =>
            new WebhookStorageError({ operation: "postgres.query", cause }),
        }).pipe(Effect.map((result) => result.rows))
      ),
      transaction: Effect.fn("webhooks.postgres.transaction")((statements) =>
        Effect.tryPromise({
          try: async () => {
            const client = await pool.connect();
            try {
              await client.query("BEGIN");
              const results: unknown[] = [];
              for (const { sql, parameters } of statements) {
                results.push((await client.query(sql, [...parameters])).rows);
              }
              await client.query("COMMIT");
              return results;
            } catch (error) {
              await client.query("ROLLBACK").catch(() => undefined);
              throw error;
            } finally {
              client.release();
            }
          },
          catch: (cause) =>
            new WebhookStorageError({
              operation: "postgres.transaction",
              cause,
            }),
        })
      ),
    });
  })
);
