"use client";

import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ScheduledPublicationView } from "@notra/ai/types/scheduled-publications";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { ScheduleDestinationMark } from "@/components/content/schedule/schedule-destination-mark";
import { ScheduledPublicationStatus } from "@/components/content/schedule/scheduled-publication-status";
import { useRetryScheduledPublication } from "@/lib/hooks/use-content-calendar";
import type { ScheduleDestinationStatusListProps } from "@/types/content/schedule";

function DestinationRow({
  contentId,
  organizationId,
  publication,
  socialPlatform,
}: Omit<ScheduleDestinationStatusListProps, "schedule"> & {
  publication: ScheduledPublicationView;
}) {
  const t = useTranslations("content.calendar.schedule");
  const retry = useRetryScheduledPublication(organizationId);
  const failed = publication.status === "failed";
  const outcomeUnknown = publication.errorCode === "outcome_unknown";
  let note: string | null = null;
  if (failed) {
    note = outcomeUnknown
      ? t("outcomeUnknown")
      : (publication.lastError ?? t("failedFallback"));
  } else if (publication.status === "scheduled" && publication.attempts > 0) {
    note = t("retryPending", { error: publication.lastError ?? "" });
  }

  return (
    <li className="flex flex-col gap-1 px-3 py-2.5">
      <div className="flex min-h-7 items-center justify-between gap-3">
        <ScheduleDestinationMark
          destination={publication.destination}
          socialPlatform={socialPlatform}
        />
        <div className="flex shrink-0 items-center gap-2">
          <ScheduledPublicationStatus
            className="text-muted-foreground"
            status={publication.status}
          />
          {publication.resultUrl ? (
            <Button
              nativeButton={false}
              render={
                <a
                  aria-label={t("viewResult")}
                  href={publication.resultUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                />
              }
              size="icon-sm"
              variant="ghost"
            >
              <HugeiconsIcon icon={ArrowUpRight01Icon} />
            </Button>
          ) : null}
          {failed ? (
            <Button
              disabled={retry.isPending}
              onClick={() =>
                retry.mutate({
                  contentId,
                  scheduledPublicationId: publication.id,
                })
              }
              size="sm"
              type="button"
              variant="outline"
            >
              {outcomeUnknown ? t("retryAnyway") : t("retry")}
            </Button>
          ) : null}
        </div>
      </div>
      {note ? (
        <p className="text-muted-foreground pl-6 text-xs text-pretty">{note}</p>
      ) : null}
    </li>
  );
}

/** Where a post went out: one row per destination with its status. */
export function ScheduleDestinationStatusList({
  schedule,
  ...rowProps
}: ScheduleDestinationStatusListProps) {
  return (
    <ul className="bg-card ring-foreground/10 divide-border divide-y rounded-xl ring-1">
      {schedule.publications.map((publication) => (
        <DestinationRow
          key={publication.id}
          publication={publication}
          {...rowProps}
        />
      ))}
    </ul>
  );
}
