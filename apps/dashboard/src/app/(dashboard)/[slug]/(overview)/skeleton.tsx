"use client";

import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useId } from "react";

import { CreateContentButton } from "@/components/content/create-content-button";
import { PageContainer } from "@/components/layout/container";

export function HomePageSkeleton() {
  const id = useId();
  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <div className="space-y-1">
          <Skeleton className="h-9 w-64" />
        </div>

        <section className="space-y-4">
          <div className="flex flex-col items-start gap-3 @min-[40rem]/main:flex-row @min-[40rem]/main:items-center @min-[40rem]/main:justify-between">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold">Today&apos;s Content</h2>
              <p className="text-muted-foreground text-sm">
                Latest items created today
              </p>
            </div>
            <CreateContentButton />
          </div>
          <div className="grid auto-rows-[1fr] justify-items-center gap-3 sm:grid-cols-2 sm:justify-items-stretch lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton
                className="h-[10.625rem] w-full max-w-[21.25rem] rounded-lg sm:h-[8.75rem] sm:max-w-none"
                key={`${id}-card-${i}`}
              />
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Content Activity</h2>
            <p className="text-muted-foreground text-sm">
              Your content creation over the year
            </p>
          </div>
          <Skeleton className="h-40 w-full max-w-[53rem] rounded-lg" />
        </section>
      </div>
    </PageContainer>
  );
}
