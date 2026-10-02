import { getLinearIntegrationById } from "@notra/ai/integrations/linear";
import {
  getSidebarOpenFromCookie,
  SIDEBAR_COOKIE_NAME,
} from "@notra/ui/lib/sidebar-state";
import type { DehydratedState } from "@tanstack/react-query";
import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getCookie, getRequestHeaders } from "@tanstack/react-start/server";
import { Effect } from "effect";

import { DEMO_BANNER_COOKIE, DEMO_BANNER_OFF } from "@/constants/demo";
import { SIDEBAR_WIDTH_COOKIE_NAME } from "@/constants/nav";
import { validateOrganizationAccess } from "@/lib/auth/actions";
import { resolveAiProductAccess } from "@/lib/billing/subscription";
import { resolveInitialGeoProjectId } from "@/lib/geo/initial-project.server";
import { getTranslations } from "@/lib/i18n/server";
import { resolveOrganizationIntegrationConnect } from "@/lib/integrations/deeplink-resolution";
import { redirectOrgRootToStoredMode } from "@/lib/nav/org-root-redirect";
import type { UiRouteInput } from "@/types/migration-routes";
import { dehydrateContentDetailQueries } from "@/utils/content-prefetch.server";
import { getGreetingPeriod } from "@/utils/dashboard-greeting-period";
import { dehydrateDashboardHomeQueries } from "@/utils/dashboard-home-prefetch.server";
import {
  dehydrateContentListQueries,
  dehydrateIntegrationsQueries,
  dehydrateSkillDetailQuery,
  dehydrateSkillsQueries,
} from "@/utils/dashboard-list-prefetch.server";
import {
  geoProjectRepairPath,
  geoRequestedProjectId,
} from "@/utils/geo-hydration";
import {
  dehydrateGeoOverviewQueries,
  dehydrateGeoTrafficQueries,
} from "@/utils/geo-prefetch.server";
import { resolveOnboardingAgentRunState } from "@/utils/onboarding-agent-run";
import { toOrganizationSummary } from "@/utils/organization-summary";
import { getSidebarWidthFromCookie } from "@/utils/sidebar-width";

export const loadOrganizationShell = createServerFn({ method: "GET" })
  .inputValidator((data: UiRouteInput) => data)
  .handler(async ({ data: { params } }) => {
    const { organization } = await validateOrganizationAccess(
      params.slug ?? ""
    );
    return {
      initialActiveOrganization: toOrganizationSummary(organization),
      initialSidebarOpen: getSidebarOpenFromCookie(
        getCookie(SIDEBAR_COOKIE_NAME)
      ),
      initialSidebarWidth: getSidebarWidthFromCookie(
        getCookie(SIDEBAR_WIDTH_COOKIE_NAME)
      ),
      demoBannerHidden: getCookie(DEMO_BANNER_COOKIE) === DEMO_BANNER_OFF,
      initialOnboardingAgentRun: {
        organizationId: organization.id,
        state: resolveOnboardingAgentRunState({
          ran: organization.onboardingAgentRan,
          startedAt: organization.onboardingAgentStartedAt,
        }),
      },
    };
  });

export const loadDashboardHome = createServerFn({
  method: "GET",
  strict: { output: false },
})
  .inputValidator((data: UiRouteInput) => data)
  .handler(async ({ data: { params, searchParams } }) => {
    const slug = params.slug ?? "";
    const accessPromise = validateOrganizationAccess(slug).then(
      async (access) => ({
        ...access,
        billing: await resolveAiProductAccess(access.organization.id),
      })
    );
    await redirectOrgRootToStoredMode(slug, Promise.resolve(searchParams));
    const { organization, user, member, billing } = await accessPromise;
    if (!billing.hasAccess) {
      return { hasAccess: false as const };
    }
    const projectId = await resolveInitialGeoProjectId(
      organization.id,
      slug,
      geoRequestedProjectId(searchParams)
    );
    const t = await getTranslations("home");
    const period = getGreetingPeriod(new Date());
    const name = user.name?.trim();
    return {
      hasAccess: true as const,
      greetingText: name
        ? t("greetingWithName", { period, name })
        : t("greeting", { period }),
      state: await dehydrateDashboardHomeQueries(
        organization.id,
        projectId,
        getRequestHeaders(),
        member && { userId: user.id, id: member.id, role: member.role }
      ),
    };
  });

export const loadOrganizationPage = createServerFn({
  method: "GET",
  strict: { output: false },
})
  .inputValidator(
    (
      data: UiRouteInput & {
        kind:
          | "content"
          | "content-detail"
          | "collection"
          | "skills"
          | "skill-detail"
          | "integrations";
      }
    ) => data
  )
  .handler(async ({ data: { params, searchParams, kind } }) => {
    const slug = params.slug ?? "";
    const { organization, user, member } =
      await validateOrganizationAccess(slug);
    const requestHeaders = getRequestHeaders();
    const membership = member && {
      userId: user.id,
      id: member.id,
      role: member.role,
    };
    const projectId =
      kind === "content"
        ? await resolveInitialGeoProjectId(
            organization.id,
            slug,
            geoRequestedProjectId(searchParams)
          )
        : undefined;
    const rawPage = Array.isArray(searchParams.page)
      ? searchParams.page[0]
      : searchParams.page;
    const requestedPage = Number(rawPage);
    const page =
      Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    let state: DehydratedState | undefined;
    if (kind === "content") {
      state = await dehydrateContentListQueries(
        organization.id,
        projectId,
        page,
        requestHeaders,
        membership
      );
    } else if (kind === "content-detail") {
      state = await dehydrateContentDetailQueries(
        organization.id,
        params.id ?? "",
        requestHeaders,
        membership
      );
    } else if (kind === "skills") {
      state = await dehydrateSkillsQueries(
        organization.id,
        requestHeaders,
        membership
      );
    } else if (kind === "skill-detail") {
      state = await dehydrateSkillDetailQuery(
        organization.id,
        params.name ?? "",
        requestHeaders,
        membership
      );
    } else if (kind === "integrations") {
      state = await dehydrateIntegrationsQueries(
        organization.id,
        requestHeaders,
        membership
      );
    }
    return { organizationId: organization.id, projectId, state };
  });

export const loadGeoScope = createServerFn({ method: "GET" })
  .inputValidator((data: UiRouteInput) => data)
  .handler(async ({ data: { params } }) => {
    const slug = params.slug ?? "";
    const { organization } = await validateOrganizationAccess(slug);
    return {
      projectId: await resolveInitialGeoProjectId(
        organization.id,
        slug,
        undefined
      ),
    };
  });

export const loadGeoPage = createServerFn({
  method: "GET",
  strict: { output: false },
})
  .inputValidator(
    (data: UiRouteInput & { kind: "overview" | "traffic" | "gsc" }) => data
  )
  .handler(async ({ data: { params, searchParams, kind } }) => {
    const slug = params.slug ?? "";
    const { organization } = await validateOrganizationAccess(slug);
    const requestedProjectId = geoRequestedProjectId(searchParams);
    const projectId = await resolveInitialGeoProjectId(
      organization.id,
      slug,
      requestedProjectId
    );
    if (requestedProjectId && requestedProjectId !== projectId) {
      let repairPath: string | undefined;
      if (kind === "traffic") {
        repairPath = "/geo/traffic";
      } else if (kind === "gsc") {
        repairPath = "/integrations/google-search-console";
      }
      throw redirect({
        href: geoProjectRepairPath(slug, searchParams, projectId, repairPath),
      });
    }
    let state: DehydratedState | undefined;
    if (kind === "overview") {
      state = await dehydrateGeoOverviewQueries(
        organization.id,
        projectId,
        searchParams,
        getRequestHeaders()
      );
    } else if (kind === "traffic") {
      state = await dehydrateGeoTrafficQueries(
        organization.id,
        projectId,
        searchParams,
        getRequestHeaders()
      );
    }
    return { projectId, state };
  });

export const loadIntegrationConnect = createServerFn({ method: "GET" })
  .inputValidator((data: UiRouteInput) => data)
  .handler(async ({ data: { params } }) => {
    const resolution = await Effect.runPromise(
      resolveOrganizationIntegrationConnect({
        organizationSlug: params.slug ?? "",
        integrationSlugParam: params.integrationSlug ?? "",
      })
    );
    if (resolution.kind === "redirect") {
      throw redirect({ href: resolution.path });
    }
    return { connectSlug: resolution.connectSlug };
  });

export const loadLinearDetail = createServerFn({ method: "GET" })
  .inputValidator((data: UiRouteInput) => data)
  .handler(async ({ data: { params } }) => {
    const { organization } = await validateOrganizationAccess(
      params.slug ?? ""
    );
    const [integration, t, common] = await Promise.all([
      getLinearIntegrationById(params.id ?? ""),
      getTranslations("integrations.detailPage"),
      getTranslations("common"),
    ]);
    return {
      title:
        integration?.organizationId === organization.id
          ? t("metaTitle", { name: integration.displayName })
          : common("labels.integration"),
    };
  });
