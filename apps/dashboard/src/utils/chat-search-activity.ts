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
import { isFailedToolOutput } from "@/utils/chat-tool-output";

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

function httpUrl(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function sourceFromUnknown(value: unknown): ChatSearchSource | undefined {
  const record = asRecord(value);
  if (!record) {
    return undefined;
  }

  const rawUrl = typeof record.url === "string" ? record.url : undefined;
  const url = rawUrl ? httpUrl(rawUrl) : undefined;
  if (rawUrl && !url) {
    return undefined;
  }
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

const PRIVATE_DOMAIN_SUFFIX = /\.(?:local|internal|lan|home|corp|localhost)$/i;
const IPV4_HOST = /^(?:\d{1,3}\.){3}\d{1,3}$/;

export function isPublicSearchDomain(
  domain: string | undefined
): domain is string {
  if (!domain) {
    return false;
  }

  const host = domain.trim().replace(/\.$/, "").toLowerCase();
  if (!host.includes(".") || host.includes(":")) {
    return false;
  }
  return !PRIVATE_DOMAIN_SUFFIX.test(host) && !IPV4_HOST.test(host);
}

export function isStackableSearchPart(part: AssistantMessagePart): boolean {
  if (!isSearchToolPart(part) || !isToolUIPart(part)) {
    return false;
  }
  if (part.state === "output-error") {
    return false;
  }
  return !(
    part.state === "output-available" && isFailedToolOutput(part.output)
  );
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
