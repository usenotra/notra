"use client";

import { Robot01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { EngineIcon } from "@/components/geo/engine-icon";
import { cn } from "@/lib/utils";
import type {
  TrafficSourceGroupIconProps,
  TrafficSourceIconStackProps,
} from "@/types/geo";

export function TrafficSourceGroupIcon({
  group,
  className,
}: TrafficSourceGroupIconProps) {
  if (group.icon === null) {
    return (
      <HugeiconsIcon
        aria-hidden="true"
        className={cn("text-muted-foreground size-4 shrink-0", className)}
        icon={Robot01Icon}
      />
    );
  }
  return <EngineIcon className={className} engine={group.icon} />;
}

export function TrafficSourceIconStack({
  engines,
  overflow = 0,
  className,
}: TrafficSourceIconStackProps) {
  return (
    <span className={cn("flex shrink-0 items-center", className)}>
      {engines.map((engine, index) => (
        <span
          className="bg-background border-border -ml-1.5 flex size-6 items-center justify-center rounded-full border first:ml-0"
          key={`${engine}-${index}`}
          style={{ zIndex: engines.length - index }}
        >
          <EngineIcon className="size-3.5" engine={engine} />
        </span>
      ))}
      {overflow > 0 ? (
        <span className="bg-muted border-border text-muted-foreground -ml-1.5 flex size-6 items-center justify-center rounded-full border text-[0.625rem] font-medium tabular-nums">
          +{overflow}
        </span>
      ) : null}
    </span>
  );
}
