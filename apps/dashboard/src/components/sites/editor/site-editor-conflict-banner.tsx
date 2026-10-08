"use client";

import { Alert02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@notra/ui/components/ui/alert";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import type { SiteEditorConflictBannerProps } from "@/types/components/site-editor";

export function SiteEditorConflictBanner({
  paths,
  isRebasing,
  canRebase,
  onSelect,
  onRebase,
  onDismiss,
}: SiteEditorConflictBannerProps) {
  const t = useTranslations("sites.editor");
  return (
    <Alert variant="destructive">
      <HugeiconsIcon aria-hidden="true" icon={Alert02Icon} strokeWidth={1.5} />
      <AlertTitle>{t("conflict.title")}</AlertTitle>
      <AlertDescription>
        {t("conflict.description")}
        {paths.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5 pt-2">
            {paths.map((path) => (
              <li className="min-w-0" key={path}>
                <button
                  className="bg-background text-foreground hover:bg-muted focus-visible:ring-ring/50 max-w-full truncate rounded-md border px-2 py-0.5 font-mono text-xs transition-colors duration-150 outline-none focus-visible:ring-[3px]"
                  disabled={isRebasing}
                  onClick={() => onSelect(path)}
                  title={path}
                  type="button"
                >
                  {path}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </AlertDescription>
      <div className="text-foreground col-start-2 flex flex-wrap items-center gap-1.5 pt-2">
        <Button
          disabled={!canRebase}
          loading={isRebasing}
          onClick={onRebase}
          size="sm"
          variant="outline"
        >
          {t("conflict.rebase")}
        </Button>
        <Button onClick={onDismiss} size="sm" variant="ghost">
          {t("dismiss")}
        </Button>
      </div>
    </Alert>
  );
}
