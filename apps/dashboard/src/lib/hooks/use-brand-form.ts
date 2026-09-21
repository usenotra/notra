"use client";

import { normalizePublicWebsiteUrl } from "@notra/geo-core/schemas/url";
import { useForm } from "@tanstack/react-form";
import { useAsyncDebouncer } from "@tanstack/react-pacer";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { AUTO_SAVE_DELAY } from "@/constants/brand-identity";
import type { BrandFormProps } from "@/types/brand-identity";

import { useUpdateBrandSettings } from "./use-brand-analysis";

export function useBrandForm({
  organizationId,
  voiceId,
  initialData,
  onSavingChange,
}: BrandFormProps) {
  const updateMutation = useUpdateBrandSettings(organizationId);
  const lastSavedData = useRef(JSON.stringify(initialData));

  const debouncer = useAsyncDebouncer(
    async (values: typeof initialData) => {
      const { useCustomTone: _, websiteUrl: rawUrl, ...valuesToSave } = values;
      const trimmedUrl = rawUrl.trim();
      const websiteUrl = trimmedUrl
        ? normalizePublicWebsiteUrl(trimmedUrl)
        : undefined;
      await updateMutation.mutateAsync({
        ...valuesToSave,
        id: voiceId,
        ...(websiteUrl !== undefined && { websiteUrl }),
      });
      lastSavedData.current = JSON.stringify(values);
      onSavingChange?.(false);
    },
    {
      wait: AUTO_SAVE_DELAY,
      onError: (error) => {
        onSavingChange?.(false);
        toast.error(
          error instanceof Error ? error.message : "Failed to save changes"
        );
      },
    }
  );

  const form = useForm({
    defaultValues: initialData,
    onSubmit: async () => undefined,
    listeners: {
      onChange: ({ formApi }) => {
        const currentValues = formApi.state.values;
        const currentData = JSON.stringify(currentValues);

        if (currentData === lastSavedData.current) {
          debouncer.cancel();
          onSavingChange?.(false);
          return;
        }

        if (currentValues.useCustomTone && !currentValues.customTone.trim()) {
          debouncer.cancel();
          onSavingChange?.(false);
          return;
        }

        onSavingChange?.(true);
        debouncer.maybeExecute(currentValues);
      },
    },
  });

  useEffect(() => {
    return () => {
      onSavingChange?.(false);
    };
  }, [onSavingChange]);

  return form;
}
