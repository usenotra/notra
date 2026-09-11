"use client";

import { createContext, useContext, useMemo } from "react";

import { useGeoProjectQueryState } from "@/lib/hooks/use-geo-project-query";
import type {
  GeoProjectContextValue,
  GeoProjectProviderProps,
} from "@/types/geo";

const GeoProjectContext = createContext<GeoProjectContextValue>({
  projectId: undefined,
});

export function GeoProjectProvider({
  projectId,
  children,
}: GeoProjectProviderProps) {
  const value = useMemo(() => ({ projectId }), [projectId]);
  return (
    <GeoProjectContext.Provider key={projectId ?? ""} value={value}>
      {children}
    </GeoProjectContext.Provider>
  );
}

export function GeoProjectQueryProvider({
  children,
}: Pick<GeoProjectProviderProps, "children">) {
  const [projectId] = useGeoProjectQueryState();

  return (
    <GeoProjectProvider projectId={projectId ?? undefined}>
      {children}
    </GeoProjectProvider>
  );
}

export function useGeoProjectScope(): GeoProjectContextValue {
  return useContext(GeoProjectContext);
}
