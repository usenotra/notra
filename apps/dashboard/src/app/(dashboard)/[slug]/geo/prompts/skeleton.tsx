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
          <Button className="gap-1.5">
            <HugeiconsIcon className="size-4" icon={PlusSignIcon} />
            {tGeoShared("addPrompt")}
            <Kbd className="ml-1 hidden sm:inline-flex">P</Kbd>
          </Button>
        </header>
        <div className="space-y-3">
          <Skeleton className="h-9 w-full rounded-md sm:max-w-72" />
          <GeoTableSkeleton rows={PROMPT_ROW_COUNT} />
        </div>
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold">
                {tGeoShared("conversations")}
              </p>
              <p className="text-muted-foreground text-sm">
                {tGeoShared("multiTurnQuestionsWhereBuying")}
              </p>
            </div>
            <Skeleton className="h-8 w-36 rounded-lg" />
          </div>
          <GeoTableSkeleton rows={2} />
        </div>
        <GeoTableSkeleton
          rows={3}
          toolbar={
            <div className="flex h-16 items-center gap-3 px-4">
              <Skeleton className="size-4 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-40 rounded-md" />
                <Skeleton className="h-3 w-56 max-w-full rounded-md" />
              </div>
              <Skeleton className="h-8 w-20 rounded-lg" />
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
          }
        />
      </div>
    </PageContainer>
  );
}
