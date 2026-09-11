"use client";

import type {
  SocialConnectPlatform,
  SocialPublishSurface,
} from "@notra/schemas/dashboard/social-accounts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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
        toast.warning(`@${account.username} needs reconnecting`);
        return;
      }
      toast.success(`@${account.username} is up to date`);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : "Failed to refresh account"
      );
    },
  });
}

export function usePublishSocialPost(
  organizationId: string,
  platform: SocialConnectPlatform
) {
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
        `🎉 Posted to ${SOCIAL_PLATFORM_LABELS[platform]} as @${result.username}`
      );
    },
    onError: (error) => {
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : "Failed to publish post"
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
          : `Failed to connect ${SOCIAL_PLATFORM_LABELS[platform]} account`
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
