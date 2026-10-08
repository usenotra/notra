import { neon } from "@neondatabase/serverless";
import { Redacted } from "effect";

import { databaseLayer } from "../services/database";

export const neonDatabaseLayer = (databaseUrl: Redacted.Redacted<string>) => {
  const client = neon(Redacted.value(databaseUrl));
  return databaseLayer({
    query: (sql, parameters) => client.query(sql, [...parameters]),
    // Neon sends a non-interactive transaction as a single HTTP request.
    transaction: (statements) =>
      client.transaction(
        statements.map(({ sql, parameters }) =>
          client.query(sql, [...parameters])
        )
      ),
  });
};
