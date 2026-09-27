"use client";

import type { EventTriggerFormValues } from "@notra/schemas/dashboard/automation/event-trigger-form";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";

import { supportsAutoPublish } from "@/constants/schedule-output-types";
import { dashboardOrpc } from "@/lib/orpc/query";
import { createEventTriggerFormSchema } from "@/schemas/event-trigger-form";
import type { UseEventTriggerFormProps } from "@/types/automation/event-trigger";
import type { Trigger } from "@/types/triggers/triggers";
import {
  getDefaultEventTriggerValues,
  parseIgnoreCommitPatternsText,
} from "@/utils/event-trigger-form";
import { getOrpcErrorDataCode } from "@/utils/orpc-errors";

export function useEventTriggerForm({
  organizationId,
  editTrigger,
  open,
  onSuccess,
  onClose,
}: UseEventTriggerFormProps) {
  const t = useTranslations("automation.events.dialog");
  const tAutomationShared = useTranslations("automation.shared");
  const tValidation = useTranslations("automation.events.validation");
  const eventTriggerFormSchema = useMemo(
    () => createEventTriggerFormSchema(tValidation),
    [tValidation]
  );
  const isEditMode = !!editTrigger;
  const lastResetKeyRef = useRef<string | null>(null);

  const mutation = useMutation<
    { trigger: Trigger },
    Error,
    EventTriggerFormValues
  >({
    mutationFn: async (value) => {
      const payload = {
        organizationId,
        sourceType: "github_webhook" as const,
        sourceConfig: {
          eventTypes: [value.eventType],
          includePreReleases:
            value.eventType === "release" ? value.includePreReleases : true,
          ignoreCommitPatterns:
            value.eventType === "push"
              ? parseIgnoreCommitPatternsText(value.ignoreCommitPatternsText)
              : [],
        },
        targets: { repositoryIds: value.repositoryIds },
        outputType: value.outputType,
        outputConfig: {
          ...(value.brandVoiceId ? { brandVoiceId: value.brandVoiceId } : {}),
        },
        enabled: true,
        autoPublish: supportsAutoPublish(value.outputType)
          ? value.autoPublish
          : false,
      };

      try {
        if (isEditMode) {
          return await dashboardOrpc.automation.events.update.call({
            triggerId: editTrigger.id,
            ...payload,
            enabled: editTrigger.enabled,
          });
        }
        return await dashboardOrpc.automation.events.create.call(payload);
      } catch (error) {
        if (getOrpcErrorDataCode(error) === "DUPLICATE_TRIGGER") {
          throw new Error(t("alreadyExists"));
        }
        if (error instanceof Error && error.message) {
          throw error;
        }
        throw new Error(
          isEditMode
            ? tAutomationShared("failedToUpdateTrigger")
            : t("createFailed")
        );
      }
    },
    onSuccess: (data) => {
      toast.success(isEditMode ? t("updated") : t("added"));
      onSuccess?.(data.trigger);
      onClose();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const form = useForm({
    defaultValues: getDefaultEventTriggerValues(editTrigger),
    validators: {
      onSubmit: eventTriggerFormSchema,
    },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    },
  });

  useEffect(() => {
    if (!open) {
      lastResetKeyRef.current = null;
      return;
    }

    const resetKey = editTrigger?.id ?? "create";
    if (lastResetKeyRef.current === resetKey) {
      return;
    }

    form.reset(getDefaultEventTriggerValues(editTrigger));
    lastResetKeyRef.current = resetKey;
  }, [editTrigger, form, open]);

  return { form, isPending: mutation.isPending };
}
