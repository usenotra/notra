"use client";

import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Kbd } from "@notra/ui/components/ui/kbd";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useTranslations } from "next-intl";

import { Button } from "@/components/button";
import { GeoTableSkeleton } from "@/components/geo/skeleton-parts";
import { PageContainer } from "@/components/layout/container";

const PROMPT_ROW_COUNT = 6;

export function GeoPromptsSkeleton() {
  const t = useTranslations("geo.pages.prompts");
  const tCommon = useTranslations("common");
  const tGeoShared = useTranslations("geo.shared");
  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">
              {tCommon("labels.prompts")}
            </h1>
            <p className="text-muted-foreground">{t("description")}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button className="gap-1.5" size="sm">
              <HugeiconsIcon className="size-4" icon={PlusSignIcon} />
              {tGeoShared("addPrompt")}
              <Kbd className="ml-1 hidden sm:inline-flex">P</Kbd>
            </Button>
          </div>
        </header>
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-8 w-md max-w-full rounded-lg" />
          <Skeleton className="h-7 w-28 rounded-lg" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-9 w-full rounded-md sm:max-w-72" />
          <GeoTableSkeleton rows={PROMPT_ROW_COUNT} />
        </div>
      </div>
    </PageContainer>
  );
}
