"use client";

import {
  ArrowDown01Icon,
  Linkedin02Icon,
  NewTwitterIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/button";
import { CONNECT_X_CLASS } from "@/constants/analytics";
import { INTEGRATION_PROVIDERS } from "@/constants/integration-analytics";
import { trackEvent } from "@/lib/analytics/posthog-client";
import { useHandleConnectSocialAccount } from "@/lib/hooks/use-connected-accounts";
import { cn } from "@/lib/utils";
import type { ConnectAccountsButtonsProps } from "@/types/analytics";

const SPLIT_SHELL_CLASS =
  "m-0 inline-flex min-w-0 items-stretch overflow-hidden border-0 bg-[#0f1419] p-0 shadow-[0px_0px_0px_2.5px_rgba(255,255,255,0.08)_inset] corner-squircle rounded-md supports-[corner-shape:squircle]:rounded-[1.25rem] dark:bg-white";

const SPLIT_SEGMENT_CLASS =
  "rounded-none shadow-none active:scale-100 focus-visible:z-10 focus-visible:ring-inset";

export function ConnectAccountsButtons({
  organizationId,
}: ConnectAccountsButtonsProps) {
  const twitter = useHandleConnectSocialAccount(organizationId, "twitter");
  const linkedin = useHandleConnectSocialAccount(organizationId, "linkedin");

  return (
    <fieldset className={SPLIT_SHELL_CLASS}>
      <Button
        className={cn(CONNECT_X_CLASS, SPLIT_SEGMENT_CLASS, "gap-2")}
        disabled={twitter.isPending}
        onClick={() => {
          trackEvent(POSTHOG_EVENTS.INTEGRATION_CONNECT_STARTED, {
            provider: INTEGRATION_PROVIDERS.X,
          });
          void twitter.handleConnect();
        }}
      >
        {twitter.isPending ? (
          <Loader2Icon className="size-4 animate-spin" />
        ) : (
          <HugeiconsIcon className="size-4" icon={NewTwitterIcon} />
        )}
        Connect X
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              aria-label="Connect another platform"
              className={cn(
                CONNECT_X_CLASS,
                SPLIT_SEGMENT_CLASS,
                "border-l border-white/20 px-2.5! dark:border-black/15"
              )}
            />
          }
        >
          <HugeiconsIcon className="size-4" icon={ArrowDown01Icon} />
        </DropdownMenuTrigger>
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
            <span className="whitespace-nowrap">Connect LinkedIn</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </fieldset>
  );
}
