"use client";

import { PlusSignIcon, Rocket01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import type { SiteEditorHeaderActionsProps } from "@/types/components/site-editor";

export function SiteEditorHeaderActions({
  canCreateFile,
  unsaved,
  draftCount,
  onNewFile,
  onPublish,
}: SiteEditorHeaderActionsProps) {
  const t = useTranslations("sites.editorPage");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button disabled={!canCreateFile} onClick={onNewFile} variant="outline">
        <HugeiconsIcon icon={PlusSignIcon} size={15} strokeWidth={1.5} />
        {t("newFile")}
      </Button>
      <Button
        aria-label={t("publishLabel", { count: draftCount })}
        disabled={draftCount === 0 || unsaved}
        onClick={onPublish}
      >
        <HugeiconsIcon icon={Rocket01Icon} size={15} strokeWidth={1.5} />
        {t("publish")}
        {draftCount > 0 ? (
          <span className="bg-primary-foreground/20 -me-0.5 rounded-full px-1.5 text-xs tabular-nums">
            {draftCount}
          </span>
        ) : null}
      </Button>
    </div>
  );
}
