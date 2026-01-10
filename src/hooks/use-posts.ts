"use client";

import { usePaginatedQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

const DEFAULT_LIMIT = 12;

export function usePosts(organizationId: string) {
  const { results, status, loadMore, isLoading } = usePaginatedQuery(
    api.posts.list,
    organizationId ? { organizationId } : "skip",
    { initialNumItems: DEFAULT_LIMIT }
  );

  return {
    data: results
      ? {
          pages: [
            {
              posts: results.map((post) => ({
                ...post,
                id: post._id,
                createdAt: new Date(post._creationTime).toISOString(),
                updatedAt: new Date(post.updatedAt).toISOString(),
              })),
            },
          ],
        }
      : undefined,
    isLoading,
    isFetchingNextPage: status === "LoadingMore",
    hasNextPage: status === "CanLoadMore",
    fetchNextPage: () => loadMore(DEFAULT_LIMIT),
    status,
  };
}
