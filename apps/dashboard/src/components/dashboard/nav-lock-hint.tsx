"use client";

import { SquareLock02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useEffect, useRef } from "react";

import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { PAYWALL_KINDS } from "@/constants/analytics-events";
import { trackEvent } from "@/lib/analytics/posthog-client";
import { toAnalyticsRoute } from "@/lib/analytics/route";
import { usePathname } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import type { NavLockHintProps } from "@/types/components/nav";

export function NavLockHint({ message, className }: NavLockHintProps) {
  const { activeOrganization } = useOrganizationsContext();
  const pathname = usePathname();
  const route = toAnalyticsRoute(pathname, activeOrganization?.slug);
  const shownRef = useRef(false);

  useEffect(() => {
    if (shownRef.current) {
      return;
    }
    shownRef.current = true;
    trackEvent(POSTHOG_EVENTS.PAYWALL_SHOWN, {
      kind: PAYWALL_KINDS.NAV_LOCK,
      route,
    });
  }, [route]);

  return (
    <Tooltip>
      <TooltipTrigger
        className={cn(
          "text-muted-foreground ml-auto inline-flex shrink-0 items-center group-data-[collapsible=icon]:hidden",
          className
        )}
        render={<span />}
      >
        <HugeiconsIcon className="size-3.5" icon={SquareLock02Icon} />
        <span className="sr-only">{message}</span>
      </TooltipTrigger>
      <TooltipContent side="right">{message}</TooltipContent>
    </Tooltip>
  );
}
