"use client";

import { DEFAULT_UI_LABELS } from "@notra/ui/constants/ui-labels";
import type {
  UiLabelProps,
  UiLabels,
  UiLabelsProviderProps,
} from "@notra/ui/types/ui-labels";
import { createContext, useContext, useMemo } from "react";

const UiLabelsContext = createContext<UiLabels>(DEFAULT_UI_LABELS);

export function UiLabelsProvider({ labels, children }: UiLabelsProviderProps) {
  const value = useMemo(() => ({ ...DEFAULT_UI_LABELS, ...labels }), [labels]);

  return (
    <UiLabelsContext.Provider value={value}>{children}</UiLabelsContext.Provider>
  );
}

export function useUiLabels(): UiLabels {
  return useContext(UiLabelsContext);
}

export function UiLabel({ name }: UiLabelProps) {
  return useUiLabels()[name];
}
