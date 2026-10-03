import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** One piece of metadata with its icon: a branch, a commit, an author, a domain. */
export function SiteMeta({
  icon,
  children,
  mono = false,
  className,
}: {
  icon: IconSvgElement;
  children: ReactNode;
  /** For SHAs and branch names. */
  mono?: boolean;
  className?: string;
}) {
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
