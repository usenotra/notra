import { mcpToolMetadataSchema } from "@notra/schemas/dashboard/ai/chat-tool-block";

import { getMcpFaviconUrl, getMcpIconUrls } from "@/lib/integrations/mcp";
import type { McpIconUrls } from "@/types/integrations/mcp";

import {
  MCP_TOOL_NAME_REGEX,
  NON_ALPHANUMERIC_WORD_SEPARATOR_REGEX,
  TITLE_CASE_WORD_REGEX,
  UNDERSCORE_REGEX,
} from "./constants";

export function isMcpToolName(toolName: string) {
  return MCP_TOOL_NAME_REGEX.test(toolName);
}

function formatToolDisplayName(value: string): string {
  return value
    .replace(NON_ALPHANUMERIC_WORD_SEPARATOR_REGEX, " ")
    .trim()
    .replace(TITLE_CASE_WORD_REGEX, (match) => match.toUpperCase());
}

function formatMcpToolName(toolName: string): string {
  const label = toolName
    .replace(MCP_TOOL_NAME_REGEX, "")
    .replace(UNDERSCORE_REGEX, " ");
  const displayName = formatToolDisplayName(label);
  return displayName || "MCP Tool";
}

function formatMcpToolLabelPart(value: string): string {
  const label = formatToolDisplayName(value);
  return label || "MCP tool";
}

function formatMcpServerName(value: string): string | undefined {
  const serverName = value.trim();
  return serverName || undefined;
}

function getNotraMcpMetadata(toolMetadata: unknown) {
  const parsed = mcpToolMetadataSchema.safeParse(toolMetadata);
  return parsed.success ? parsed.data.notra : undefined;
}

export function getMcpToolLabel(toolName: string, toolMetadata: unknown) {
  const notraMetadata = getNotraMcpMetadata(toolMetadata);
  const serverName = notraMetadata?.serverName
    ? formatMcpServerName(notraMetadata.serverName)
    : undefined;
  const metadataToolName = notraMetadata?.toolName
    ? formatMcpToolLabelPart(notraMetadata.toolName)
    : undefined;

  if (serverName && metadataToolName) {
    return `${serverName} - ${metadataToolName}`;
  }

  if (notraMetadata?.label) {
    return formatMcpToolLabelPart(notraMetadata.label);
  }

  return formatMcpToolName(toolName);
}

export function getMcpToolActionPhrase(
  toolMetadata: unknown,
  isStreaming: boolean
) {
  const notraMetadata = getNotraMcpMetadata(toolMetadata);
  const phrase = isStreaming
    ? notraMetadata?.actionPhrasePresent
    : notraMetadata?.actionPhrasePast;
  const normalizedPhrase = phrase?.trim();
  return normalizedPhrase || undefined;
}

export function getMcpToolIconUrls(toolMetadata: unknown): McpIconUrls {
  const notraMetadata = getNotraMcpMetadata(toolMetadata);
  return getMcpIconUrls({
    lightUrl: notraMetadata?.logoLightUrl,
    darkUrl: notraMetadata?.logoDarkUrl,
    fallbackUrl: getMcpFaviconUrl(notraMetadata?.serverUrl),
  });
}

export function getMcpToolServerId(toolMetadata: unknown) {
  return getNotraMcpMetadata(toolMetadata)?.serverId?.trim() || undefined;
}
