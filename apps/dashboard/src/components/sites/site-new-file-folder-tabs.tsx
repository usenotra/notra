"use client";

import { Tabs, TabsList, TabsTrigger } from "@notra/ui/components/ui/tabs";
import { useTranslations } from "use-intl";

import type { SiteNewFileFolderTabsProps } from "@/types/components/sites";

export function SiteNewFileFolderTabs({
  folders,
  value,
  onValueChange,
}: SiteNewFileFolderTabsProps) {
  const t = useTranslations("sites.newFile");
  const tSections = useTranslations("sites.sections");
  if (folders.length <= 1) {
    return null;
  }
  return (
    <Tabs
      onValueChange={(next) => {
        const folder = folders.find((candidate) => candidate === next);
        if (folder) {
          onValueChange(folder);
        }
      }}
      value={value}
    >
      <TabsList aria-label={t("section")} className="w-full">
        {folders.map((candidate) => (
          <TabsTrigger className="flex-1" key={candidate} value={candidate}>
            {tSections(candidate)}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
