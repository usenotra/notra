"use client";

import { File02Icon, Folder01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslations } from "next-intl";

import { InstrumentModule } from "@/components/instrument/instrument-module";
import { SITE_REPOSITORY_LAYOUT } from "@/constants/sites";
import type { SiteRepositoryLayoutProps } from "@/types/sites";

export function SiteRepositoryLayout({ className }: SiteRepositoryLayoutProps) {
  const t = useTranslations("sites.layout");
  return (
    <InstrumentModule
      className={className}
      description={t("description")}
      eyebrow={t("title")}
      variant="panel"
    >
      <ul className="-my-1 space-y-3">
        {SITE_REPOSITORY_LAYOUT.map((entry) => {
          const isFolder = entry.path.includes("/");
          return (
            <li className="flex min-w-0 items-start gap-2.5" key={entry.key}>
              <HugeiconsIcon
                aria-hidden="true"
                className="text-muted-foreground mt-0.5 shrink-0"
                icon={isFolder ? Folder01Icon : File02Icon}
                size={15}
              />
              <div className="min-w-0">
                <p className="font-mono text-xs">{entry.path}</p>
                <p className="text-muted-foreground text-xs">{t(entry.key)}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </InstrumentModule>
  );
}
