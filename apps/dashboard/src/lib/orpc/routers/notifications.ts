import { db } from "@notra/db/drizzle";
import { organizationNotificationSettings } from "@notra/db/schema";
import { organizationIdInputSchema } from "@notra/schemas/dashboard/auth/organization";
import { updateNotificationSettingsInputSchema } from "@notra/schemas/dashboard/notification-settings";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";

import { runAfterResponse } from "@/lib/after-response";
import { assertOrganizationAccess } from "@/lib/auth/organization";
import { assertActiveSubscription } from "@/lib/billing/subscription";
import { syncBrewContactsForOrganizationOwners } from "@/lib/email/brew-contacts";
import { authorizedProcedure } from "@/lib/orpc/base";

import { forbidden } from "../utils/errors";

export const notificationsRouter = {
  get: authorizedProcedure
    .input(organizationIdInputSchema)
    .handler(async ({ context, input }) => {
      await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
        user: context.user,
      });

      const settings =
        await db.query.organizationNotificationSettings.findFirst({
          where: eq(
            organizationNotificationSettings.organizationId,
            input.organizationId
          ),
        });

      return {
        settings: settings ?? {
          scheduledContentCreation: false,
          scheduledContentFailed: false,
          scheduledContentSkipped: false,
          marketingEmails: true,
          dailySummary: true,
        },
      };
    }),
  update: authorizedProcedure
    .input(updateNotificationSettingsInputSchema)
    .handler(async ({ context, input }) => {
      const access = await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
        user: context.user,
      });

      if (access.membership.role !== "owner") {
        const tErrors = await getTranslations("errors.notifications");
        throw forbidden(tErrors("ownerOnly"));
      }

      // Owners must still be able to opt out after their subscription expires.
      if (Object.values(input).some((value) => value === true)) {
        await assertActiveSubscription(input.organizationId);
      }

      const updates: Record<string, boolean | Date> = {
        updatedAt: new Date(),
      };

      if (input.scheduledContentCreation !== undefined) {
        updates.scheduledContentCreation = input.scheduledContentCreation;
      }

      if (input.scheduledContentFailed !== undefined) {
        updates.scheduledContentFailed = input.scheduledContentFailed;
      }

      if (input.scheduledContentSkipped !== undefined) {
        updates.scheduledContentSkipped = input.scheduledContentSkipped;
      }

      if (input.marketingEmails !== undefined) {
        updates.marketingEmails = input.marketingEmails;
      }

      if (input.dailySummary !== undefined) {
        updates.dailySummary = input.dailySummary;
      }

      const [updated] = await db
        .insert(organizationNotificationSettings)
        .values({
          id: crypto.randomUUID(),
          organizationId: input.organizationId,
          scheduledContentCreation: input.scheduledContentCreation ?? false,
          scheduledContentFailed: input.scheduledContentFailed ?? false,
          scheduledContentSkipped: input.scheduledContentSkipped ?? false,
          marketingEmails: input.marketingEmails ?? true,
          dailySummary: input.dailySummary ?? true,
        })
        .onConflictDoUpdate({
          set: updates,
          target: organizationNotificationSettings.organizationId,
        })
        .returning();

      runAfterResponse("[BrewContacts] Sync failed", () =>
        syncBrewContactsForOrganizationOwners(input.organizationId)
      );

      return { settings: updated };
    }),
};
