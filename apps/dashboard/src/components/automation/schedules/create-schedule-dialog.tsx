"use client";

import {
  Add01Icon,
  AlertCircleIcon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { CUSTOM_SCHEDULE_DEFAULT_INTERVAL_DAYS } from "@notra/ai/constants/schedule-interval";
import { toUtcDateString } from "@notra/ai/utils/schedule-interval";
import type { ScheduleFormValues } from "@notra/schemas/dashboard/automation/schedule-form";
import {
  LOOKBACK_WINDOWS,
  type LookbackWindow,
  MAX_SCHEDULE_INSTRUCTIONS_LENGTH,
  MAX_SCHEDULE_NAME_LENGTH,
} from "@notra/schemas/dashboard/integrations";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@notra/ui/components/shared/responsive-dialog";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  useComboboxAnchor,
} from "@notra/ui/components/ui/combobox";
import { Input } from "@notra/ui/components/ui/input";
import { Label } from "@notra/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { Github } from "@notra/ui/components/ui/svgs/github";
import { Linear } from "@notra/ui/components/ui/svgs/linear";
import { Switch } from "@notra/ui/components/ui/switch";
import { Textarea } from "@notra/ui/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { cn } from "@notra/ui/lib/utils";
import { useForm, useStore } from "@tanstack/react-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { BrandIdentityRadioGroup } from "@/components/brand-identity-radio-group";
import { Button } from "@/components/button";
import { FormatCard } from "@/components/content/create/format-card";
import { AddRepositoryButton } from "@/components/integrations/add-repository-button";
import { AddRepositoryDialog } from "@/components/integrations/add-repository-dialog";
import { LegacyAddIntegrationDialog as AddIntegrationDialog } from "@/components/integrations/legacy/add-integration-dialog";
import { OUTPUT_TYPE_LABEL_KEYS } from "@/constants/automation-output-types";
import { FORMAT_ORDER } from "@/constants/content-formats";
import { LOOKBACK_WINDOW_COMMON_LABEL_KEYS } from "@/constants/schedule";
import { supportsAutoPublish } from "@/constants/schedule-output-types";
import { dashboardOrpc } from "@/lib/orpc/query";
import { createScheduleFormSchema } from "@/schemas/schedule-form";
import type {
  CreateScheduleDialogProps,
  ScheduleCron,
  ScheduleIntegrationOption,
} from "@/types/automation/schedule";
import type { Trigger } from "@/types/triggers/triggers";
import { getOrpcErrorDataCode } from "@/utils/orpc-errors";
import {
  buildAutoScheduleName,
  formatTimeValue,
  getDefaultScheduleValues,
  parseTimeValue,
} from "@/utils/schedule-form";

import { ScheduleDayPicker } from "./schedule-day-picker";
import { ScheduleFrequencyTabs } from "./schedule-frequency-tabs";
import { ScheduleIntervalPicker } from "./schedule-interval-picker";
import { ScheduleSummaryCard } from "./schedule-summary-card";

export function CreateScheduleDialog({
  organizationId,
  onSuccess,
  trigger,
  editTrigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  presetId,
}: CreateScheduleDialogProps) {
  const t = useTranslations("automation.schedules");
  const tAutomationShared = useTranslations("automation.shared");
  const tValidation = useTranslations("automation.schedules.validation");
  const tCommon = useTranslations("common");
  const lookbackLabel = (window: LookbackWindow) =>
    window === "current_day"
      ? t("lookbackWindows.current_day")
      : tCommon(`labels.${LOOKBACK_WINDOW_COMMON_LABEL_KEYS[window]}`);
  const scheduleFormSchema = useMemo(
    () => createScheduleFormSchema(tValidation),
    [tValidation]
  );
  const isEditMode = !!editTrigger;
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = useCallback(
    (next: boolean) => {
      if (isControlled) {
        controlledOnOpenChange?.(next);
      } else {
        setInternalOpen(next);
      }
    },
    [controlledOnOpenChange, isControlled]
  );

  const [addRepoOpen, setAddRepoOpen] = useState(false);
  const dialogOpen = open && !addRepoOpen;
  const comboboxAnchor = useComboboxAnchor();

  const mutation = useMutation<{ trigger: Trigger }, Error, ScheduleFormValues>(
    {
      mutationFn: async (value) => {
        const githubRepoIds = value.repositoryIds.filter(
          (id) => !id.startsWith("linear:")
        );

        const instructions = value.instructions.trim();
        const schedulePayload = {
          organizationId,
          name: value.name.trim(),
          sourceType: "cron" as const,
          sourceConfig: { cron: value.schedule },
          targets: { repositoryIds: githubRepoIds },
          outputType: value.outputType,
          outputConfig: {
            ...(value.brandVoiceId ? { brandVoiceId: value.brandVoiceId } : {}),
            ...(instructions ? { instructions } : {}),
          },
          enabled: isEditMode ? editTrigger.enabled : true,
          autoPublish: supportsAutoPublish(value.outputType)
            ? value.autoPublish
            : false,
          lookbackWindow: value.lookbackWindow,
        };

        try {
          if (isEditMode) {
            return await dashboardOrpc.automation.schedules.update.call({
              triggerId: editTrigger.id,
              ...schedulePayload,
            });
          }
          return await dashboardOrpc.automation.schedules.create.call(
            schedulePayload
          );
        } catch (error) {
          if (getOrpcErrorDataCode(error) === "DUPLICATE_TRIGGER") {
            throw new Error(t("dialog.alreadyExists"));
          }
          if (error instanceof Error && error.message) {
            throw error;
          }
          throw new Error(
            isEditMode
              ? tAutomationShared("failedToUpdateSchedule")
              : t("dialog.createFailed")
          );
        }
      },
      onSuccess: (data) => {
        toast.success(isEditMode ? t("dialog.updated") : t("dialog.added"));
        onSuccess?.(data.trigger);
        setOpen(false);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }
  );

  const form = useForm({
    defaultValues: getDefaultScheduleValues(editTrigger),
    validators: {
      onSubmit: scheduleFormSchema,
    },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    },
  });

  const previousAutoNameRef = useRef("");

  useEffect(() => {
    if (open) {
      form.reset(getDefaultScheduleValues(editTrigger, presetId));
      previousAutoNameRef.current = "";
    }
  }, [open, editTrigger, presetId, form]);

  const outputType = useStore(form.store, (s) => s.values.outputType);
  const schedule = useStore(form.store, (s) => s.values.schedule);
  const { frequency, hour, minute, dayOfWeek, dayOfMonth, intervalDays } =
    schedule;
  const repositoryCount = useStore(
    form.store,
    (s) => s.values.repositoryIds.length
  );

  useEffect(() => {
    const newAutoName = buildAutoScheduleName(
      { frequency, intervalDays },
      outputType,
      t
    );
    const currentName = form.state.values.name;
    if (
      currentName === previousAutoNameRef.current ||
      currentName.length === 0
    ) {
      form.setFieldValue("name", newAutoName);
    }
    previousAutoNameRef.current = newAutoName;
  }, [outputType, frequency, intervalDays, form, t]);

  const { data: integrationsResponse, isLoading: isLoadingRepos } = useQuery(
    dashboardOrpc.integrations.list.queryOptions({
      input: { organizationId },
      enabled: !!organizationId && open,
    })
  );

  const { data: brandResponse } = useQuery(
    dashboardOrpc.brand.voices.list.queryOptions({
      input: { organizationId },
      enabled: !!organizationId && open,
    })
  );

  const brandVoices = brandResponse?.voices ?? [];
  const nonDefaultBrandVoices = brandVoices.filter((voice) => !voice.isDefault);
  const defaultBrandVoice = brandVoices.find((voice) => voice.isDefault);
  const defaultBrandVoiceLabel = defaultBrandVoice
    ? t("dialog.defaultVoiceName", { name: defaultBrandVoice.name })
    : t("dialog.defaultVoice");

  const { integrationOptions, githubIntegrationId } = useMemo(() => {
    const githubIntegrations =
      integrationsResponse?.integrations.filter(
        (i) => i.type === "github" && i.enabled
      ) ?? [];
    const linearIntegrations =
      integrationsResponse?.integrations.filter(
        (i) => i.type === "linear" && i.enabled
      ) ?? [];
    const repos = githubIntegrations.flatMap((i) =>
      i.repositories.filter((r) => r.enabled)
    );

    const options: ScheduleIntegrationOption[] = [
      ...repos.map((r) => ({
        value: r.id,
        label: r.defaultBranch
          ? `${r.owner}/${r.repo} · ${r.defaultBranch}`
          : `${r.owner}/${r.repo}`,
        type: "github" as const,
      })),
      ...linearIntegrations.map((i) => ({
        value: `linear:${i.id}`,
        label: i.displayName,
        type: "linear" as const,
      })),
    ];

    return {
      integrationOptions: options,
      githubIntegrationId: githubIntegrations[0]?.id,
    };
  }, [integrationsResponse]);

  const handleFrequencyChange = (next: ScheduleCron["frequency"]) => {
    const prev = form.state.values.schedule;
    let dayOfWeek: number | undefined;
    let dayOfMonth: number | undefined;
    let intervalDays: number | undefined;
    let anchorDate: string | undefined;
    if (next === "weekly") {
      dayOfWeek = prev.dayOfWeek ?? 1;
    } else if (next === "monthly") {
      dayOfMonth = prev.dayOfMonth ?? 1;
    } else if (next === "custom") {
      intervalDays = prev.intervalDays ?? CUSTOM_SCHEDULE_DEFAULT_INTERVAL_DAYS;
      anchorDate = prev.anchorDate ?? toUtcDateString(new Date());
    }
    form.setFieldValue("schedule", {
      ...prev,
      frequency: next,
      dayOfWeek,
      dayOfMonth,
      intervalDays,
      anchorDate,
    });
  };

  const formError = useStore(form.store, (state) => {
    if (state.submissionAttempts === 0) {
      return null;
    }
    for (const meta of Object.values(state.fieldMeta)) {
      const errors = meta?.errors;
      if (errors && errors.length > 0) {
        const first = errors[0];
        if (typeof first === "string") {
          return first;
        }
        if (first && typeof first === "object" && "message" in first) {
          const message = (first as { message: unknown }).message;
          if (typeof message === "string") {
            return message;
          }
        }
      }
    }
    return null;
  });

  return (
    <>
      <ResponsiveDialog onOpenChange={setOpen} open={dialogOpen}>
        {trigger && <ResponsiveDialogTrigger render={trigger} />}
        <ResponsiveDialogContent className="flex h-[85vh] max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
          <ResponsiveDialogHeader className="shrink-0 border-b p-4 pr-14">
            <ResponsiveDialogTitle className="text-base">
              {isEditMode ? t("dialog.editTitle") : t("dialog.newTitle")}
            </ResponsiveDialogTitle>
            <p className="text-muted-foreground text-sm">
              {t("dialog.description")}
            </p>
          </ResponsiveDialogHeader>

          <form
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
            onSubmit={(event) => {
              event.preventDefault();
              event.stopPropagation();
              form.handleSubmit();
            }}
          >
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="space-y-8 p-6">
                <section className="space-y-3">
                  <div className="space-y-1">
                    <h3 className="flex items-center gap-1 text-base font-semibold">
                      {tCommon("labels.name")}
                      <span aria-hidden="true" className="text-destructive">
                        *
                      </span>
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {t("dialog.nameHint")}
                    </p>
                  </div>
                  <form.Field name="name">
                    {(field) => (
                      <Input
                        id={field.name}
                        maxLength={MAX_SCHEDULE_NAME_LENGTH}
                        onChange={(event) => {
                          field.handleChange(event.target.value);
                        }}
                        placeholder={buildAutoScheduleName(
                          { frequency, intervalDays },
                          outputType,
                          t
                        )}
                        value={field.state.value}
                      />
                    )}
                  </form.Field>
                </section>

                <section className="space-y-3">
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold">
                      {t("dialog.contentFormat")}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {t("dialog.contentFormatHint")}
                    </p>
                  </div>
                  <form.Field name="outputType">
                    {(field) => (
                      <div className="grid gap-3 md:grid-cols-2">
                        {FORMAT_ORDER.map((type) => (
                          <FormatCard
                            format={type}
                            key={type}
                            onToggle={() => field.handleChange(type)}
                            selected={field.state.value === type}
                          />
                        ))}
                      </div>
                    )}
                  </form.Field>
                </section>

                <section className="space-y-3">
                  <div className="space-y-1">
                    <h3 className="flex items-center gap-2 text-base font-semibold">
                      {t("dialog.instructions")}
                      <span className="text-muted-foreground rounded-full border px-2 py-0.5 text-[11px] font-medium">
                        {tCommon("states.optional")}
                      </span>
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {t("dialog.instructionsHint")}
                    </p>
                  </div>
                  <form.Field name="instructions">
                    {(field) => (
                      <div className="space-y-2">
                        <Textarea
                          aria-label={t("dialog.instructions")}
                          className="max-h-80 min-h-24 resize-none overflow-y-auto"
                          id={field.name}
                          maxLength={MAX_SCHEDULE_INSTRUCTIONS_LENGTH}
                          onBlur={field.handleBlur}
                          onChange={(event) => {
                            field.handleChange(event.target.value);
                          }}
                          placeholder={t("dialog.instructionsPlaceholder")}
                          value={field.state.value}
                        />
                        <div className="text-muted-foreground flex items-center justify-between text-xs">
                          <span>{t("dialog.instructionsFooter")}</span>
                          <span className="tabular-nums">
                            {field.state.value.length} /{" "}
                            {MAX_SCHEDULE_INSTRUCTIONS_LENGTH}
                          </span>
                        </div>
                      </div>
                    )}
                  </form.Field>
                </section>

                <section className="space-y-3">
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold">
                      {tCommon("labels.schedule")}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {t("dialog.scheduleHint")}
                    </p>
                  </div>
                  <ScheduleFrequencyTabs
                    onChange={handleFrequencyChange}
                    value={frequency}
                  />
                  <ScheduleDayPicker
                    dayOfMonth={dayOfMonth}
                    dayOfWeek={dayOfWeek}
                    frequency={frequency}
                    onDayOfMonthChange={(day) =>
                      form.setFieldValue("schedule.dayOfMonth", day)
                    }
                    onDayOfWeekChange={(day) =>
                      form.setFieldValue("schedule.dayOfWeek", day)
                    }
                  />
                  {frequency === "custom" && (
                    <ScheduleIntervalPicker
                      intervalDays={intervalDays}
                      onIntervalDaysChange={(days) =>
                        form.setFieldValue("schedule.intervalDays", days)
                      }
                    />
                  )}
                  <div className="space-y-2">
                    <Label
                      className="text-muted-foreground text-xs"
                      htmlFor="schedule-time"
                    >
                      {t("dialog.time")}
                    </Label>
                    <Input
                      className="bg-background w-full appearance-none sm:w-40 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                      id="schedule-time"
                      onChange={(event) => {
                        const parsed = parseTimeValue(event.target.value);
                        if (parsed) {
                          form.setFieldValue("schedule.hour", parsed.hour);
                          form.setFieldValue("schedule.minute", parsed.minute);
                        }
                      }}
                      type="time"
                      value={formatTimeValue(hour, minute)}
                    />
                  </div>
                  <ScheduleSummaryCard schedule={schedule} />
                </section>

                <section className="space-y-3">
                  <div className="space-y-1">
                    <h3 className="flex items-center gap-1 text-base font-semibold">
                      {tCommon("labels.sources")}
                      <span aria-hidden="true" className="text-destructive">
                        *
                      </span>
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {t("dialog.sourcesHint")}
                    </p>
                  </div>
                  {isLoadingRepos && <Skeleton className="h-10 w-full" />}
                  {!isLoadingRepos && integrationOptions.length === 0 && (
                    <div className="flex items-center gap-2 rounded-lg border border-dashed p-3">
                      <span className="text-muted-foreground flex-1 text-xs">
                        {tCommon("labels.noIntegrationsConnectedYet")}
                      </span>
                      <AddRepositoryButton
                        onAdd={() => {
                          setAddRepoOpen(true);
                        }}
                      />
                    </div>
                  )}
                  {!isLoadingRepos && integrationOptions.length > 0 && (
                    <form.Field name="repositoryIds">
                      {(field) => (
                        <div ref={comboboxAnchor}>
                          <Combobox
                            items={integrationOptions.map((o) => o.value)}
                            multiple
                            onValueChange={(value) =>
                              field.handleChange(
                                Array.isArray(value) ? value : []
                              )
                            }
                            value={field.state.value}
                          >
                            <ComboboxChips>
                              {field.state.value.map((id) => {
                                const opt = integrationOptions.find(
                                  (o) => o.value === id
                                );
                                if (!opt) {
                                  return null;
                                }
                                return (
                                  <ComboboxChip
                                    className="max-w-full"
                                    key={opt.value}
                                  >
                                    <span className="flex min-w-0 items-center gap-1.5">
                                      {opt.type === "github" ? (
                                        <Github className="size-3 shrink-0" />
                                      ) : (
                                        <Linear className="size-3 shrink-0" />
                                      )}
                                      <span
                                        className="truncate"
                                        title={opt.label}
                                      >
                                        {opt.label}
                                      </span>
                                    </span>
                                  </ComboboxChip>
                                );
                              })}
                              <ComboboxChipsInput
                                placeholder={t("dialog.searchIntegrations")}
                              />
                              <ComboboxTrigger className="ml-auto flex shrink-0 items-center self-center" />
                            </ComboboxChips>
                            <ComboboxContent anchor={comboboxAnchor.current}>
                              <ComboboxEmpty>
                                {t("dialog.noIntegrationsFound")}
                              </ComboboxEmpty>
                              <ComboboxList>
                                {integrationOptions.map((opt) => (
                                  <ComboboxItem
                                    key={opt.value}
                                    value={opt.value}
                                  >
                                    <span className="flex min-w-0 items-center gap-2">
                                      {opt.type === "github" ? (
                                        <Github className="size-3.5 shrink-0" />
                                      ) : (
                                        <Linear className="size-3.5 shrink-0" />
                                      )}
                                      <span
                                        className="truncate"
                                        title={opt.label}
                                      >
                                        {opt.label}
                                      </span>
                                    </span>
                                  </ComboboxItem>
                                ))}
                              </ComboboxList>
                            </ComboboxContent>
                          </Combobox>
                        </div>
                      )}
                    </form.Field>
                  )}
                </section>

                <section className="space-y-3">
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold">
                      {t("dialog.rules", {
                        type: tCommon(
                          `labels.${OUTPUT_TYPE_LABEL_KEYS[outputType]}`
                        ),
                      })}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {t("dialog.rulesHint")}
                    </p>
                  </div>
                  <form.Field name="lookbackWindow">
                    {(field) => (
                      <div className="space-y-2">
                        <Label
                          className="text-muted-foreground text-xs"
                          htmlFor="schedule-lookback"
                        >
                          {tCommon("labels.lookbackWindow")}
                        </Label>
                        <Select
                          onValueChange={(value) => {
                            if (value) {
                              field.handleChange(value as LookbackWindow);
                            }
                          }}
                          value={field.state.value}
                        >
                          <SelectTrigger
                            className="w-full"
                            id="schedule-lookback"
                          >
                            <SelectValue
                              placeholder={tCommon("labels.lookbackWindow")}
                            >
                              <span>{lookbackLabel(field.state.value)}</span>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {LOOKBACK_WINDOWS.map((window) => (
                              <SelectItem key={window} value={window}>
                                <span>{lookbackLabel(window)}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </form.Field>

                  {brandVoices.length > 1 && (
                    <form.Field name="brandVoiceId">
                      {(field) => (
                        <BrandIdentityRadioGroup
                          description={t("dialog.brandVoiceDescription")}
                          emptyOption={{
                            label: defaultBrandVoiceLabel,
                            description: t(
                              "dialog.brandVoiceDefaultDescription"
                            ),
                            voice: defaultBrandVoice,
                          }}
                          id={field.name}
                          label={tCommon("labels.brandVoice")}
                          onChange={field.handleChange}
                          value={field.state.value}
                          voices={nonDefaultBrandVoices}
                        />
                      )}
                    </form.Field>
                  )}

                  {supportsAutoPublish(outputType) && (
                    <form.Field name="autoPublish">
                      {(field) => (
                        <div className="flex items-center justify-between rounded-lg border p-3">
                          <div className="flex items-center gap-1.5">
                            <Label
                              className="cursor-pointer text-sm font-medium"
                              htmlFor={field.name}
                            >
                              {t("dialog.autoPublish")}
                            </Label>
                            <Tooltip>
                              <TooltipTrigger className="text-muted-foreground inline-flex cursor-help">
                                <HugeiconsIcon
                                  icon={InformationCircleIcon}
                                  size={14}
                                />
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p className="max-w-50 text-xs">
                                  {t("dialog.autoPublishHint")}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <Switch
                            checked={field.state.value}
                            id={field.name}
                            onCheckedChange={field.handleChange}
                          />
                        </div>
                      )}
                    </form.Field>
                  )}
                </section>
              </div>
            </div>

            <div className="bg-muted/30 shrink-0 border-t px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <FooterStatus
                  errorMessage={formError}
                  repositoryCount={repositoryCount}
                />
                <div className="flex items-center gap-2">
                  <Button
                    disabled={mutation.isPending}
                    onClick={() => setOpen(false)}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    {tCommon("actions.cancel")}
                  </Button>
                  <Button loading={mutation.isPending} type="submit">
                    <HugeiconsIcon className="size-4" icon={Add01Icon} />
                    {isEditMode
                      ? tCommon("actions.saveChanges")
                      : t("dialog.add")}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
      {githubIntegrationId ? (
        <AddRepositoryDialog
          integrationId={githubIntegrationId}
          onOpenChange={(isOpen) => {
            setAddRepoOpen(isOpen);
          }}
          open={addRepoOpen}
          organizationId={organizationId}
        />
      ) : (
        <AddIntegrationDialog
          onOpenChange={(isOpen) => {
            setAddRepoOpen(isOpen);
          }}
          open={addRepoOpen}
          organizationId={organizationId}
        />
      )}
    </>
  );
}

interface FooterStatusProps {
  errorMessage: string | null;
  repositoryCount: number;
}

function FooterStatus({ errorMessage, repositoryCount }: FooterStatusProps) {
  const t = useTranslations("automation.schedules.dialog");
  const tCommon2 = useTranslations("common");
  if (errorMessage) {
    return (
      <span className="text-destructive flex items-center gap-1.5 text-xs font-medium">
        <HugeiconsIcon className="size-3.5" icon={AlertCircleIcon} />
        {errorMessage}
      </span>
    );
  }
  return (
    <span
      className={cn("text-muted-foreground flex items-center gap-1.5 text-xs")}
    >
      {repositoryCount === 0
        ? tCommon2("labels.noSourcesSelectedYet")
        : t("sourcesSelected", { count: repositoryCount })}
    </span>
  );
}
