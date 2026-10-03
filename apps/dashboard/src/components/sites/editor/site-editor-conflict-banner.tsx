"use client";

import { Alert02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/button";
import type { SiteEditorConflictBannerProps } from "@/types/site-editor";

/** Shown when publishing failed because someone pushed to the same files. */
export function SiteEditorConflictBanner({
  paths,
  isRebasing,
  onSelect,
  onRebase,
  onDismiss,
}: SiteEditorConflictBannerProps) {
  const t = useTranslations("sites.editor");
  return (
    <div
      className="border-destructive/25 bg-destructive/[0.04] flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-start"
      role="alert"
    >
      <HugeiconsIcon
        aria-hidden="true"
        className="text-destructive mt-0.5 hidden shrink-0 sm:block"
        icon={Alert02Icon}
        size={16}
        strokeWidth={1.5}
      />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-medium">{t("conflict.title")}</p>
        <p className="text-muted-foreground text-sm text-pretty">
          {t("conflict.description")}
        </p>
        {paths.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5 pt-1.5">
            {paths.map((path) => (
              <li key={path}>
                <button
                  className="bg-background hover:bg-muted max-w-full truncate rounded-md border px-2 py-0.5 font-mono text-xs transition-colors duration-150"
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
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Button
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
    </div>
  );
}
