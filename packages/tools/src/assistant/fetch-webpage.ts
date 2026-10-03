import {
  fetchWebpage,
  isContextDevConfigured,
} from "@notra/ai/utils/context-dev";
import { defineTool } from "eve/tools";

import { fetchWebpageInputSchema } from "../schemas/assistant-tools";

export function createFetchWebpageTool() {
  return defineTool({
    description:
      "Fetch a specific public webpage URL with Context.dev and return LLM-ready markdown. Use when the user provides a URL and asks to read, fetch, browse, inspect, summarize, or extract content from that page.",
    inputSchema: fetchWebpageInputSchema,
    async execute(input) {
      if (!isContextDevConfigured()) {
        return {
          success: false,
          error:
            "Context.dev is not configured. Set CONTEXT_DEV_API_KEY to fetch webpages.",
        };
      }
      return await fetchWebpage(input);
    },
  });
}
