"use client";

import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useId } from "react";

import { PageContainer } from "@/components/layout/container";
import { SKILL_CARD_SKELETON_COUNT } from "@/constants/skills";

export function SkillEditorSkeleton() {
  return (
    <div className="space-y-8">
      <div className="max-w-2xl space-y-5">
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-20 w-full" />
      </div>
      <Skeleton className="h-[28rem] w-full rounded-xl" />
    </div>
  );
}

export function SkillDetailSkeleton() {
  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-8 px-4 lg:px-6">
        <div className="space-y-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-8 w-48" />
        </div>
        <SkillEditorSkeleton />
      </div>
    </PageContainer>
  );
}

export function SkillsPageSkeleton() {
  const id = useId();
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-9 w-full sm:max-w-72" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: SKILL_CARD_SKELETON_COUNT }).map((_, i) => (
          <Skeleton
            className="h-40 rounded-xl"
            key={`${id}-card-${i.toString()}`}
          />
        ))}
      </div>
    </div>
  );
}
