"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { toast } from "sonner";

import { MCP_OAUTH_ERROR_CODES } from "@/constants/mcp";

function isMcpOAuthErrorCode(
  value: string
): value is (typeof MCP_OAUTH_ERROR_CODES)[number] {
  return MCP_OAUTH_ERROR_CODES.some((code) => code === value);
}

export function useMcpConnectionToast() {
  const t = useTranslations("integrations.connectionToasts");
  useEffect(() => {
    const url = new URL(window.location.href);
    const connected = url.searchParams.get("mcpConnected");
    const error = url.searchParams.get("error");
    if (connected === "true") {
      toast.success(t("mcpConnected"));
    }

    const message =
      error && isMcpOAuthErrorCode(error) ? t(`mcpErrors.${error}`) : undefined;
    if (message) {
      toast.error(message);
    }
    if (connected === "true" || message) {
      url.searchParams.delete("mcpConnected");
      url.searchParams.delete("error");
      window.history.replaceState(null, "", url);
    }
  }, [t]);
}
