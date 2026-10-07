"use client";

import type {
  SocialConnectPlatform,
  SocialPublishSurface,
} from "@notra/schemas/dashboard/social-accounts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { SOCIAL_PLATFORM_LABELS } from "@/constants/social-connect";
import type { ConnectedAccount } from "@/types/hooks/connected-accounts";

import { dashboardOrpc } from "../orpc/query";

export function useConnectedAccounts(organizationId: string) {
  return useQuery<{ accounts: ConnectedAccount[] }>(
    dashboardOrpc.socialAccounts.list.queryOptions({
      input: { organizationId },
      enabled: !!organizationId,
    })
  );
}

export function useSocialAccounts(
  organizationId: string,
  platform: SocialConnectPlatform
) {
  const { data, isLoading } = useConnectedAccounts(organizationId);
  const accounts = (data?.accounts ?? []).filter(
    (account) => account.provider === platform
  );
  return { accounts, isLoading };
}

export function useRefreshConnectedAccount(organizationId: string) {
  const t = useTranslations("integrations.socialConnect");
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (accountId: string) =>
      dashboardOrpc.socialAccounts.refresh.call({ organizationId, accountId }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({
        queryKey: dashboardOrpc.socialAccounts.list.queryKey({
          input: { organizationId },
        }),
      });
      const account = result.accounts.at(0);
      if (!account) {
        return;
      }
      if (account.status === "missing") {
        toast.warning(t("needsReconnecting", { username: account.username }));
        return;
      }
      toast.success(t("upToDate", { username: account.username }));
    },
    onError: (error) => {
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : t("refreshFailed")
      );
    },
  });
}

export function usePublishSocialPost(
  organizationId: string,
  platform: SocialConnectPlatform
) {
  const t = useTranslations("integrations.socialConnect");
  const tCommon = useTranslations("common");
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      accountId: string;
      content: string;
      from?: SocialPublishSurface;
    }) =>
      dashboardOrpc.socialAccounts.publish.call({
        organizationId,
        accountId: input.accountId,
        content: input.content,
        from: input.from,
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.socialAccounts.list.queryKey({
          input: { organizationId },
        }),
      });
      toast.success(
        t("posted", {
          platform: SOCIAL_PLATFORM_LABELS[platform],
          username: result.username,
        })
      );
    },
    onError: (error) => {
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : tCommon("labels.failedToPublishPost")
      );
    },
  });
}

function useConnectSocialAccount(
  organizationId: string,
  platform: SocialConnectPlatform
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (callbackPath: string): Promise<{ url: string }> => {
      return dashboardOrpc.socialAccounts.beginConnect.call({
        organizationId,
        platform,
        callbackPath,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.socialAccounts.list.queryKey({
          input: { organizationId },
        }),
      });
    },
  });
}

export function useHandleConnectSocialAccount(
  organizationId: string,
  platform: SocialConnectPlatform
) {
  const t = useTranslations("integrations.socialConnect");
  const connectAccount = useConnectSocialAccount(organizationId, platform);

  const handleConnect = async () => {
    try {
      const result = await connectAccount.mutateAsync(
        window.location.pathname + window.location.search
      );
      window.location.href = result.url;
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("connectPlatformFailed", {
              platform: SOCIAL_PLATFORM_LABELS[platform],
            })
      );
    }
  };

  return { handleConnect, isPending: connectAccount.isPending };
}

export function useDisconnectAccount(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accountId: string) => {
      return dashboardOrpc.socialAccounts.disconnect.call({
        organizationId,
        accountId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.socialAccounts.list.queryKey({
          input: { organizationId },
        }),
      });
    },
  });
}
