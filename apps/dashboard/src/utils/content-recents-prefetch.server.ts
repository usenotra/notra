import type { QueryClient } from "@tanstack/react-query";

import { dashboardOrpc } from "@/lib/orpc/query";
import { recentPostsQueryInput } from "@/utils/recent-posts-query";

export function prefetchRecentPostsQuery(
  queryClient: QueryClient,
  recents: (
    input: ReturnType<typeof recentPostsQueryInput>
  ) => Promise<unknown>,
  organizationId: string,
  projectId: string | undefined
) {
  const input = recentPostsQueryInput(organizationId, projectId);
  void queryClient.prefetchQuery({
    ...dashboardOrpc.content.recents.queryOptions({ input }),
    queryFn: () => recents(input),
  });
}
