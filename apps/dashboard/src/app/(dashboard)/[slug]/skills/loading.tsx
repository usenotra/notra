import { Skeleton } from "@notra/ui/components/ui/skeleton";

import { PageContainer } from "@/components/layout/container";
import { PageHeading } from "@/components/layout/page-heading";

import { SkillsPageSkeleton } from "./skeleton";

export default function Loading() {
  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <PageHeading
          description="Reusable instructions your agents load when generating content."
          title="Skills"
        >
          <Skeleton className="h-9 w-36 rounded-md" />
        </PageHeading>
        <SkillsPageSkeleton />
      </div>
    </PageContainer>
  );
}
