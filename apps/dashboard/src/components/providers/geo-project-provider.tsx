"use client";

import { createContext, useContext, useMemo } from "react";

import { useGeoProjectQueryState } from "@/lib/hooks/use-geo-project-query";
import type {
  GeoProjectContextValue,
  GeoProjectProviderProps,
  GeoProjectQueryProviderProps,
} from "@/types/geo";
import { normalizeGeoProjectId } from "@/utils/geo-hydration";

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
  initialProjectId,
  children,
}: GeoProjectQueryProviderProps) {
  const [projectParam] = useGeoProjectQueryState();
  // The sidebar writes the same id into the URL once `projectsList` resolves;
  // starting from the server-resolved value keeps the scope (and every query
  // key derived from it) stable across that rewrite. An empty `?project=` is
  // normalised away so the client falls back exactly like the server does.
  const projectId = normalizeGeoProjectId(projectParam) ?? initialProjectId;

  return (
    <GeoProjectProvider projectId={projectId}>{children}</GeoProjectProvider>
  );
}

export function useGeoProjectScope(): GeoProjectContextValue {
  return useContext(GeoProjectContext);
}
