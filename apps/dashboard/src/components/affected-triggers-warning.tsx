"use client";

import { Calendar03Icon, SentIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { AffectedTrigger } from "@notra/schemas/dashboard/integrations";
import { useTranslations } from "next-intl";

interface AffectedTriggersWarningProps {
  schedules: AffectedTrigger[];
  events: AffectedTrigger[];
  isLoading: boolean;
  resourceLabel: "integration" | "identity";
}

export function AffectedTriggersWarning({
  schedules,
  events,
  isLoading,
  resourceLabel,
}: AffectedTriggersWarningProps) {
  const t = useTranslations("integrations.affectedTriggers");

  if (isLoading) {
    return null;
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
          label={t("schedulesLabel", { count: schedules.length })}
        />
      )}
      {hasEvents && (
        <TriggerGroup
          icon={SentIcon}
          items={events}
          label={t("eventsLabel", { count: events.length })}
        />
      )}
      <p className="text-muted-foreground text-xs">
        {(() => {
          if (hasSchedules && hasEvents) {
            return t("bothNote", { resource: resourceLabel });
          }
          if (hasSchedules) {
            return t("schedulesNote", { resource: resourceLabel });
          }
          return t("eventsNote", { resource: resourceLabel });
        })()}
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
  const t = useTranslations("integrations.affectedTriggers");
  return (
    <>
      <div className="text-muted-foreground flex items-center gap-2">
        <HugeiconsIcon icon={icon} size={18} />
        <p className="text-sm font-medium">{label}</p>
      </div>
      <div className="space-y-2 rounded-lg border border-dashed p-3">
        {items.slice(0, 3).map((item) => (
          <div className="flex items-center gap-2" key={item.id}>
            <p className="min-w-0 text-sm wrap-anywhere">{item.name}</p>
          </div>
        ))}
        {items.length > 3 && (
          <p className="text-muted-foreground text-xs">
            {t("more", { count: items.length - 3 })}
          </p>
        )}
      </div>
    </>
  );
}
