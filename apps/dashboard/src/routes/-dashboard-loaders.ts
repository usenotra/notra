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
import { resolveInitialGeoProjectId } from "@/lib/geo/initial-project.server";
import { getTranslations } from "@/lib/i18n/server";
import { redirectOrgRootToStoredMode } from "@/lib/nav/org-root-redirect";
import type { UiRouteInput } from "@/types/migration-routes";
import { onboardingBannerDismissedCookie } from "@/utils/cookies";
import { getGreetingPeriod } from "@/utils/dashboard-greeting-period";
import {
  geoProjectRepairPath,
  geoRequestedProjectId,
} from "@/utils/geo-hydration";
import { resolveOnboardingAgentRunState } from "@/utils/onboarding-agent-run";
import { toOrganizationSummary } from "@/utils/organization-summary";
import { getSidebarWidthFromCookie } from "@/utils/sidebar-width";

export const loadOrganizationShell = createServerFn({ method: "GET" })
  .validator((data: UiRouteInput) => data)
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
      onboardingBannerDismissed:
        getCookie(onboardingBannerDismissedCookie(organization.id)) === "1",
      initialOnboardingAgentRun: {
        organizationId: organization.id,
        state: resolveOnboardingAgentRunState({
          ran: organization.onboardingAgentRan,
          startedAt: organization.onboardingAgentStartedAt,
        }),
      },
    };
  });

/** Redirects of the organization root that must precede a streamed render. */
export const gateDashboardHome = createServerFn({ method: "GET" })
  .validator((data: UiRouteInput) => data)
  .handler(async ({ data: { params, searchParams } }) => {
    await validateOrganizationAccess(params.slug ?? "");
    await redirectOrgRootToStoredMode(
      params.slug ?? "",
      Promise.resolve(searchParams)
    );
  });

export const loadDashboardHome = createServerFn({
  method: "GET",
  strict: { output: false },
})
  .validator((data: UiRouteInput) => data)
  .handler(async ({ data: { params, searchParams, gated } }) => {
    const slug = params.slug ?? "";
    const { organization, user, member } =
      await validateOrganizationAccess(slug);
    if (!gated) {
      await redirectOrgRootToStoredMode(slug, Promise.resolve(searchParams));
    }
    // The billing lookup is a round trip to Autumn; the home data does not
    // depend on it, so both run at once and the data is dropped without access.
    const billingPromise = import("@/lib/billing/subscription").then(
      ({ resolveAiProductAccess }) => resolveAiProductAccess(organization.id)
    );
    const homePromise = (async () => {
      const [{ dehydrateDashboardHomeQueries }, projectId, t] =
        await Promise.all([
          import("@/utils/dashboard-home-prefetch.server"),
          resolveInitialGeoProjectId(
            organization.id,
            slug,
            geoRequestedProjectId(searchParams)
          ),
          getTranslations("home"),
        ]);
      const period = getGreetingPeriod(new Date());
      const name = user.name?.trim();
      return {
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
    })();
    // Observed right away: if the home data fails while billing is still in
    // flight (or billing itself fails), the rejection must not count as
    // unhandled. Awaiting homePromise below still rethrows it.
    homePromise.catch(() => undefined);
    const billing = await billingPromise;
    if (!billing.hasAccess) {
      return { hasAccess: false as const };
    }
    return { hasAccess: true as const, ...(await homePromise) };
  });

export const loadOrganizationPage = createServerFn({
  method: "GET",
  strict: { output: false },
})
  .validator(
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
    // Prefetch modules (and the oRPC routers behind them) load on first use:
    // a cold server instance renders its first page without all of them.
    let state: DehydratedState | undefined;
    if (kind === "content") {
      const { dehydrateContentListQueries } =
        await import("@/utils/dashboard-list-prefetch.server");
      state = await dehydrateContentListQueries(
        organization.id,
        projectId,
        page,
        requestHeaders,
        membership
      );
    } else if (kind === "content-detail") {
      const { dehydrateContentDetailQueries } =
        await import("@/utils/content-prefetch.server");
      state = await dehydrateContentDetailQueries(
        organization.id,
        params.id ?? "",
        requestHeaders,
        membership
      );
    } else if (kind === "skills") {
      const { dehydrateSkillsQueries } =
        await import("@/utils/dashboard-list-prefetch.server");
      state = await dehydrateSkillsQueries(
        organization.id,
        requestHeaders,
        membership
      );
    } else if (kind === "skill-detail") {
      const { dehydrateSkillDetailQuery } =
        await import("@/utils/dashboard-list-prefetch.server");
      state = await dehydrateSkillDetailQuery(
        organization.id,
        params.name ?? "",
        requestHeaders,
        membership
      );
    } else if (kind === "integrations") {
      const { dehydrateIntegrationsQueries } =
        await import("@/utils/dashboard-list-prefetch.server");
      state = await dehydrateIntegrationsQueries(
        organization.id,
        requestHeaders,
        membership
      );
    }
    return { organizationId: organization.id, projectId, state };
  });

export const loadGeoScope = createServerFn({ method: "GET" })
  .validator((data: UiRouteInput) => data)
  .handler(async ({ data: { params } }) => {
    const slug = params.slug ?? "";
    const { organization } = await validateOrganizationAccess(slug);
    const [projectId, entitlement] = await Promise.all([
      resolveInitialGeoProjectId(organization.id, slug, undefined),
      import("@/lib/billing/subscription")
        .then(({ resolveGeoEntitlement }) =>
          resolveGeoEntitlement(organization.id)
        )
        .catch(() => "unknown" as const),
    ]);
    // Lets the GEO pages render while the client's own billing lookup runs;
    // the client still shows the paywall if that lookup says locked.
    return { projectId, geoEntitled: entitlement !== "denied" };
  });

type GeoPageKind = "overview" | "traffic" | "gsc";

/** Sends a stale `?project=` to the repaired URL before a streamed render. */
export const gateGeoPage = createServerFn({ method: "GET" })
  .validator((data: UiRouteInput & { kind: GeoPageKind }) => data)
  .handler(async ({ data: { params, searchParams, kind } }) => {
    const slug = params.slug ?? "";
    const { organization } = await validateOrganizationAccess(slug);
    const requestedProjectId = geoRequestedProjectId(searchParams);
    const projectId = await resolveInitialGeoProjectId(
      organization.id,
      slug,
      requestedProjectId
    );
    redirectStaleGeoProject(slug, searchParams, kind, projectId);
  });

function redirectStaleGeoProject(
  slug: string,
  searchParams: UiRouteInput["searchParams"],
  kind: GeoPageKind,
  projectId: string | undefined
) {
  const requestedProjectId = geoRequestedProjectId(searchParams);
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
}

export const loadGeoPage = createServerFn({
  method: "GET",
  strict: { output: false },
})
  .validator((data: UiRouteInput & { kind: GeoPageKind }) => data)
  .handler(async ({ data: { params, searchParams, kind, gated } }) => {
    const slug = params.slug ?? "";
    const { organization } = await validateOrganizationAccess(slug);
    const requestedProjectId = geoRequestedProjectId(searchParams);
    const projectId = await resolveInitialGeoProjectId(
      organization.id,
      slug,
      requestedProjectId
    );
    if (!gated) {
      redirectStaleGeoProject(slug, searchParams, kind, projectId);
    }
    let state: DehydratedState | undefined;
    if (kind === "overview") {
      const { dehydrateGeoOverviewQueries } =
        await import("@/utils/geo-prefetch.server");
      state = await dehydrateGeoOverviewQueries(
        organization.id,
        projectId,
        searchParams,
        getRequestHeaders()
      );
    } else if (kind === "traffic") {
      const { dehydrateGeoTrafficQueries } =
        await import("@/utils/geo-prefetch.server");
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
  .validator((data: UiRouteInput) => data)
  .handler(async ({ data: { params } }) => {
    const { resolveOrganizationIntegrationConnect } =
      await import("@/lib/integrations/deeplink-resolution");
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
  .validator((data: UiRouteInput) => data)
  .handler(async ({ data: { params } }) => {
    const { organization } = await validateOrganizationAccess(
      params.slug ?? ""
    );
    const [integration, t, common] = await Promise.all([
      import("@notra/ai/integrations/linear").then(
        ({ getLinearIntegrationById }) =>
          getLinearIntegrationById(params.id ?? "")
      ),
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
