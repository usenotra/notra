"use client";

import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useId } from "react";

export function AccountPageSkeleton() {
  const id = useId();
  return (
    <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <div className="space-y-1">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-80" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              className="rounded-[20px] border border-border/80 bg-muted/80 p-2"
              key={`${id}-card-${i}`}
            >
              <div className="px-2 py-1.5">
                <Skeleton className="h-6 w-32" />
              </div>
              <div className="space-y-3 rounded-[12px] border border-border/80 bg-background px-4 py-3">
                {Array.from({ length: 4 }).map((_, j) => (
                  <Skeleton
                    className={`h-4 ${j === 3 ? "w-2/3" : "w-full"}`}
                    key={`${id}-line-${i}-${j}`}
                  />
                ))}
              </div>
            </div>
          ))}
          <div className="rounded-[20px] border border-border/80 bg-muted/80 p-2 lg:col-span-2">
            <div className="px-2 py-1.5">
              <Skeleton className="h-6 w-32" />
            </div>
            <div className="space-y-3 rounded-[12px] border border-border/80 bg-background px-4 py-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
