"use client";

import { useTranslations } from "use-intl";

import { SCHEDULED_PUBLICATION_STATUS_DOTS } from "@/constants/content-calendar";
import { cn } from "@/lib/utils";
import type { ScheduledPublicationStatusProps } from "@/types/content/schedule";

/** A destination's status: a colored dot and its label. */
export function ScheduledPublicationStatus({
  status,
  className,
}: ScheduledPublicationStatusProps) {
  const t = useTranslations("content.calendar.schedule");
  return (
    <span className={cn("flex items-center gap-1.5 text-xs", className)}>
      <span
        aria-hidden
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          SCHEDULED_PUBLICATION_STATUS_DOTS[status]
        )}
      />
      {t(`statuses.${status}`)}
    </span>
  );
}
