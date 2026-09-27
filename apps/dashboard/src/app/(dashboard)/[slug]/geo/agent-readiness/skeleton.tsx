"use client";

import { AGENT_READINESS_SKELETON_ROW_KEYS } from "@notra/geo-core/constants/agent-readiness";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useTranslations } from "next-intl";

import { PageContainer } from "@/components/layout/container";

export function AgentReadinessSkeleton() {
  const t = useTranslations("geo.pages.agentReadiness");
  const tCommon = useTranslations("common");
  const content = (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-6 rounded-2xl border p-6">
        <div className="flex items-center gap-6">
          <Skeleton className="size-28 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-8 w-24 self-start rounded-md" />
        </div>
        <div className="grid gap-3 border-t pt-4 sm:grid-cols-3">
          <Skeleton className="h-14 rounded-xl" />
          <Skeleton className="h-14 rounded-xl" />
          <Skeleton className="h-14 rounded-xl" />
        </div>
      </div>
      <div className="grid gap-4 rounded-2xl border p-5 md:grid-cols-3">
        {AGENT_READINESS_SKELETON_ROW_KEYS.map((key) => (
          <Skeleton className="h-40 w-full rounded-lg" key={key} />
        ))}
      </div>
    </div>
  );

  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <header className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">
            {tCommon("labels.agentReadiness")}
          </h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </header>
        {content}
      </div>
    </PageContainer>
  );
}
