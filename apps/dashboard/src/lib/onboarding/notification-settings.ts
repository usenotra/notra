import { db } from "@notra/db/drizzle";
import { organizationNotificationSettings } from "@notra/db/schema";

import { runAfterResponse } from "@/lib/after-response";
import { syncBrewContactsForOrganizationOwners } from "@/lib/email/brew-contacts";

export async function upsertOnboardingNotificationSettings({
  organizationId,
  dailySummary,
}: {
  organizationId: string;
  dailySummary: boolean;
}) {
  await db
    .insert(organizationNotificationSettings)
    .values({
      id: crypto.randomUUID(),
      organizationId,
      scheduledContentCreation: false,
      scheduledContentFailed: false,
      scheduledContentSkipped: false,
      dailySummary,
    })
    .onConflictDoUpdate({
      set: {
        dailySummary,
        updatedAt: new Date(),
      },
      target: organizationNotificationSettings.organizationId,
    });

  runAfterResponse("[BrewContacts] Sync failed", () =>
    syncBrewContactsForOrganizationOwners(organizationId)
  );
}
