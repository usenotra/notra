import { createRouterClient } from "@orpc/server";
import { dehydrate } from "@tanstack/react-query";

import { COLLECTIONS_PAGE_SIZE } from "@/constants/content-collections";
import { geoDbQueryKey } from "@/lib/db/geo-collections";
import { createORPCContext } from "@/lib/orpc/context";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { LoadedMembership } from "@/types/auth/organization";
import { getGeoServerQueryClient } from "@/utils/geo-query-client.server";
import { seedMembership } from "@/utils/seed-membership.server";

function routerContext(requestHeaders: Headers) {
  return () => createORPCContext({ headers: requestHeaders });
}

// Routers load with the page that needs them: importing all four (the GEO
// engines, the Linear SDK, …) for any one page slowed every cold start.
const loadContentRouter = () =>
  import("@/lib/orpc/routers/content").then((module) => module.contentRouter);
const loadGeoRouter = () =>
  import("@/lib/orpc/routers/geo").then((module) => module.geoRouter);
const loadIntegrationsRouter = () =>
  import("@/lib/orpc/routers/integrations").then(
    (module) => module.integrationsRouter
  );
const loadSkillsRouter = () =>
  import("@/lib/orpc/routers/skills").then((module) => module.skillsRouter);

/**
 * Loads the content list (and starts the project collection it scopes) on
 * the server, so the browser reuses this work instead of waiting for
 * hydration and then a second round trip.
 */
export async function dehydrateContentListQueries(
  organizationId: string,
  projectId: string | undefined,
  page: number,
  requestHeaders: Headers,
  membership?: LoadedMembership
) {
  const [contentRouter, geoRouter] = await Promise.all([
    loadContentRouter(),
    loadGeoRouter(),
    seedMembership(organizationId, requestHeaders, membership),
  ]);
  const client = createRouterClient(
    { content: contentRouter, geo: geoRouter },
    { context: routerContext(requestHeaders) }
  );
  const queryClient = getGeoServerQueryClient();
  const organizationInput = { organizationId };
  const listInput = {
    organizationId,
    projectId,
    page,
    pageSize: COLLECTIONS_PAGE_SIZE,
  };

  void queryClient.prefetchQuery({
    queryKey: geoDbQueryKey("projects", organizationInput),
    queryFn: async () =>
      (await client.geo.projectsList(organizationInput)).projects,
  });
  // Awaited (the route streams, so the shell does not wait): the list is in
  // the server HTML instead of rendering only after the client hydrates.
  await queryClient.prefetchQuery({
    ...dashboardOrpc.content.collections.list.queryOptions({
      input: listInput,
    }),
    queryFn: () => client.content.collections.list(listInput),
  });

  return dehydrate(queryClient);
}

export async function dehydrateIntegrationsQueries(
  organizationId: string,
  requestHeaders: Headers,
  membership?: LoadedMembership
) {
  const [integrationsRouter] = await Promise.all([
    loadIntegrationsRouter(),
    seedMembership(organizationId, requestHeaders, membership),
  ]);
  const client = createRouterClient(
    { integrations: integrationsRouter },
    { context: routerContext(requestHeaders) }
  );
  const queryClient = getGeoServerQueryClient();
  const input = { organizationId };

  // Awaited for the same reason as the content list: the cards render in
  // the server HTML of the streamed route.
  await Promise.all([
    queryClient.prefetchQuery({
      ...dashboardOrpc.integrations.list.queryOptions({ input }),
      queryFn: () => client.integrations.list(input),
    }),
    queryClient.prefetchQuery({
      ...dashboardOrpc.integrations.mcp.list.queryOptions({ input }),
      queryFn: () => client.integrations.mcp.list(input),
    }),
    queryClient.prefetchQuery({
      ...dashboardOrpc.integrations.mcp.storeList.queryOptions({ input }),
      queryFn: () => client.integrations.mcp.storeList(input),
    }),
  ]);

  return dehydrate(queryClient);
}

export async function dehydrateSkillsQueries(
  organizationId: string,
  requestHeaders: Headers,
  membership?: LoadedMembership
) {
  const [skillsRouter] = await Promise.all([
    loadSkillsRouter(),
    seedMembership(organizationId, requestHeaders, membership),
  ]);
  const client = createRouterClient(
    { skills: skillsRouter },
    { context: routerContext(requestHeaders) }
  );
  const queryClient = getGeoServerQueryClient();
  const input = { organizationId };

  // The list is small. Wait for it so the first HTML includes the cards.
  // Dehydrating a still-pending query made the browser start a second request
  // after the page's client bundle hydrated.
  await queryClient.prefetchQuery({
    ...dashboardOrpc.skills.list.queryOptions({ input }),
    queryFn: () => client.skills.list(input),
  });

  return dehydrate(queryClient);
}

export async function dehydrateSkillDetailQuery(
  organizationId: string,
  name: string,
  requestHeaders: Headers,
  membership?: LoadedMembership
) {
  const [skillsRouter] = await Promise.all([
    loadSkillsRouter(),
    seedMembership(organizationId, requestHeaders, membership),
  ]);
  const client = createRouterClient(
    { skills: skillsRouter },
    { context: routerContext(requestHeaders) }
  );
  const queryClient = getGeoServerQueryClient();
  const input = { organizationId, name };

  await queryClient.prefetchQuery({
    ...dashboardOrpc.skills.getByName.queryOptions({ input }),
    queryFn: () => client.skills.getByName(input),
  });

  return dehydrate(queryClient);
}
