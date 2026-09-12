import {
  type AddMcpServerFormValues,
  MCP_URL_PROTOCOL_REGEX,
} from "@notra/schemas/dashboard/integrations";
import { logoLinkUrl } from "@notra/utils/logo-link";

import type {
  GetMcpIconUrlsInput,
  McpIconUrls,
} from "@/types/integrations/mcp";

export const MCP_ACCENT_COLOR = "#9333EA";

export function buildMcpUrl(raw: string) {
  const host = raw.trim().replace(MCP_URL_PROTOCOL_REGEX, "");
  return host ? `https://${host}` : "";
}

export function toMcpFormUrl(url: string) {
  return url.trim().replace(MCP_URL_PROTOCOL_REGEX, "");
}

export function getMcpFaviconUrl(url: string | null | undefined) {
  if (!url) {
    return undefined;
  }
  const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;
  try {
    return logoLinkUrl(new URL(normalizedUrl).hostname) ?? undefined;
  } catch {
    return undefined;
  }
}

export function getMcpIconUrls({
  lightUrl,
  darkUrl,
  fallbackUrl,
}: GetMcpIconUrlsInput): McpIconUrls {
  const normalizedLightUrl = lightUrl?.trim() || undefined;
  const normalizedDarkUrl = darkUrl?.trim() || undefined;
  const normalizedFallbackUrl = fallbackUrl?.trim() || undefined;

  return {
    lightUrl: normalizedLightUrl ?? normalizedDarkUrl ?? normalizedFallbackUrl,
    darkUrl: normalizedDarkUrl ?? normalizedLightUrl ?? normalizedFallbackUrl,
  };
}

export function getMcpFormErrorMessage(error: unknown) {
  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }

  return "Invalid value";
}

export function buildMcpHeaders(
  value: Pick<AddMcpServerFormValues, "headers">
) {
  const headers: Record<string, string> = {};

  for (const row of value.headers) {
    const name = row.name.trim();
    const headerValue = row.value.trim();
    if (name && headerValue) {
      headers[name] = headerValue;
    }
  }

  return headers;
}

export function getStoreIntegrationConnectHint(authType: string, name: string) {
  if (authType === "oauth") {
    return `You will be redirected to ${name} to authorize the connection.`;
  }
  if (authType === "headers") {
    return `You will need your own ${name} credentials to finish connecting.`;
  }
  return `${name} connects instantly and needs no credentials.`;
}

export function toMcpFormAuthType(
  authType: string
): "none" | "headers" | "oauth" {
  if (authType === "headers" || authType === "oauth") {
    return authType;
  }
  return "none";
}
