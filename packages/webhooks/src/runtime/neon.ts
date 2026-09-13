import { neon } from "@neondatabase/serverless";

import { databaseLayer } from "../services/database";

export const neonDatabaseLayer = (databaseUrl: string) => {
  const client = neon(databaseUrl);
  return databaseLayer((sql, parameters) => client.query(sql, [...parameters]));
};
