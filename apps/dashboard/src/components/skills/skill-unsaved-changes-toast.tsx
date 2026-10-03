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
    <div className="flex w-full items-center gap-2 pl-1">
      <span className="flex-1 text-sm font-medium">{t("unsavedChanges")}</span>
      <Button onClick={onDiscard} size="sm" variant="ghost">
        {tCommon("labels.discard")}
      </Button>
      <Button onClick={onSave} size="sm">
        {tCommon("actions.save")}
      </Button>
    </div>
  );
}
