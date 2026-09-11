import { HugeiconsIcon } from "@hugeicons/react";

import { cn } from "@notra/ui/lib/utils";
import type { SecurityMethodRowProps } from "../../../lib/security-types";

export function SecurityMethodRow({
  icon,
  title,
  description,
  action,
  children,
  className,
}: SecurityMethodRowProps) {
  return (
    <div className={cn("py-3 first:pt-0 last:pb-0", className)}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <HugeiconsIcon icon={icon} size={18} />
          </div>
          <div className="min-w-0">
            <div className="font-medium text-sm">{title}</div>
            {description && (
              <p className="text-muted-foreground text-xs">{description}</p>
            )}
          </div>
        </div>
        {action && (
          <div className="flex shrink-0 items-center gap-2">{action}</div>
        )}
      </div>
      {children && <div className="mt-4 pl-12">{children}</div>}
    </div>
  );
}
