"use client";

import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Github } from "@notra/ui/components/ui/svgs/github";
import { Google } from "@notra/ui/components/ui/svgs/google";
import { TitleCard } from "@notra/ui/components/ui/title-card";
import { Loader2Icon } from "lucide-react";
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
      toast.error("Could not start the connection. Please try again.");
    });
  }

  async function handleUnlinkAccount(provider: "google" | "github") {
    if (!canUnlink) {
      toast.error("You must have at least one login method");
      return;
    }

    setLoadingProvider(provider);
    try {
      const result = await authClient.unlinkAccount({
        providerId: provider,
      });

      if (result.error) {
        const message = errorMessageOr(
          result.error.message,
          `Failed to unlink ${provider}`
        );
        toast.error(message);
        setLoadingProvider(null);
        return;
      }

      toast.success(`${provider} account unlinked`);
      onAccountsChange();
    } catch {
      toast.error(`Failed to unlink ${provider}`);
    }
    setLoadingProvider(null);
  }

  if (isError) {
    return (
      <TitleCard className="lg:col-span-2" heading="Connected Accounts">
        <div className="border-destructive/50 bg-destructive/10 rounded-lg border p-4 text-center">
          <p className="text-destructive text-sm">
            Failed to load connected accounts. Please refresh the page.
          </p>
        </div>
      </TitleCard>
    );
  }

  return (
    <TitleCard className="lg:col-span-2" heading="Connected Accounts">
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">
          Connect your social accounts for easier sign-in
        </p>

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
                    ? "Connected to your Google account"
                    : "Sign in with Google"}
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
                    Disconnect
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
                  "Connect"
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
                    ? "Connected to your GitHub account"
                    : "Sign in with GitHub"}
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
                    Disconnect
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
                  "Connect"
                )}
              </Button>
            )}
          </div>
        </div>

        {!canUnlink && (
          <p className="text-muted-foreground text-xs">
            You need at least one connected account or password to sign in
          </p>
        )}
      </div>
    </TitleCard>
  );
}
