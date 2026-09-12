"use client";

import type { SocialConnectPlatform } from "@notra/schemas/dashboard/social-accounts";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import {
  SOCIAL_CONNECT_ERROR_MESSAGES,
  SOCIAL_CONNECTED_PARAMS,
  SOCIAL_PLATFORM_LABELS,
} from "@/constants/social-connect";
import { dashboardOrpc } from "@/lib/orpc/query";

export function useSocialConnectCallbackToasts(organizationId: string) {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) {
      return;
    }

    const error = searchParams.get("error");
    const isSocialConnectError = error !== null && !error.startsWith("mcp_");
    const errorMessage = isSocialConnectError
      ? (SOCIAL_CONNECT_ERROR_MESSAGES[error] ??
        "Failed to connect the account. Please try again.")
      : null;
    const connectedPlatforms = (
      Object.keys(SOCIAL_CONNECTED_PARAMS) as SocialConnectPlatform[]
    ).filter(
      (platform) =>
        searchParams.get(SOCIAL_CONNECTED_PARAMS[platform]) === "true"
    );

    if (!errorMessage && connectedPlatforms.length === 0) {
      return;
    }
    handled.current = true;

    for (const platform of connectedPlatforms) {
      toast.success(`${SOCIAL_PLATFORM_LABELS[platform]} account connected`);
    }
    if (errorMessage) {
      toast.error(errorMessage);
    }
    queryClient.invalidateQueries({
      queryKey: dashboardOrpc.socialAccounts.list.queryKey({
        input: { organizationId },
      }),
    });

    const cleanUrl = new URL(window.location.href);
    for (const platform of connectedPlatforms) {
      cleanUrl.searchParams.delete(SOCIAL_CONNECTED_PARAMS[platform]);
    }
    if (errorMessage) {
      cleanUrl.searchParams.delete("error");
    }
    window.history.replaceState({}, "", cleanUrl.toString());
  }, [searchParams, queryClient, organizationId]);
}
