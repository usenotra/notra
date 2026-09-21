"use client";

import { createElement, useEffect, useRef } from "react";
import { toast } from "sonner";

import { ContentDetailSaveToast } from "@/components/content/content-detail-save-bar";
import { CONTENT_SAVE_TOAST_POSITION } from "@/constants/content-detail";

interface UseContentDetailSaveToastParams {
  hasChanges: boolean;
  isSaving: boolean;
  isActivityPanelOpen: boolean;
  onDiscard: () => void;
  onSave: () => void;
  saveLabel?: string;
  savingLabel?: string;
}

export function useContentDetailSaveToast({
  hasChanges,
  isSaving,
  isActivityPanelOpen,
  onDiscard,
  onSave,
  saveLabel = "Save",
  savingLabel = "Saving...",
}: UseContentDetailSaveToastParams) {
  const saveToastIdRef = useRef<string | number | null>(null);
  const onDiscardRef = useRef(onDiscard);
  const onSaveRef = useRef(onSave);

  useEffect(() => {
    onDiscardRef.current = onDiscard;
    onSaveRef.current = onSave;
  }, [onDiscard, onSave]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 64rem)");

    const syncSaveToast = () => {
      const isWide = isActivityPanelOpen && mediaQuery.matches;

      if ((!hasChanges || isWide || isSaving) && saveToastIdRef.current) {
        toast.dismiss(saveToastIdRef.current);
        saveToastIdRef.current = null;
      }

      if (hasChanges && !isSaving && !isWide && !saveToastIdRef.current) {
        saveToastIdRef.current = toast.custom(
          (toastId) =>
            createElement(ContentDetailSaveToast, {
              isSaving,
              saveLabel,
              savingLabel,
              onDismiss: () => {
                toast.dismiss(toastId);
                saveToastIdRef.current = null;
              },
              onDiscard: () => {
                onDiscardRef.current();
              },
              onSave: () => {
                onSaveRef.current();
              },
            }),
          {
            duration: Number.POSITIVE_INFINITY,
            position: CONTENT_SAVE_TOAST_POSITION,
          }
        );
      }
    };

    syncSaveToast();
    mediaQuery.addEventListener("change", syncSaveToast);

    return () => {
      mediaQuery.removeEventListener("change", syncSaveToast);
    };
  }, [hasChanges, isSaving, isActivityPanelOpen, saveLabel, savingLabel]);

  useEffect(() => {
    return () => {
      if (saveToastIdRef.current) {
        toast.dismiss(saveToastIdRef.current);
      }
    };
  }, []);
}
