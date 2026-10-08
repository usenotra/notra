"use client";

import { FileEditIcon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import type { SiteEditorEmptyStateProps } from "@/types/components/site-editor";

export function SiteEditorEmptyState({
  filesLoading,
  canCreateFile,
  onChooseFile,
  onNewFile,
}: SiteEditorEmptyStateProps) {
  const t = useTranslations("sites.editorPage");
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-xl">
        <HugeiconsIcon
          aria-hidden="true"
          icon={FileEditIcon}
          size={18}
          strokeWidth={1.5}
        />
      </div>
      <div className="max-w-xs space-y-1">
        <h2 className="text-sm font-medium">{t("empty.title")}</h2>
        <p className="text-muted-foreground text-sm text-pretty">
          {t("empty.description")}
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button
          className="md:hidden"
          disabled={filesLoading}
          onClick={onChooseFile}
          size="sm"
          variant="outline"
        >
          {t("empty.chooseFile")}
        </Button>
        <Button
          disabled={!canCreateFile}
          onClick={onNewFile}
          size="sm"
          variant="outline"
        >
          <HugeiconsIcon
            data-icon="inline-start"
            icon={PlusSignIcon}
            strokeWidth={1.5}
          />
          {t("newFile")}
        </Button>
      </div>
    </div>
  );
}
