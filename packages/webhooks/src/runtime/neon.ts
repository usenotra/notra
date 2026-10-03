import { neon } from "@neondatabase/serverless";
import { Redacted } from "effect";

import { databaseLayer } from "../services/database";

export const neonDatabaseLayer = (databaseUrl: Redacted.Redacted<string>) => {
  const client = neon(Redacted.value(databaseUrl));
  return databaseLayer((sql, parameters) => client.query(sql, [...parameters]));
};
