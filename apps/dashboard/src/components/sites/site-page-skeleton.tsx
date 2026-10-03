"use client";

import { Skeleton } from "@notra/ui/components/ui/skeleton";

import { SitesPageShell } from "./sites-page-shell";

export function SitePageSkeleton() {
  return (
    <SitesPageShell>
      <div className="space-y-2">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Skeleton className="h-64 w-full rounded-2xl" />
      <Skeleton className="h-72 w-full rounded-2xl" />
    </SitesPageShell>
  );
}
