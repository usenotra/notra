import { setDemoSocialAccountsProvider } from "@notra/analytics/tinybird/demo-social";
import type { DemoSocialAccount } from "@notra/analytics/types/demo-social";
import { db } from "@notra/db/drizzle";
import {
  connectedSocialAccounts,
  trackedSocialAccounts,
} from "@notra/db/schema";
import { eq } from "drizzle-orm";

const accountColumns = {
  provider: true,
  providerAccountId: true,
  username: true,
  displayName: true,
  profileImageUrl: true,
  verified: true,
} as const;

async function listDemoSocialAccounts(
  organizationId: string
): Promise<DemoSocialAccount[]> {
  const [connected, tracked] = await Promise.all([
    db.query.connectedSocialAccounts.findMany({
      columns: accountColumns,
      where: eq(connectedSocialAccounts.organizationId, organizationId),
    }),
    db.query.trackedSocialAccounts.findMany({
      columns: accountColumns,
      where: eq(trackedSocialAccounts.organizationId, organizationId),
    }),
  ]);
  return [
    ...connected.map((account) => ({ ...account, kind: "connected" as const })),
    ...tracked.map((account) => ({ ...account, kind: "tracked" as const })),
  ];
}

/**
 * Serves the public demo's social analytics from the sandbox's seeded (and
 * visitor-tracked) accounts. Called once at startup by the dashboard and API.
 */
export function registerDemoSocialAnalytics() {
  setDemoSocialAccountsProvider(listDemoSocialAccounts);
}
