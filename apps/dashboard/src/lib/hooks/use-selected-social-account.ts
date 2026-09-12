"use client";

import type { SocialConnectPlatform } from "@notra/schemas/dashboard/social-accounts";
import { useSyncExternalStore } from "react";

import { useSocialAccounts } from "@/lib/hooks/use-connected-accounts";
import {
  getSelectedSocialAccountId,
  setSelectedSocialAccountId,
  subscribeToSelectedSocialAccountId,
} from "@/lib/state/selected-social-account";

export function useSelectedSocialAccount(
  organizationId: string,
  platform: SocialConnectPlatform
) {
  const { accounts, isLoading } = useSocialAccounts(organizationId, platform);

  const selectedAccountId = useSyncExternalStore(
    (onChange: () => void) =>
      subscribeToSelectedSocialAccountId(organizationId, platform, onChange),
    () => getSelectedSocialAccountId(organizationId, platform),
    () => null
  );

  const selectedAccount =
    accounts.find((account) => account.id === selectedAccountId) ??
    accounts[0] ??
    null;

  const selectAccount = (accountId: string) =>
    setSelectedSocialAccountId(organizationId, platform, accountId);

  return { accounts, isLoading, selectedAccount, selectAccount };
}
