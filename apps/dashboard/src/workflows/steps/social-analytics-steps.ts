import "@/workflows/runtime";
import {
  ingestSocialAccountStats,
  ingestSocialAccounts,
  ingestSocialPostStats,
  ingestSocialPosts,
  isTinybirdConfigured,
} from "@notra/analytics/tinybird/client";
import { db } from "@notra/db/drizzle";
import {
  connectedSocialAccounts,
  trackedSocialAccounts,
} from "@notra/db/schema";
import { isDemoMode } from "@notra/utils/demo-mode";
import { eq } from "drizzle-orm";

import { isAnalyticsEnabledForOrganization } from "@/lib/analytics/flag";
import { buildAccountRow } from "@/lib/analytics/rows";
import { collectTwitterRows } from "@/lib/analytics/twitter-sync";
import type { SyncableSocialAccount } from "@/types/analytics";

async function filterFlaggedOrganizations(
  accounts: SyncableSocialAccount[]
): Promise<SyncableSocialAccount[]> {
  const organizationIds = [
    ...new Set(accounts.map((account) => account.organizationId)),
  ];
  const flags = await Promise.all(
    organizationIds.map(async (organizationId) => ({
      organizationId,
      enabled: await isAnalyticsEnabledForOrganization(organizationId),
    }))
  );
  const enabledOrganizations = new Set<string>();
  for (const flag of flags) {
    if (flag.enabled) {
      enabledOrganizations.add(flag.organizationId);
    }
  }
  return accounts.filter((account) =>
    enabledOrganizations.has(account.organizationId)
  );
}

export async function listSyncableAccounts(
  organizationId?: string
): Promise<SyncableSocialAccount[]> {
  "use step";
  // Demo accounts are fictional and their stats are generated at read time.
  if (!isTinybirdConfigured() || isDemoMode()) {
    return [];
  }
  const [accounts, tracked] = await Promise.all([
    db.query.connectedSocialAccounts.findMany({
      columns: {
        id: true,
        organizationId: true,
        provider: true,
        providerAccountId: true,
        username: true,
        displayName: true,
        profileImageUrl: true,
        verified: true,
      },
      ...(organizationId
        ? { where: eq(connectedSocialAccounts.organizationId, organizationId) }
        : {}),
    }),
    db.query.trackedSocialAccounts.findMany({
      columns: {
        id: true,
        organizationId: true,
        provider: true,
        providerAccountId: true,
        username: true,
        displayName: true,
        profileImageUrl: true,
      },
      ...(organizationId
        ? { where: eq(trackedSocialAccounts.organizationId, organizationId) }
        : {}),
    }),
  ]);

  const connected: SyncableSocialAccount[] = accounts.map((account) => ({
    id: account.id,
    organizationId: account.organizationId,
    provider: account.provider,
    providerAccountId: account.providerAccountId,
    username: account.username,
    displayName: account.displayName,
    profileImageUrl: account.profileImageUrl,
    verified: account.verified ?? false,
  }));

  const connectedKeys = new Set(
    connected.flatMap((account) => [
      `${account.organizationId}:${account.provider}:${account.providerAccountId}`,
      `${account.organizationId}:${account.provider}:@${account.username.toLowerCase()}`,
    ])
  );

  const trackedOnly: SyncableSocialAccount[] = tracked
    .filter(
      (account) =>
        !(
          connectedKeys.has(
            `${account.organizationId}:${account.provider}:${account.providerAccountId}`
          ) ||
          connectedKeys.has(
            `${account.organizationId}:${account.provider}:@${account.username.toLowerCase()}`
          )
        )
    )
    .map((account) => ({
      id: account.id,
      organizationId: account.organizationId,
      provider: account.provider,
      providerAccountId: account.providerAccountId,
      username: account.username,
      displayName: account.displayName,
      profileImageUrl: account.profileImageUrl,
      verified: false,
    }));

  return await filterFlaggedOrganizations([...connected, ...trackedOnly]);
}

export async function snapshotAccountDimensions(
  accounts: SyncableSocialAccount[]
): Promise<number> {
  "use step";
  const capturedAt = new Date();
  const rows = accounts.map((account) => buildAccountRow(account, capturedAt));
  await ingestSocialAccounts(rows);
  return rows.length;
}

export async function syncTwitterAnalytics(
  accounts: SyncableSocialAccount[]
): Promise<{ accountStats: number; posts: number }> {
  "use step";
  const capturedAt = new Date();
  const twitterAccounts = accounts.filter(
    (account) => account.provider === "twitter"
  );
  const rows = await collectTwitterRows(twitterAccounts, capturedAt);
  await ingestSocialAccountStats(rows.accountStats);
  await ingestSocialPosts(rows.posts);
  await ingestSocialPostStats(rows.postStats);
  return { accountStats: rows.accountStats.length, posts: rows.posts.length };
}
