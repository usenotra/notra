import "@tanstack/react-start/server-only";
import { logError } from "@notra/ai/utils/server-log";
import { db } from "@notra/db/drizzle";
import { users } from "@notra/db/schema";
import { BREW_MARKETING_CONSENT_POLICY_VERSION } from "@notra/email/constants/brew";
import {
  getBrewMarketingStatus,
  setBrewMarketingUnsubscribed,
} from "@notra/email/utils/brew";
import { eq } from "drizzle-orm";

import { syncBrewContacts } from "@/lib/email/brew-contacts";
import { getLocale, getTranslations } from "@/lib/i18n/server";
import type {
  MarketingEmailsState,
  MarketingOptInSource,
} from "@/types/settings/notifications";

/**
 * Marketing consent has two halves: the opt-in is ours
 * (`users.marketing_opt_in_at`), the opt-out is Brew's. An email footer
 * unsubscribes brand-wide, which only Brew's app can undo; the settings toggle
 * uses the marketing domain's unsubscribe list, which it can lift again.
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

/** The checkbox exactly as the user saw it, in their language. */
async function buildConsentEvidence(source: MarketingOptInSource) {
  const locale = await getLocale();
  const tLabels = await getTranslations("common.labels");
  const description =
    source === "onboarding"
      ? (await getTranslations("onboarding.emailPrefs"))(
          "marketingEmails.description"
        )
      : (await getTranslations("settings.panes.notifications"))(
          "toggles.marketingEmails.description"
        );

  return `Notra ${source} (${locale}): unchecked checkbox "${tLabels("productUpdates")}: ${description}", ticked by the signed-in user (verified email)`;
}

/** Stores the choice. Throws only on database errors. */
async function saveMarketingChoice({
  userId,
  enabled,
  source,
}: {
  userId: string;
  enabled: boolean;
  source: MarketingOptInSource;
}): Promise<string> {
  const [user] = await db
    .update(users)
    .set(
      enabled
        ? {
            marketingOptInAt: new Date(),
            marketingOptInEvidence: await buildConsentEvidence(source),
            marketingOptInPolicyVersion: BREW_MARKETING_CONSENT_POLICY_VERSION,
          }
        : {
            marketingOptInAt: null,
            marketingOptInEvidence: null,
            marketingOptInPolicyVersion: null,
          }
    )
    .where(eq(users.id, userId))
    .returning({ email: users.email });
  if (!user) {
    throw new Error("User not found");
  }
  return user.email;
}

/** Never throws, so an opt-out still reaches the unsubscribe list. */
async function trySyncContact(userId: string): Promise<boolean> {
  try {
    const { failed } = await syncBrewContacts([userId]);
    return failed === 0;
  } catch (error) {
    logError("[MarketingConsent] Contact sync failed", error, { userId });
    return false;
  }
}

/**
 * Mirrors a stored choice to Brew. An opt-in upserts the contact (with its
 * consent record) before lifting the unsubscribe, because Brew creates
 * unknown addresses as globally unsubscribed. An opt-out unsubscribes even
 * when the contact sync fails, so no marketing email slips through.
 */
async function mirrorMarketingChoice({
  userId,
  email,
  enabled,
}: {
  userId: string;
  email: string;
  enabled: boolean;
}): Promise<MarketingEmailsState> {
  const synced = await trySyncContact(userId);

  if (enabled && !synced) {
    throw new Error("Failed to sync the Brew contact");
  }

  const status = await setBrewMarketingUnsubscribed(email, !enabled);
  if (!synced) {
    throw new Error("Failed to sync the Brew contact");
  }

  return {
    enabled: enabled && status !== "globally_unsubscribed",
    blockedByUnsubscribe: status === "globally_unsubscribed",
  };
}

/** Records the user's choice and mirrors it to Brew. */
export async function setMarketingEmails(options: {
  userId: string;
  enabled: boolean;
  source: MarketingOptInSource;
}): Promise<MarketingEmailsState> {
  const email = await saveMarketingChoice(options);
  return mirrorMarketingChoice({ ...options, email });
}

/**
 * Applies the onboarding checkbox when it changed. The choice is always
 * stored; a Brew failure is only logged (the nightly contact sync catches
 * up), so a Brew outage never blocks onboarding.
 */
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

  const email = await saveMarketingChoice({
    userId,
    enabled,
    source: "onboarding",
  });
  try {
    await mirrorMarketingChoice({ userId, email, enabled });
  } catch (error) {
    logError("[MarketingConsent] Failed to mirror choice to Brew", error, {
      userId,
    });
  }
}
