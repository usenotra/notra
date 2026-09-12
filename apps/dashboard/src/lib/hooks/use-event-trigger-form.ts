"use client";

import {
  type EventTriggerFormValues,
  eventTriggerFormSchema,
} from "@notra/schemas/dashboard/automation/event-trigger-form";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { supportsAutoPublish } from "@/constants/schedule-output-types";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { UseEventTriggerFormProps } from "@/types/automation/event-trigger";
import type { Trigger } from "@/types/triggers/triggers";
import { getDefaultEventTriggerValues } from "@/utils/event-trigger-form";

export function useEventTriggerForm({
  organizationId,
  editTrigger,
  open,
  onSuccess,
  onClose,
}: UseEventTriggerFormProps) {
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
        if (error instanceof Error && error.message === "Duplicate trigger") {
          throw new Error("Trigger already exists");
        }
        if (error instanceof Error && error.message) {
          throw error;
        }
        throw new Error(
          isEditMode ? "Failed to update trigger" : "Failed to create trigger"
        );
      }
    },
    onSuccess: (data) => {
      toast.success(isEditMode ? "Trigger updated" : "Trigger added");
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
