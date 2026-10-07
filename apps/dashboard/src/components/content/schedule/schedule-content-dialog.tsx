"use client";

import { scheduleDestinationsForContentType } from "@notra/ai/utils/schedule-destinations";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@notra/ui/components/shared/responsive-dialog";
import { startOfDay } from "date-fns";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { ScheduleWhereSection } from "@/components/content/schedule/schedule-destination-fields";
import { ScheduleDestinationStatusList } from "@/components/content/schedule/schedule-destination-status-list";
import { ScheduleDialogFooter } from "@/components/content/schedule/schedule-dialog-footer";
import { ScheduleSlotField } from "@/components/content/schedule/schedule-slot-field";
import {
  SCHEDULE_DIALOG_MODES,
  SCHEDULE_SLOT_DATE_FORMAT,
} from "@/constants/content-calendar";
import {
  useCancelPostSchedule,
  usePublishScheduleNow,
  useSchedulePost,
} from "@/lib/hooks/use-content-calendar";
import { useLocalDateFormat } from "@/lib/hooks/use-local-date-format";
import { useScheduleDestinations } from "@/lib/hooks/use-schedule-destinations";
import type {
  ScheduleContentDialogProps,
  ScheduleFormState,
} from "@/types/content/schedule";
import {
  combineDateAndTime,
  getScheduleDialogMode,
  initialScheduleFormState,
  summarizePostSchedule,
} from "@/utils/content-calendar";
import { readStoredGitHubPublishRepositoryId } from "@/utils/github-publish-repository-preference";
import { getLocalTimezone } from "@/utils/schedule-summary";

function ScheduleContentForm({
  onOpenChange,
  organizationId,
  organizationSlug,
  contentId,
  contentType,
  title,
  schedule,
  hasUnsavedChanges,
}: Omit<ScheduleContentDialogProps, "open">) {
  const t = useTranslations("content.calendar.schedule");
  const formatDate = useLocalDateFormat();
  const [form, setForm] = useState(() =>
    initialScheduleFormState({
      schedule,
      storedRepositoryId: readStoredGitHubPublishRepositoryId(organizationId),
    })
  );
  // Taken once as the dialog opens, like the form. The server re-checks the
  // slot with a few minutes of grace, so the open time is a close enough
  // "now". The scheduled rows are what a submit replaces: if the schedule
  // changed meanwhile, the server answers with a conflict.
  const [opened] = useState(() => ({
    at: Date.now(),
    expectedScheduledIds: summarizePostSchedule(schedule).scheduledIds,
  }));
  const timeZone = getLocalTimezone();

  const scheduleMutation = useSchedulePost(organizationId);
  const cancelMutation = useCancelPostSchedule(organizationId);
  const publishNowMutation = usePublishScheduleNow(organizationId);
  const destinations = useScheduleDestinations({
    organizationId,
    contentType,
    form,
  });

  const { socialPlatform } = scheduleDestinationsForContentType(contentType);
  const summary = summarizePostSchedule(schedule);
  const mode = getScheduleDialogMode(summary);
  const config = SCHEDULE_DIALOG_MODES[mode];
  const scheduledAt =
    form.date && form.time
      ? combineDateAndTime(form.date, form.time)
      : undefined;
  const inPast = scheduledAt ? scheduledAt.getTime() < opened.at : false;
  const isBusy =
    scheduleMutation.isPending ||
    cancelMutation.isPending ||
    publishNowMutation.isPending;
  // A schedule sends the saved post, so unsaved edits block changing it.
  const canSubmit =
    config.editable &&
    Boolean(scheduledAt) &&
    !inPast &&
    !destinations.blocked &&
    !isBusy &&
    !hasUnsavedChanges;

  const update = (patch: Partial<ScheduleFormState>) =>
    setForm((current) => ({ ...current, ...patch }));
  const close = () => onOpenChange(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!(canSubmit && scheduledAt)) {
      return;
    }
    scheduleMutation.mutate(
      {
        contentId,
        scheduledAt,
        timeZone,
        destinations: destinations.destinations,
        expectedScheduledIds: opened.expectedScheduledIds,
      },
      {
        onSuccess: () => {
          toast.success(
            t("scheduledToast", {
              date: formatDate(scheduledAt, SCHEDULE_SLOT_DATE_FORMAT),
            })
          );
          close();
        },
      }
    );
  };

  return (
    <form className="contents" onSubmit={handleSubmit}>
      <ResponsiveDialogHeader>
        <ResponsiveDialogTitle>{t(config.titleKey)}</ResponsiveDialogTitle>
        <ResponsiveDialogDescription>{title}</ResponsiveDialogDescription>
      </ResponsiveDialogHeader>

      <div className="min-w-0 space-y-6">
        {schedule && summary.hasOutcome ? (
          <ScheduleDestinationStatusList
            contentId={contentId}
            organizationId={organizationId}
            schedule={schedule}
            socialPlatform={socialPlatform}
          />
        ) : null}

        {config.editable ? (
          <>
            <ScheduleSlotField
              date={form.date}
              earliestDate={startOfDay(opened.at)}
              inPast={inPast}
              onDateChange={(date) => update({ date })}
              onTimeChange={(time) => update({ time })}
              time={form.time}
              timeZone={timeZone}
            />

            <ScheduleWhereSection
              destinations={destinations}
              form={form}
              isBusy={isBusy}
              onChange={update}
              organizationSlug={organizationSlug}
            />

            {hasUnsavedChanges ? (
              <p className="text-muted-foreground text-xs" role="status">
                {t("saveFirst")}
              </p>
            ) : null}
          </>
        ) : null}
      </div>

      <ScheduleDialogFooter
        canPublishNow={!hasUnsavedChanges}
        canSubmit={canSubmit}
        isBusy={isBusy}
        mode={mode}
        onPublishNow={() =>
          publishNowMutation.mutate(contentId, { onSuccess: close })
        }
        onSecondaryAction={() =>
          cancelMutation.mutate(contentId, { onSuccess: close })
        }
        isSubmitting={scheduleMutation.isPending}
      />
    </form>
  );
}

export function ScheduleContentDialog({
  open,
  onOpenChange,
  ...props
}: ScheduleContentDialogProps) {
  return (
    <ResponsiveDialog onOpenChange={onOpenChange} open={open}>
      <ResponsiveDialogContent
        className="min-w-0 sm:max-w-[560px]"
        // The drawer pads its direct children, but the form sits in between.
        drawerClassName="[&>form>*:not([data-slot=sheet-header]):not([data-slot=sheet-footer])]:px-4"
      >
        {/* Remount per open so the form starts from the current schedule. */}
        {open ? (
          <ScheduleContentForm onOpenChange={onOpenChange} {...props} />
        ) : null}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
