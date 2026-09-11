"use client";

import { Calendar03Icon, SentIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { AffectedTrigger } from "@notra/schemas/dashboard/integrations";
import { Skeleton } from "@notra/ui/components/ui/skeleton";

interface AffectedTriggersWarningProps {
  schedules: AffectedTrigger[];
  events: AffectedTrigger[];
  isLoading: boolean;
  resourceLabel: string;
}

export function AffectedTriggersWarning({
  schedules,
  events,
  isLoading,
  resourceLabel,
}: AffectedTriggersWarningProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    );
  }

  const hasSchedules = schedules.length > 0;
  const hasEvents = events.length > 0;

  if (!hasSchedules && !hasEvents) {
    return null;
  }

  return (
    <div className="space-y-3">
      {hasSchedules && (
        <TriggerGroup
          icon={Calendar03Icon}
          items={schedules}
          label={
            schedules.length === 1
              ? "This schedule will be disabled:"
              : "These schedules will be disabled:"
          }
        />
      )}
      {hasEvents && (
        <TriggerGroup
          icon={SentIcon}
          items={events}
          label={
            events.length === 1
              ? "This event will be disabled:"
              : "These events will be disabled:"
          }
        />
      )}
      <p className="text-muted-foreground text-xs">
        {(() => {
          if (hasSchedules && hasEvents) {
            return `These schedules and events use this ${resourceLabel} and will be disabled.`;
          }
          if (hasSchedules) {
            return `These schedules use this ${resourceLabel} and will be disabled.`;
          }
          return `These events use this ${resourceLabel} and will be disabled.`;
        })()}{" "}
        You&apos;ll need to edit them before re-enabling.
      </p>
    </div>
  );
}

interface TriggerGroupProps {
  icon: typeof Calendar03Icon;
  label: string;
  items: AffectedTrigger[];
}

function TriggerGroup({ icon, label, items }: TriggerGroupProps) {
  return (
    <>
      <div className="text-muted-foreground flex items-center gap-2">
        <HugeiconsIcon icon={icon} size={18} />
        <p className="text-sm font-medium">{label}</p>
      </div>
      <div className="space-y-2 rounded-lg border border-dashed p-3">
        {items.slice(0, 3).map((item) => (
          <div className="flex items-center gap-2" key={item.id}>
            <p className="text-sm">{item.name}</p>
          </div>
        ))}
        {items.length > 3 && (
          <p className="text-muted-foreground text-xs">
            and {items.length - 3} more…
          </p>
        )}
      </div>
    </>
  );
}
