import { queryOptions } from "@tanstack/react-query";

import { dashboardOrpcClient } from "@/lib/orpc/client";

export function chatHistoryQueryOptions(
  organizationId: string,
  chatId: string | undefined
) {
  return queryOptions({
    queryKey: ["chat-history", organizationId, chatId],
    queryFn: async ({ signal }) => {
      if (!chatId) {
        return null;
      }
      const data = await dashboardOrpcClient.chat.sessions.get(
        { organizationId, chatId },
        { signal }
      );
      return data;
    },
    enabled: Boolean(organizationId && chatId),
    staleTime: 1000 * 60 * 5,
  });
}
