import { db } from "@notra/db/drizzle";
import { organizationNotificationSettings } from "@notra/db/schema";

import { runAfterResponse } from "@/lib/after-response";
import { syncBrewContactsForOrganizationOwners } from "@/lib/email/brew-contacts";

export async function upsertOnboardingNotificationSettings({
  organizationId,
  dailySummary,
  marketingEmails,
}: {
  organizationId: string;
  dailySummary: boolean;
  marketingEmails: boolean;
}) {
  await db
    .insert(organizationNotificationSettings)
    .values({
      id: crypto.randomUUID(),
      organizationId,
      scheduledContentCreation: false,
      scheduledContentFailed: false,
      scheduledContentSkipped: false,
      marketingEmails,
      dailySummary,
    })
    .onConflictDoUpdate({
      set: {
        dailySummary,
        marketingEmails,
        updatedAt: new Date(),
      },
      target: organizationNotificationSettings.organizationId,
    });

  runAfterResponse("[BrewContacts] Sync failed", () =>
    syncBrewContactsForOrganizationOwners(organizationId)
  );
}
