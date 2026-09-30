import { cn } from "cn";

import { Skeleton } from "@/components/ui/skeleton";

import { AI_OVERVIEW_SKELETON_LINES } from "../constants/google-ai-overview";
import type { AIOverviewSkeletonProps } from "../types/google-ai-overview";

export const AIOverviewSkeleton = ({
  className,
  lines = AI_OVERVIEW_SKELETON_LINES,
  ...props
}: AIOverviewSkeletonProps) => (
  <div
    aria-busy="true"
    className={cn("flex max-w-177 flex-col gap-3", className)}
    data-slot="ai-overview-skeleton"
    {...props}
  >
    {lines.map((line) => (
      <Skeleton
        className="bg-aio-chip h-4 rounded-full"
        key={line.id}
        style={{ width: line.width }}
      />
    ))}
  </div>
);
