"use client";

import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { SITE_OVERVIEW_LINK_CLASS } from "@/constants/sites";
import { cn } from "@/lib/utils";
import type { SiteOverviewExternalLinkProps } from "@/types/components/sites";

export function SiteOverviewExternalLink({
  href,
  children,
  muted = false,
}: SiteOverviewExternalLinkProps) {
  return (
    <a
      className="group inline-flex min-w-0 items-center gap-1"
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      <span
        className={cn(
          SITE_OVERVIEW_LINK_CLASS,
          muted && "text-muted-foreground"
        )}
      >
        {children}
      </span>
      <HugeiconsIcon
        aria-hidden="true"
        className="text-muted-foreground group-hover:text-foreground size-3.5 shrink-0 transition-colors duration-150"
        icon={ArrowUpRight01Icon}
        strokeWidth={1.5}
      />
    </a>
  );
}
