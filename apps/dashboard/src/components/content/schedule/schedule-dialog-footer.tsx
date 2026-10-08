"use client";

import {
  CalendarRemove01Icon,
  MoreHorizontalIcon,
  SentIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { ResponsiveDialogFooter } from "@notra/ui/components/shared/responsive-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { SCHEDULE_DIALOG_MODES } from "@/constants/content-calendar";
import type { ScheduleDialogFooterProps } from "@/types/content/schedule";

/**
 * One button per footer: the form's submit, or the schedule's own action when
 * there is nothing to edit. Rarer actions on an editable schedule (publish
 * now, unschedule) sit in a menu so they don't compete with saving.
 */
export function ScheduleDialogFooter({
  mode,
  isBusy,
  canSubmit,
  canPublishNow,
  isSubmitting,
  onSecondaryAction,
  onPublishNow,
}: ScheduleDialogFooterProps) {
  const t = useTranslations("content.calendar.schedule");
  const config = SCHEDULE_DIALOG_MODES[mode];
  let submitLabel = mode === "edit" ? t("saveSchedule") : t("schedule");
  if (isSubmitting) {
    submitLabel = t("scheduling");
  }

  if (!config.editable) {
    return (
      <ResponsiveDialogFooter>
        {config.secondaryAction ? (
          <Button
            disabled={isBusy}
            onClick={onSecondaryAction}
            type="button"
            variant="outline"
          >
            {t(config.secondaryAction)}
          </Button>
        ) : null}
      </ResponsiveDialogFooter>
    );
  }

  return (
    <ResponsiveDialogFooter>
      {config.canPublishNow || config.secondaryAction ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={isBusy}
            render={
              <Button
                aria-label={t("moreActions")}
                className="sm:mr-auto"
                size="icon"
                type="button"
                variant="outline"
              >
                <HugeiconsIcon aria-hidden="true" icon={MoreHorizontalIcon} />
              </Button>
            }
          />
          <DropdownMenuContent align="start" className="w-44">
            {config.canPublishNow ? (
              <DropdownMenuItem
                disabled={!canPublishNow}
                onClick={onPublishNow}
              >
                <HugeiconsIcon aria-hidden="true" icon={SentIcon} />
                {t("publishNow")}
              </DropdownMenuItem>
            ) : null}
            {config.secondaryAction ? (
              <DropdownMenuItem
                onClick={onSecondaryAction}
                variant="destructive"
              >
                <HugeiconsIcon aria-hidden="true" icon={CalendarRemove01Icon} />
                {t(config.secondaryAction)}
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
      <Button disabled={!canSubmit} type="submit">
        {submitLabel}
      </Button>
    </ResponsiveDialogFooter>
  );
}
