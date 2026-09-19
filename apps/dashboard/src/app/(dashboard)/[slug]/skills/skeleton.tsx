"use client";

import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useId } from "react";

import { PageContainer } from "@/components/layout/container";
import { SKILL_TABLE_SKELETON_ROWS } from "@/constants/skills";

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
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-9 w-full sm:max-w-72" />
      </div>
      <div className="border-border/80 overflow-hidden rounded-lg border">
        <div className="bg-muted/80 flex h-10 items-center gap-4 px-3">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
        {Array.from({ length: SKILL_TABLE_SKELETON_ROWS }).map((_, i) => (
          <div
            className="bg-background border-border/60 flex items-center gap-4 border-t px-3 py-3.5"
            key={`${id}-row-${i}`}
          >
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
