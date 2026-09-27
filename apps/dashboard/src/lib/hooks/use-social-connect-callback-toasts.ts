"use client";

import type { SocialConnectPlatform } from "@notra/schemas/dashboard/social-accounts";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { parseAsBoolean, parseAsString, useQueryStates } from "nuqs";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import {
  SOCIAL_CONNECT_ERROR_CODES,
  SOCIAL_PLATFORM_LABELS,
} from "@/constants/social-connect";
import { dashboardOrpc } from "@/lib/orpc/query";

const SOCIAL_PLATFORMS: SocialConnectPlatform[] = ["twitter", "linkedin"];

function isSocialConnectErrorCode(
  value: string
): value is (typeof SOCIAL_CONNECT_ERROR_CODES)[number] {
  return SOCIAL_CONNECT_ERROR_CODES.some((code) => code === value);
}

export function useSocialConnectCallbackToasts(organizationId: string) {
  const t = useTranslations("integrations.socialConnect");
  const [{ twitterConnected, linkedinConnected, error }, setParams] =
    useQueryStates(
      {
        twitterConnected: parseAsBoolean,
        linkedinConnected: parseAsBoolean,
        error: parseAsString,
      },
      { history: "replace" }
    );
  const queryClient = useQueryClient();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) {
      return;
    }

    const isSocialConnectError = error !== null && !error.startsWith("mcp_");
    let errorMessage: string | null = null;
    if (isSocialConnectError) {
      errorMessage = isSocialConnectErrorCode(error)
        ? t(`errors.${error}`)
        : t("connectFailed");
    }
    const connectedFlags = {
      twitter: twitterConnected,
      linkedin: linkedinConnected,
    };
    const connectedPlatforms = SOCIAL_PLATFORMS.filter(
      (platform) => connectedFlags[platform]
    );

    if (!errorMessage && connectedPlatforms.length === 0) {
      return;
    }
    handled.current = true;

    for (const platform of connectedPlatforms) {
      toast.success(
        t("accountConnected", { platform: SOCIAL_PLATFORM_LABELS[platform] })
      );
    }
    if (errorMessage) {
      toast.error(errorMessage);
    }
    queryClient.invalidateQueries({
      queryKey: dashboardOrpc.socialAccounts.list.queryKey({
        input: { organizationId },
      }),
    });

    void setParams({
      twitterConnected: null,
      linkedinConnected: null,
      error: errorMessage ? null : error,
    });
  }, [
    twitterConnected,
    linkedinConnected,
    error,
    setParams,
    queryClient,
    organizationId,
    t,
  ]);
}
