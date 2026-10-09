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
                <Button
                  className="max-w-full"
                  disabled={isRebasing}
                  onClick={() => onSelect(path)}
                  title={path}
                  type="button"
                  size="xs"
                  variant="outline"
                >
                  <span className="truncate font-mono">{path}</span>
                </Button>
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
