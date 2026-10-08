import { HugeiconsIcon } from "@hugeicons/react";

import { cn } from "@/lib/utils";
import type { SiteMetaProps } from "@/types/components/sites";

export function SiteMeta({
  icon,
  children,
  mono = false,
  className,
}: SiteMetaProps) {
  return (
    <span
      className={cn(
        "text-muted-foreground inline-flex min-w-0 items-center gap-1.5 text-sm",
        className
      )}
    >
      <HugeiconsIcon
        className="size-4 shrink-0"
        icon={icon}
        strokeWidth={1.5}
      />
      <span
        className={cn("min-w-0 truncate", mono && "font-mono text-[0.8125rem]")}
      >
        {children}
      </span>
    </span>
  );
}
