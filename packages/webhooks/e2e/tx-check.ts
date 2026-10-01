// Verifies the transactional outbox adapter against the Docker Postgres with
// the production driver (node-postgres): commit, rollback, and dedupe against
// the Effect pipeline. Run:
//   bun run e2e/tx-check.ts
import "./env";
import { drizzle } from "drizzle-orm/node-postgres";

import { publishEventInTransaction } from "../src/drizzle";
import { postPublishedInput } from "../src/utils/posts";

const db = drizzle(process.env.DATABASE_URL as string);

const committedId = await db.transaction(async (tx) =>
  publishEventInTransaction(
    tx,
    postPublishedInput({ organizationId: "org-one", postId: "post_tx_live" })
  )
);
console.log("committed:", committedId);

try {
  await db.transaction(async (tx) => {
    await publishEventInTransaction(
      tx,
      postPublishedInput({
        organizationId: "org-one",
        postId: "post_tx_live_rolled_back",
      })
    );
    throw new Error("simulated caller failure");
  });
  console.error("ERROR: rollback transaction unexpectedly succeeded");
  process.exit(1);
} catch (error) {
  console.log(
    "rolled back as expected:",
    error instanceof Error ? error.message : error
  );
}

// Same post published again through the same adapter returns the existing
// event instead of creating a duplicate.
const deduped = await db.transaction(async (tx) =>
  publishEventInTransaction(
    tx,
    postPublishedInput({ organizationId: "org-one", postId: "post_tx_live" })
  )
);
console.log("dedupe ok:", deduped === committedId);

await db.$client.end();
