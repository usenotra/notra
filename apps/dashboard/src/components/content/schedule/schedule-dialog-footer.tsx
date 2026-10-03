"use client";

import {
  ResponsiveDialogClose,
  ResponsiveDialogFooter,
} from "@notra/ui/components/shared/responsive-dialog";
import { useTranslations } from "next-intl";

import { Button } from "@/components/button";
import { SCHEDULE_DIALOG_MODES } from "@/constants/content-calendar";
import type { ScheduleDialogFooterProps } from "@/types/content/schedule";

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
  const tCommon = useTranslations("common.actions");
  const config = SCHEDULE_DIALOG_MODES[mode];
  let submitLabel = mode === "edit" ? t("saveSchedule") : t("schedule");
  if (isSubmitting) {
    submitLabel = t("scheduling");
  }

  return (
    <ResponsiveDialogFooter className="sm:justify-between">
      <div className="flex flex-col-reverse gap-2 sm:flex-row">
        {config.secondaryAction ? (
          <Button
            disabled={isBusy}
            onClick={onSecondaryAction}
            type="button"
            variant="ghost"
          >
            {t(config.secondaryAction)}
          </Button>
        ) : null}
        {config.canPublishNow ? (
          <Button
            disabled={isBusy || !canPublishNow}
            onClick={onPublishNow}
            type="button"
            variant="outline"
          >
            {t("publishNow")}
          </Button>
        ) : null}
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row">
        <ResponsiveDialogClose
          disabled={isBusy}
          render={<Button type="button" variant="outline" />}
        >
          {config.editable ? tCommon("cancel") : tCommon("close")}
        </ResponsiveDialogClose>
        {config.editable ? (
          <Button disabled={!canSubmit} type="submit">
            {submitLabel}
          </Button>
        ) : null}
      </div>
    </ResponsiveDialogFooter>
  );
}
