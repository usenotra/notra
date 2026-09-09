"use client";

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
  const placeholder = (
    <div className={cn("relative flex flex-col text-xs", className)} />
  );

  return (
    <Suspense fallback={placeholder}>
      {hydrated ? children : placeholder}
    </Suspense>
  );
}
