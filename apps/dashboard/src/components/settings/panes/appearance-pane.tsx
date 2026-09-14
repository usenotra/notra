"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@notra/ui/lib/utils";
import { useTheme } from "next-themes";

import { SettingsPane } from "@/components/settings/settings-pane";
import {
  APPEARANCE_OPTIONS,
  APPEARANCE_PREVIEW_STYLES,
} from "@/constants/appearance";
import type {
  AppearanceMode,
  AppearancePreviewProps,
} from "@/types/settings/appearance";

function AppearancePreview({ mode }: AppearancePreviewProps) {
  const styles = APPEARANCE_PREVIEW_STYLES[mode];

  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative h-28 overflow-hidden rounded-lg border",
        styles.root
      )}
    >
      {styles.systemOverlay ? (
        <div className="absolute inset-y-0 right-0 w-1/2 bg-neutral-950" />
      ) : null}
      <div
        className={cn(
          "absolute inset-y-0 left-0 w-[28%] border-r p-2.5",
          styles.sidebar
        )}
      >
        <div className={cn("mb-3 size-3 rounded-full", styles.dot)} />
        <div className="space-y-1.5">
          <div className={cn("h-1.5 w-4/5 rounded-full", styles.line)} />
          <div className={cn("h-1.5 w-3/5 rounded-full", styles.line)} />
          <div className={cn("h-1.5 w-2/3 rounded-full", styles.line)} />
        </div>
      </div>
      <div className="absolute inset-y-0 right-0 w-[72%] p-4">
        <div className={cn("mb-4 h-2 w-1/3 rounded-full", styles.mainLine)} />
        <div className={cn("mb-3 h-5 w-3/4 rounded-md", styles.mainBlock)} />
        <div className="space-y-2">
          <div className={cn("h-2 w-1/2 rounded-full", styles.mainLine)} />
          <div className={cn("h-2 w-2/3 rounded-full", styles.mainLine)} />
        </div>
      </div>
    </div>
  );
}

export function AppearanceSettingsPane() {
  const { setTheme, theme } = useTheme();
  const selectedMode: AppearanceMode =
    theme === "light" || theme === "dark" || theme === "system"
      ? theme
      : "system";

  return (
    <SettingsPane>
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Mode</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {APPEARANCE_OPTIONS.map((option) => {
            const selected = selectedMode === option.value;
            return (
              <label
                className={cn(
                  "has-focus-visible:border-ring has-focus-visible:ring-ring/50 bg-background cursor-pointer rounded-xl border p-2.5 transition-[border-color,background-color,box-shadow] outline-none has-focus-visible:ring-2",
                  selected
                    ? "border-primary bg-primary/5 ring-primary ring-1"
                    : "border-border hover:border-foreground/20 hover:bg-muted/30"
                )}
                key={option.value}
              >
                <input
                  checked={selected}
                  className="sr-only"
                  name="appearance-mode"
                  onChange={() => setTheme(option.value)}
                  type="radio"
                  value={option.value}
                />
                <AppearancePreview mode={option.value} />
                <span className="mt-2.5 flex items-center gap-2 px-1 pb-0.5 text-sm font-medium">
                  <HugeiconsIcon
                    aria-hidden="true"
                    className="size-4"
                    icon={option.icon}
                    strokeWidth={2}
                  />
                  {option.label}
                </span>
                <span className="sr-only">{option.description}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
    </SettingsPane>
  );
}
