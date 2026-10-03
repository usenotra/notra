"use client";

import { Linkedin02Icon, NewTwitterIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@notra/ui/components/ui/dropdown-menu";
import {
  SplitButton,
  SplitButtonTrigger,
} from "@notra/ui/components/ui/split-button";
import { Loader2Icon } from "lucide-react";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { INTEGRATION_PROVIDERS } from "@/constants/integration-analytics";
import { trackEvent } from "@/lib/analytics/posthog-client";
import { useHandleConnectSocialAccount } from "@/lib/hooks/use-connected-accounts";
import type { ConnectAccountsButtonsProps } from "@/types/analytics";

export function ConnectAccountsButtons({
  organizationId,
}: ConnectAccountsButtonsProps) {
  const t = useTranslations("analytics.connect");
  const twitter = useHandleConnectSocialAccount(organizationId, "twitter");
  const linkedin = useHandleConnectSocialAccount(organizationId, "linkedin");

  return (
    <SplitButton>
      <Button
        loading={twitter.isPending}
        onClick={() => {
          trackEvent(POSTHOG_EVENTS.INTEGRATION_CONNECT_STARTED, {
            provider: INTEGRATION_PROVIDERS.X,
          });
          void twitter.handleConnect();
        }}
      >
        <HugeiconsIcon className="size-4" icon={NewTwitterIcon} />
        {t("connectX")}
      </Button>
      <DropdownMenu>
        <SplitButtonTrigger label={t("another")} />
        <DropdownMenuContent align="end" className="min-w-52">
          <DropdownMenuItem
            disabled={linkedin.isPending}
            onClick={() => {
              trackEvent(POSTHOG_EVENTS.INTEGRATION_CONNECT_STARTED, {
                provider: INTEGRATION_PROVIDERS.LINKEDIN,
              });
              void linkedin.handleConnect();
            }}
          >
            {linkedin.isPending ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <HugeiconsIcon className="size-4" icon={Linkedin02Icon} />
            )}
            <span className="whitespace-nowrap">{t("connectLinkedIn")}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SplitButton>
  );
}
