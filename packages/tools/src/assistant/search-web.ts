import { isContextDevConfigured, searchWeb } from "@notra/ai/utils/context-dev";
import { defineTool } from "eve/tools";

import { searchWebInputSchema } from "../schemas/assistant-tools";

export function createSearchWebTool() {
  return defineTool({
    description:
      "Search the live web with Context.dev and return source-aware results. Use when public, current, or external context would improve accuracy, including docs, news, competitors, market context, or fact checking. Prefer limit: 5 for discovery.",
    inputSchema: searchWebInputSchema,
    async execute(input) {
      if (!isContextDevConfigured()) {
        return {
          success: false,
          error:
            "Context.dev is not configured. Set CONTEXT_DEV_API_KEY to use web search.",
        };
      }
      return await searchWeb(input);
    },
  });
}
