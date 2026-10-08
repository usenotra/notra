import { expect } from "bun:test";

import type { Client } from "pg";

export async function expectConstraint(
  client: Client,
  query: string,
  constraint: string,
  code = "23503"
): Promise<void> {
  await client.query("SAVEPOINT rejected_write");
  try {
    await expect(client.query(query)).rejects.toMatchObject({
      code,
      constraint,
    });
  } finally {
    await client.query("ROLLBACK TO SAVEPOINT rejected_write");
  }
}
