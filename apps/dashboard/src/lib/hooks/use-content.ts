"use client";

import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/utils/query-keys";
import type { ContentResponse } from "@/utils/schemas/content";

interface ContentApiResponse {
  content: ContentResponse;
}

export function useContent(organizationId: string, contentId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.CONTENT.detail(organizationId, contentId),
    queryFn: async (): Promise<ContentApiResponse> => {
      const res = await fetch(
        `/api/organizations/${organizationId}/content/${contentId}`
      );
      if (!res.ok) {
        throw new Error("Failed to fetch content");
      }
      return res.json();
    },
    enabled: !!organizationId && !!contentId,
  });
}
