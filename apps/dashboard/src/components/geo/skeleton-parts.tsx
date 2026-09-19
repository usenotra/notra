"use client";

import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useId } from "react";

import { cn } from "@/lib/utils";
import type {
  GeoSectionSkeletonProps,
  GeoTableSkeletonProps,
} from "@/types/geo";

export function GeoSectionSkeleton({
  eyebrow,
  action,
  children,
  className,
}: GeoSectionSkeletonProps) {
  return (
    <section className={cn("flex min-w-0 flex-col gap-3", className)}>
      <div className="flex min-w-0 items-center justify-between gap-2">
        <div className="flex h-7 items-center">
          <h2 className="text-foreground text-sm leading-none font-medium capitalize">
            {eyebrow}
          </h2>
        </div>
        {action}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </section>
  );
}

export function GeoTableSkeleton({ rows, toolbar }: GeoTableSkeletonProps) {
  const id = useId();
  return (
    <div className="border-border overflow-hidden rounded-2xl border">
      {toolbar ? <div className="border-border border-b">{toolbar}</div> : null}
      <div className="bg-muted/40 flex h-10 items-center justify-between px-4">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-3.5 w-16" />
      </div>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          className="border-border/60 flex h-13 items-center justify-between gap-4 border-t px-4"
          key={`${id}-row-${index}`}
        >
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

export function GeoConversationSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-8 [&_[data-slot=skeleton]]:motion-reduce:animate-none"
    >
      <div className="bg-muted/40 ml-auto w-4/5 space-y-2 rounded-2xl px-4 py-3 sm:w-2/3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/5" />
      </div>
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <Skeleton className="size-7 rounded-full" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      </div>
    </div>
  );
}
