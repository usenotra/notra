"use client";

import {
  Alert02Icon,
  Calendar03Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/button";
import { ScheduleContentDialog } from "@/components/content/schedule/schedule-content-dialog";
import { SCHEDULE_SLOT_DATE_FORMAT } from "@/constants/content-calendar";
import { usePostSchedule } from "@/lib/hooks/use-content-calendar";
import { useLocalDateFormat } from "@/lib/hooks/use-local-date-format";
import { cn } from "@/lib/utils";
import type { ContentScheduleButtonProps } from "@/types/content/schedule";
import { summarizePostSchedule } from "@/utils/content-calendar";

export function ContentScheduleButton({
  organizationId,
  organizationSlug,
  contentId,
  contentType,
  title,
  hasUnsavedChanges,
  published,
}: ContentScheduleButtonProps) {
  const t = useTranslations("content.calendar.schedule");
  const formatDate = useLocalDateFormat();
  const [open, setOpen] = useState(false);
  const { data } = usePostSchedule(organizationId, contentId);
  const schedule = data?.schedule ?? null;
  const { state, active, failed } = summarizePostSchedule(schedule);
  // A schedule still going out, or one with failures to resolve.
  const live = active || failed;

  if (published && !live) {
    return null;
  }

  let icon = Calendar03Icon;
  let label = t("trigger");
  if (state === "publishing") {
    icon = Loading03Icon;
    label = t("publishingTrigger");
  } else if (failed) {
    icon = Alert02Icon;
    label = t("failedTrigger");
  } else if (state === "scheduled" && schedule) {
    label = t("scheduledTrigger", {
      date: formatDate(
        new Date(schedule.scheduledAt),
        SCHEDULE_SLOT_DATE_FORMAT
      ),
    });
  }

  // Unsaved edits would not be part of what goes out, so they block a new
  // schedule; an existing one stays reachable to cancel or inspect it.
  const blocked = hasUnsavedChanges && !live;
  const button = (
    <Button
      disabled={blocked}
      onClick={() => setOpen(true)}
      size="sm"
      variant="outline"
    >
      <HugeiconsIcon
        className={cn(
          "size-4",
          state === "publishing" && "animate-spin",
          failed && "text-destructive"
        )}
        icon={icon}
      />
      <span className="max-w-52 truncate">{label}</span>
    </Button>
  );

  return (
    <>
      {blocked ? (
        <Tooltip>
          <TooltipTrigger render={<span className="inline-flex" />}>
            {button}
          </TooltipTrigger>
          <TooltipContent>{t("saveFirst")}</TooltipContent>
        </Tooltip>
      ) : (
        button
      )}
      <ScheduleContentDialog
        contentId={contentId}
        contentType={contentType}
        hasUnsavedChanges={hasUnsavedChanges}
        onOpenChange={setOpen}
        open={open}
        organizationId={organizationId}
        organizationSlug={organizationSlug}
        schedule={schedule}
        title={title}
      />
    </>
  );
}
