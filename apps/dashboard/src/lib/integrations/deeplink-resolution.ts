import {
  getLiveMcpStoreIntegrationById,
  getLiveMcpStoreIntegrationBySlug,
} from "@notra/ai/integrations/mcp-store";
import { storeIntegrationDeeplinkSlugSchema } from "@notra/schemas/dashboard/integrations";
import { Effect } from "effect";

import { getLastActiveOrganization, getSession } from "@/lib/auth/actions";
import {
  buildIntegrationConnectLoginUrl,
  buildOrganizationIntegrationConnectPath,
  buildOrganizationIntegrationsPath,
  decodeIntegrationSlugParam,
} from "@/lib/integrations/deeplink";
import type {
  IntegrationConnectResolution,
  OrganizationIntegrationConnectParams,
  OrganizationIntegrationConnectResolution,
} from "@/types/integrations/deeplink";

export const resolveIntegrationConnectDeeplink = Effect.fn(
  "resolveIntegrationConnectDeeplink"
)(function* (integrationSlugParam: string) {
  const parsed = storeIntegrationDeeplinkSlugSchema.safeParse(
    decodeIntegrationSlugParam(integrationSlugParam)
  );

  if (!parsed.success) {
    return { kind: "not-found" } satisfies IntegrationConnectResolution;
  }

  const session = yield* Effect.promise(() => getSession());

  if (!session?.user) {
    return {
      kind: "redirect",
      path: buildIntegrationConnectLoginUrl(parsed.data),
    } satisfies IntegrationConnectResolution;
  }

  const organization = yield* Effect.promise(() => getLastActiveOrganization());

  if (!organization) {
    return {
      kind: "redirect",
      path: "/onboarding",
    } satisfies IntegrationConnectResolution;
  }

  return {
    kind: "redirect",
    path: buildOrganizationIntegrationConnectPath(
      organization.slug,
      parsed.data
    ),
  } satisfies IntegrationConnectResolution;
});

export const resolveOrganizationIntegrationConnect = Effect.fn(
  "resolveOrganizationIntegrationConnect"
)(function* ({
  organizationSlug,
  integrationSlugParam,
}: OrganizationIntegrationConnectParams) {
  const integrationsPath = buildOrganizationIntegrationsPath(organizationSlug);
  const parsed = storeIntegrationDeeplinkSlugSchema.safeParse(
    decodeIntegrationSlugParam(integrationSlugParam)
  );

  if (!parsed.success) {
    return {
      kind: "redirect",
      path: integrationsPath,
    } satisfies OrganizationIntegrationConnectResolution;
  }

  const listingBySlug = yield* Effect.promise(() =>
    getLiveMcpStoreIntegrationBySlug(parsed.data)
  );
  const listing =
    listingBySlug ??
    (yield* Effect.promise(() => getLiveMcpStoreIntegrationById(parsed.data)));

  if (!listing) {
    return {
      kind: "redirect",
      path: integrationsPath,
    } satisfies OrganizationIntegrationConnectResolution;
  }

  return {
    kind: "render",
    connectSlug: parsed.data,
  } satisfies OrganizationIntegrationConnectResolution;
});
