"use client";

import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { Suspense, useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";
import type { LazyChartBoundaryProps } from "@/types/evilcharts";

function subscribe() {
  return () => undefined;
}

function getSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

export function LazyChartBoundary({
  children,
  className,
}: LazyChartBoundaryProps) {
  const hydrated = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );
  // The placeholder keeps the caller's sizing classes so swapping it for the
  // chart never shifts layout.
  const placeholder = (
    <div
      aria-hidden="true"
      className={cn("relative flex flex-col text-xs", className)}
    >
      <Skeleton className="size-full min-h-full flex-1" />
    </div>
  );

  return (
    <Suspense fallback={placeholder}>
      {hydrated ? children : placeholder}
    </Suspense>
  );
}
