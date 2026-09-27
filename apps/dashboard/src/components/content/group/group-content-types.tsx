"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { cn } from "@notra/ui/lib/utils";

import { useOutputTypeLabel } from "@/lib/hooks/use-output-type-label";
import type {
  GroupContentTypesProps,
  GroupTypeIconProps,
} from "@/types/content/collection";
import { getOutputTypeIconClass, OutputTypeIcon } from "@/utils/output-types";

const MAX_VISIBLE_TYPES = 4;

function GroupTypeIcon({ type, className = "size-4" }: GroupTypeIconProps) {
  return (
    <OutputTypeIcon
      className={cn(className, getOutputTypeIconClass(type))}
      outputType={type}
    />
  );
}

export function GroupContentTypes({ contentTypes }: GroupContentTypesProps) {
  const outputTypeLabel = useOutputTypeLabel();
  if (contentTypes.length === 0) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }

  const visible = contentTypes.slice(0, MAX_VISIBLE_TYPES);
  const hiddenCount = contentTypes.length - visible.length;

  return (
    <div className="flex items-center gap-2">
      {visible.map((type) => (
        <Tooltip key={type}>
          <TooltipTrigger
            render={
              <span className="flex items-center justify-center">
                <GroupTypeIcon type={type} />
              </span>
            }
          />
          <TooltipContent>{outputTypeLabel(type)}</TooltipContent>
        </Tooltip>
      ))}
      {hiddenCount > 0 && (
        <span className="text-muted-foreground text-xs tabular-nums">
          +{hiddenCount}
        </span>
      )}
    </div>
  );
}
