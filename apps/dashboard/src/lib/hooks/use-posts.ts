"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/utils/query-keys";
import type { PostsResponse } from "@/utils/schemas/content";

const DEFAULT_LIMIT = 12;

export function usePosts(organizationId: string) {
  return useInfiniteQuery({
    queryKey: QUERY_KEYS.POSTS.list(organizationId),
    queryFn: async ({ pageParam }): Promise<PostsResponse> => {
      const params = new URLSearchParams({
        limit: String(DEFAULT_LIMIT),
      });

      if (pageParam) {
        params.set("cursor", pageParam);
      }

      const res = await fetch(
        `/api/organizations/${organizationId}/posts?${params.toString()}`
      );

      if (!res.ok) {
        throw new Error("Failed to fetch posts");
      }

      return res.json();
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!organizationId,
  });
}
