"use client";

import {
  ArrowDown01Icon,
  Cancel01Icon,
  CancelCircleIcon,
  CpuIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
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
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { useState } from "react";

import { McpIcon } from "@/components/integrations/mcp-icon";
import { CHAT_TOOL_LABEL_ALIASES } from "@/constants/chat-tool-labels";
import { TOOL_TIMER_THRESHOLD_SECONDS } from "@/constants/chat-tool-timer";
import { useElapsedSeconds } from "@/lib/hooks/use-elapsed-seconds";
import { getChatToolIcon } from "@/utils/chat-tool-icon";
import { isFailedToolOutput } from "@/utils/chat-tool-output";
import { formatElapsedSeconds } from "@/utils/format-elapsed-seconds";
import { hasOwnKey } from "@/utils/has-own-key";

import {
  getMcpToolActionPhrase,
  getMcpToolIconUrls,
  getMcpToolLabel,
  isMcpToolName,
} from "./chat-tool-block/mcp/utils";
import { ToolDraftPreview } from "./chat-tool-block/tool-draft-preview";
import { ToolOutputImages } from "./chat-tool-block/tool-output-images";
import type {
  ChatToolBlockProps,
  ChatToolContentProps,
  ChatToolIconProps,
  ChatToolTriggerProps,
  ToolBlockTranslator,
  ToolCopy,
  ToolDetailsProps,
} from "./chat-tool-block/types";
import { resolveChatToolBlockVisuals } from "./chat-tool-block/visuals";

const TOOL_DETAILS_PANEL_CLASSNAME =
  "h-[var(--collapsible-panel-height)] overflow-hidden outline-none transition-[height,opacity] duration-normal ease-emphasized data-[ending-style]:h-0 data-[starting-style]:h-0 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 motion-reduce:transition-none";

const ToolOutputChart = dynamic(
  () =>
    import("./chat-tool-block/tool-output-chart").then(
      (mod) => mod.ToolOutputChart
    ),
  { ssr: false }
);

const DocumentDiff = dynamic(
  () =>
    import("./chat-tool-block/document-diff").then((mod) => mod.DocumentDiff),
  { ssr: false }
);

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
  t,
}: {
  input: unknown;
  isStreaming: boolean;
  t: ToolBlockTranslator;
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

  const state = isStreaming ? "running" : "done";
  const withSuffix = (label: string) =>
    suffix ? t("withSuffix", { label, suffix }) : label;

  switch (command) {
    case "view":
      return withSuffix(t("memory.view", { state }));
    case "create":
      return withSuffix(t("memory.create", { state }));
    case "delete":
      return withSuffix(t("memory.delete", { state }));
    case "rename":
      return withSuffix(t("memory.rename", { state }));
    case "insert":
    case "str_replace":
      return withSuffix(t("memory.update", { state }));
    default:
      return withSuffix(t("memory.use", { state }));
  }
}

function webSearchSuffix(
  input: unknown,
  output: unknown,
  t: ToolBlockTranslator
): string | undefined {
  const parsedInput = webSearchInputSchema.safeParse(input);
  const query = parsedInput.success
    ? quotedSuffixFromFields(parsedInput.data, ["query"])
    : undefined;
  const count = getWebSearchResultCount(output);
  if (query && count !== undefined) {
    return t("suffix.forQueryWithCount", { query, count });
  }
  return query ? t("suffix.forQuery", { query }) : undefined;
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
  t: ToolBlockTranslator,
  unit: "results" | "tools" | "projects" | "pages" | "urls",
  count: number | undefined
) {
  if (count === undefined) {
    return undefined;
  }
  return t(`suffix.count.${unit}`, { count });
}

function toolSearchSuffix(
  input: unknown,
  output: unknown,
  t: ToolBlockTranslator
): string | undefined {
  const query = quotedSuffix(input, ["query"]);
  const count = getArrayLength(output, "results");
  if (query && count !== undefined) {
    return t("suffix.forQueryWithCount", { query, count });
  }
  return query ?? countSuffix(t, "results", count);
}

function activatedToolsSuffix(
  output: unknown,
  t: ToolBlockTranslator
): string | undefined {
  const names = getToolObjectNames(output, "activated");
  if (names.length === 0) {
    return countSuffix(t, "tools", getArrayLength(output, "activated"));
  }
  if (names.length === 1) {
    return names[0];
  }
  return countSuffix(t, "tools", names.length);
}

function activeToolsSuffix(
  output: unknown,
  t: ToolBlockTranslator
): string | undefined {
  const names = [
    ...getStringArray(output, "activeTools"),
    ...getToolObjectNames(output, "activeTools"),
  ];
  if (names.length === 0) {
    return countSuffix(t, "tools", getArrayLength(output, "activeTools"));
  }
  return t("suffix.activeCount", { count: names.length });
}

function deactivatedToolsSuffix(
  output: unknown,
  t: ToolBlockTranslator
): string | undefined {
  return countSuffix(
    t,
    "tools",
    getArrayLength(output, "deactivated") ??
      getNumericValue(output, "deactivated") ??
      getArrayLength(output, "removed") ??
      getNumericValue(output, "removed")
  );
}

function geoDaysSuffix(
  input: unknown,
  _output: unknown,
  t: ToolBlockTranslator
): string | undefined {
  const days = getNumericValue(input, "days");
  return days === undefined ? undefined : t("suffix.lastDays", { days });
}

const TOOL_COPY = {
  code_mode: {},
  searchNotraTools: {
    suffix: toolSearchSuffix,
  },
  activateNotraTools: {
    suffix: (_input, output, t) => activatedToolsSuffix(output, t),
  },
  listActiveNotraTools: {
    suffix: (_input, output, t) => activeToolsSuffix(output, t),
  },
  deactivateNotraTools: {
    suffix: (_input, output, t) => deactivatedToolsSuffix(output, t),
  },
  searchMcpTools: {
    suffix: toolSearchSuffix,
  },
  activateMcpTools: {
    suffix: (_input, output, t) => activatedToolsSuffix(output, t),
  },
  listActiveMcpTools: {
    suffix: (_input, output, t) => activeToolsSuffix(output, t),
  },
  deactivateMcpTools: {
    suffix: (_input, output, t) => deactivatedToolsSuffix(output, t),
  },
  getPullRequests: {
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
    suffix: (input, _output, t) => {
      const parsed = commitsByTimeframeInputSchema.safeParse(input);
      const days = parsed.success ? parsed.data.days : undefined;
      return days ? t("suffix.lastDays", { days }) : undefined;
    },
  },
  getLinearIssues: {},
  getLinearProjects: {},
  getLinearCycles: {},
  viewPost: {
    suffix: (input) => idSuffix(input, ["id", "postId"]),
  },
  updatePost: {
    suffix: (input) => quotedSuffix(input, ["title"]),
  },
  getAvailablePosts: {},
  getPost: {
    suffix: (input) => idSuffix(input, ["id", "postId", "identifier"]),
  },
  createImage: {
    subtitle: ({ isStreaming, t }) =>
      isStreaming ? t("imageGenerating") : undefined,
    suffix: (input) => quotedSuffix(input, ["title"]),
  },
  createBlogPost: {
    suffix: (input) => quotedSuffix(input, ["title"]),
  },
  createChangelog: {
    suffix: (input) => quotedSuffix(input, ["title"]),
  },
  createTwitterPost: {
    suffix: (input) => quotedSuffix(input, ["title"]),
  },
  createLinkedInPost: {
    suffix: (input) => quotedSuffix(input, ["title"]),
  },
  createInvestorUpdate: {
    suffix: (input) => quotedSuffix(input, ["title"]),
  },
  createSchedule: {
    suffix: (input) => quotedSuffix(input, ["name"]),
  },
  listSchedules: {},
  reviseImage: {
    subtitle: ({ isStreaming, t }) =>
      isStreaming ? t("imageRevising") : undefined,
    suffix: (input) => quotedSuffix(input, ["title"]),
  },
  listBrandIdentities: {},
  getBrandIdentity: {
    suffix: (input) => quotedSuffix(input, ["name", "id"]),
  },
  getAvailableBrandReferences: {},
  getBrandReferences: {},
  searchBrandReferences: {
    suffix: (input) => quotedSuffix(input, ["query"]),
  },
  getAvailableIntegrations: {},
  listGeoProjects: {
    suffix: (_input, output, t) =>
      countSuffix(t, "projects", getNumericValue(output, "count")),
  },
  getGeoOverview: {
    suffix: geoDaysSuffix,
  },
  getGeoTimeseries: {
    suffix: geoDaysSuffix,
  },
  getGeoPromptResults: {
    suffix: geoDaysSuffix,
  },
  getGeoCompetitorShare: {
    suffix: geoDaysSuffix,
  },
  getGeoProjectContext: {
    suffix: (input) => idSuffix(input, ["projectId"]),
  },
  getSitemapPages: {
    suffix: (input, output, t) =>
      quotedSuffix(input, ["query"]) ??
      countSuffix(t, "pages", getNumericValue(output, "total")),
  },
  fetchSitemapPage: {
    suffix: (input) => quotedSuffix(input, ["url"]),
  },
  crawlSitemap: {
    suffix: (input, output, t) =>
      quotedSuffix(input, ["domain"]) ??
      countSuffix(t, "urls", getNumericValue(output, "total")),
  },
  getMarkdown: {},
  editMarkdown: {},
  listAvailableSkills: {},
  getSkillByName: {
    suffix: (input) => quotedSuffix(input, ["name"]),
  },
  fetchWebpage: {
    suffix: (input) => quotedSuffix(input, ["url"]),
  },
  webSearch: {
    suffix: webSearchSuffix,
  },
  search: {
    suffix: webSearchSuffix,
  },
  searchMemories: {
    suffix: (input) => quotedSuffix(input, ["informationToGet", "query", "q"]),
  },
  recall: {
    suffix: (input) => quotedSuffix(input, ["informationToGet", "query", "q"]),
  },
  addMemory: {
    suffix: (input, output) =>
      quotedSuffix(input, ["memory", "content", "text"]) ??
      memoryIdSuffix(input, output),
  },
  fetchMemory: {
    suffix: memoryIdSuffix,
  },
  getProfile: {
    suffix: (input) => quotedSuffix(input, ["query", "containerTag"]),
  },
  whoAmI: {},
  documentList: {
    suffix: (input) => quotedSuffix(input, ["containerTag", "status"]),
  },
  documentAdd: {
    suffix: (input, output) =>
      quotedSuffix(input, ["title", "description", "content"]) ??
      memoryIdSuffix(input, output),
  },
  documentDelete: {
    suffix: (input) => idSuffix(input, ["documentId"]),
  },
  memoryForget: {
    suffix: (input) =>
      idSuffix(input, ["memoryId"]) ??
      quotedSuffix(input, ["memoryContent", "reason"]),
  },
  memory: {
    subtitle: memoryToolSubtitle,
  },
} satisfies Record<string, ToolCopy>;

function isToolCopyName(toolName: string): toolName is keyof typeof TOOL_COPY {
  return Object.hasOwn(TOOL_COPY, toolName);
}

function getSubtitle({
  toolName,
  input,
  output,
  isStreaming,
  isError,
  isAwaitingApproval,
  toolMetadata,
  t,
}: {
  toolName: string;
  input: unknown;
  output: unknown;
  isStreaming: boolean;
  isError: boolean;
  isAwaitingApproval: boolean;
  toolMetadata?: unknown;
  t: ToolBlockTranslator;
}): string {
  if (!isToolCopyName(toolName)) {
    if (isMcpToolName(toolName)) {
      const label = getMcpToolLabel(toolName, toolMetadata);
      if (isAwaitingApproval) {
        return t("fallback.approve", { name: label });
      }
      if (isError) {
        return t("fallback.failed", { name: label });
      }
      const actionPhrase = getMcpToolActionPhrase(toolMetadata, isStreaming);
      if (actionPhrase) {
        return actionPhrase;
      }
      return t("fallback.mcpCall", {
        name: label,
        state: isStreaming ? "running" : "done",
      });
    }
    if (isAwaitingApproval) {
      return t("fallback.approve", { name: toolName });
    }
    if (isError) {
      return t("fallback.failed", { name: toolName });
    }
    return t("fallback.run", {
      name: toolName,
      state: isStreaming ? "running" : "done",
    });
  }
  const copy: ToolCopy = TOOL_COPY[toolName];
  const suffix = copy.suffix?.(input, isStreaming ? undefined : output, t);
  const withSuffix = (label: string) =>
    suffix ? t("withSuffix", { label, suffix }) : label;
  const labelTool = hasOwnKey(CHAT_TOOL_LABEL_ALIASES, toolName)
    ? CHAT_TOOL_LABEL_ALIASES[toolName]
    : toolName;
  if (isAwaitingApproval) {
    return withSuffix(t(`tools.${labelTool}`, { state: "approve" }));
  }
  if (isError) {
    return withSuffix(t(`tools.${labelTool}`, { state: "failed" }));
  }
  const subtitle = copy.subtitle?.({ input, output, isStreaming, isError, t });
  if (subtitle) {
    return subtitle;
  }
  return withSuffix(
    t(`tools.${labelTool}`, { state: isStreaming ? "running" : "done" })
  );
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
  const t = useTranslations("ai.toolBlock");
  const raw = stringifyForDisplay(value);
  if (raw === undefined) {
    return (
      <pre className="text-muted-foreground overflow-x-auto font-mono text-[0.75rem]">
        {t("unableToDisplay")}
      </pre>
    );
  }
  const truncated = raw.length > MAX_JSON_RENDER_CHARS;
  const text = truncated
    ? `${raw.slice(0, MAX_JSON_RENDER_CHARS)}\n${t("truncated", { count: raw.length - MAX_JSON_RENDER_CHARS })}`
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

function ChatToolIcon({
  isError,
  isMcp,
  iconUrl,
  mcpLogoDarkUrl,
  mcpLogoLightUrl,
  toolMetadata,
  toolName,
}: ChatToolIconProps) {
  if (isError) {
    return (
      <HugeiconsIcon
        className="size-3.5 shrink-0"
        icon={CancelCircleIcon}
        strokeWidth={1.8}
      />
    );
  }
  if (isMcp) {
    const mcpIconUrls = getMcpToolIconUrls(toolMetadata);
    return (
      <McpIcon
        className="size-3.5"
        darkUrl={
          iconUrl ?? mcpLogoDarkUrl ?? mcpLogoLightUrl ?? mcpIconUrls.darkUrl
        }
        lightUrl={
          iconUrl ?? mcpLogoLightUrl ?? mcpLogoDarkUrl ?? mcpIconUrls.lightUrl
        }
      />
    );
  }
  if (iconUrl) {
    return (
      <Avatar className="size-3.5 shrink-0 rounded-sm after:hidden">
        <AvatarImage className="rounded-sm" src={iconUrl} />
        <AvatarFallback className="rounded-sm bg-transparent">
          <HugeiconsIcon
            className="size-3.5"
            icon={CpuIcon}
            strokeWidth={1.8}
          />
        </AvatarFallback>
      </Avatar>
    );
  }
  return (
    <HugeiconsIcon
      className="size-3.5 shrink-0"
      icon={getChatToolIcon(toolName)}
      strokeWidth={1.8}
    />
  );
}

function ToolDetails({
  hasApprovalActions,
  showJsonDetails,
  showJsonInput,
  showJsonOutput,
  input,
  output,
  onApprove,
  onDeny,
}: ToolDetailsProps) {
  const t = useTranslations("ai.toolBlock");
  const tCommon = useTranslations("common");
  return (
    <CollapsibleContent className={TOOL_DETAILS_PANEL_CLASSNAME}>
      <div className="mt-3 space-y-4">
        {showJsonDetails && showJsonInput ? (
          <ToolDataSection label={tCommon("labels.input")} value={input} />
        ) : null}
        {showJsonDetails && showJsonOutput ? (
          <ToolDataSection label={tCommon("labels.output")} value={output} />
        ) : null}
        {hasApprovalActions ? (
          <div className="flex flex-wrap items-center gap-2">
            {onApprove ? (
              <Button onClick={onApprove} size="sm" type="button">
                <HugeiconsIcon icon={Tick02Icon} className="size-3.5" />
                {t("allow")}
              </Button>
            ) : null}
            {onDeny ? (
              <Button onClick={onDeny} size="sm" type="button" variant="ghost">
                <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
                {t("deny")}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </CollapsibleContent>
  );
}

function ChatToolContent({
  editorHref,
  input,
  onApprove,
  onDeny,
  output,
  toolName,
  isAwaitingApproval,
  isStreaming,
  visuals,
}: ChatToolContentProps) {
  const {
    chart,
    documentDiff,
    draft,
    showDraftPreview,
    hasApprovalActions,
    showJsonInput,
    showJsonOutput,
    showJsonDetails,
    outputImages,
  } = visuals;
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
  return (
    <>
      <ToolOutputImages images={outputImages} />
      {chart && !isStreaming ? <ToolOutputChart chart={chart} /> : null}
      {documentDiff ? <DocumentDiff {...documentDiff} /> : null}
      {showDraftPreview && draft ? (
        <ToolDraftPreview
          editorHref={editorHref}
          markdown={draft.markdown}
          onApprove={isAwaitingApproval ? onApprove : undefined}
          onDeny={isAwaitingApproval ? onDeny : undefined}
          title={draft.title}
        />
      ) : null}
      <ToolDetails
        hasApprovalActions={hasApprovalActions}
        input={input}
        onApprove={onApprove}
        onDeny={onDeny}
        output={detailsOutput}
        showJsonDetails={showJsonDetails}
        showJsonInput={showJsonInput}
        showJsonOutput={showJsonOutput}
      />
    </>
  );
}

function ChatToolTrigger({
  isError,
  isMcp,
  iconUrl,
  mcpLogoDarkUrl,
  mcpLogoLightUrl,
  toolMetadata,
  toolName,
  isOpen,
  isStreaming,
  hasDetails,
  subtitle,
  elapsedSeconds,
  showElapsedTimer,
}: ChatToolTriggerProps) {
  return (
    <CollapsibleTrigger
      className={cn(
        "group flex w-full min-w-0 items-center gap-2 text-sm transition-colors disabled:cursor-default",
        isError
          ? "text-destructive hover:text-destructive disabled:hover:text-destructive"
          : "text-muted-foreground hover:text-foreground disabled:hover:text-muted-foreground"
      )}
      disabled={!hasDetails}
    >
      <ChatToolIcon
        iconUrl={iconUrl}
        isError={isError}
        isMcp={isMcp}
        mcpLogoDarkUrl={mcpLogoDarkUrl}
        mcpLogoLightUrl={mcpLogoLightUrl}
        toolMetadata={toolMetadata}
        toolName={toolName}
      />
      <span className="min-w-0 truncate leading-5">
        {isStreaming ? <Shimmer as="span">{subtitle}</Shimmer> : subtitle}
      </span>
      {showElapsedTimer && (
        <span className="text-muted-foreground/60 shrink-0 text-xs tabular-nums">
          {formatElapsedSeconds(elapsedSeconds)}
        </span>
      )}
      {hasDetails ? (
        <HugeiconsIcon
          aria-hidden
          className={cn(
            "text-muted-foreground/60 size-3.5 shrink-0 transition-transform",
            isOpen ? "rotate-180" : "rotate-0 opacity-0 group-hover:opacity-100"
          )}
          icon={ArrowDown01Icon}
        />
      ) : null}
    </CollapsibleTrigger>
  );
}

export function ChatToolBlock({
  toolCallId,
  toolName,
  state,
  isActive,
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
  const t = useTranslations("ai.toolBlock");
  const isAwaitingApproval = state === "approval-requested";
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const isOpen = isAwaitingApproval || isDetailsOpen;
  const isError = state === "output-error" || isFailedToolOutput(output);
  const isPending = state === "input-streaming" || state === "input-available";
  const isStreaming = isActive && isPending;
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
    t,
  });
  const isLongRunningImage =
    isStreaming &&
    elapsedSeconds >= 8 * 60 &&
    (toolName === "createImage" || toolName === "reviseImage");
  let subtitle = defaultSubtitle;
  if (isPending && !isActive) {
    subtitle = t("interrupted");
  } else if (isLongRunningImage) {
    subtitle = t("imageLongRunning", {
      action: toolName === "reviseImage" ? "revise" : "generate",
    });
  }
  const hasInput = input != null;
  const hasOutput = output != null;
  const visuals = resolveChatToolBlockVisuals({
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
  return (
    <Collapsible onOpenChange={setIsDetailsOpen} open={isOpen}>
      <ChatToolTrigger
        elapsedSeconds={elapsedSeconds}
        hasDetails={visuals.hasDetails}
        iconUrl={iconUrl}
        isError={isError}
        isMcp={isMcp}
        isOpen={isOpen}
        isStreaming={isStreaming}
        mcpLogoDarkUrl={mcpLogoDarkUrl}
        mcpLogoLightUrl={mcpLogoLightUrl}
        showElapsedTimer={showElapsedTimer}
        subtitle={subtitle}
        toolMetadata={toolMetadata}
        toolName={toolName}
      />
      <ChatToolContent
        editorHref={editorHref}
        input={input}
        isAwaitingApproval={isAwaitingApproval}
        isStreaming={isStreaming}
        onApprove={onApprove}
        onDeny={onDeny}
        output={output}
        toolName={toolName}
        visuals={visuals}
      />
    </Collapsible>
  );
}
