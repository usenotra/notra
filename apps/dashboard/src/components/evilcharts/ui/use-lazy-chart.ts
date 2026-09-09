"use client";

import { useEffect, useState } from "react";

export interface LazyChartLoader<TComponent> {
  load: () => Promise<TComponent>;
  cached: TComponent | null;
  promise: Promise<TComponent> | null;
}

export function createLazyChartLoader<TComponent>(
  load: () => Promise<TComponent>
): LazyChartLoader<TComponent> {
  return { load, cached: null, promise: null };
}

/**
 * Client-only lazy loading for the ECharts chart implementations (~163 kB gz).
 * This is `next/dynamic({ ssr: false })` by hand: the caller renders the
 * placeholder itself so it can reuse the chart's own sizing classes and keep the
 * box identical before and after the chunk lands (no layout shift).
 */
export function useLazyChart<TComponent>(
  loader: LazyChartLoader<TComponent>
): TComponent | null {
  const [component, setComponent] = useState<TComponent | null>(
    () => loader.cached
  );

  useEffect(() => {
    if (component) {
      return;
    }

    let active = true;
    loader.promise ??= loader.load();
    void loader.promise.then((loaded) => {
      loader.cached = loaded;
      if (active) {
        setComponent(() => loaded);
      }
    });

    return () => {
      active = false;
    };
  }, [component, loader]);

  return component;
}
