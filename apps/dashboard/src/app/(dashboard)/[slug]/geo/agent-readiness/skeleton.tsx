"use client";

import { AGENT_READINESS_SKELETON_ROW_KEYS } from "@notra/geo-core/constants/agent-readiness";
import { PageHeading } from "@notra/ui/components/shared/page-heading";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useTranslations } from "use-intl";

import { PageContainer } from "@/components/layout/container";

export function AgentReadinessSkeleton() {
  const t = useTranslations("geo.pages.agentReadiness");
  const tCommon = useTranslations("common");
  const content = (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-6 rounded-2xl border p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-5">
          <Skeleton className="size-24 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
        <div className="w-full space-y-4 lg:max-w-[26rem]">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
      <Skeleton className="h-28 w-full rounded-2xl" />
      <div className="flex flex-col rounded-2xl border">
        {AGENT_READINESS_SKELETON_ROW_KEYS.map((key) => (
          <div className="border-b px-5 py-3 last:border-b-0" key={key}>
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <PageHeading
          description={t("description")}
          title={tCommon("labels.agentReadiness")}
        />
        {content}
      </div>
    </PageContainer>
  );
}
