import {
  webSearchInputSchema,
  webSearchOutputSchema,
} from "@notra/schemas/dashboard/ai/chat-tool-block";
import { getToolName, isToolUIPart } from "ai";

import { SEARCH_TOOL_NAMES } from "@/constants/chat-activity";
import type {
  AssistantMessagePart,
  ChatSearchSource,
} from "@/types/chat-activity";

const WWW_PREFIX = /^www\./;
const SEARCH_TOOL_NAME_SET = new Set<string>(SEARCH_TOOL_NAMES);

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function hostnameFromUrl(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(WWW_PREFIX, "") || undefined;
  } catch {
    return undefined;
  }
}

function sourceFromUnknown(value: unknown): ChatSearchSource | undefined {
  const record = asRecord(value);
  if (!record) {
    return undefined;
  }

  const url = typeof record.url === "string" ? record.url : undefined;
  const title = typeof record.title === "string" ? record.title.trim() : "";
  const domain =
    (typeof record.domain === "string" ? record.domain : undefined) ??
    (url ? hostnameFromUrl(url) : undefined);

  if (!url && !title) {
    return undefined;
  }

  return {
    url,
    title: title || domain || url || "Source",
    domain,
  };
}

function sourcesFromList(values: unknown[] | undefined): ChatSearchSource[] {
  if (!values) {
    return [];
  }

  const sources: ChatSearchSource[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const source = sourceFromUnknown(value);
    if (!source) {
      continue;
    }
    const key = source.url ?? source.title;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    sources.push(source);
  }
  return sources;
}

export function isSearchToolPart(part: AssistantMessagePart): boolean {
  if (!isToolUIPart(part)) {
    return false;
  }
  return SEARCH_TOOL_NAME_SET.has(getToolName(part));
}

export function getSearchQuery(input: unknown): string | undefined {
  const parsed = webSearchInputSchema.safeParse(input);
  const query = parsed.success ? parsed.data.query?.trim() : undefined;
  return query || undefined;
}

export function getSearchSources(output: unknown): ChatSearchSource[] {
  const parsed = webSearchOutputSchema.safeParse(output);
  if (!parsed.success) {
    return [];
  }

  if (parsed.data.results) {
    return sourcesFromList(parsed.data.results);
  }

  if (Array.isArray(parsed.data.data)) {
    return sourcesFromList(parsed.data.data);
  }

  const data = parsed.data.data;
  return sourcesFromList(
    [data?.web, data?.news].flatMap((group) =>
      Array.isArray(group) ? group : []
    )
  );
}

export function uniqueSearchSources(
  sources: ChatSearchSource[]
): ChatSearchSource[] {
  const unique: ChatSearchSource[] = [];
  const seen = new Set<string>();
  for (const source of sources) {
    const key = source.url ?? source.title;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(source);
  }
  return unique;
}

export function getSearchRowLabel(
  query: string | undefined,
  isRowStreaming: boolean,
  isStackStreaming: boolean
): string {
  if (query) {
    return isRowStreaming
      ? `Searching web for ${query}`
      : `Searched web for ${query}`;
  }
  return isStackStreaming ? "Searching web" : "Searched web";
}

export function getSearchStackLabel(
  count: number,
  isStreaming: boolean
): string {
  if (isStreaming) {
    return count === 1 ? "Searching web" : `Running ${count} searches`;
  }
  return count === 1 ? "Ran 1 search" : `Ran ${count} searches`;
}
