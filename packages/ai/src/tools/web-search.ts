import type {
  ContextDevFetchWebpageInput,
  ContextDevWebSearchInput,
} from "@notra/ai/types/context-dev";
import { fetchWebpage, searchWeb } from "@notra/ai/utils/context-dev";
import { toolDescription } from "@notra/ai/utils/description";
import { type Tool, tool } from "ai";
import z from "zod";

export const WEB_SEARCH_TOOL_NAME = "webSearch";
export const FETCH_WEBPAGE_TOOL_NAME = "fetchWebpage";

export function isWebSearchAvailable(): boolean {
  return Boolean(process.env.CONTEXT_DEV_API_KEY?.trim());
}

const webSearchInputSchema: z.ZodType<ContextDevWebSearchInput> = z.object({
  query: z.string().min(1).describe("The web search query."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(5)
    .describe("Maximum number of results to return. Prefer 5 by default."),
  includeDomains: z
    .array(z.string().min(1))
    .optional()
    .describe("Optional list of domains to include."),
  excludeDomains: z
    .array(z.string().min(1))
    .optional()
    .describe("Optional list of domains to exclude."),
  freshness: z
    .enum(["last_24_hours", "last_week", "last_month", "last_year"])
    .optional()
    .describe("Optional freshness window for recently published content."),
  queryFanout: z
    .boolean()
    .optional()
    .describe("Expand the query into parallel variants for broader recall."),
  timeoutMS: z
    .number()
    .int()
    .min(1000)
    .max(300_000)
    .default(60_000)
    .describe("Search timeout in milliseconds."),
  scrapeOptions: z
    .object({
      formats: z
        .array(
          z.enum(["markdown", "html", "rawHtml", "links", "images", "summary"])
        )
        .optional(),
      onlyMainContent: z.boolean().optional(),
      maxAge: z.number().int().positive().optional(),
    })
    .optional()
    .describe("Optional scrape options when full page markdown is needed."),
});

const fetchWebpageInputSchema: z.ZodType<ContextDevFetchWebpageInput> =
  z.object({
    url: z
      .string()
      .url()
      .describe("The full public HTTP or HTTPS URL to fetch."),
    includeLinks: z
      .boolean()
      .default(true)
      .describe("Preserve hyperlinks in the returned markdown."),
    includeImages: z
      .boolean()
      .default(false)
      .describe("Include image references in the returned markdown."),
    onlyMainContent: z
      .boolean()
      .default(true)
      .describe("Extract only the primary page content when possible."),
    maxAgeMs: z
      .number()
      .int()
      .min(0)
      .max(2_592_000_000)
      .optional()
      .describe("Maximum cache age in milliseconds."),
    waitForMs: z
      .number()
      .int()
      .min(0)
      .max(30_000)
      .optional()
      .describe("Optional browser wait time after page load in milliseconds."),
    timeoutMS: z
      .number()
      .int()
      .min(1000)
      .max(300_000)
      .default(60_000)
      .describe("Fetch timeout in milliseconds."),
  });

export function createWebSearchTool(): Tool {
  return tool({
    description: toolDescription({
      toolName: WEB_SEARCH_TOOL_NAME,
      intro:
        "Search the live web with Context.dev and return source-aware results.",
      whenToUse:
        "Use when public, current, or external context would improve accuracy, including docs, news, competitors, market context, or fact checking.",
      usageNotes:
        "Prefer limit: 5 for discovery. Use includeDomains, excludeDomains, freshness, or scrapeOptions when the user asks for a specific source type, time window, or full page content. Results include titles, URLs, descriptions, and optional scraped markdown.",
    }),
    inputSchema: webSearchInputSchema,
    execute: async (input) => searchWeb(input),
  });
}

export function createUnavailableWebSearchTool(): Tool {
  return tool({
    description: toolDescription({
      toolName: WEB_SEARCH_TOOL_NAME,
      intro:
        "Explain that live web search is unavailable because Context.dev is not configured.",
      whenToUse:
        "Use when the user asks to search the web and Context.dev API credentials are missing.",
      usageNotes:
        "Return the configuration error. Do not claim that no web-search tool exists.",
    }),
    inputSchema: webSearchInputSchema,
    execute: async () => ({
      success: false,
      error:
        "Context.dev is not configured. Set CONTEXT_DEV_API_KEY to use web search.",
    }),
  });
}

export function createFetchWebpageTool(): Tool {
  return tool({
    description: toolDescription({
      toolName: FETCH_WEBPAGE_TOOL_NAME,
      intro:
        "Fetch a specific public webpage URL with Context.dev and return LLM-ready markdown.",
      whenToUse:
        "Use when the user provides a URL and asks to read, fetch, browse, inspect, summarize, or extract content from that page.",
      usageNotes:
        "Pass the exact URL. Use onlyMainContent: true by default for article, docs, marketing, and company pages. The result includes markdown, source URL, and page metadata when available.",
    }),
    inputSchema: fetchWebpageInputSchema,
    execute: async (input) => fetchWebpage(input),
  });
}

export function createUnavailableFetchWebpageTool(): Tool {
  return tool({
    description: toolDescription({
      toolName: FETCH_WEBPAGE_TOOL_NAME,
      intro:
        "Explain that webpage fetching is unavailable because Context.dev is not configured.",
      whenToUse:
        "Use when the user asks to fetch or read a URL and Context.dev API credentials are missing.",
      usageNotes:
        "Return the configuration error. Do not claim that no webpage-fetching tool exists.",
    }),
    inputSchema: fetchWebpageInputSchema,
    execute: async () => ({
      success: false,
      error:
        "Context.dev is not configured. Set CONTEXT_DEV_API_KEY to fetch webpages.",
    }),
  });
}

export const WEB_SEARCH_TOOL_DESCRIPTION =
  "**Web Search**: Search the live web using webSearch for current facts, public docs, news, competitive context, and source-aware research. Prefer limit: 5 unless the user asks for broader coverage. Use result titles, URLs, descriptions, and scraped markdown for citations or follow-up research. Requires Context.dev API configuration to return live data.";

export const FETCH_WEBPAGE_TOOL_DESCRIPTION =
  "**Fetch Webpage**: Fetch a specific public URL using fetchWebpage and return clean markdown plus metadata. Use this when the user provides a URL and asks to read, browse, summarize, inspect, or extract from that page. Requires Context.dev API configuration to return live data.";

export function registerWebSearchTools(
  tools: Record<string, Tool>,
  descriptions: string[] = []
) {
  const hasContextDev = isWebSearchAvailable();
  tools[FETCH_WEBPAGE_TOOL_NAME] = hasContextDev
    ? createFetchWebpageTool()
    : createUnavailableFetchWebpageTool();
  tools[WEB_SEARCH_TOOL_NAME] = hasContextDev
    ? createWebSearchTool()
    : createUnavailableWebSearchTool();
  descriptions.push(FETCH_WEBPAGE_TOOL_DESCRIPTION);
  descriptions.push(WEB_SEARCH_TOOL_DESCRIPTION);
}
