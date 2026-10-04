import {
  Alert02Icon,
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import Link from "@/components/framework/link";
import { cn } from "@/lib/utils";
import type { IrisReadinessListProps } from "@/types/iris";

export function IrisReadinessList({ items }: IrisReadinessListProps) {
  return (
    <ul className="divide-border border-border divide-y rounded-xl border">
      {items.map((item) => (
        <li
          className="flex items-center gap-3 px-4 py-3 text-sm"
          key={item.key}
        >
          <HugeiconsIcon
            className={cn(
              "size-4 shrink-0",
              item.ready ? "text-success" : "text-warning"
            )}
            icon={item.ready ? CheckmarkCircle02Icon : Alert02Icon}
          />
          <div className="min-w-0 flex-1">
            <p className="font-medium">{item.label}</p>
            <p className="text-muted-foreground text-xs">{item.description}</p>
          </div>
          <Link
            className="text-muted-foreground hover:text-foreground inline-flex shrink-0 items-center gap-1 text-xs"
            href={item.href}
          >
            {item.actionLabel}
            <HugeiconsIcon className="size-3.5" icon={ArrowRight01Icon} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
