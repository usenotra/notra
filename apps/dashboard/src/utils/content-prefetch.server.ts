import { createRouterClient } from "@orpc/server";
import { dehydrate } from "@tanstack/react-query";

import { CONTENT_COLLECTION_PAGE_SIZE } from "@/constants/content-collections";
import { createORPCContext } from "@/lib/orpc/context";
import { dashboardOrpc } from "@/lib/orpc/query";
import { contentRouter } from "@/lib/orpc/routers/content";
import type { OrganizationMembership } from "@/types/auth/organization";
import { getGeoServerQueryClient } from "@/utils/geo-query-client.server";

async function contentQueryClient(
  requestHeaders: Headers,
  organizationId: string,
  membership?: OrganizationMembership & { userId: string }
) {
  if (membership) {
    const { requestMemo } = await createORPCContext({
      headers: requestHeaders,
    });
    requestMemo.membershipByUserOrganization.set(
      `${membership.userId}:${organizationId}`,
      Promise.resolve({ id: membership.id, role: membership.role })
    );
  }

  const client = createRouterClient(
    { content: contentRouter },
    { context: () => createORPCContext({ headers: requestHeaders }) }
  );
  return { client, queryClient: getGeoServerQueryClient() };
}

export async function dehydrateContentDetailQueries(
  organizationId: string,
  contentId: string,
  requestHeaders: Headers,
  membership?: OrganizationMembership & { userId: string }
) {
  const { client, queryClient } = await contentQueryClient(
    requestHeaders,
    organizationId,
    membership
  );
  const input = { organizationId, contentId };

  void queryClient.prefetchQuery({
    ...dashboardOrpc.content.get.queryOptions({ input }),
    queryFn: () => client.content.get(input),
  });

  return dehydrate(queryClient);
}

export async function dehydrateContentListQueries(
  organizationId: string,
  projectId: string | undefined,
  page: number,
  requestHeaders: Headers,
  membership?: OrganizationMembership & { userId: string }
) {
  const { client, queryClient } = await contentQueryClient(
    requestHeaders,
    organizationId,
    membership
  );
  const input = {
    organizationId,
    projectId,
    page,
    pageSize: CONTENT_COLLECTION_PAGE_SIZE,
  };

  void queryClient.prefetchQuery({
    ...dashboardOrpc.content.collections.list.queryOptions({ input }),
    queryFn: () => client.content.collections.list(input),
  });

  return dehydrate(queryClient);
}

export async function dehydrateCollectionQueries(
  organizationId: string,
  collectionId: string,
  requestHeaders: Headers,
  membership?: OrganizationMembership & { userId: string }
) {
  const { client, queryClient } = await contentQueryClient(
    requestHeaders,
    organizationId,
    membership
  );
  const input = { organizationId, collectionId };

  void queryClient.prefetchQuery({
    ...dashboardOrpc.content.collections.get.queryOptions({ input }),
    queryFn: () => client.content.collections.get(input),
  });

  return dehydrate(queryClient);
}
