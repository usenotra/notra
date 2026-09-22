"use client";

import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useId } from "react";
import { createPortal } from "react-dom";

import { useContentEditorHeaderSlot } from "@/utils/content-editor-header-slot";

export function ContentDetailSkeleton() {
  const id = useId();
  const headerSlot = useContentEditorHeaderSlot();
  return (
    <div className="flex flex-1 flex-col" role="status">
      <span className="sr-only">Loading content</span>
      {headerSlot
        ? createPortal(
            <>
              <div className="flex shrink-0 items-center gap-1">
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-7 w-20" />
              </div>
            </>,
            headerSlot
          )
        : null}
      <div aria-hidden="true" className="flex flex-1 flex-col py-4 md:py-6">
        <div className="mx-auto w-full max-w-5xl px-4 lg:px-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-full md:h-9" />
            <Skeleton className="h-8 w-2/3 md:h-9" />
          </div>
          <div className="mt-4 space-y-2">
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="mt-8 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton
                className={`h-4 ${i === 7 ? "w-2/3" : "w-full"}`}
                key={`${id}-line-${i}`}
              />
            ))}
          </div>
          <Skeleton className="mt-8 h-7 w-1/2" />
          <div className="mt-4 space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    </div>
  );
}
