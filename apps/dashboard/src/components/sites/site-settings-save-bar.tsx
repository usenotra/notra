"use client";

import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import type { SiteSettingsSaveBarProps } from "@/types/components/sites";

export function SiteSettingsSaveBar({
  canSave,
  isSaving,
  onReset,
}: SiteSettingsSaveBarProps) {
  const tPage = useTranslations("sites.settingsPage");
  const tCommon = useTranslations("common");
  return (
    <div className="bg-background/90 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 sticky bottom-4 z-10 mx-auto flex w-fit max-w-full items-center justify-between gap-6 rounded-xl border py-2 pr-2 pl-4 shadow-lg backdrop-blur motion-safe:duration-200">
      <p className="text-muted-foreground text-sm">{tPage("unsaved")}</p>
      <div className="flex items-center gap-2">
        <Button
          disabled={isSaving}
          onClick={onReset}
          size="sm"
          type="button"
          variant="ghost"
        >
          {tCommon("actions.reset")}
        </Button>
        <Button disabled={!canSave} loading={isSaving} size="sm" type="submit">
          {tCommon("actions.saveChanges")}
        </Button>
      </div>
    </div>
  );
}
