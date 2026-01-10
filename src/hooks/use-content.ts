"use client";

import { useQuery } from "convex/react";
import type { ContentResponse } from "@/utils/schemas/content";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

interface ContentApiResponse {
  content: ContentResponse;
}

export function useContent(_organizationId: string, contentId: string) {
  const data = useQuery(
    api.posts.get,
    contentId ? { postId: contentId as Id<"posts"> } : "skip"
  );

  const content: ContentApiResponse | undefined = data
    ? {
        content: {
          id: data._id,
          title: data.title,
          content: data.content,
          markdown: data.markdown,
          contentType: data.contentType as
            | "changelog"
            | "blog_post"
            | "twitter_post"
            | "linkedin_post"
            | "investor_update",
          date: new Date(data._creationTime).toISOString(),
        },
      }
    : undefined;

  return {
    data: content,
    isLoading: data === undefined && !!contentId,
    error: null,
  };
}
