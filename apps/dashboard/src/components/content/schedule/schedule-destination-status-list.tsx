"use client";

import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ScheduledPublicationView } from "@notra/ai/types/scheduled-publications";
import { Badge } from "@notra/ui/components/ui/badge";
import { useTranslations } from "next-intl";

import { Button } from "@/components/button";
import { SCHEDULED_PUBLICATION_STATUS_BADGE_VARIANTS } from "@/constants/content-calendar";
import { useRetryScheduledPublication } from "@/lib/hooks/use-content-calendar";
import type {
  ScheduleDestinationStatusListProps,
  ScheduledPublicationStatusBadgeProps,
} from "@/types/content/schedule";

export function ScheduledPublicationStatusBadge({
  status,
}: ScheduledPublicationStatusBadgeProps) {
  const t = useTranslations("content.calendar.schedule");
  return (
    <Badge variant={SCHEDULED_PUBLICATION_STATUS_BADGE_VARIANTS[status]}>
      {t(`statuses.${status}`)}
    </Badge>
  );
}

function DestinationRow({
  contentId,
  organizationId,
  publication,
}: {
  contentId: string;
  organizationId: string;
  publication: ScheduledPublicationView;
}) {
  const t = useTranslations("content.calendar.schedule");
  const retry = useRetryScheduledPublication(organizationId);
  const outcomeUnknown = publication.errorCode === "outcome_unknown";

  return (
    <li className="flex flex-col gap-1.5 py-2.5 first:pt-0 last:pb-0">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">
          {t(`destinations.${publication.destination}`)}
        </span>
        <div className="flex items-center gap-2">
          {publication.resultUrl ? (
            <a
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5 text-xs underline-offset-4 hover:underline"
              href={publication.resultUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              {t("viewResult")}
              <HugeiconsIcon className="size-3" icon={ArrowUpRight01Icon} />
            </a>
          ) : null}
          <ScheduledPublicationStatusBadge status={publication.status} />
        </div>
      </div>
      {publication.status === "failed" ? (
        <div className="flex items-start justify-between gap-3">
          <p className="text-muted-foreground text-xs text-pretty">
            {outcomeUnknown
              ? t("outcomeUnknown")
              : (publication.lastError ?? t("failedFallback"))}
          </p>
          <Button
            disabled={retry.isPending}
            onClick={() =>
              retry.mutate({
                contentId,
                scheduledPublicationId: publication.id,
              })
            }
            size="xs"
            type="button"
            variant="outline"
          >
            {outcomeUnknown ? t("retryAnyway") : t("retry")}
          </Button>
        </div>
      ) : null}
      {publication.status === "scheduled" && publication.attempts > 0 ? (
        <p className="text-muted-foreground text-xs text-pretty">
          {t("retryPending", { error: publication.lastError ?? "" })}
        </p>
      ) : null}
    </li>
  );
}

export function ScheduleDestinationStatusList({
  contentId,
  organizationId,
  schedule,
}: ScheduleDestinationStatusListProps) {
  return (
    <ul className="divide-border divide-y rounded-lg border px-3 py-2.5">
      {schedule.publications.map((publication) => (
        <DestinationRow
          contentId={contentId}
          key={publication.id}
          organizationId={organizationId}
          publication={publication}
        />
      ))}
    </ul>
  );
}
