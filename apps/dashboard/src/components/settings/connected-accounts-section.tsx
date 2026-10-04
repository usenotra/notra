"use client";

import { Github } from "@notra/ui/components/ui/svgs/github";
import { Google } from "@notra/ui/components/ui/svgs/google";
import { TitleCard } from "@notra/ui/components/ui/title-card";
import { isDemoModeClient } from "@notra/utils/demo-mode";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { ConnectedAccountRow } from "@/components/settings/connected-account-row";
import { DEMO_DISABLED_MESSAGE } from "@/constants/demo";
import { authClient } from "@/lib/auth/client";
import { startSocialSignInAction } from "@/lib/auth/social-actions";
import { errorMessageOr } from "@/lib/utils";
import type { ConnectedAccountsSectionProps } from "@/types/settings/account";

export function ConnectedAccountsSection({
  accounts,
  hasGoogleLinked,
  hasGithubLinked,
  isError,
  onAccountsChange,
}: ConnectedAccountsSectionProps) {
  const t = useTranslations("settings.connectedAccounts");
  const tSettingsShared = useTranslations("settings.shared");
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  const canUnlink = accounts.length > 1;
  const disconnectHint = canUnlink ? null : t("disconnectHint");

  function handleLinkAccount(provider: "google" | "github") {
    if (isDemoModeClient()) {
      toast.error(DEMO_DISABLED_MESSAGE);
      return;
    }
    setLoadingProvider(provider);
    startSocialSignInAction({
      provider,
      returnTo: window.location.pathname,
    }).catch(() => {
      setLoadingProvider(null);
      toast.error(t("connectFailed"));
    });
  }

  async function handleUnlinkAccount(provider: "google" | "github") {
    if (!canUnlink) {
      toast.error(t("needOneLoginMethod"));
      return;
    }

    const providerName = provider === "google" ? "Google" : "GitHub";
    setLoadingProvider(provider);
    try {
      const result = await authClient.unlinkAccount({
        providerId: provider,
      });

      if (result.error) {
        const message = errorMessageOr(
          result.error.message,
          t("unlinkFailed", { provider: providerName })
        );
        toast.error(message);
        setLoadingProvider(null);
        return;
      }

      toast.success(t("unlinked", { provider: providerName }));
      onAccountsChange();
    } catch {
      toast.error(t("unlinkFailed", { provider: providerName }));
    }
    setLoadingProvider(null);
  }

  if (isError) {
    return (
      <TitleCard heading={tSettingsShared("connectedAccounts")}>
        <div className="border-destructive/50 bg-destructive/10 rounded-lg border p-4 text-center">
          <p className="text-destructive text-sm">{t("loadFailed")}</p>
        </div>
      </TitleCard>
    );
  }

  return (
    <TitleCard
      className="lg:col-span-2"
      heading={tSettingsShared("connectedAccounts")}
    >
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">{t("description")}</p>

        <div className="divide-y">
          <ConnectedAccountRow
            canUnlink={canUnlink}
            disconnectHint={disconnectHint}
            icon={<Google className="size-5" />}
            linked={hasGoogleLinked}
            loading={loadingProvider === "google"}
            name="Google"
            onLink={() => handleLinkAccount("google")}
            onUnlink={() => handleUnlinkAccount("google")}
          />
          <ConnectedAccountRow
            canUnlink={canUnlink}
            disconnectHint={disconnectHint}
            icon={<Github className="size-5" />}
            linked={hasGithubLinked}
            loading={loadingProvider === "github"}
            name="GitHub"
            onLink={() => handleLinkAccount("github")}
            onUnlink={() => handleUnlinkAccount("github")}
          />
        </div>
      </div>
    </TitleCard>
  );
}
