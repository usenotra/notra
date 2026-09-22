import { Skeleton } from "@notra/ui/components/ui/skeleton";

import { PageContainer } from "@/components/layout/container";

import { SkillsPageSkeleton } from "./skeleton";

export default function Loading() {
  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Skills</h1>
            <p className="text-muted-foreground">
              Reusable instructions your agents load when generating content.
            </p>
          </div>
          <Skeleton className="h-9 w-36 rounded-md" />
        </div>
        <SkillsPageSkeleton />
      </div>
    </PageContainer>
  );
}
