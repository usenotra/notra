"use client";

import { Skeleton } from "@notra/ui/components/ui/skeleton";

import { GeoTableSkeleton } from "@/components/geo/skeleton-parts";
import { GEO_PROMPT_ANSWER_LOADING_LABEL } from "@/constants/geo-prompts";
import type { GeoPromptAnswerSkeletonProps } from "@/types/geo-prompt-detail";

function RawAnswerSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-8">
      <div className="flex justify-end">
        <Skeleton className="h-10 w-2/3 max-w-sm rounded-2xl" />
      </div>
      <div className="flex flex-col gap-2.5">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-3.5 w-2/3" />
        <div className="mt-3 flex flex-col gap-2.5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </div>
    </div>
  );
}

function AnalysisAnswerSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-14 rounded-xl" />
      </div>
      <GeoTableSkeleton rows={4} />
    </div>
  );
}

export function GeoPromptAnswerSkeleton({
  view,
}: GeoPromptAnswerSkeletonProps) {
  return (
    <div
      aria-busy="true"
      aria-label={GEO_PROMPT_ANSWER_LOADING_LABEL}
      className="min-h-full flex-1"
      role="status"
    >
      {view === "raw" ? <RawAnswerSkeleton /> : <AnalysisAnswerSkeleton />}
    </div>
  );
}
