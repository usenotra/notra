"use client";

import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import type { SiteEditorFilesErrorProps } from "@/types/components/site-editor";
import { toErrorMessage } from "@/utils/error-message";

export function SiteEditorFilesError({
  error,
  onRetry,
}: SiteEditorFilesErrorProps) {
  const t = useTranslations("sites.editorPage");
  const tEditor = useTranslations("sites.editor");
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-muted-foreground max-w-sm text-sm text-pretty">
        {toErrorMessage(error, tEditor("filesFailed"))}
      </p>
      <Button onClick={onRetry} size="sm" variant="outline">
        {t("retry")}
      </Button>
    </div>
  );
}
