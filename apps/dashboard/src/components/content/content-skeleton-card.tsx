"use client";

import type { ContentType } from "@notra/ai/schemas/content";
import { Badge } from "@notra/ui/components/ui/badge";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { BracesIcon, Loader2Icon } from "lucide-react";

import { getContentTypeLabel } from "@/components/content/content-card";
import { cn } from "@/lib/utils";
import { OutputTypeIcon } from "@/utils/output-types";

interface ContentSkeletonCardProps {
  outputType: string;
  className?: string;
  source?: "api" | "dashboard";
}

export function ContentSkeletonCard({
  outputType,
  className,
  source,
}: ContentSkeletonCardProps) {
  return (
    <div
      className={cn(
        "border-border/80 border-b-border/40 bg-muted/80 flex flex-col gap-1.5 rounded-xl border p-1.5 shadow-2xs",
        "h-full",
        className
      )}
    >
      <div className="border-border/60 bg-background flex min-h-28 flex-1 flex-col gap-2 overflow-hidden rounded-lg border px-3 pt-2.5 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Loader2Icon className="text-muted-foreground size-4 shrink-0 animate-spin" />
            <p className="text-muted-foreground truncate text-base font-medium">
              Generating content...
            </p>
          </div>
          {source === "api" && (
            <Tooltip>
              <TooltipTrigger className="border-border/60 bg-muted/80 text-muted-foreground hover:bg-muted -mt-0.5 inline-flex shrink-0 items-center justify-center rounded-md border p-1 transition-colors">
                <BracesIcon className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent side="top">Queued via API</TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="h-3 w-2/5" />
        </div>
      </div>
      <div className="flex items-center gap-1.5 px-1 pb-0.5">
        <Badge className="capitalize" variant="outline">
          draft
        </Badge>
        <Badge
          className="flex items-center gap-1 capitalize"
          variant="secondary"
        >
          <OutputTypeIcon className="size-3" outputType={outputType} />
          {getContentTypeLabel(outputType as ContentType)}
        </Badge>
      </div>
    </div>
  );
}
