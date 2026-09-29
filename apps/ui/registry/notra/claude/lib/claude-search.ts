import {
  CLAUDE_SEARCH_QUERY_MS,
  CLAUDE_SEARCH_RESULTS_MS,
  CLAUDE_SEARCH_STEP_MS,
  CLAUDE_SEARCH_VERB_HOLD_MS,
} from "../constants/claude";
import type {
  ClaudeDemoSearch,
  ClaudeSearchGroup,
  ClaudeStepItem,
} from "../types/claude";

export const claudeSearchDuration = (
  search: ClaudeDemoSearch,
  reducedMotion: boolean
): number => {
  if (reducedMotion) {
    return 0;
  }

  const items = search.items ?? [];
  const toolCount =
    search.groups.length + items.filter((item) => item.type === "tool").length;
  const stepCount =
    (search.steps?.length ?? 0) +
    items.filter((item) => item.type !== "tool").length +
    (search.thought ? 1 : 0);

  return (
    CLAUDE_SEARCH_VERB_HOLD_MS +
    toolCount * (CLAUDE_SEARCH_QUERY_MS + CLAUDE_SEARCH_RESULTS_MS) +
    stepCount * CLAUDE_SEARCH_STEP_MS
  );
};

export const claudeFaviconSrc = (domain: string): string =>
  `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;

export const claudeWait = (ms: number): Promise<void> =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });

export const claudeStepSummary = (
  items: readonly ClaudeStepItem[],
  groups: readonly ClaudeSearchGroup[] = []
): string => {
  const tools = new Set<string>();
  let searched = groups.length > 0;
  for (const item of items) {
    if (item.type !== "tool") {
      continue;
    }
    if (item.results) {
      searched = true;
    } else if (item.tool) {
      tools.add(item.tool);
    }
  }
  const parts: string[] = [];
  if (tools.size > 0) {
    parts.push(`Used ${[...tools].join(", ")}`);
  }
  if (searched) {
    parts.push(tools.size > 0 ? "searched the web" : "Searched the web");
  }
  return parts.join(", ");
};
