import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { isDemoMode } from "@notra/utils/demo-mode";
import { notFound, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getCookie, getRequestHeaders } from "@tanstack/react-start/server";
import { Effect } from "effect";
import { createLoader, createSerializer } from "nuqs/server";

import { CALLBACK_DESTINATIONS } from "@/constants/analytics-events";
import { LAST_VISITED_ORGANIZATION_COOKIE } from "@/constants/cookies";
import { DEMO_THEME_PARAM } from "@/constants/demo";
import { LOGIN_ERROR_KEYS } from "@/constants/login-error-messages";
import { LOGIN_MFA_QUERY_KEY } from "@/constants/security";
import {
  setPersonProperties,
  trackServerEvent,
} from "@/lib/analytics/posthog-server";
import { getLastActiveOrganization, getSession } from "@/lib/auth/actions";
import { isSessionBanned } from "@/lib/auth/banned";
import { readPendingMfaFlow } from "@/lib/auth/mfa-cookies";
import { getCurrentDemoSandbox } from "@/lib/demo/session";
import { demoThemeParser, serializeDemoTheme } from "@/lib/demo/theme-param";
import { getTranslations } from "@/lib/i18n/server";
import { resolveIntegrationConnectDeeplink } from "@/lib/integrations/deeplink-resolution";
import type { CallbackDestination } from "@/types/analytics/events";
import type { LoginPageStart } from "@/types/auth/login-page";
import type { UiRouteInput } from "@/types/migration-routes";
import { demoHomePath, safeDemoReturnTo } from "@/utils/demo-return-to";
import { withGeoProject } from "@/utils/geo-paths";
import {
  marketingAttributionServerSearchParams,
  marketingAttributionServerUrlKeys,
} from "@/utils/marketing-attribution.server";

export const loadAppEntry = createServerFn({ method: "GET" })
  .inputValidator((data: UiRouteInput) => data)
  .handler(async ({ data: { searchParams } }) => {
    const session = await getSession();
    if (!session?.user) {
      throw redirect({ href: "/login" });
    }
    const organization = await getLastActiveOrganization();
    if (!organization) {
      throw redirect({ href: "/onboarding" });
    }
    if (!isDemoMode()) {
      throw redirect({
        href: withGeoProject(`/${organization.slug}`, organization.projectId),
      });
    }
    const home = withGeoProject(
      demoHomePath(organization.slug),
      organization.projectId
    );
    throw redirect({
      href: serializeDemoTheme(home, {
        [DEMO_THEME_PARAM]: demoThemeParser.parse(
          String(searchParams[DEMO_THEME_PARAM])
        ),
      }),
    });
  });

export const loadGuestAccess = createServerFn({ method: "GET" }).handler(
  async () => {
    const session = await getSession();
    if (!session?.user) {
      return null;
    }
    const organization = await getLastActiveOrganization();
    throw redirect({
      href: organization
        ? withGeoProject(`/${organization.slug}`, organization.projectId)
        : "/onboarding",
    });
  }
);

export const loadLogin = createServerFn({ method: "GET" })
  .inputValidator((data: UiRouteInput) => data)
  .handler(async ({ data: { searchParams } }) => {
    const read = (key: string) =>
      typeof searchParams[key] === "string" ? searchParams[key] : undefined;
    const returnTo = read("returnTo");
    const verify = read("verify");
    const email = read("email");
    const mfa = read(LOGIN_MFA_QUERY_KEY);
    const knownErrorKey = LOGIN_ERROR_KEYS.find((key) => key === read("error"));
    const start: LoginPageStart = {};
    if (mfa) {
      const flow = await readPendingMfaFlow(mfa);
      if (flow?.kind === "challenge") {
        const { kind: _kind, ...challenge } = flow;
        start.pending = { status: "mfa-required", ...challenge };
      } else if (flow?.kind === "enrollment") {
        start.resumeEnrollmentFlowId = mfa;
      }
    }
    if (!start.pending && !start.resumeEnrollmentFlowId && verify) {
      start.pending = {
        status: "verification-required",
        pendingAuthenticationToken: verify,
        email: email ?? "",
      };
    }
    const t = await getTranslations("auth.loginErrors");
    let initialError: string | undefined;
    if (knownErrorKey === "social-sign-in-failed") {
      initialError = t("socialSignInFailed");
    } else if (knownErrorKey) {
      initialError = t("externalLoginFailed");
    }
    return {
      ...start,
      returnTo,
      knownErrorKey,
      initialError,
    };
  });

export const loadDemoEntry = createServerFn({ method: "GET" })
  .inputValidator((data: UiRouteInput) => data)
  .handler(async ({ data: { searchParams } }) => {
    if (!isDemoMode()) {
      throw notFound();
    }
    const target = safeDemoReturnTo(
      typeof searchParams.returnTo === "string"
        ? searchParams.returnTo
        : undefined
    );
    if (await getCurrentDemoSandbox()) {
      throw redirect({ href: target ?? "/" });
    }
    return { returnTo: target };
  });

export const loadIntegrationEntry = createServerFn({ method: "GET" })
  .inputValidator((data: UiRouteInput) => data)
  .handler(async ({ data: { params } }) => {
    const resolution = await Effect.runPromise(
      resolveIntegrationConnectDeeplink(params.integrationSlug ?? "")
    );
    if (resolution.kind === "not-found") {
      throw notFound();
    }
    throw redirect({ href: resolution.path });
  });

export const loadLegacyApiKeys = createServerFn({ method: "GET" }).handler(
  async () => {
    const slug = getCookie(LAST_VISITED_ORGANIZATION_COOKIE);
    if (slug && /^[a-z0-9-]+$/.test(slug)) {
      throw redirect({ href: `/${slug}/api-keys` });
    }
    throw notFound();
  }
);

export const loadAuthCallback = createServerFn({ method: "GET" })
  .inputValidator((data: UiRouteInput) => data)
  .handler(async ({ data: { searchParams } }) => {
    const session = await getSession();
    const requestHeaders = getRequestHeaders();
    const loadAttribution = createLoader(
      marketingAttributionServerSearchParams,
      { urlKeys: marketingAttributionServerUrlKeys }
    );
    const serializeAttribution = createSerializer(
      marketingAttributionServerSearchParams,
      { urlKeys: marketingAttributionServerUrlKeys }
    );
    const attribution = await loadAttribution(searchParams);
    const userId = session?.user?.id ?? null;
    const trackRouted = (destination: CallbackDestination) =>
      trackServerEvent({
        event: POSTHOG_EVENTS.CALLBACK_ROUTED,
        headers: requestHeaders,
        userId,
        properties: { destination },
      });
    if (!session?.user) {
      if (await isSessionBanned()) {
        trackRouted(CALLBACK_DESTINATIONS.BANNED);
        throw redirect({ href: "/auth/banned" });
      }
      trackRouted(CALLBACK_DESTINATIONS.LOGIN);
      throw redirect({ href: "/login" });
    }
    if (
      attribution.dbSource ||
      attribution.dbLandingPageH1Variant ||
      attribution.signupMethod
    ) {
      setPersonProperties({
        userId: session.user.id,
        setOnce: {
          db_source: attribution.dbSource ?? undefined,
          landing_page_h1_variant:
            attribution.dbLandingPageH1Variant ?? undefined,
          signup_method_param: attribution.signupMethod ?? undefined,
        },
      });
    }
    let returnTo = searchParams.returnTo;
    if (typeof returnTo === "string" && returnTo) {
      try {
        returnTo = decodeURIComponent(returnTo);
      } catch {
        returnTo = searchParams.returnTo;
      }
      if (
        typeof returnTo === "string" &&
        returnTo.startsWith("/") &&
        !returnTo.startsWith("//") &&
        !returnTo.includes("\\")
      ) {
        trackRouted(CALLBACK_DESTINATIONS.RETURN_TO);
        throw redirect({ href: returnTo });
      }
    }
    const organization = await getLastActiveOrganization();
    if (!organization) {
      trackRouted(CALLBACK_DESTINATIONS.ONBOARDING);
      throw redirect({
        href: serializeAttribution("/onboarding", attribution),
      });
    }
    trackRouted(CALLBACK_DESTINATIONS.DASHBOARD);
    throw redirect({
      href: withGeoProject(`/${organization.slug}`, organization.projectId),
    });
  });
