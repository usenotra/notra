import { db } from "@notra/db/drizzle";
import {
  members,
  organizationNotificationSettings,
  organizations,
} from "@notra/db/schema";
import { and, eq } from "drizzle-orm";

import type {
  NotificationData,
  NotificationSettingKey,
} from "@/types/workflows/content-generation-steps";

/**
 * Whether an organization wants one kind of notification, and its owners'
 * addresses. No settings row means off, like the settings page shows it.
 */
export async function getNotificationData(input: {
  organizationId: string;
  setting: NotificationSettingKey;
}): Promise<NotificationData> {
  const notificationSettings =
    await db.query.organizationNotificationSettings.findFirst({
      where: eq(
        organizationNotificationSettings.organizationId,
        input.organizationId
      ),
    });

  if (!notificationSettings?.[input.setting]) {
    return {
      enabled: false,
      ownerEmails: [],
      organizationName: "",
      organizationSlug: "",
    };
  }

  const [org, ownerMemberships] = await Promise.all([
    db.query.organizations.findFirst({
      where: eq(organizations.id, input.organizationId),
      columns: { name: true, slug: true },
    }),
    db.query.members.findMany({
      where: and(
        eq(members.organizationId, input.organizationId),
        eq(members.role, "owner")
      ),
      with: { users: { columns: { email: true } } },
    }),
  ]);

  return {
    enabled: true,
    ownerEmails: ownerMemberships.map((membership) => membership.users.email),
    organizationName: org?.name ?? "Your organization",
    organizationSlug: org?.slug ?? "",
  };
}
