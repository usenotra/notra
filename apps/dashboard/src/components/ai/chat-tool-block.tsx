"use client";

import { ArrowDown01Icon, CpuIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  commitsByTimeframeInputSchema,
  type MemoryToolInput,
  memoryIdentifierInputSchema,
  memoryIdentifierOutputSchema,
  memoryToolInputSchema,
  pullRequestInputSchema,
  pullRequestOutputSchema,
  releaseInputSchema,
  releaseOutputSchema,
  type StringToolField,
  stringToolFieldsSchema,
  webSearchInputSchema,
  webSearchOutputSchema,
} from "@notra/schemas/dashboard/ai/chat-tool-block";
import { Shimmer } from "@notra/ui/components/ai-elements/shimmer";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@notra/ui/components/ui/avatar";
import { Button } from "@notra/ui/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@notra/ui/components/ui/collapsible";
import { cn } from "@notra/ui/lib/utils";
import { CheckIcon, XIcon } from "lucide-react";
import { type ReactNode, useState } from "react";

import { McpIcon } from "@/components/integrations/mcp-icon";
import { TOOL_TIMER_THRESHOLD_SECONDS } from "@/constants/chat-tool-timer";
import { useElapsedSeconds } from "@/lib/hooks/use-elapsed-seconds";
import { formatElapsedSeconds } from "@/utils/format-elapsed-seconds";

import {
  getMcpToolActionPhrase,
  getMcpToolIconUrls,
  getMcpToolLabel,
  isMcpToolName,
} from "./chat-tool-block/mcp/utils";
import { ToolDraftPreview } from "./chat-tool-block/tool-draft-preview";
import { ToolOutputChart } from "./chat-tool-block/tool-output-chart";
import { ToolOutputImages } from "./chat-tool-block/tool-output-images";
import type { ChatToolBlockProps, ToolCopy } from "./chat-tool-block/types";
import { resolveChatToolBlockVisuals } from "./chat-tool-block/visuals";

const TOOL_DETAILS_PANEL_CLASSNAME =
  "h-[var(--collapsible-panel-height)] overflow-hidden outline-none transition-[height,opacity] duration-normal ease-emphasized data-[ending-style]:h-0 data-[starting-style]:h-0 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 motion-reduce:transition-none";

function firstStringValue<T extends object>(
  values: T,
  keys: readonly (keyof T)[]
): string | undefined {
  for (const key of keys) {
    const value = values[key];
    if (typeof value === "string" && value) {
      return value;
    }
  }
  return undefined;
}

function idSuffixFromFields<T extends object>(
  values: T,
  keys: readonly (keyof T)[]
): string | undefined {
  const value = firstStringValue(values, keys);
  return value ? value.slice(0, 8) : undefined;
}

function idSuffix(
  input: unknown,
  keys: readonly StringToolField[]
): string | undefined {
  const parsed = stringToolFieldsSchema.safeParse(input);
  if (!parsed.success) {
    return undefined;
  }
  return idSuffixFromFields(parsed.data, keys);
}

function shortPreview(value: string, maxLength = 72): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 1)}…`;
}

function quotedSuffixFromFields<T extends object>(
  values: T,
  keys: readonly (keyof T)[]
): string | undefined {
  for (const key of keys) {
    const value = values[key];
    if (typeof value === "string" && value) {
      return `"${shortPreview(value)}"`;
    }
  }
  return undefined;
}

function quotedSuffix(
  input: unknown,
  keys: readonly StringToolField[]
): string | undefined {
  const parsed = stringToolFieldsSchema.safeParse(input);
  if (!parsed.success) {
    return undefined;
  }
  return quotedSuffixFromFields(parsed.data, keys);
}

function memoryIdSuffix(input: unknown, output: unknown): string | undefined {
  const parsedInput = memoryIdentifierInputSchema.safeParse(input);
  const parsedOutput = memoryIdentifierOutputSchema.safeParse(output);
  const outputData = parsedOutput.success ? parsedOutput.data : undefined;
  return (
    (parsedInput.success
      ? idSuffixFromFields(parsedInput.data, ["memoryId", "documentId", "id"])
      : undefined) ??
    (outputData
      ? idSuffixFromFields(outputData, ["memoryId", "documentId", "id"])
      : undefined) ??
    outputData?.memory?.id?.slice(0, 8) ??
    outputData?.document?.id?.slice(0, 8)
  );
}

function memoryPathSuffix(input: MemoryToolInput): string | undefined {
  if (input.path && input.new_path) {
    return `${input.path} → ${input.new_path}`;
  }
  return input.path;
}

function memoryToolSubtitle({
  input,
  isStreaming,
}: {
  input: unknown;
  isStreaming: boolean;
}): string | undefined {
  const parsed = memoryToolInputSchema.safeParse(input);
  const command = parsed.success ? parsed.data.command : undefined;
  const suffix = parsed.success
    ? (memoryPathSuffix(parsed.data) ??
      quotedSuffixFromFields(parsed.data, [
        "file_text",
        "insert_text",
        "new_str",
      ]))
    : undefined;

  const withSuffix = (label: string) => (suffix ? `${label} ${suffix}` : label);

  switch (command) {
    case "view":
      return withSuffix(isStreaming ? "Viewing memory" : "Viewed memory");
    case "create":
      return withSuffix(isStreaming ? "Saving memory" : "Saved memory");
    case "delete":
      return withSuffix(isStreaming ? "Deleting memory" : "Deleted memory");
    case "rename":
      return withSuffix(isStreaming ? "Renaming memory" : "Renamed memory");
    case "insert":
    case "str_replace":
      return withSuffix(isStreaming ? "Updating memory" : "Updated memory");
    default:
      return withSuffix(isStreaming ? "Using memory" : "Used memory");
  }
}

function webSearchSuffix(input: unknown, output: unknown): string | undefined {
  const parsedInput = webSearchInputSchema.safeParse(input);
  const query = parsedInput.success
    ? quotedSuffixFromFields(parsedInput.data, ["query"])
    : undefined;
  const count = getWebSearchResultCount(output);
  if (query && count !== undefined) {
    return `for ${query} (${count} ${count === 1 ? "result" : "results"})`;
  }
  return query ? `for ${query}` : undefined;
}

function getWebSearchResultCount(output: unknown): number | undefined {
  const parsed = webSearchOutputSchema.safeParse(output);
  if (!parsed.success) {
    return undefined;
  }

  if (parsed.data.results) {
    return parsed.data.results.length;
  }

  if (Array.isArray(parsed.data.data)) {
    return parsed.data.data.length;
  }

  const data = parsed.data.data;
  const counts = data
    ? [data.web, data.news, data.images]
        .filter((group): group is unknown[] => Boolean(group))
        .map((group) => group.length)
    : [];

  return counts.length
    ? counts.reduce((total, count) => total + count, 0)
    : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function getArrayLength(value: unknown, key: string): number | undefined {
  const array = asRecord(value)?.[key];
  return Array.isArray(array) ? array.length : undefined;
}

function getNumericValue(value: unknown, key: string): number | undefined {
  const number = asRecord(value)?.[key];
  return typeof number === "number" ? number : undefined;
}

function getStringArray(value: unknown, key: string): string[] {
  const array = asRecord(value)?.[key];
  return Array.isArray(array)
    ? array.filter((item): item is string => typeof item === "string")
    : [];
}

function getToolObjectNames(value: unknown, key: string): string[] {
  const array = asRecord(value)?.[key];
  if (!Array.isArray(array)) {
    return [];
  }

  return array
    .map((item) => {
      const record = asRecord(item);
      const name =
        record?.toolName ??
        record?.runtimeToolName ??
        record?.title ??
        record?.serverName;
      return typeof name === "string" ? name : undefined;
    })
    .filter((name): name is string => Boolean(name));
}

function countSuffix(
  count: number | undefined,
  singular: string,
  plural: string
) {
  if (count === undefined) {
    return undefined;
  }
  return `(${count} ${count === 1 ? singular : plural})`;
}

function toolSearchSuffix(input: unknown, output: unknown): string | undefined {
  const query = quotedSuffix(input, ["query"]);
  const count = getArrayLength(output, "results");
  const resultCount = countSuffix(count, "result", "results");
  if (query && resultCount) {
    return `for ${query} ${resultCount}`;
  }
  return query ?? resultCount;
}

function activatedToolsSuffix(output: unknown): string | undefined {
  const names = getToolObjectNames(output, "activated");
  if (names.length === 0) {
    return countSuffix(getArrayLength(output, "activated"), "tool", "tools");
  }
  if (names.length === 1) {
    return names[0];
  }
  return `(${names.length} tools)`;
}

function activeToolsSuffix(output: unknown): string | undefined {
  const names = [
    ...getStringArray(output, "activeTools"),
    ...getToolObjectNames(output, "activeTools"),
  ];
  if (names.length === 0) {
    return countSuffix(getArrayLength(output, "activeTools"), "tool", "tools");
  }
  return `(${names.length} active)`;
}

function deactivatedToolsSuffix(output: unknown): string | undefined {
  return countSuffix(
    getArrayLength(output, "deactivated") ??
      getNumericValue(output, "deactivated") ??
      getArrayLength(output, "removed") ??
      getNumericValue(output, "removed"),
    "tool",
    "tools"
  );
}

function geoDaysSuffix(input: unknown): string | undefined {
  const days = getNumericValue(input, "days");
  return days === undefined ? undefined : `from the last ${days} days`;
}

const TOOL_COPY: Record<string, ToolCopy> = {
  searchNotraTools: {
    verbs: ["Searching", "Searched"],
    noun: "tools",
    suffix: toolSearchSuffix,
  },
  activateNotraTools: {
    verbs: ["Loading", "Loaded"],
    noun: "tool",
    suffix: (_input, output) => activatedToolsSuffix(output),
  },
  listActiveNotraTools: {
    verbs: ["Checking", "Checked"],
    noun: "active tools",
    suffix: (_input, output) => activeToolsSuffix(output),
  },
  deactivateNotraTools: {
    verbs: ["Unloading", "Unloaded"],
    noun: "tools",
    suffix: (_input, output) => deactivatedToolsSuffix(output),
  },
  searchMcpTools: {
    verbs: ["Searching", "Searched"],
    noun: "MCP tools",
    suffix: toolSearchSuffix,
  },
  activateMcpTools: {
    verbs: ["Loading", "Loaded"],
    noun: "MCP tool",
    suffix: (_input, output) => activatedToolsSuffix(output),
  },
  listActiveMcpTools: {
    verbs: ["Checking", "Checked"],
    noun: "active MCP tools",
    suffix: (_input, output) => activeToolsSuffix(output),
  },
  deactivateMcpTools: {
    verbs: ["Unloading", "Unloaded"],
    noun: "MCP tools",
    suffix: (_input, output) => deactivatedToolsSuffix(output),
  },
  getPullRequests: {
    verbs: ["Fetching", "Fetched"],
    noun: "pull request",
    suffix: (input, output) => {
      const parsedOutput = pullRequestOutputSchema.safeParse(output);
      const repo = parsedOutput.success
        ? (parsedOutput.data.repository ?? parsedOutput.data.repo)
        : undefined;
      const number = parsedOutput.success
        ? (parsedOutput.data.number ?? parsedOutput.data.pull_number)
        : undefined;
      if (repo && number !== undefined) {
        return `${repo}#${number}`;
      }
      const parsedInput = pullRequestInputSchema.safeParse(input);
      const pullNumber = parsedInput.success
        ? parsedInput.data.pull_number
        : undefined;
      return pullNumber !== undefined ? `#${pullNumber}` : undefined;
    },
  },
  getReleaseByTag: {
    verbs: ["Fetching", "Fetched"],
    noun: "release",
    suffix: (input, output) => {
      const parsedOutput = releaseOutputSchema.safeParse(output);
      const repo = parsedOutput.success
        ? (parsedOutput.data.repository ?? parsedOutput.data.repo)
        : undefined;
      const tag = parsedOutput.success
        ? (parsedOutput.data.tag_name ?? parsedOutput.data.tag)
        : undefined;
      if (repo && tag) {
        return `${repo} · ${tag}`;
      }
      const parsedInput = releaseInputSchema.safeParse(input);
      return parsedInput.success ? parsedInput.data.tag : undefined;
    },
  },
  getCommitsByTimeframe: {
    verbs: ["Fetching", "Fetched"],
    noun: "commits",
    suffix: (input) => {
      const parsed = commitsByTimeframeInputSchema.safeParse(input);
      const days = parsed.success ? parsed.data.days : undefined;
      return days ? `from the last ${days} days` : undefined;
    },
  },
  getLinearIssues: { verbs: ["Fetching", "Fetched"], noun: "issues" },
  getLinearProjects: { verbs: ["Fetching", "Fetched"], noun: "projects" },
  getLinearCycles: { verbs: ["Fetching", "Fetched"], noun: "cycles" },
  viewPost: {
    verbs: ["Viewing", "Viewed"],
    noun: "post",
    suffix: (input) => idSuffix(input, ["id", "postId"]),
  },
  updatePost: {
    verbs: ["Updating", "Updated"],
    noun: "post",
    suffix: (input) => quotedSuffix(input, ["title"]),
  },
  getAvailablePosts: { verbs: ["Loading", "Loaded"], noun: "posts" },
  getPost: {
    verbs: ["Loading", "Loaded"],
    noun: "post",
    suffix: (input) => idSuffix(input, ["id", "postId", "identifier"]),
  },
  createImage: {
    verbs: ["Generating", "Generated"],
    noun: "image",
    subtitle: ({ isStreaming }) =>
      isStreaming ? "Generating image — usually 3–8 minutes" : undefined,
    suffix: (input) => quotedSuffix(input, ["title"]),
  },
  createBlogPost: {
    verbs: ["Drafting", "Drafted"],
    noun: "blog post",
    suffix: (input) => quotedSuffix(input, ["title"]),
  },
  createChangelog: {
    verbs: ["Drafting", "Drafted"],
    noun: "changelog",
    suffix: (input) => quotedSuffix(input, ["title"]),
  },
  createTwitterPost: {
    verbs: ["Drafting", "Drafted"],
    noun: "Twitter post",
    suffix: (input) => quotedSuffix(input, ["title"]),
  },
  createLinkedInPost: {
    verbs: ["Drafting", "Drafted"],
    noun: "LinkedIn post",
    suffix: (input) => quotedSuffix(input, ["title"]),
  },
  createInvestorUpdate: {
    verbs: ["Drafting", "Drafted"],
    noun: "investor update",
    suffix: (input) => quotedSuffix(input, ["title"]),
  },
  reviseImage: {
    verbs: ["Revising", "Revised"],
    noun: "image",
    subtitle: ({ isStreaming }) =>
      isStreaming ? "Revising image — usually 3–8 minutes" : undefined,
    suffix: (input) => quotedSuffix(input, ["title"]),
  },
  listBrandIdentities: {
    verbs: ["Listing", "Listed"],
    noun: "brand identities",
  },
  getBrandIdentity: {
    verbs: ["Loading", "Loaded"],
    noun: "brand identity",
    suffix: (input) => quotedSuffix(input, ["name", "id"]),
  },
  getAvailableBrandReferences: {
    verbs: ["Loading", "Loaded"],
    noun: "brand references",
  },
  getAvailableIntegrations: {
    verbs: ["Checking", "Checked"],
    noun: "integrations",
  },
  listGeoProjects: {
    verbs: ["Listing", "Listed"],
    noun: "GEO projects",
    suffix: (_input, output) =>
      countSuffix(getNumericValue(output, "count"), "project", "projects"),
  },
  getGeoOverview: {
    verbs: ["Loading", "Loaded"],
    noun: "GEO overview",
    suffix: geoDaysSuffix,
  },
  getGeoTimeseries: {
    verbs: ["Loading", "Loaded"],
    noun: "GEO trends",
    suffix: geoDaysSuffix,
  },
  getGeoPromptResults: {
    verbs: ["Loading", "Loaded"],
    noun: "GEO prompt results",
    suffix: geoDaysSuffix,
  },
  getGeoCompetitorShare: {
    verbs: ["Loading", "Loaded"],
    noun: "GEO competitor share",
    suffix: geoDaysSuffix,
  },
  getGeoProjectContext: {
    verbs: ["Loading", "Loaded"],
    noun: "GEO project context",
    suffix: (input) => idSuffix(input, ["projectId"]),
  },
  getMarkdown: { verbs: ["Reading", "Read"], noun: "document" },
  editMarkdown: { verbs: ["Editing", "Edited"], noun: "document" },
  listAvailableSkills: { verbs: ["Listing", "Listed"], noun: "skills" },
  getSkillByName: {
    verbs: ["Loading", "Loaded"],
    noun: "skill",
    suffix: (input) => quotedSuffix(input, ["name"]),
  },
  fetchWebpage: {
    verbs: ["Fetching", "Fetched"],
    noun: "webpage",
    suffix: (input) => quotedSuffix(input, ["url"]),
  },
  webSearch: {
    verbs: ["Searching", "Searched"],
    noun: "web",
    suffix: webSearchSuffix,
  },
  search: {
    verbs: ["Searching", "Searched"],
    noun: "web",
    suffix: webSearchSuffix,
  },
  searchMemories: {
    verbs: ["Searching", "Searched"],
    noun: "memory",
    suffix: (input) => quotedSuffix(input, ["informationToGet", "query", "q"]),
  },
  recall: {
    verbs: ["Searching", "Searched"],
    noun: "memory",
    suffix: (input) => quotedSuffix(input, ["informationToGet", "query", "q"]),
  },
  addMemory: {
    verbs: ["Saving", "Saved"],
    noun: "memory",
    suffix: (input, output) =>
      quotedSuffix(input, ["memory", "content", "text"]) ??
      memoryIdSuffix(input, output),
  },
  fetchMemory: {
    verbs: ["Fetching", "Fetched"],
    noun: "memory",
    suffix: memoryIdSuffix,
  },
  getProfile: {
    verbs: ["Checking", "Checked"],
    noun: "memory profile",
    suffix: (input) => quotedSuffix(input, ["query", "containerTag"]),
  },
  whoAmI: {
    verbs: ["Checking", "Checked"],
    noun: "memory account",
  },
  documentList: {
    verbs: ["Listing", "Listed"],
    noun: "memory documents",
    suffix: (input) => quotedSuffix(input, ["containerTag", "status"]),
  },
  documentAdd: {
    verbs: ["Saving", "Saved"],
    noun: "memory document",
    suffix: (input, output) =>
      quotedSuffix(input, ["title", "description", "content"]) ??
      memoryIdSuffix(input, output),
  },
  documentDelete: {
    verbs: ["Deleting", "Deleted"],
    noun: "memory document",
    suffix: (input) => idSuffix(input, ["documentId"]),
  },
  memoryForget: {
    verbs: ["Forgetting", "Forgot"],
    noun: "memory",
    suffix: (input) =>
      idSuffix(input, ["memoryId"]) ??
      quotedSuffix(input, ["memoryContent", "reason"]),
  },
  memory: {
    verbs: ["Using", "Used"],
    noun: "memory",
    subtitle: memoryToolSubtitle,
  },
};

function getSubtitle({
  toolName,
  input,
  output,
  isStreaming,
  isError,
  isAwaitingApproval,
  toolMetadata,
}: {
  toolName: string;
  input: unknown;
  output: unknown;
  isStreaming: boolean;
  isError: boolean;
  isAwaitingApproval: boolean;
  toolMetadata?: unknown;
}): string {
  const copy = TOOL_COPY[toolName];
  const failurePrefix = isError ? "Failed to call" : undefined;
  if (!copy) {
    if (isMcpToolName(toolName)) {
      const label = getMcpToolLabel(toolName, toolMetadata);
      if (isAwaitingApproval) {
        return `Approve ${label}`;
      }
      if (failurePrefix) {
        return `${failurePrefix} ${label}`;
      }
      const actionPhrase = getMcpToolActionPhrase(toolMetadata, isStreaming);
      if (actionPhrase) {
        return actionPhrase;
      }
      return isStreaming ? `Calling ${label}` : `Called ${label}`;
    }
    if (isAwaitingApproval) {
      return `Approve ${toolName}`;
    }
    if (failurePrefix) {
      return `${failurePrefix} ${toolName}`;
    }
    return isStreaming ? `Running ${toolName}` : `Ran ${toolName}`;
  }
  const suffix = copy.suffix?.(input, isStreaming ? undefined : output);
  if (isAwaitingApproval) {
    return suffix ? `Approve ${copy.noun} ${suffix}` : `Approve ${copy.noun}`;
  }
  if (isError) {
    return suffix ? `Failed ${copy.noun} ${suffix}` : `Failed ${copy.noun}`;
  }
  const subtitle = copy.subtitle?.({ input, output, isStreaming, isError });
  if (subtitle) {
    return subtitle;
  }
  const verb = copy.verbs[isStreaming ? 0 : 1];
  return suffix ? `${verb} ${copy.noun} ${suffix}` : `${verb} ${copy.noun}`;
}

const JSON_TOKEN_RE =
  /"(?:\\.|[^"\\])*"(?:\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;
const MAX_JSON_RENDER_CHARS = 20_000;

function stringifyForDisplay(value: unknown): string | undefined {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return undefined;
  }
}

function JsonView({ value }: { value: unknown }) {
  const raw = stringifyForDisplay(value);
  if (raw === undefined) {
    return (
      <pre className="text-muted-foreground overflow-x-auto font-mono text-[0.75rem]">
        Unable to display value
      </pre>
    );
  }
  const truncated = raw.length > MAX_JSON_RENDER_CHARS;
  const text = truncated
    ? `${raw.slice(0, MAX_JSON_RENDER_CHARS)}\n… (${raw.length - MAX_JSON_RENDER_CHARS} more characters truncated)`
    : raw;

  const parts: Array<{ text: string; className: string; key: string }> = [];
  let lastIndex = 0;
  for (const match of text.matchAll(JSON_TOKEN_RE)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      parts.push({
        text: text.slice(lastIndex, start),
        className: "text-muted-foreground/70",
        key: `plain-${lastIndex}-${start}`,
      });
    }
    const token = match[0];
    let className = "text-foreground";
    if (token.startsWith('"')) {
      className = token.endsWith(":")
        ? "text-muted-foreground"
        : "text-foreground";
    } else if (token === "true" || token === "false") {
      className = "text-foreground";
    } else if (token === "null") {
      className = "text-muted-foreground/60 italic";
    } else {
      className = "text-foreground tabular-nums";
    }
    parts.push({
      text: token,
      className,
      key: `token-${start}-${token.length}`,
    });
    lastIndex = start + token.length;
  }
  if (lastIndex < text.length) {
    parts.push({
      text: text.slice(lastIndex),
      className: "text-muted-foreground/70",
      key: `plain-${lastIndex}-${text.length}`,
    });
  }

  return (
    <pre className="border-border/50 bg-muted/30 overflow-x-auto rounded-md border p-3 font-mono text-[0.75rem] leading-relaxed break-words whitespace-pre-wrap">
      {parts.map((part) => (
        <span className={part.className} key={part.key}>
          {part.text}
        </span>
      ))}
    </pre>
  );
}

function ToolDataSection({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <div className="text-muted-foreground/70 mb-2 text-[0.65rem] font-medium tracking-wider uppercase">
        {label}
      </div>
      <JsonView value={value} />
    </div>
  );
}

function isErrorOutputPayload(output: unknown): boolean {
  if (output === null || typeof output !== "object") {
    return false;
  }
  return "isError" in output && output.isError === true;
}

export function ChatToolBlock({
  toolCallId,
  toolName,
  state,
  input,
  output,
  onApprove,
  onDeny,
  editorHref,
  isMcp = false,
  iconUrl,
  mcpLogoDarkUrl,
  mcpLogoLightUrl,
  toolMetadata,
}: ChatToolBlockProps) {
  const isAwaitingApproval = state === "approval-requested";
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const isOpen = isAwaitingApproval || isDetailsOpen;
  const isError = state === "output-error" || isErrorOutputPayload(output);
  const isStreaming =
    state === "input-streaming" || state === "input-available";
  const elapsedSeconds = useElapsedSeconds(isStreaming, toolCallId);
  const showElapsedTimer =
    isStreaming && elapsedSeconds >= TOOL_TIMER_THRESHOLD_SECONDS;

  const defaultSubtitle = getSubtitle({
    toolName,
    input,
    output,
    isStreaming,
    isError,
    isAwaitingApproval,
    toolMetadata,
  });
  const isLongRunningImage =
    isStreaming &&
    elapsedSeconds >= 8 * 60 &&
    (toolName === "createImage" || toolName === "reviseImage");
  const subtitle = isLongRunningImage
    ? `${toolName === "reviseImage" ? "Revising" : "Generating"} image — still working; large repos can take longer`
    : defaultSubtitle;
  const hasInput = input != null;
  const hasOutput = output != null;
  const {
    chart,
    draft,
    showDraftPreview,
    hasApprovalActions,
    showJsonInput,
    showJsonOutput,
    showJsonDetails,
    hasDetails,
    outputImages,
  } = resolveChatToolBlockVisuals({
    toolName,
    input,
    output,
    hasInput,
    hasOutput,
    isError,
    isStreaming,
    isAwaitingApproval,
    editorHref,
    onApprove,
    onDeny,
  });
  const detailsOutput =
    toolName === "editMarkdown" &&
    output !== null &&
    typeof output === "object" &&
    !Array.isArray(output)
      ? Object.fromEntries(
          Object.entries(output as Record<string, unknown>).filter(
            ([key]) => key !== "previousMarkdown" && key !== "updatedMarkdown"
          )
        )
      : output;
  let toolIcon: ReactNode = null;

  if (isMcp) {
    const mcpIconUrls = getMcpToolIconUrls(toolMetadata);
    toolIcon = (
      <McpIcon
        darkUrl={
          iconUrl ?? mcpLogoDarkUrl ?? mcpLogoLightUrl ?? mcpIconUrls.darkUrl
        }
        lightUrl={
          iconUrl ?? mcpLogoLightUrl ?? mcpLogoDarkUrl ?? mcpIconUrls.lightUrl
        }
      />
    );
  } else if (iconUrl) {
    toolIcon = (
      <Avatar className="size-4 shrink-0 rounded-sm after:hidden">
        <AvatarImage className="rounded-sm" src={iconUrl} />
        <AvatarFallback className="rounded-sm bg-transparent">
          <HugeiconsIcon className="size-3" icon={CpuIcon} />
        </AvatarFallback>
      </Avatar>
    );
  }

  return (
    <Collapsible onOpenChange={setIsDetailsOpen} open={isOpen}>
      <CollapsibleTrigger
        className="group text-muted-foreground hover:text-foreground disabled:hover:text-muted-foreground flex w-full min-w-0 items-center gap-2 text-sm transition-colors disabled:cursor-default"
        disabled={!hasDetails}
      >
        {toolIcon}
        {isStreaming ? (
          <Shimmer as="span" className="min-w-0 truncate text-sm leading-5">
            {subtitle}
          </Shimmer>
        ) : (
          <span className="inline-block min-w-0 truncate leading-5">
            {subtitle}
          </span>
        )}
        {showElapsedTimer && (
          <span className="text-muted-foreground/60 shrink-0 text-xs tabular-nums">
            {formatElapsedSeconds(elapsedSeconds)}
          </span>
        )}
        <HugeiconsIcon
          aria-hidden
          className={cn(
            "text-muted-foreground/60 size-3.5 shrink-0 transition-all",
            !hasDetails && "invisible",
            hasDetails && isOpen && "rotate-180 opacity-100",
            hasDetails &&
              !isOpen &&
              "rotate-0 opacity-0 group-hover:opacity-100"
          )}
          icon={ArrowDown01Icon}
        />
      </CollapsibleTrigger>
      <ToolOutputImages images={outputImages} />
      {chart && !isStreaming ? <ToolOutputChart chart={chart} /> : null}
      {showDraftPreview && draft ? (
        <ToolDraftPreview
          editorHref={editorHref}
          markdown={draft.markdown}
          onApprove={isAwaitingApproval ? onApprove : undefined}
          onDeny={isAwaitingApproval ? onDeny : undefined}
          title={draft.title}
        />
      ) : null}
      <CollapsibleContent className={TOOL_DETAILS_PANEL_CLASSNAME}>
        <div className="mt-3 space-y-4">
          {showJsonDetails && showJsonInput ? (
            <ToolDataSection label="Input" value={input} />
          ) : null}
          {showJsonDetails && showJsonOutput ? (
            <ToolDataSection label="Output" value={detailsOutput} />
          ) : null}
          {hasApprovalActions ? (
            <div className="flex flex-wrap items-center gap-2">
              {onApprove ? (
                <Button onClick={onApprove} size="sm" type="button">
                  <CheckIcon className="size-3.5" />
                  Allow
                </Button>
              ) : null}
              {onDeny ? (
                <Button
                  onClick={onDeny}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  <XIcon className="size-3.5" />
                  Deny
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
