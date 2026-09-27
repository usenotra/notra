"use client";

import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Github } from "@notra/ui/components/ui/svgs/github";
import { Google } from "@notra/ui/components/ui/svgs/google";
import { TitleCard } from "@notra/ui/components/ui/title-card";
import { Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { authClient } from "@/lib/auth/client";
import { isNextRedirectError } from "@/lib/auth/redirect-error";
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
  const tCommon = useTranslations("common.actions");
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  const canUnlink = accounts.length > 1;

  function handleLinkAccount(provider: "google" | "github") {
    setLoadingProvider(provider);
    startSocialSignInAction({
      provider,
      returnTo: window.location.pathname,
    }).catch((error) => {
      if (isNextRedirectError(error)) {
        return;
      }
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
      <TitleCard
        className="lg:col-span-2"
        heading={tSettingsShared("connectedAccounts")}
      >
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

        <div className="space-y-3">
          <div className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-lg">
                <Google className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">Google</p>
                <p className="text-muted-foreground text-xs">
                  {hasGoogleLinked
                    ? t("connectedTo", { provider: "Google" })
                    : t("signInWith", { provider: "Google" })}
                </p>
              </div>
            </div>
            {hasGoogleLinked ? (
              <Button
                className="shrink-0 self-start sm:self-auto"
                disabled={!canUnlink || loadingProvider === "google"}
                onClick={() => handleUnlinkAccount("google")}
                size="sm"
                variant="outline"
              >
                {loadingProvider === "google" ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <>
                    <HugeiconsIcon icon={Cancel01Icon} size={16} />
                    {tCommon("disconnect")}
                  </>
                )}
              </Button>
            ) : (
              <Button
                className="shrink-0 self-start sm:self-auto"
                disabled={loadingProvider === "google"}
                onClick={() => handleLinkAccount("google")}
                size="sm"
                variant="outline"
              >
                {loadingProvider === "google" ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  tCommon("connect")
                )}
              </Button>
            )}
          </div>

          <div className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-lg">
                <Github className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">GitHub</p>
                <p className="text-muted-foreground text-xs">
                  {hasGithubLinked
                    ? t("connectedTo", { provider: "GitHub" })
                    : t("signInWith", { provider: "GitHub" })}
                </p>
              </div>
            </div>
            {hasGithubLinked ? (
              <Button
                className="shrink-0 self-start sm:self-auto"
                disabled={!canUnlink || loadingProvider === "github"}
                onClick={() => handleUnlinkAccount("github")}
                size="sm"
                variant="outline"
              >
                {loadingProvider === "github" ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <>
                    <HugeiconsIcon icon={Cancel01Icon} size={16} />
                    {tCommon("disconnect")}
                  </>
                )}
              </Button>
            ) : (
              <Button
                className="shrink-0 self-start sm:self-auto"
                disabled={loadingProvider === "github"}
                onClick={() => handleLinkAccount("github")}
                size="sm"
                variant="outline"
              >
                {loadingProvider === "github" ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  tCommon("connect")
                )}
              </Button>
            )}
          </div>
        </div>

        {!canUnlink && (
          <p className="text-muted-foreground text-xs">{t("needOneAccount")}</p>
        )}
      </div>
    </TitleCard>
  );
}
