"use server";

import { db } from "@notra/db/drizzle";
import { brandSettings, members, organizations } from "@notra/db/schema";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { organizationIdSchema } from "@notra/schemas/dashboard/auth/organization";
import {
  type OnboardingBrandAnalysisInput,
  onboardingBrandAnalysisSchema,
} from "@notra/schemas/dashboard/brand-analysis";
import { onboardingNotificationPrefsSchema } from "@notra/schemas/dashboard/notification-settings";
import { triggerOnboardingAgentSetupSchema } from "@notra/schemas/dashboard/onboarding-agent";
import {
  onboardingWorkspaceAttributionSchema,
  onboardingWorkspaceFormFieldsSchema,
} from "@notra/schemas/dashboard/onboarding/workspace";
import { ORPCError } from "@orpc/server";
import { and, eq, isNull } from "drizzle-orm";
import { Effect } from "effect";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { after } from "next/server";
import { z } from "zod";

import { ONBOARDING_BRAND_ANALYSIS_FAILURE_REASONS } from "@/constants/analytics-events";
import {
  identifyOrganizationGroup,
  setPersonProperties,
  trackServerEvent,
  trackServerEventAndFlush,
} from "@/lib/analytics/posthog-server";
import { readRequestHeaders } from "@/lib/analytics/request-headers";
import { assertOrganizationAccess } from "@/lib/auth/organization";
import { getAuthSession } from "@/lib/auth/server";
import {
  ensureDefaultBrandIdentity,
  launchReservedOnboardingAgent,
  reserveInitialOnboardingAgentRun,
} from "@/lib/onboarding-agent";
import { queueValidatedOnboardingBrandAnalysis } from "@/lib/onboarding/brand-analysis";
import {
  resolveCompanyDomain,
  resolveReachableWebsiteUrl,
} from "@/lib/onboarding/company-domain";
import { upsertOnboardingNotificationSettings } from "@/lib/onboarding/notification-settings";
import type {
  SaveOnboardingAttributionInput,
  SaveOnboardingAttributionResult,
  SaveOnboardingNotificationSettingsInput,
  SaveOnboardingNotificationSettingsResult,
} from "@/types/onboarding";
import type {
  OnboardingAgentSetupTaskInput,
  TriggerOnboardingAgentSetupInput,
  TriggerOnboardingAgentSetupResult,
} from "@/types/onboarding-agent";
import type { ActionResult } from "@/types/organizations/actions";
import { ratelimit } from "@/utils/ratelimit";
import { validateOnboardingWebsite } from "@/utils/website-url";

export async function initializeOnboardingBrandAnalysis(
  rawInput: OnboardingBrandAnalysisInput
): Promise<ActionResult<null>> {
  const input = onboardingBrandAnalysisSchema.parse(rawInput);
  const session = await getAuthSession();
  if (!session?.user) {
    return {
      data: null,
      error: { message: "Unauthorized", code: "UNAUTHORIZED" },
    };
  }
  const membership = await db.query.members.findFirst({
    where: and(
      eq(members.userId, session.user.id),
      eq(members.organizationId, input.organizationId)
    ),
    columns: { id: true },
  });
  if (!membership) {
    return { data: null, error: { message: "Forbidden", code: "FORBIDDEN" } };
  }
  const existingBrand = await db.query.brandSettings.findFirst({
    where: eq(brandSettings.organizationId, input.organizationId),
    columns: { id: true },
  });
  if (existingBrand) {
    return { data: null, error: null };
  }
  try {
    const websiteUrl = await validateOnboardingWebsite(
      input.websiteUrl,
      session.user.id
    );
    await queueValidatedOnboardingBrandAnalysis(
      { ...input, websiteUrl },
      session.user.id
    );
    return { data: null, error: null };
  } catch (error) {
    if (error instanceof ORPCError) {
      return {
        data: null,
        error: { message: error.message, code: error.code },
      };
    }
    throw error;
  }
}

export async function isWorkspaceSlugAvailable(slug: string): Promise<boolean> {
  const session = await getAuthSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  if (!onboardingWorkspaceFormFieldsSchema.shape.slug.safeParse(slug).success) {
    return false;
  }

  const existing = await db.query.organizations.findFirst({
    columns: { id: true },
    where: eq(organizations.slug, slug),
  });
  return !existing;
}

async function runOnboardingAgentSetup({
  domain,
  email,
  organizationId,
}: OnboardingAgentSetupTaskInput) {
  const websiteUrl = await resolveReachableWebsiteUrl(domain);
  if (!websiteUrl) {
    await trackServerEventAndFlush({
      event: POSTHOG_EVENTS.ONBOARDING_BRAND_ANALYSIS_FAILED,
      organizationId,
      properties: {
        reason: ONBOARDING_BRAND_ANALYSIS_FAILURE_REASONS.WEBSITE_UNREACHABLE,
      },
    });
    return;
  }

  const organization = await db.query.organizations.findFirst({
    columns: { name: true },
    where: eq(organizations.id, organizationId),
  });
  if (!organization) {
    throw new Error("Organization not found");
  }

  await ensureDefaultBrandIdentity({
    companyName: organization.name,
    organizationId,
    websiteUrl,
  });

  const reservedAt = await reserveInitialOnboardingAgentRun(organizationId);
  if (!reservedAt) {
    return;
  }

  await Effect.runPromise(
    launchReservedOnboardingAgent({
      payload: {
        domain,
        email,
        organizationId,
        organizationName: organization.name,
      },
      reservedAt,
    })
  );
}

export async function triggerOnboardingAgentSetup(
  rawInput: TriggerOnboardingAgentSetupInput
): Promise<TriggerOnboardingAgentSetupResult> {
  const input = triggerOnboardingAgentSetupSchema.parse(rawInput);
  const session = await getAuthSession();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const membership = await db.query.members.findFirst({
    where: and(
      eq(members.userId, session.user.id),
      eq(members.organizationId, input.organizationId)
    ),
    columns: { id: true },
  });

  if (!membership) {
    throw new Error("Forbidden");
  }

  const { success: withinLimit } = await ratelimit.onboardingAgent.limit(
    input.organizationId
  );

  if (!withinLimit) {
    throw new Error(
      "Too many onboarding agent requests. Please try again shortly."
    );
  }

  const resolution = resolveCompanyDomain({
    email: session.user.email,
    websiteUrl: input.websiteUrl,
  });
  if (!resolution) {
    trackServerEvent({
      event: POSTHOG_EVENTS.ONBOARDING_BRAND_ANALYSIS_FAILED,
      headers: await readRequestHeaders(),
      userId: session.user.id,
      organizationId: input.organizationId,
      properties: {
        reason: ONBOARDING_BRAND_ANALYSIS_FAILURE_REASONS.NO_COMPANY_DOMAIN,
      },
    });
    return { skipped: "no-company-domain", success: true };
  }

  const taskInput: OnboardingAgentSetupTaskInput = {
    domain: resolution.domain,
    email: session.user.email,
    organizationId: input.organizationId,
  };

  after(async () => {
    try {
      await runOnboardingAgentSetup(taskInput);
    } catch (error) {
      console.error("[Onboarding] Background onboarding agent setup failed", {
        error,
        organizationId: taskInput.organizationId,
      });
    }
  });

  return { success: true };
}

const saveOnboardingAttributionSchema = z
  .object({
    organizationId: organizationIdSchema,
  })
  .and(onboardingWorkspaceAttributionSchema);

export async function saveOnboardingAttribution(
  rawInput: SaveOnboardingAttributionInput
): Promise<SaveOnboardingAttributionResult> {
  const parsed = saveOnboardingAttributionSchema.safeParse(rawInput);
  const t = await getTranslations("onboarding.actions");

  if (!parsed.success) {
    return {
      success: false,
      error: t("invalidAttribution"),
    };
  }

  let membershipRole: string;
  let userId: string;

  try {
    const access = await assertOrganizationAccess({
      headers: await headers(),
      organizationId: parsed.data.organizationId,
    });
    membershipRole = access.membership.role;
    userId = access.user.id;
  } catch (error) {
    if (error instanceof ORPCError) {
      return {
        success: false,
        error: error.message,
      };
    }

    throw error;
  }

  if (membershipRole !== "owner") {
    return {
      success: false,
      error: t("ownerOnly"),
    };
  }

  if (
    !(parsed.data.heardAboutNotraSource || parsed.data.heardAboutNotraOther)
  ) {
    return { success: true };
  }

  await db
    .update(organizations)
    .set({
      heardAboutNotraSource: parsed.data.heardAboutNotraSource,
      heardAboutNotraOther: parsed.data.heardAboutNotraOther,
    })
    .where(
      and(
        eq(organizations.id, parsed.data.organizationId),
        isNull(organizations.heardAboutNotraSource),
        isNull(organizations.heardAboutNotraOther)
      )
    );

  const heardAbout = parsed.data.heardAboutNotraSource ?? "other";
  identifyOrganizationGroup({
    organizationId: parsed.data.organizationId,
    userId,
    properties: { heard_about_notra: heardAbout },
  });
  setPersonProperties({
    userId,
    setOnce: { heard_about_notra: heardAbout },
  });

  return { success: true };
}

const saveOnboardingNotificationSettingsSchema = z
  .object({
    organizationId: organizationIdSchema,
  })
  .and(onboardingNotificationPrefsSchema);

export async function saveOnboardingNotificationSettings(
  rawInput: SaveOnboardingNotificationSettingsInput
): Promise<SaveOnboardingNotificationSettingsResult> {
  const parsed = saveOnboardingNotificationSettingsSchema.safeParse(rawInput);
  const t = await getTranslations("onboarding.actions");

  if (!parsed.success) {
    return {
      success: false,
      error: t("invalidNotificationPrefs"),
    };
  }

  let membershipRole: string;

  try {
    const access = await assertOrganizationAccess({
      headers: await headers(),
      organizationId: parsed.data.organizationId,
    });
    membershipRole = access.membership.role;
  } catch (error) {
    if (error instanceof ORPCError) {
      return {
        success: false,
        error: error.message,
      };
    }

    throw error;
  }

  if (membershipRole !== "owner") {
    return {
      success: false,
      error: t("ownerOnly"),
    };
  }

  await upsertOnboardingNotificationSettings({
    organizationId: parsed.data.organizationId,
    dailySummary: parsed.data.dailySummary,
    marketingEmails: parsed.data.marketingEmails,
  });

  return { success: true };
}
