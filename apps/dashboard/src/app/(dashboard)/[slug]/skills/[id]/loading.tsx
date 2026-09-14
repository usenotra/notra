import { Skeleton } from "@notra/ui/components/ui/skeleton";

import { PageContainer } from "@/components/layout/container";
import { SkillPageTransition } from "@/components/skills/skill-page-transition";

/**
 * Detail-shaped fallback. Without it the nearest boundary is the skills list
 * `loading.tsx`, which flashed the list skeleton when opening a skill.
 */
export default function Loading() {
  return (
    <SkillPageTransition>
      <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="w-full space-y-8 px-4 lg:px-6">
          <div className="space-y-4">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-8 w-48" />
          </div>
          <div className="max-w-2xl space-y-5">
            <Skeleton className="h-10 w-full max-w-md" />
            <Skeleton className="h-20 w-full" />
          </div>
          <Skeleton className="h-[28rem] w-full rounded-xl" />
        </div>
      </PageContainer>
    </SkillPageTransition>
  );
}
