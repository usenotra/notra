"use client";

import { Kbd } from "@notra/ui/components/ui/kbd";
import { Skeleton } from "@notra/ui/components/ui/skeleton";

import { Button } from "@/components/button";
import {
  GeoSectionSkeleton,
  GeoTableSkeleton,
} from "@/components/geo/skeleton-parts";
import { PageContainer } from "@/components/layout/container";

const ENGINE_ROW_COUNT = 4;

export function GeoPageSkeleton() {
  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <header className="space-y-1">
          <div className="flex flex-col items-start gap-3 @min-[40rem]/main:flex-row @min-[40rem]/main:items-center @min-[40rem]/main:justify-between">
            <h1 className="text-3xl font-bold tracking-tight">GEO</h1>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Skeleton className="h-7 w-16 rounded-full" />
              <Button className="w-fit gap-2" disabled size="sm">
                Run Scan
                <Kbd className="hidden sm:inline-flex">R</Kbd>
              </Button>
            </div>
          </div>
          <p className="text-muted-foreground">
            How AI engines talk about your brand
          </p>
        </header>
        <div className="bg-muted/40 flex w-fit shrink-0 items-center gap-0.5 rounded-lg border p-0.5">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton className="h-7 w-24 rounded-md" key={index} />
          ))}
        </div>
        <div className="mt-6 flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <GeoSectionSkeleton className="lg:col-span-5" eyebrow="Mentions">
              <Skeleton className="h-64 w-full rounded-xl" />
            </GeoSectionSkeleton>
            <GeoSectionSkeleton
              action={<Skeleton className="h-7 w-28 rounded-full" />}
              className="lg:col-span-7"
              eyebrow="Mention activity"
            >
              <Skeleton className="h-64 w-full rounded-xl" />
            </GeoSectionSkeleton>
          </div>
          <GeoSectionSkeleton
            action={<Skeleton className="h-7 w-40 rounded-md" />}
            eyebrow="Engines"
          >
            <GeoTableSkeleton rows={ENGINE_ROW_COUNT} />
          </GeoSectionSkeleton>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <GeoSectionSkeleton
              action={<Skeleton className="h-3.5 w-8" />}
              eyebrow="Share of voice"
            >
              <Skeleton className="h-64 w-full rounded-xl" />
            </GeoSectionSkeleton>
            <GeoSectionSkeleton
              action={<Skeleton className="h-3.5 w-8" />}
              eyebrow="Performance by language"
            >
              <Skeleton className="h-64 w-full rounded-xl" />
            </GeoSectionSkeleton>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
