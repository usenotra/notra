import { createDb } from "@notra/db/drizzle";
import { hasNonDemoOrganizations } from "@notra/db/utils/demo";

/** demo-api must never run against a database with real customers. */
export async function assertDedicatedDemoDatabase(databaseUrl: string) {
  if (await hasNonDemoOrganizations(createDb(databaseUrl))) {
    console.error(
      "NOTRA_DEMO_MODE is on but DATABASE_URL contains non-demo organizations. Refusing to start."
    );
    process.exit(1);
  }
}
