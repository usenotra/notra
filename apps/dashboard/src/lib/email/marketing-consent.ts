import "server-only";
import { db } from "@notra/db/drizzle";
import { users } from "@notra/db/schema";
import {
  getBrewMarketingStatus,
  setBrewMarketingUnsubscribed,
} from "@notra/email/utils/brew";
import { eq } from "drizzle-orm";

import { syncBrewContacts } from "@/lib/email/brew-contacts";
import type { MarketingEmailsState } from "@/types/settings/notifications";

/**
 * Marketing consent has two halves: the opt-in is ours
 * (`users.marketing_opt_in_at`), the opt-out is Brew's (the marketing domain's
 * unsubscribe list, filled by email footers and by this toggle).
 */
export async function getMarketingEmailsState(
  userId: string
): Promise<MarketingEmailsState> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { email: true, marketingOptInAt: true },
  });
  if (!user?.marketingOptInAt) {
    return { enabled: false, blockedByUnsubscribe: false };
  }

  const status = await getBrewMarketingStatus(user.email);
  return {
    enabled: status === "subscribed" || status === "unknown",
    blockedByUnsubscribe: status === "globally_unsubscribed",
  };
}

/**
 * Records the user's choice and mirrors it to Brew. The contact is upserted
 * before its unsubscribe list entry changes, because Brew creates unknown
 * addresses as globally unsubscribed.
 */
export async function setMarketingEmails({
  userId,
  enabled,
}: {
  userId: string;
  enabled: boolean;
}): Promise<MarketingEmailsState> {
  const [user] = await db
    .update(users)
    .set({ marketingOptInAt: enabled ? new Date() : null })
    .where(eq(users.id, userId))
    .returning({ email: users.email });
  if (!user) {
    throw new Error("User not found");
  }

  const { failed } = await syncBrewContacts([userId]);
  if (failed > 0) {
    throw new Error("Failed to sync the Brew contact");
  }

  const status = await setBrewMarketingUnsubscribed(user.email, !enabled);
  return {
    enabled: enabled && status !== "globally_unsubscribed",
    blockedByUnsubscribe: status === "globally_unsubscribed",
  };
}

/** Applies the onboarding checkbox, touching Brew only when it changed. */
export async function applyOnboardingMarketingChoice({
  userId,
  enabled,
}: {
  userId: string;
  enabled: boolean;
}) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { marketingOptInAt: true },
  });
  if (enabled === Boolean(user?.marketingOptInAt)) {
    return;
  }

  await setMarketingEmails({ userId, enabled });
}
