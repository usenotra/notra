import { db } from "@notra/db/drizzle";
import {
  brandSettings,
  organizationNotificationSettings,
  organizations,
} from "@notra/db/schema";
import { normalizeCompetitorDomain } from "@notra/geo-core/geo/domain";
import {
  getGeoOnboardingSnapshot,
  getGeoOnboardingStage,
} from "@notra/geo-core/geo/onboarding-status";
import { preferredGeoLanguage } from "@notra/geo-core/utils/geo-locale-language";
import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";

import {
  ONBOARDING_STEP_COMPETITORS,
  ONBOARDING_STEP_PRICING,
  ONBOARDING_STEP_VISIBILITY,
  ONBOARDING_STEP_WORKSPACE,
} from "@/constants/onboarding";
import {
  getLastActiveOrganization,
  getSession,
  validateOrganizationAccess,
} from "@/lib/auth/actions";
import { hasPaidSubscriptionHistory } from "@/lib/billing/subscription";
import { redirectIfAnyOrganizationHasPaidHistory } from "@/lib/onboarding/billing-gate";
import { redirectIfOnboardingDismissed } from "@/lib/onboarding/dismissal";
import type { OnboardingLayoutContext } from "@/types/onboarding-layout";
import type { UiRouteInput } from "@/types/ui-route";
import {
  geoDashboardPath,
  geoOnboardingCompetitorsPath,
  geoOnboardingPath,
  geoOnboardingPricingPath,
  geoOnboardingWorkspacePath,
  withGeoProject,
} from "@/utils/geo-paths";
import { onboardingProgressHrefs } from "@/utils/onboarding-progress";

async function onboardingContext({ searchParams }: UiRouteInput) {
  const session = await getSession();
  if (!session?.user) {
    throw redirect({ href: "/login" });
  }
  const organization = await getLastActiveOrganization();
  const projectId =
    typeof searchParams.project === "string" && searchParams.project
      ? searchParams.project
      : undefined;
  const replay =
    process.env.NODE_ENV === "development" && searchParams.replay === "1";
  return { organization, projectId, replay };
}

async function onboardingBrandContext(input: UiRouteInput) {
  const { organization, projectId, replay } = await onboardingContext(input);
  if (!organization) {
    throw redirect({ href: "/onboarding/workspace" });
  }
  const brand = await db.query.brandSettings.findFirst({
    where: eq(brandSettings.organizationId, organization.id),
    columns: { websiteUrl: true, companyName: true },
  });
  if (!brand) {
    throw redirect({ href: "/onboarding/workspace" });
  }
  await redirectIfOnboardingDismissed(
    organization.id,
    organization.slug,
    projectId,
    replay
  );
  return { organization, projectId, replay, brand };
}

export const loadOnboardingLayout = createServerFn({ method: "GET" }).handler(
  async (): Promise<OnboardingLayoutContext> => {
    const organization = await getLastActiveOrganization();
    const member = organization
      ? (await validateOrganizationAccess(organization.slug)).member
      : null;
    return {
      organizationSlug: organization?.slug ?? null,
      canSkip: member?.role === "owner" || member?.role === "admin",
    };
  }
);

export const loadOnboardingEntry = createServerFn({ method: "GET" })
  .validator((data: UiRouteInput) => data)
  .handler(async ({ data }) => {
    const { organization, projectId, replay } = await onboardingContext(data);
    await redirectIfAnyOrganizationHasPaidHistory();
    if (!organization) {
      throw redirect({ href: geoOnboardingWorkspacePath(projectId, replay) });
    }
    await redirectIfOnboardingDismissed(
      organization.id,
      organization.slug,
      projectId,
      replay
    );
    const brand = await db.query.brandSettings.findFirst({
      where: eq(brandSettings.organizationId, organization.id),
      columns: { id: true },
    });
    if (!brand) {
      throw redirect({ href: geoOnboardingWorkspacePath(projectId, replay) });
    }
    const stage = await getGeoOnboardingStage(organization.id, projectId);
    if (stage === "brand") {
      throw redirect({ href: geoOnboardingPath(projectId, replay) });
    }
    if (stage === "competitors") {
      throw redirect({ href: geoOnboardingCompetitorsPath(projectId, replay) });
    }
    throw redirect({ href: geoOnboardingPricingPath(projectId, replay) });
  });

export const loadOnboardingWorkspace = createServerFn({ method: "GET" })
  .validator((data: UiRouteInput) => data)
  .handler(async ({ data }) => {
    const { organization, projectId, replay } = await onboardingContext(data);
    if (!organization) {
      await redirectIfAnyOrganizationHasPaidHistory();
      return { existingOrg: undefined, progressHrefs: undefined };
    }
    await redirectIfOnboardingDismissed(
      organization.id,
      organization.slug,
      projectId,
      replay
    );
    const [brand, existingOrg, notificationSettings, stage] = await Promise.all(
      [
        db.query.brandSettings.findFirst({
          where: eq(brandSettings.organizationId, organization.id),
          columns: { id: true, websiteUrl: true },
        }),
        db.query.organizations.findFirst({
          where: eq(organizations.id, organization.id),
          columns: {
            heardAboutNotraOther: true,
            heardAboutNotraSource: true,
            id: true,
            logo: true,
            slug: true,
            name: true,
          },
        }),
        db.query.organizationNotificationSettings.findFirst({
          where: eq(
            organizationNotificationSettings.organizationId,
            organization.id
          ),
          columns: { dailySummary: true, marketingEmails: true },
        }),
        getGeoOnboardingStage(organization.id, projectId),
      ]
    );
    return {
      existingOrg: existingOrg
        ? {
            ...existingOrg,
            dailySummary: notificationSettings?.dailySummary ?? true,
            marketingEmails: notificationSettings?.marketingEmails ?? true,
            hasBrand: Boolean(brand),
            websiteUrl: brand?.websiteUrl ?? null,
          }
        : undefined,
      progressHrefs: onboardingProgressHrefs({
        current: ONBOARDING_STEP_WORKSPACE,
        hasOrganization: true,
        hasBrand: Boolean(brand),
        projectId,
        replay,
        stage,
      }),
    };
  });

export const loadOnboardingVisibility = createServerFn({ method: "GET" })
  .validator((data: UiRouteInput) => data)
  .handler(async ({ data }) => {
    const { organization, projectId, replay, brand } =
      await onboardingBrandContext(data);
    const [{ stage, languages }, paid] = await Promise.all([
      getGeoOnboardingSnapshot(organization.id, projectId),
      hasPaidSubscriptionHistory(organization.id),
    ]);
    const inOnboardingFlow = replay || !paid;
    return {
      companyName: brand.companyName,
      initialLanguages: languages?.languages ?? [
        preferredGeoLanguage(getRequestHeaders().get("accept-language")),
      ],
      lockedLanguage: languages?.promptLanguage ?? null,
      inOnboardingFlow,
      nextHref: geoOnboardingCompetitorsPath(projectId, replay),
      organizationId: organization.id,
      progressHrefs: onboardingProgressHrefs({
        current: ONBOARDING_STEP_VISIBILITY,
        hasBrand: true,
        hasOrganization: true,
        projectId,
        replay,
        stage,
      }),
      projectId,
      skipHref:
        inOnboardingFlow && !replay
          ? geoOnboardingPricingPath(projectId)
          : geoDashboardPath(organization.slug, projectId),
      websiteUrl: brand.websiteUrl,
    };
  });

export const loadOnboardingCompetitors = createServerFn({ method: "GET" })
  .validator((data: UiRouteInput) => data)
  .handler(async ({ data }) => {
    const { organization, projectId, replay, brand } =
      await onboardingBrandContext(data);
    const [stage, paid] = await Promise.all([
      getGeoOnboardingStage(organization.id, projectId),
      hasPaidSubscriptionHistory(organization.id),
    ]);
    const inOnboardingFlow = replay || !paid;
    if (!replay && stage === "brand") {
      throw redirect({ href: geoOnboardingPath(projectId) });
    }
    return {
      companyName: brand.companyName ?? "",
      domain: normalizeCompetitorDomain(brand.websiteUrl),
      inOnboardingFlow,
      nextHref:
        inOnboardingFlow && !replay
          ? geoOnboardingPricingPath(projectId)
          : geoDashboardPath(organization.slug, projectId),
      organizationId: organization.id,
      progressHrefs: onboardingProgressHrefs({
        current: ONBOARDING_STEP_COMPETITORS,
        hasBrand: true,
        hasOrganization: true,
        projectId,
        replay,
        stage,
      }),
      projectId,
    };
  });

export const loadOnboardingPricing = createServerFn({ method: "GET" })
  .validator((data: UiRouteInput) => data)
  .handler(async ({ data }) => {
    const { organization, projectId, replay } = await onboardingContext(data);
    if (!organization) {
      await redirectIfAnyOrganizationHasPaidHistory();
      throw redirect({ href: "/onboarding/workspace" });
    }
    await redirectIfOnboardingDismissed(
      organization.id,
      organization.slug,
      projectId,
      replay
    );
    const [stage, { member }] = await Promise.all([
      getGeoOnboardingStage(organization.id, projectId),
      validateOrganizationAccess(organization.slug),
    ]);
    return {
      canSkipOnboarding: member?.role === "owner" || member?.role === "admin",
      closeHref: withGeoProject(`/${organization.slug}`, projectId),
      progressHrefs: onboardingProgressHrefs({
        current: ONBOARDING_STEP_PRICING,
        hasBrand: true,
        hasOrganization: true,
        projectId,
        replay,
        stage,
      }),
      slug: organization.slug,
    };
  });
