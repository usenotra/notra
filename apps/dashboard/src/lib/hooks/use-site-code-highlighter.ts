"use client";

import { preloadHighlighter } from "@pierre/diffs";
import { useQuery } from "@tanstack/react-query";

import { SITE_CODE_LANGUAGES, SITE_CODE_THEME } from "@/constants/site-editor";

/**
 * Shiki loads the grammars MDX embeds (frontmatter, JSX, code fences) lazily, and Pierre
 * only resolves the file's own language. Loading them up front keeps imports and
 * frontmatter highlighted from the first render. True once the highlighter is ready.
 */
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
  // A failed preload still renders: Pierre then highlights what it can.
  return query.isSuccess || query.isError;
}
