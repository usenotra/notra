import { db } from "@notra/db/drizzle";
import {
  connectedSocialAccounts,
  githubIntegrations,
  members,
  posts,
  scheduledPublications,
  users,
} from "@notra/db/schema";
import type { ScheduledPublicationDestinationConfig } from "@notra/db/types/scheduled-publications";
import { EMAIL_CONFIG } from "@notra/email/utils/config";
import { socialConnectPlatformSchema } from "@notra/schemas/dashboard/social-accounts";
import { and, eq } from "drizzle-orm";

import { SOCIAL_PLATFORM_LABELS } from "@/constants/social-connect";
import { getNotificationData } from "@/lib/email/notification-data";
import { sendScheduledPublicationFailedEmail } from "@/lib/email/send";

async function describeDestination(
  organizationId: string,
  config: ScheduledPublicationDestinationConfig
) {
  if (config.destination === "github") {
    const repository = await db.query.githubIntegrations.findFirst({
      columns: { owner: true, repo: true },
      where: and(
        eq(githubIntegrations.id, config.repositoryId),
        eq(githubIntegrations.organizationId, organizationId)
      ),
    });
    return repository?.owner && repository.repo
      ? `GitHub (${repository.owner}/${repository.repo})`
      : "GitHub";
  }
  if (config.destination === "social") {
    const account = await db.query.connectedSocialAccounts.findFirst({
      columns: { provider: true, username: true },
      where: and(
        eq(connectedSocialAccounts.id, config.accountId),
        eq(connectedSocialAccounts.organizationId, organizationId)
      ),
    });
    if (!account) {
      return "social media";
    }
    const provider = socialConnectPlatformSchema.safeParse(account.provider);
    const platform = provider.success
      ? SOCIAL_PLATFORM_LABELS[provider.data]
      : account.provider;
    return `${platform} (@${account.username})`;
  }
  return "Notra";
}

function formatScheduledFor(scheduledAt: Date, timeZone: string) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone,
    }).format(scheduledAt);
  } catch {
    return scheduledAt.toUTCString();
  }
}

/**
 * Emails that one destination gave up, gated by the organization's
 * "scheduled content failed" setting like the other failure notices. It goes
 * to the member who scheduled the post, or to the owners when it came from
 * the API or that person left the organization. The Brew idempotency key
 * makes a retried step send at most once per recipient.
 */
export async function notifyScheduledPublicationFailed(
  scheduledPublicationId: string
): Promise<void> {
  const [row] = await db
    .select({
      id: scheduledPublications.id,
      organizationId: scheduledPublications.organizationId,
      postId: scheduledPublications.postId,
      destinationConfig: scheduledPublications.destinationConfig,
      scheduledAt: scheduledPublications.scheduledAt,
      timeZone: scheduledPublications.timeZone,
      lastError: scheduledPublications.lastError,
      status: scheduledPublications.status,
      failedAt: scheduledPublications.updatedAt,
      postTitle: posts.title,
      // Only set while the person who scheduled it is still a member.
      schedulerEmail: users.email,
    })
    .from(scheduledPublications)
    .innerJoin(posts, eq(posts.id, scheduledPublications.postId))
    .leftJoin(
      members,
      and(
        eq(members.userId, scheduledPublications.createdByUserId),
        eq(members.organizationId, scheduledPublications.organizationId)
      )
    )
    .leftJoin(users, eq(users.id, members.userId))
    .where(eq(scheduledPublications.id, scheduledPublicationId))
    .limit(1);
  if (row?.status !== "failed") {
    return;
  }
  const notification = await getNotificationData({
    organizationId: row.organizationId,
    setting: "scheduledContentFailed",
  });
  const recipientEmails = row.schedulerEmail
    ? [row.schedulerEmail]
    : notification.ownerEmails;
  if (!notification.enabled || recipientEmails.length === 0) {
    return;
  }

  const email = {
    // A row that fails again after a manual retry is a new failure.
    failureKey: `${row.id}:${row.failedAt.getTime()}`,
    organizationName: notification.organizationName,
    organizationSlug: notification.organizationSlug,
    postTitle: row.postTitle,
    destinationLabel: await describeDestination(
      row.organizationId,
      row.destinationConfig
    ),
    scheduledFor: formatScheduledFor(row.scheduledAt, row.timeZone),
    reason: row.lastError ?? "Unknown error",
    postLink: `${EMAIL_CONFIG.getAppUrl()}/${notification.organizationSlug}/content/${row.postId}`,
  };
  const results = await Promise.all(
    recipientEmails.map((recipientEmail) =>
      sendScheduledPublicationFailedEmail({ ...email, recipientEmail })
    )
  );
  const failed = results.find((result) => result.error);
  if (failed?.error) {
    throw new Error(
      `Failed to send scheduled publication failure email: ${failed.error.message}`
    );
  }
}
