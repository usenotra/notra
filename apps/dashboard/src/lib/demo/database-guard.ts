import { db } from "@notra/db/drizzle";
import { hasNonDemoOrganizations } from "@notra/db/utils/demo";

let verified: Promise<void> | null = null;

/**
 * Demo mode must never run against a database with real customers. Checked
 * once per process; a failure is retried on the next request.
 */
export function assertDedicatedDemoDatabase(): Promise<void> {
  verified ??= hasNonDemoOrganizations(db)
    .then((found) => {
      if (found) {
        throw new Error(
          "NOTRA_DEMO_MODE is on but DATABASE_URL contains non-demo organizations. Point the demo at its own database."
        );
      }
    })
    .catch((error: unknown) => {
      verified = null;
      throw error;
    });
  return verified;
}
