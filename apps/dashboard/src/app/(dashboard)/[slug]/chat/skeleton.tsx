"use client";

import { Skeleton } from "@notra/ui/components/ui/skeleton";

export function ChatPageSkeleton() {
  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <div className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
        <div className="relative flex min-h-full min-w-0 flex-col">
          <div className="flex flex-1 flex-col px-4 pt-6 pb-28">
            <div className="mx-auto flex w-full max-w-2xl min-w-0 flex-col gap-6">
              <div className="flex justify-end">
                <Skeleton className="h-10 w-48 rounded-2xl" />
              </div>
              <div className="flex flex-col gap-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </div>
              <div className="flex justify-end">
                <Skeleton className="h-10 w-64 rounded-2xl" />
              </div>
              <div className="flex flex-col gap-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-3/6" />
              </div>
            </div>
          </div>
          <div className="bg-background sticky bottom-0 z-10 px-4 pb-4">
            <div className="from-background pointer-events-none absolute -inset-x-4 bottom-full h-12 bg-linear-to-t to-transparent" />
            <div className="mx-auto w-full max-w-2xl">
              <Skeleton className="h-28 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
