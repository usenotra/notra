"use client";

import { GitCompareIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { SiteFileDiff } from "@/components/sites/editor/site-file-diff";
import { SITE_EDITOR_LOADING_LINES } from "@/constants/site-editor";
import type { SiteEditorPaneBodyProps } from "@/types/components/site-editor";
import { toErrorMessage } from "@/utils/error-message";

export function SiteEditorPaneBody({
  path,
  isLoading,
  error,
  onRetry,
  mode,
  value,
  published,
  children,
}: SiteEditorPaneBodyProps) {
  const t = useTranslations("sites.editor");
  const tPage = useTranslations("sites.editorPage");

  if (isLoading) {
    return (
      <div aria-busy="true" className="space-y-3 py-4 ps-14 pe-6">
        {SITE_EDITOR_LOADING_LINES.map((width) => (
          <Skeleton className={`h-3 ${width}`} key={width} />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-muted-foreground text-sm text-pretty">
          {toErrorMessage(error, t("loadFailed"))}
        </p>
        <Button onClick={onRetry} size="sm" variant="outline">
          {tPage("retry")}
        </Button>
      </div>
    );
  }
  if (mode === "edit") {
    return children;
  }
  if (published !== null && published === value) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <HugeiconsIcon
          aria-hidden="true"
          className="text-muted-foreground"
          icon={GitCompareIcon}
          size={18}
          strokeWidth={1.5}
        />
        <p className="text-muted-foreground max-w-xs text-sm text-pretty">
          {tPage("changes.none")}
        </p>
      </div>
    );
  }
  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <SiteFileDiff after={value} before={published} path={path} />
    </div>
  );
}
