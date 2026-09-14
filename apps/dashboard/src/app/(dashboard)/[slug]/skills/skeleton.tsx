"use client";

import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useId } from "react";

import { SKILL_TABLE_SKELETON_ROWS } from "@/constants/skills";

export function SkillsPageSkeleton() {
  const id = useId();
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
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
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
