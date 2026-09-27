"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/button";
import type { SkillUnsavedChangesToastProps } from "@/types/skills/page";

export function SkillUnsavedChangesToast({
  onDiscard,
  onSave,
}: SkillUnsavedChangesToastProps) {
  const t = useTranslations("skills.detail");
  const tCommon = useTranslations("common");

  return (
    <div className="border-border bg-background rounded-[14px] border p-0.5 shadow-sm">
      <div className="bg-background flex items-center gap-3 rounded-lg px-4 py-3">
        <span className="text-muted-foreground text-sm">
          {t("unsavedChanges")}
        </span>
        <Button onClick={onDiscard} size="sm" variant="ghost">
          {tCommon("labels.discard")}
        </Button>
        <Button onClick={onSave} size="sm">
          {tCommon("actions.save")}
        </Button>
      </div>
    </div>
  );
}
