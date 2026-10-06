"use client";

import { preloadHighlighter } from "@pierre/diffs";
import { useQuery } from "@tanstack/react-query";

import { SITE_CODE_LANGUAGES, SITE_CODE_THEME } from "@/constants/site-editor";

export function useSiteCodeHighlighter(): boolean {
  const query = useQuery({
    queryKey: ["sites", "code-highlighter"],
    queryFn: async () => {
      await preloadHighlighter({
        themes: [SITE_CODE_THEME.light, SITE_CODE_THEME.dark],
        langs: [...SITE_CODE_LANGUAGES],
      });
      return true;
    },
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    retry: false,
  });
  return query.isSuccess || query.isError;
}
